-- Function to safely create types
CREATE OR REPLACE FUNCTION create_type_if_not_exists(type_name text, enum_values text[]) RETURNS void AS $$
DECLARE
    type_exists boolean;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM pg_type WHERE typname = type_name
    ) INTO type_exists;
    
    IF NOT type_exists THEN
        EXECUTE 'CREATE TYPE public.' || quote_ident(type_name) || ' AS ENUM (' || 
                array_to_string(enum_values, ', ') || ')';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Safely create types
SELECT create_type_if_not_exists('client_status', ARRAY['''active''', '''inactive''', '''prospect''', '''archived''']);
SELECT create_type_if_not_exists('communication_direction', ARRAY['''inbound''', '''outbound''']);
SELECT create_type_if_not_exists('communication_type', ARRAY['''email''', '''call''', '''meeting''', '''note''']);
SELECT create_type_if_not_exists('company_size', ARRAY['''startup''', '''small''', '''medium''', '''large''', '''enterprise''']);
SELECT create_type_if_not_exists('extraction_entity_type', ARRAY['''client''', '''project''', '''cost''', '''contact''', '''task''']);
SELECT create_type_if_not_exists('extraction_source_type', ARRAY['''email''', '''document''', '''pdf''', '''image''', '''text''']);
SELECT create_type_if_not_exists('extraction_status', ARRAY['''pending''', '''approved''', '''rejected''', '''auto_applied''']);
SELECT create_type_if_not_exists('invoice_status', ARRAY['''draft''', '''sent''', '''paid''', '''overdue''', '''cancelled''']);
SELECT create_type_if_not_exists('permission_category', ARRAY['''dashboard''', '''boards''', '''clients''', '''apps''', '''admin''']);
SELECT create_type_if_not_exists('project_member_role', ARRAY['''owner''', '''manager''', '''member''', '''viewer''']);
SELECT create_type_if_not_exists('project_priority', ARRAY['''low''', '''medium''', '''high''', '''urgent''']);
SELECT create_type_if_not_exists('project_status', ARRAY['''planning''', '''active''', '''on_hold''', '''completed''', '''cancelled''']);
SELECT create_type_if_not_exists('task_priority', ARRAY['''low''', '''medium''', '''high''', '''urgent''']);
SELECT create_type_if_not_exists('task_status', ARRAY['''todo''', '''in_progress''', '''review''', '''completed''']);
SELECT create_type_if_not_exists('user_role', ARRAY['''super_admin''', '''admin''', '''member''']);
SELECT create_type_if_not_exists('workspace_member_role', ARRAY['''owner''', '''admin''', '''member''']);

-- Drop the helper function
DROP FUNCTION create_type_if_not_exists(text, text[]);

-- Create or replace utility functions
CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create or replace bootstrap check function
CREATE OR REPLACE FUNCTION "public"."has_users"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_count integer;
BEGIN
  SELECT COUNT(*) INTO user_count FROM auth.users;
  RETURN user_count > 0;
END;
$$;

-- Create or replace user profile creation trigger function
CREATE OR REPLACE FUNCTION "public"."create_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  new_workspace_id uuid;
  first text := coalesce(NEW.raw_user_meta_data->>'first_name', null);
  last text := coalesce(NEW.raw_user_meta_data->>'last_name', null);
begin
  -- Insert into user_profiles
  insert into public.user_profiles (id, email, first_name, last_name, email_verified)
  values (
    NEW.id,
    NEW.email,
    first,
    last,
    true
  );

  -- Create workspace with dynamic name
  insert into public.workspaces (name, owner_id)
  values (
    coalesce(first, split_part(NEW.email, '@', 1)) || '''s Workspace',
    NEW.id
  )
  returning id into new_workspace_id;

  -- Update profile with default workspace
  update public.user_profiles
  set default_workspace_id = new_workspace_id
  where id = NEW.id;

  -- Create membership
  insert into public.memberships (user_id, workspace_id, role)
  values (NEW.id, new_workspace_id, 'owner');

  return NEW;
end;
$$;

-- Create or replace activity logging function
CREATE OR REPLACE FUNCTION "public"."log_user_activity"("p_user_id" "uuid", "p_action" "text", "p_resource_type" "text" DEFAULT NULL::"text", "p_resource_id" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_workspace_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  activity_id uuid;
BEGIN
  INSERT INTO public.user_activity_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata,
    workspace_id
  ) VALUES (
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_metadata,
    p_workspace_id
  ) RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$;

-- Create or replace invitation management functions
CREATE OR REPLACE FUNCTION "public"."create_user_invitation"("p_email" "text", "p_role" "public"."user_role" DEFAULT 'member'::"public"."user_role", "p_permissions" "jsonb" DEFAULT '[]'::"jsonb", "p_target_workspace_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  invitation_id uuid;
  invitation_token text;
  inviter_id uuid;
BEGIN
  -- Get the current user ID
  inviter_id := auth.uid();
  
  IF inviter_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Generate a unique invitation token
  invitation_token := encode(gen_random_bytes(32), 'base64');
  
  -- Create the invitation
  INSERT INTO public.user_invitations (
    email,
    invited_by,
    role,
    permissions,
    invitation_token,
    workspace_id
  ) VALUES (
    p_email,
    inviter_id,
    p_role,
    p_permissions,
    invitation_token,
    p_target_workspace_id
  ) RETURNING id INTO invitation_id;
  
  RETURN invitation_id;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."accept_invitation"("p_token" "text", "p_password" "text", "p_first_name" "text", "p_last_name" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  invitation_record record;
  new_user_id uuid;
  workspace_id uuid;
  auth_user_data jsonb;
BEGIN
  -- Find and validate the invitation
  SELECT * INTO invitation_record
  FROM public.user_invitations
  WHERE invitation_token = p_token
    AND accepted_at IS NULL
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;
  
  -- Prepare user metadata
  auth_user_data := jsonb_build_object(
    'first_name', p_first_name,
    'last_name', p_last_name,
    'role', invitation_record.role
  );
  
  -- Create the auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    invitation_record.email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    auth_user_data,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO new_user_id;
  
  -- Determine workspace
  IF invitation_record.workspace_id IS NOT NULL THEN
    workspace_id := invitation_record.workspace_id;
  ELSE
    -- Create a new workspace for the user
    INSERT INTO public.workspaces (name, owner_id)
    VALUES (p_first_name || '''s Workspace', new_user_id)
    RETURNING id INTO workspace_id;
  END IF;
  
  -- Create user profile (this might be handled by trigger, but ensure it exists)
  INSERT INTO public.user_profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    default_workspace_id,
    email_verified
  ) VALUES (
    new_user_id,
    invitation_record.email,
    p_first_name,
    p_last_name,
    invitation_record.role,
    workspace_id,
    true
  ) ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    default_workspace_id = EXCLUDED.default_workspace_id,
    email_verified = EXCLUDED.email_verified;
  
  -- Add user to workspace
  INSERT INTO public.memberships (user_id, workspace_id, role)
  VALUES (new_user_id, workspace_id, 
    CASE 
      WHEN invitation_record.workspace_id IS NULL THEN 'owner'
      ELSE 'member'
    END
  ) ON CONFLICT (user_id, workspace_id) DO NOTHING;
  
  -- Assign permissions if specified
  IF jsonb_array_length(invitation_record.permissions) > 0 THEN
    INSERT INTO public.user_permissions (user_id, permission_id, granted_by)
    SELECT 
      new_user_id,
      (permission_value->>'id')::uuid,
      invitation_record.invited_by
    FROM jsonb_array_elements(invitation_record.permissions) AS permission_value
    WHERE permission_value->>'id' IS NOT NULL;
  END IF;
  
  -- Mark invitation as accepted
  UPDATE public.user_invitations
  SET accepted_at = now()
  WHERE id = invitation_record.id;
  
  RETURN jsonb_build_object(
    'user_id', new_user_id,
    'workspace_id', workspace_id,
    'success', true
  );
END;
$$;

-- Grant permissions to functions
GRANT EXECUTE ON FUNCTION "public"."has_users"() TO "anon", "authenticated", "service_role";
GRANT EXECUTE ON FUNCTION "public"."create_user_profile"() TO "anon", "authenticated", "service_role";
GRANT EXECUTE ON FUNCTION "public"."log_user_activity"("p_user_id" "uuid", "p_action" "text", "p_resource_type" "text", "p_resource_id" "text", "p_metadata" "jsonb", "p_workspace_id" "uuid") TO "anon", "authenticated", "service_role";
GRANT EXECUTE ON FUNCTION "public"."create_user_invitation"("p_email" "text", "p_role" "public"."user_role", "p_permissions" "jsonb", "p_target_workspace_id" "uuid") TO "anon", "authenticated", "service_role";
GRANT EXECUTE ON FUNCTION "public"."accept_invitation"("p_token" "text", "p_password" "text", "p_first_name" "text", "p_last_name" "text") TO "anon", "authenticated", "service_role";
GRANT EXECUTE ON FUNCTION "public"."update_updated_at"() TO "anon", "authenticated", "service_role";

-- Insert default permissions if they don't exist
INSERT INTO public.permissions (name, description, category)
VALUES 
    ('dashboard.view', 'View dashboard and overview', 'dashboard'),
    ('dashboard.analytics', 'View analytics and reports', 'dashboard'),
    ('boards.view', 'View project boards', 'boards'),
    ('boards.create', 'Create new project boards', 'boards'),
    ('boards.edit', 'Edit existing project boards', 'boards'),
    ('boards.delete', 'Delete project boards', 'boards'),
    ('clients.view', 'View client information', 'clients'),
    ('clients.create', 'Create new clients', 'clients'),
    ('clients.edit', 'Edit client information', 'clients'),
    ('clients.delete', 'Delete clients', 'clients'),
    ('apps.gmail', 'Access Gmail integration', 'apps'),
    ('apps.ai', 'Access AI features', 'apps'),
    ('apps.analytics', 'Access analytics apps', 'apps'),
    ('admin.users', 'Manage users', 'admin'),
    ('admin.system', 'Manage system settings', 'admin'),
    ('admin.super', 'Super admin privileges', 'admin')
ON CONFLICT (name) DO NOTHING;

-- Create auth trigger for user creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created' 
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();
  END IF;
END $$;