/*
# Fixed Schema Migration

1. New Tables
   - All core tables for the CRM system
   - User management, workspaces, clients, projects, tasks, etc.

2. Security
   - Row Level Security (RLS) policies with existence checks
   - Permission system

3. Changes
   - Safe type creation with existence checks
   - Safe policy creation with existence checks
   - Default permissions
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types with IF NOT EXISTS equivalent using DO blocks
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('super_admin', 'admin', 'member');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_member_role') THEN
        CREATE TYPE public.workspace_member_role AS ENUM ('owner', 'admin', 'member');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'permission_category') THEN
        CREATE TYPE public.permission_category AS ENUM ('dashboard', 'boards', 'clients', 'apps', 'admin');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_status') THEN
        CREATE TYPE public.client_status AS ENUM ('active', 'inactive', 'prospect', 'archived');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_size') THEN
        CREATE TYPE public.company_size AS ENUM ('startup', 'small', 'medium', 'large', 'enterprise');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_type') THEN
        CREATE TYPE public.communication_type AS ENUM ('email', 'call', 'meeting', 'note');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_direction') THEN
        CREATE TYPE public.communication_direction AS ENUM ('inbound', 'outbound');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
        CREATE TYPE public.project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_priority') THEN
        CREATE TYPE public.project_priority AS ENUM ('low', 'medium', 'high', 'urgent');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_member_role') THEN
        CREATE TYPE public.project_member_role AS ENUM ('owner', 'manager', 'member', 'viewer');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'review', 'completed');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
        CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extraction_source_type') THEN
        CREATE TYPE public.extraction_source_type AS ENUM ('email', 'document', 'pdf', 'image', 'text');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extraction_entity_type') THEN
        CREATE TYPE public.extraction_entity_type AS ENUM ('client', 'project', 'cost', 'contact', 'task');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extraction_status') THEN
        CREATE TYPE public.extraction_status AS ENUM ('pending', 'approved', 'rejected', 'auto_applied');
    END IF;
END $$;

-- Create utility function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create user profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role public.user_role DEFAULT 'member' NOT NULL,
  avatar_url text,
  is_active boolean DEFAULT true NOT NULL,
  email_verified boolean DEFAULT false NOT NULL,
  failed_login_attempts integer DEFAULT 0 NOT NULL,
  locked_until timestamptz,
  last_login timestamptz,
  last_activity timestamptz,
  default_workspace_id uuid,
  ai_preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES public.user_profiles(id),
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add foreign key constraint for default_workspace_id after workspaces table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_profiles_default_workspace_id_fkey'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD CONSTRAINT user_profiles_default_workspace_id_fkey 
    FOREIGN KEY (default_workspace_id) REFERENCES public.workspaces(id);
  END IF;
END $$;

-- Create memberships table
CREATE TABLE IF NOT EXISTS public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role public.workspace_member_role DEFAULT 'member' NOT NULL,
  joined_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, workspace_id)
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text NOT NULL,
  category public.permission_category NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create user permissions table
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES public.user_profiles(id),
  granted_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, permission_id)
);

-- Create user invitations table
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  invited_by uuid NOT NULL REFERENCES public.user_profiles(id),
  role public.user_role DEFAULT 'member' NOT NULL,
  permissions jsonb DEFAULT '[]',
  invitation_token text UNIQUE NOT NULL,
  expires_at timestamptz DEFAULT (now() + interval '7 days') NOT NULL,
  accepted_at timestamptz,
  workspace_id uuid REFERENCES public.workspaces(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create user activity logs table
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  metadata jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  workspace_id uuid REFERENCES public.workspaces(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  website text,
  industry text,
  company_size public.company_size,
  address jsonb DEFAULT '{}',
  status public.client_status DEFAULT 'prospect' NOT NULL,
  tags text[] DEFAULT '{}',
  notes text DEFAULT '',
  total_value numeric DEFAULT 0,
  last_contact_date timestamptz,
  next_follow_up_date timestamptz,
  assigned_to uuid REFERENCES public.user_profiles(id),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  created_by uuid REFERENCES public.user_profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create client contacts table
CREATE TABLE IF NOT EXISTS public.client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  role text,
  is_primary boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create client communications table
CREATE TABLE IF NOT EXISTS public.client_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type public.communication_type NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  direction public.communication_direction NOT NULL,
  contact_id uuid REFERENCES public.client_contacts(id),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id),
  attachments jsonb DEFAULT '[]',
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create client assignments table
CREATE TABLE IF NOT EXISTS public.client_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.user_profiles(id),
  assignment_reason text,
  ai_confidence numeric CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  workload_factor numeric,
  expertise_match numeric,
  is_active boolean DEFAULT true NOT NULL,
  assigned_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(client_id, user_id)
);

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  status public.project_status DEFAULT 'planning' NOT NULL,
  priority public.project_priority DEFAULT 'medium' NOT NULL,
  start_date date,
  end_date date,
  estimated_hours numeric DEFAULT 0,
  actual_hours numeric DEFAULT 0,
  budget numeric,
  spent_budget numeric DEFAULT 0,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  tags text[] DEFAULT '{}',
  attachments jsonb DEFAULT '[]',
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  created_by uuid REFERENCES public.user_profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create project members table
CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role public.project_member_role DEFAULT 'member' NOT NULL,
  hourly_rate numeric,
  joined_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(project_id, user_id)
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assignee_id uuid REFERENCES public.user_profiles(id),
  status public.task_status DEFAULT 'todo' NOT NULL,
  priority public.task_priority DEFAULT 'medium' NOT NULL,
  due_date timestamptz,
  estimated_hours numeric,
  actual_hours numeric DEFAULT 0,
  tags text[] DEFAULT '{}',
  attachments jsonb DEFAULT '[]',
  dependencies uuid[] DEFAULT '{}',
  position integer DEFAULT 0,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  created_by uuid REFERENCES public.user_profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create task comments table
CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.user_profiles(id),
  content text NOT NULL,
  attachments jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id),
  invoice_number text UNIQUE NOT NULL,
  status public.invoice_status DEFAULT 'draft' NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'USD' NOT NULL,
  issue_date date NOT NULL,
  due_date date NOT NULL,
  paid_date date,
  items jsonb DEFAULT '[]',
  notes text,
  created_by uuid REFERENCES public.user_profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create AI extractions table
CREATE TABLE IF NOT EXISTS public.ai_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type public.extraction_source_type NOT NULL,
  source_id text,
  extracted_data jsonb NOT NULL,
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 1),
  entity_type public.extraction_entity_type NOT NULL,
  entity_id uuid,
  status public.extraction_status DEFAULT 'pending' NOT NULL,
  reviewed_by uuid REFERENCES public.user_profiles(id),
  reviewed_at timestamptz,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  created_by uuid REFERENCES public.user_profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_workspace_id ON public.memberships(workspace_id);
CREATE INDEX IF NOT EXISTS idx_clients_workspace_id ON public.clients(workspace_id);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_to ON public.clients(assigned_to);
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON public.projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON public.tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_workspace_id ON public.user_activity_logs(workspace_id);

-- Create triggers for updated_at columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_profiles_updated_at') THEN
    CREATE TRIGGER update_user_profiles_updated_at
      BEFORE UPDATE ON public.user_profiles
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_workspaces_updated_at') THEN
    CREATE TRIGGER update_workspaces_updated_at
      BEFORE UPDATE ON public.workspaces
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clients_updated_at') THEN
    CREATE TRIGGER update_clients_updated_at
      BEFORE UPDATE ON public.clients
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_projects_updated_at') THEN
    CREATE TRIGGER update_projects_updated_at
      BEFORE UPDATE ON public.projects
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tasks_updated_at') THEN
    CREATE TRIGGER update_tasks_updated_at
      BEFORE UPDATE ON public.tasks
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_task_comments_updated_at') THEN
    CREATE TRIGGER update_task_comments_updated_at
      BEFORE UPDATE ON public.task_comments
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_invoices_updated_at') THEN
    CREATE TRIGGER update_invoices_updated_at
      BEFORE UPDATE ON public.invoices
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- Create user profile creation function
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id uuid;
  first text := coalesce(NEW.raw_user_meta_data->>'first_name', null);
  last text := coalesce(NEW.raw_user_meta_data->>'last_name', null);
BEGIN
  -- Insert into user_profiles
  INSERT INTO public.user_profiles (id, email, first_name, last_name, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    first,
    last,
    true
  );

  -- Create workspace with dynamic name
  INSERT INTO public.workspaces (name, owner_id)
  VALUES (
    coalesce(first, split_part(NEW.email, '@', 1)) || '''s Workspace',
    NEW.id
  )
  RETURNING id INTO new_workspace_id;

  -- Update profile with default workspace
  UPDATE public.user_profiles
  SET default_workspace_id = new_workspace_id
  WHERE id = NEW.id;

  -- Create membership
  INSERT INTO public.memberships (user_id, workspace_id, role)
  VALUES (NEW.id, new_workspace_id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user profile creation (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();
  END IF;
END $$;

-- Create invitation functions
CREATE OR REPLACE FUNCTION public.create_user_invitation(
  p_email text,
  p_role public.user_role DEFAULT 'member',
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

-- Create accept invitation function
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

-- Create activity logging function
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

-- Create utility function to check if users exist
CREATE OR REPLACE FUNCTION public.has_users()
RETURNS boolean AS $$
DECLARE
  user_count integer;
BEGIN
  SELECT COUNT(*) INTO user_count FROM auth.users;
  RETURN user_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_extractions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies with existence checks
-- User profiles policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own profile' AND tablename = 'user_profiles') THEN
    CREATE POLICY "Users can view their own profile" ON public.user_profiles
      FOR SELECT USING (id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own profile' AND tablename = 'user_profiles') THEN
    CREATE POLICY "Users can update their own profile" ON public.user_profiles
      FOR UPDATE USING (id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable insert for authenticated users' AND tablename = 'user_profiles') THEN
    CREATE POLICY "Enable insert for authenticated users" ON public.user_profiles
      FOR INSERT WITH CHECK (id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all profiles' AND tablename = 'user_profiles') THEN
    CREATE POLICY "Admins can view all profiles" ON public.user_profiles
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE up.id = auth.uid() AND up.role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable management for admins' AND tablename = 'user_profiles') THEN
    CREATE POLICY "Enable management for admins" ON public.user_profiles
      FOR ALL USING (role IN ('super_admin', 'admin'));
  END IF;
END $$;

-- Workspaces policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create workspaces' AND tablename = 'workspaces') THEN
    CREATE POLICY "Users can create workspaces" ON public.workspaces
      FOR INSERT WITH CHECK (owner_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace owners can view their workspaces' AND tablename = 'workspaces') THEN
    CREATE POLICY "Workspace owners can view their workspaces" ON public.workspaces
      FOR SELECT USING (owner_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace members can view workspaces' AND tablename = 'workspaces') THEN
    CREATE POLICY "Workspace members can view workspaces" ON public.workspaces
      FOR SELECT USING (
        id IN (
          SELECT workspace_id FROM public.memberships
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace owners can update' AND tablename = 'workspaces') THEN
    CREATE POLICY "Workspace owners can update" ON public.workspaces
      FOR UPDATE USING (owner_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace owners can delete' AND tablename = 'workspaces') THEN
    CREATE POLICY "Workspace owners can delete" ON public.workspaces
      FOR DELETE USING (owner_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all workspaces' AND tablename = 'workspaces') THEN
    CREATE POLICY "Admins can view all workspaces" ON public.workspaces
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

-- Memberships policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own memberships' AND tablename = 'memberships') THEN
    CREATE POLICY "Users can view their own memberships" ON public.memberships
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace owners can view memberships' AND tablename = 'memberships') THEN
    CREATE POLICY "Workspace owners can view memberships" ON public.memberships
      FOR SELECT USING (
        workspace_id IN (
          SELECT id FROM public.workspaces
          WHERE owner_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace owners can manage memberships' AND tablename = 'memberships') THEN
    CREATE POLICY "Workspace owners can manage memberships" ON public.memberships
      FOR ALL USING (
        workspace_id IN (
          SELECT id FROM public.workspaces
          WHERE owner_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all memberships' AND tablename = 'memberships') THEN
    CREATE POLICY "Admins can manage all memberships" ON public.memberships
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

-- Permissions policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'All users can view permissions' AND tablename = 'permissions') THEN
    CREATE POLICY "All users can view permissions" ON public.permissions
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage permissions' AND tablename = 'permissions') THEN
    CREATE POLICY "Admins can manage permissions" ON public.permissions
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

-- User permissions policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own user permissions' AND tablename = 'user_permissions') THEN
    CREATE POLICY "Users can view their own user permissions" ON public.user_permissions
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all user permissions' AND tablename = 'user_permissions') THEN
    CREATE POLICY "Admins can manage all user permissions" ON public.user_permissions
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

-- User invitations policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage invitations' AND tablename = 'user_invitations') THEN
    CREATE POLICY "Admins can manage invitations" ON public.user_invitations
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

-- User activity logs policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own activity' AND tablename = 'user_activity_logs') THEN
    CREATE POLICY "Users can view their own activity" ON public.user_activity_logs
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all activity' AND tablename = 'user_activity_logs') THEN
    CREATE POLICY "Admins can view all activity" ON public.user_activity_logs
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System can insert activity logs' AND tablename = 'user_activity_logs') THEN
    CREATE POLICY "System can insert activity logs" ON public.user_activity_logs
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Clients policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace members can view clients' AND tablename = 'clients') THEN
    CREATE POLICY "Workspace members can view clients" ON public.clients
      FOR SELECT USING (
        workspace_id IN (
          SELECT workspace_id FROM public.memberships
          WHERE user_id = auth.uid()
        ) OR
        workspace_id IN (
          SELECT id FROM public.workspaces
          WHERE owner_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace members can manage clients' AND tablename = 'clients') THEN
    CREATE POLICY "Workspace members can manage clients" ON public.clients
      FOR ALL USING (
        workspace_id IN (
          SELECT workspace_id FROM public.memberships
          WHERE user_id = auth.uid()
        ) OR
        workspace_id IN (
          SELECT id FROM public.workspaces
          WHERE owner_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

-- Client contacts policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Client contact access' AND tablename = 'client_contacts') THEN
    CREATE POLICY "Client contact access" ON public.client_contacts
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.clients
          WHERE id = client_contacts.client_id AND (
            workspace_id IN (
              SELECT workspace_id FROM public.memberships
              WHERE user_id = auth.uid()
            ) OR
            EXISTS (
              SELECT 1 FROM public.user_profiles
              WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
            )
          )
        )
      );
  END IF;
END $$;

-- Client communications policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Client communication access' AND tablename = 'client_communications') THEN
    CREATE POLICY "Client communication access" ON public.client_communications
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.clients
          WHERE id = client_communications.client_id AND (
            workspace_id IN (
              SELECT workspace_id FROM public.memberships
              WHERE user_id = auth.uid()
            ) OR
            EXISTS (
              SELECT 1 FROM public.user_profiles
              WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
            )
          )
        )
      );
  END IF;
END $$;

-- Client assignments policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Client assignment access' AND tablename = 'client_assignments') THEN
    CREATE POLICY "Client assignment access" ON public.client_assignments
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.clients
          WHERE id = client_assignments.client_id AND (
            workspace_id IN (
              SELECT workspace_id FROM public.memberships
              WHERE user_id = auth.uid()
            ) OR
            EXISTS (
              SELECT 1 FROM public.user_profiles
              WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
            )
          )
        )
      );
  END IF;
END $$;

-- Projects policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace members can view projects' AND tablename = 'projects') THEN
    CREATE POLICY "Workspace members can view projects" ON public.projects
      FOR SELECT USING (
        workspace_id IN (
          SELECT workspace_id FROM public.memberships
          WHERE user_id = auth.uid()
        ) OR
        workspace_id IN (
          SELECT id FROM public.workspaces
          WHERE owner_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace members can manage projects' AND tablename = 'projects') THEN
    CREATE POLICY "Workspace members can manage projects" ON public.projects
      FOR ALL USING (
        workspace_id IN (
          SELECT workspace_id FROM public.memberships
          WHERE user_id = auth.uid()
        ) OR
        workspace_id IN (
          SELECT id FROM public.workspaces
          WHERE owner_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

-- Project members policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Project member access' AND tablename = 'project_members') THEN
    CREATE POLICY "Project member access" ON public.project_members
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.projects
          WHERE id = project_members.project_id AND (
            workspace_id IN (
              SELECT workspace_id FROM public.memberships
              WHERE user_id = auth.uid()
            ) OR
            EXISTS (
              SELECT 1 FROM public.user_profiles
              WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
            )
          )
        )
      );
  END IF;
END $$;

-- Tasks policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace members can view tasks' AND tablename = 'tasks') THEN
    CREATE POLICY "Workspace members can view tasks" ON public.tasks
      FOR SELECT USING (
        workspace_id IN (
          SELECT workspace_id FROM public.memberships
          WHERE user_id = auth.uid()
        ) OR
        workspace_id IN (
          SELECT id FROM public.workspaces
          WHERE owner_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace members can manage tasks' AND tablename = 'tasks') THEN
    CREATE POLICY "Workspace members can manage tasks" ON public.tasks
      FOR ALL USING (
        workspace_id IN (
          SELECT workspace_id FROM public.memberships
          WHERE user_id = auth.uid()
        ) OR
        workspace_id IN (
          SELECT id FROM public.workspaces
          WHERE owner_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

-- Task comments policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Task comment access' AND tablename = 'task_comments') THEN
    CREATE POLICY "Task comment access" ON public.task_comments
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.tasks
          WHERE id = task_comments.task_id AND (
            workspace_id IN (
              SELECT workspace_id FROM public.memberships
              WHERE user_id = auth.uid()
            ) OR
            EXISTS (
              SELECT 1 FROM public.user_profiles
              WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
            )
          )
        )
      );
  END IF;
END $$;

-- Invoices policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Invoice access' AND tablename = 'invoices') THEN
    CREATE POLICY "Invoice access" ON public.invoices
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.clients
          WHERE id = invoices.client_id AND (
            workspace_id IN (
              SELECT workspace_id FROM public.memberships
              WHERE user_id = auth.uid()
            ) OR
            EXISTS (
              SELECT 1 FROM public.user_profiles
              WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
            )
          )
        )
      );
  END IF;
END $$;

-- AI extractions policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'AI extraction access' AND tablename = 'ai_extractions') THEN
    CREATE POLICY "AI extraction access" ON public.ai_extractions
      FOR ALL USING (
        workspace_id IN (
          SELECT workspace_id FROM public.memberships
          WHERE user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

-- Insert default permissions
INSERT INTO public.permissions (name, description, category) VALUES
  ('dashboard.view', 'View dashboard and overview', 'dashboard'),
  ('dashboard.analytics', 'View analytics and reports', 'dashboard'),
  ('boards.view', 'View project boards', 'boards'),
  ('boards.create', 'Create new project boards', 'boards'),
  ('boards.edit', 'Edit project boards', 'boards'),
  ('boards.delete', 'Delete project boards', 'boards'),
  ('clients.view', 'View client information', 'clients'),
  ('clients.create', 'Create new clients', 'clients'),
  ('clients.edit', 'Edit client information', 'clients'),
  ('clients.delete', 'Delete clients', 'clients'),
  ('apps.gmail', 'Access Gmail integration', 'apps'),
  ('apps.ai', 'Access AI features', 'apps'),
  ('apps.analytics', 'Access analytics tools', 'apps'),
  ('admin.users', 'Manage users and permissions', 'admin'),
  ('admin.system', 'System administration', 'admin'),
  ('admin.super', 'Super admin privileges', 'admin')
ON CONFLICT (name) DO NOTHING;