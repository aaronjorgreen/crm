/*
  # Database Functions and Triggers
  
  This migration creates all the necessary functions and triggers for the CRM system.
  
  ## Functions Created:
  1. create_user_profile - Automatically creates user profile when auth user is created
  2. create_user_invitation - Creates user invitations with tokens
  3. accept_invitation - Handles invitation acceptance and user creation
  4. log_user_activity - Logs user activities for audit trail
  5. has_users - Checks if any users exist in the system
  
  ## Triggers Created:
  - Automatic user profile creation on auth.users insert
*/

-- Function to create user profile automatically
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  workspace_id uuid;
BEGIN
  -- Create a default workspace for the user
  INSERT INTO public.workspaces (name, owner_id)
  VALUES (NEW.raw_user_meta_data->>'first_name' || '''s Workspace', NEW.id)
  RETURNING id INTO workspace_id;
  
  -- Create user profile
  INSERT INTO public.user_profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    default_workspace_id,
    email_verified
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'member'),
    workspace_id,
    NEW.email_confirmed_at IS NOT NULL
  );
  
  -- Add user as owner of their workspace
  INSERT INTO public.memberships (user_id, workspace_id, role)
  VALUES (NEW.id, workspace_id, 'owner');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create user invitation
CREATE OR REPLACE FUNCTION public.create_user_invitation(
  p_email text,
  p_role user_role DEFAULT 'member',
  p_permissions jsonb DEFAULT '[]',
  p_target_workspace_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept invitation
CREATE OR REPLACE FUNCTION public.accept_invitation(
  p_token text,
  p_password text,
  p_first_name text,
  p_last_name text
)
RETURNS jsonb AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log user activity
CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_user_id uuid,
  p_action text,
  p_resource_type text DEFAULT NULL,
  p_resource_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}',
  p_workspace_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if any users exist
CREATE OR REPLACE FUNCTION public.has_users()
RETURNS boolean AS $$
DECLARE
  user_count integer;
BEGIN
  SELECT COUNT(*) INTO user_count FROM auth.users;
  RETURN user_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_user_invitation TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.accept_invitation TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.log_user_activity TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_users TO authenticated, anon;