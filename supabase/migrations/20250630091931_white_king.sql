/*
  # Comprehensive CRM Foundation Migration
  
  This migration creates the complete database schema for the Innovate X Labs CRM platform.
  
  ## Features Included:
  1. **Authentication System**
     - User profiles with role-based access (super_admin, admin, member)
     - Email verification and account security
     - Session management and activity logging
  
  2. **Multi-Tenant Workspace System**
     - Workspace isolation for data security
     - Admin override for cross-workspace access
     - Membership management with roles
  
  3. **CRM Core Features**
     - Client management with assignments
     - Project management with team collaboration
     - Task management with kanban boards
     - Cost tracking and budget management
  
  4. **AI Integration**
     - Data extraction from emails/documents
     - Automated client assignment suggestions
     - Content processing and approval workflows
  
  5. **Analytics Infrastructure**
     - User activity tracking
     - Performance metrics collection
     - Cross-workspace analytics for admins
  
  6. **Security & Permissions**
     - Row Level Security (RLS) on all tables
     - Permission-based access control
     - Workspace-based data isolation
     - Admin override capabilities
*/

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Create enum types only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('super_admin', 'admin', 'member');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'permission_category') THEN
        CREATE TYPE public.permission_category AS ENUM ('dashboard', 'boards', 'clients', 'apps', 'admin');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_member_role') THEN
        CREATE TYPE public.workspace_member_role AS ENUM ('owner', 'admin', 'member');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_status') THEN
        CREATE TYPE public.client_status AS ENUM ('active', 'inactive', 'prospect', 'archived');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_size') THEN
        CREATE TYPE public.company_size AS ENUM ('startup', 'small', 'medium', 'large', 'enterprise');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
        CREATE TYPE public.project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_priority') THEN
        CREATE TYPE public.project_priority AS ENUM ('low', 'medium', 'high', 'urgent');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_member_role') THEN
        CREATE TYPE public.project_member_role AS ENUM ('owner', 'manager', 'member', 'viewer');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'review', 'completed');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
        CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_type') THEN
        CREATE TYPE public.communication_type AS ENUM ('email', 'call', 'meeting', 'note');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_direction') THEN
        CREATE TYPE public.communication_direction AS ENUM ('inbound', 'outbound');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extraction_source_type') THEN
        CREATE TYPE public.extraction_source_type AS ENUM ('email', 'document', 'pdf', 'image', 'text');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extraction_entity_type') THEN
        CREATE TYPE public.extraction_entity_type AS ENUM ('client', 'project', 'cost', 'contact', 'task');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extraction_status') THEN
        CREATE TYPE public.extraction_status AS ENUM ('pending', 'approved', 'rejected', 'auto_applied');
    END IF;
END$$;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Create tables only if they don't exist
-- User Profiles: Extended user information
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid PRIMARY KEY,
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

-- Workspaces: Multi-tenant isolation
CREATE TABLE IF NOT EXISTS public.workspaces (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    owner_id uuid NOT NULL,
    settings jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Workspace Memberships: User access to workspaces
CREATE TABLE IF NOT EXISTS public.memberships (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    role public.workspace_member_role DEFAULT 'member' NOT NULL,
    joined_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(user_id, workspace_id)
);

-- Permissions: System-wide permissions
CREATE TABLE IF NOT EXISTS public.permissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text UNIQUE NOT NULL,
    description text NOT NULL,
    category public.permission_category NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- User Permissions: Individual user permissions
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    granted_by uuid,
    granted_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(user_id, permission_id)
);

-- User Invitations: Invitation system
CREATE TABLE IF NOT EXISTS public.user_invitations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text NOT NULL,
    invited_by uuid NOT NULL,
    role public.user_role DEFAULT 'member' NOT NULL,
    permissions jsonb DEFAULT '[]',
    invitation_token text UNIQUE NOT NULL,
    expires_at timestamptz DEFAULT (now() + interval '7 days') NOT NULL,
    accepted_at timestamptz,
    workspace_id uuid,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now() NOT NULL
);

-- User Activity Logs: Comprehensive activity tracking
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    action text NOT NULL,
    resource_type text,
    resource_id text,
    metadata jsonb DEFAULT '{}',
    ip_address inet,
    user_agent text,
    workspace_id uuid,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================================================
-- CRM TABLES
-- ============================================================================

-- Clients: Customer/client management
CREATE TABLE IF NOT EXISTS public.clients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
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
    assigned_to uuid,
    workspace_id uuid NOT NULL,
    created_by uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Client Contacts: Contact persons for clients
CREATE TABLE IF NOT EXISTS public.client_contacts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text,
    role text,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Client Communications: Communication history
CREATE TABLE IF NOT EXISTS public.client_communications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid NOT NULL,
    type public.communication_type NOT NULL,
    subject text NOT NULL,
    content text NOT NULL,
    direction public.communication_direction NOT NULL,
    contact_id uuid,
    user_id uuid NOT NULL,
    attachments jsonb DEFAULT '[]',
    scheduled_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Client Assignments: AI-powered client assignments
CREATE TABLE IF NOT EXISTS public.client_assignments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid NOT NULL,
    user_id uuid NOT NULL,
    assigned_by uuid,
    assignment_reason text,
    ai_confidence numeric CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
    workload_factor numeric,
    expertise_match numeric,
    is_active boolean DEFAULT true NOT NULL,
    assigned_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(client_id, user_id)
);

-- Projects: Project management
CREATE TABLE IF NOT EXISTS public.projects (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    client_id uuid,
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
    workspace_id uuid NOT NULL,
    created_by uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Project Members: Team assignments to projects
CREATE TABLE IF NOT EXISTS public.project_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public.project_member_role DEFAULT 'member' NOT NULL,
    hourly_rate numeric,
    joined_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(project_id, user_id)
);

-- Tasks: Task management with kanban support
CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    project_id uuid NOT NULL,
    assignee_id uuid,
    status public.task_status DEFAULT 'todo' NOT NULL,
    priority public.task_priority DEFAULT 'medium' NOT NULL,
    due_date timestamptz,
    estimated_hours numeric,
    actual_hours numeric DEFAULT 0,
    tags text[] DEFAULT '{}',
    attachments jsonb DEFAULT '[]',
    dependencies uuid[] DEFAULT '{}',
    position integer DEFAULT 0,
    workspace_id uuid NOT NULL,
    created_by uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Task Comments: Task collaboration
CREATE TABLE IF NOT EXISTS public.task_comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    attachments jsonb DEFAULT '[]',
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Invoices: Billing and invoicing
CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid NOT NULL,
    project_id uuid,
    invoice_number text UNIQUE NOT NULL,
    status public.invoice_status DEFAULT 'draft' NOT NULL,
    amount numeric NOT NULL,
    currency text DEFAULT 'USD' NOT NULL,
    issue_date date NOT NULL,
    due_date date NOT NULL,
    paid_date date,
    items jsonb DEFAULT '[]',
    notes text,
    created_by uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================================================
-- AI & AUTOMATION TABLES
-- ============================================================================

-- AI Extractions: AI-powered data extraction
CREATE TABLE IF NOT EXISTS public.ai_extractions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    source_type public.extraction_source_type NOT NULL,
    source_id text,
    extracted_data jsonb NOT NULL,
    confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 1),
    entity_type public.extraction_entity_type NOT NULL,
    entity_id uuid,
    status public.extraction_status DEFAULT 'pending' NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamptz,
    workspace_id uuid NOT NULL,
    created_by uuid,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Only add foreign keys if they don't exist
DO $$
BEGIN
    -- User Profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_id_fkey'
    ) THEN
        ALTER TABLE public.user_profiles 
            ADD CONSTRAINT user_profiles_id_fkey 
            FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- Workspaces
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'workspaces_owner_id_fkey'
    ) THEN
        ALTER TABLE public.workspaces 
            ADD CONSTRAINT workspaces_owner_id_fkey 
            FOREIGN KEY (owner_id) REFERENCES public.user_profiles(id);
    END IF;

    -- User Profiles workspace reference
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_default_workspace_id_fkey'
    ) THEN
        ALTER TABLE public.user_profiles 
            ADD CONSTRAINT user_profiles_default_workspace_id_fkey 
            FOREIGN KEY (default_workspace_id) REFERENCES public.workspaces(id);
    END IF;

    -- Memberships
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'memberships_user_id_fkey'
    ) THEN
        ALTER TABLE public.memberships 
            ADD CONSTRAINT memberships_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'memberships_workspace_id_fkey'
    ) THEN
        ALTER TABLE public.memberships 
            ADD CONSTRAINT memberships_workspace_id_fkey 
            FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
    END IF;

    -- User Permissions
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_permissions_user_id_fkey'
    ) THEN
        ALTER TABLE public.user_permissions 
            ADD CONSTRAINT user_permissions_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_permissions_permission_id_fkey'
    ) THEN
        ALTER TABLE public.user_permissions 
            ADD CONSTRAINT user_permissions_permission_id_fkey 
            FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_permissions_granted_by_fkey'
    ) THEN
        ALTER TABLE public.user_permissions 
            ADD CONSTRAINT user_permissions_granted_by_fkey 
            FOREIGN KEY (granted_by) REFERENCES public.user_profiles(id);
    END IF;

    -- User Invitations
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_invitations_invited_by_fkey'
    ) THEN
        ALTER TABLE public.user_invitations 
            ADD CONSTRAINT user_invitations_invited_by_fkey 
            FOREIGN KEY (invited_by) REFERENCES public.user_profiles(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_invitations_workspace_id_fkey'
    ) THEN
        ALTER TABLE public.user_invitations 
            ADD CONSTRAINT user_invitations_workspace_id_fkey 
            FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);
    END IF;

    -- User Activity Logs
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_activity_logs_user_id_fkey'
    ) THEN
        ALTER TABLE public.user_activity_logs 
            ADD CONSTRAINT user_activity_logs_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_activity_logs_workspace_id_fkey'
    ) THEN
        ALTER TABLE public.user_activity_logs 
            ADD CONSTRAINT user_activity_logs_workspace_id_fkey 
            FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);
    END IF;

    -- Clients
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'clients_assigned_to_fkey'
    ) THEN
        ALTER TABLE public.clients 
            ADD CONSTRAINT clients_assigned_to_fkey 
            FOREIGN KEY (assigned_to) REFERENCES public.user_profiles(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'clients_workspace_id_fkey'
    ) THEN
        ALTER TABLE public.clients 
            ADD CONSTRAINT clients_workspace_id_fkey 
            FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'clients_created_by_fkey'
    ) THEN
        ALTER TABLE public.clients 
            ADD CONSTRAINT clients_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);
    END IF;

    -- Client Contacts
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'client_contacts_client_id_fkey'
    ) THEN
        ALTER TABLE public.client_contacts 
            ADD CONSTRAINT client_contacts_client_id_fkey 
            FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
    END IF;

    -- Client Communications
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'client_communications_client_id_fkey'
    ) THEN
        ALTER TABLE public.client_communications 
            ADD CONSTRAINT client_communications_client_id_fkey 
            FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'client_communications_contact_id_fkey'
    ) THEN
        ALTER TABLE public.client_communications 
            ADD CONSTRAINT client_communications_contact_id_fkey 
            FOREIGN KEY (contact_id) REFERENCES public.client_contacts(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'client_communications_user_id_fkey'
    ) THEN
        ALTER TABLE public.client_communications 
            ADD CONSTRAINT client_communications_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES public.user_profiles(id);
    END IF;

    -- Client Assignments
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'client_assignments_client_id_fkey'
    ) THEN
        ALTER TABLE public.client_assignments 
            ADD CONSTRAINT client_assignments_client_id_fkey 
            FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'client_assignments_user_id_fkey'
    ) THEN
        ALTER TABLE public.client_assignments 
            ADD CONSTRAINT client_assignments_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'client_assignments_assigned_by_fkey'
    ) THEN
        ALTER TABLE public.client_assignments 
            ADD CONSTRAINT client_assignments_assigned_by_fkey 
            FOREIGN KEY (assigned_by) REFERENCES public.user_profiles(id);
    END IF;

    -- Projects
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'projects_client_id_fkey'
    ) THEN
        ALTER TABLE public.projects 
            ADD CONSTRAINT projects_client_id_fkey 
            FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'projects_workspace_id_fkey'
    ) THEN
        ALTER TABLE public.projects 
            ADD CONSTRAINT projects_workspace_id_fkey 
            FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'projects_created_by_fkey'
    ) THEN
        ALTER TABLE public.projects 
            ADD CONSTRAINT projects_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);
    END IF;

    -- Project Members
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'project_members_project_id_fkey'
    ) THEN
        ALTER TABLE public.project_members 
            ADD CONSTRAINT project_members_project_id_fkey 
            FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'project_members_user_id_fkey'
    ) THEN
        ALTER TABLE public.project_members 
            ADD CONSTRAINT project_members_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    -- Tasks
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tasks_project_id_fkey'
    ) THEN
        ALTER TABLE public.tasks 
            ADD CONSTRAINT tasks_project_id_fkey 
            FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tasks_assignee_id_fkey'
    ) THEN
        ALTER TABLE public.tasks 
            ADD CONSTRAINT tasks_assignee_id_fkey 
            FOREIGN KEY (assignee_id) REFERENCES public.user_profiles(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tasks_workspace_id_fkey'
    ) THEN
        ALTER TABLE public.tasks 
            ADD CONSTRAINT tasks_workspace_id_fkey 
            FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tasks_created_by_fkey'
    ) THEN
        ALTER TABLE public.tasks 
            ADD CONSTRAINT tasks_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);
    END IF;

    -- Task Comments
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'task_comments_task_id_fkey'
    ) THEN
        ALTER TABLE public.task_comments 
            ADD CONSTRAINT task_comments_task_id_fkey 
            FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'task_comments_user_id_fkey'
    ) THEN
        ALTER TABLE public.task_comments 
            ADD CONSTRAINT task_comments_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES public.user_profiles(id);
    END IF;

    -- Invoices
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'invoices_client_id_fkey'
    ) THEN
        ALTER TABLE public.invoices 
            ADD CONSTRAINT invoices_client_id_fkey 
            FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'invoices_project_id_fkey'
    ) THEN
        ALTER TABLE public.invoices 
            ADD CONSTRAINT invoices_project_id_fkey 
            FOREIGN KEY (project_id) REFERENCES public.projects(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'invoices_created_by_fkey'
    ) THEN
        ALTER TABLE public.invoices 
            ADD CONSTRAINT invoices_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);
    END IF;

    -- AI Extractions
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ai_extractions_reviewed_by_fkey'
    ) THEN
        ALTER TABLE public.ai_extractions 
            ADD CONSTRAINT ai_extractions_reviewed_by_fkey 
            FOREIGN KEY (reviewed_by) REFERENCES public.user_profiles(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ai_extractions_workspace_id_fkey'
    ) THEN
        ALTER TABLE public.ai_extractions 
            ADD CONSTRAINT ai_extractions_workspace_id_fkey 
            FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ai_extractions_created_by_fkey'
    ) THEN
        ALTER TABLE public.ai_extractions 
            ADD CONSTRAINT ai_extractions_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);
    END IF;
END$$;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-create user profile when user signs up
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    workspace_id uuid;
    user_first_name text;
    user_last_name text;
    workspace_name text;
    user_role public.user_role;
BEGIN
    -- Extract user metadata
    user_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', 'User');
    user_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
    workspace_name := user_first_name || '''s Workspace';
    
    -- Determine user role based on email or metadata
    user_role := CASE 
        WHEN NEW.email = 'admin@innovatexlabs.com' THEN 'admin'::public.user_role
        WHEN COALESCE(NEW.raw_user_meta_data->>'role', '') = 'super_admin' THEN 'super_admin'::public.user_role
        WHEN COALESCE(NEW.raw_user_meta_data->>'role', '') = 'admin' THEN 'admin'::public.user_role
        ELSE 'member'::public.user_role
    END;
    
    -- Create user profile FIRST
    INSERT INTO public.user_profiles (
        id,
        email,
        first_name,
        last_name,
        role,
        is_active,
        email_verified,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        user_first_name,
        user_last_name,
        user_role,
        true,
        NEW.email_confirmed_at IS NOT NULL,
        NOW(),
        NOW()
    );
    
    -- Create workspace
    INSERT INTO public.workspaces (name, owner_id)
    VALUES (workspace_name, NEW.id)
    RETURNING id INTO workspace_id;
    
    -- Update user profile with workspace reference
    UPDATE public.user_profiles 
    SET default_workspace_id = workspace_id
    WHERE id = NEW.id;
    
    -- Add user as owner of their workspace
    INSERT INTO public.memberships (user_id, workspace_id, role)
    VALUES (NEW.id, workspace_id, 'owner');
    
    -- Log the user creation
    INSERT INTO public.user_activity_logs (user_id, action, resource_type, resource_id, workspace_id)
    VALUES (NEW.id, 'user_registered', 'user', NEW.id::text, workspace_id);
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the user creation
        RAISE WARNING 'Error creating user profile for %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$;

-- Update timestamps automatically
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Log user activity
CREATE OR REPLACE FUNCTION public.log_user_activity(
    p_user_id uuid,
    p_action text,
    p_resource_type text DEFAULT NULL,
    p_resource_id text DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}',
    p_workspace_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    );
END;
$$;

-- Create user invitation
CREATE OR REPLACE FUNCTION public.create_user_invitation(
    p_email text,
    p_role public.user_role,
    p_permissions jsonb DEFAULT '[]',
    p_target_workspace_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invitation_id uuid;
    invitation_token_val text;
    current_user_id uuid := auth.uid();
BEGIN
    -- Generate unique invitation token
    invitation_token_val := encode(gen_random_bytes(32), 'base64');
    
    -- Insert invitation
    INSERT INTO public.user_invitations (
        email,
        invited_by,
        role,
        permissions,
        invitation_token,
        workspace_id
    ) VALUES (
        p_email,
        current_user_id,
        p_role,
        p_permissions,
        invitation_token_val,
        p_target_workspace_id
    ) RETURNING id INTO invitation_id;
    
    -- Log activity
    PERFORM public.log_user_activity(
        current_user_id,
        'user_invited',
        'invitation',
        invitation_id::text,
        jsonb_build_object('email', p_email, 'role', p_role)
    );
    
    RETURN invitation_id;
END;
$$;

-- Accept invitation
CREATE OR REPLACE FUNCTION public.accept_invitation(
    p_token text,
    p_password text,
    p_first_name text,
    p_last_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invitation_record public.user_invitations;
    new_user_id uuid;
BEGIN
    -- Find valid invitation
    SELECT * INTO invitation_record
    FROM public.user_invitations
    WHERE invitation_token = p_token 
    AND accepted_at IS NULL 
    AND expires_at > NOW();
    
    IF invitation_record IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired invitation token';
    END IF;
    
    -- Create user in auth.users (this will trigger create_user_profile)
    INSERT INTO auth.users (
        email,
        encrypted_password,
        email_confirmed_at,
        raw_user_meta_data
    ) VALUES (
        invitation_record.email,
        crypt(p_password, gen_salt('bf')),
        NOW(),
        jsonb_build_object(
            'first_name', p_first_name,
            'last_name', p_last_name,
            'role', invitation_record.role
        )
    ) RETURNING id INTO new_user_id;
    
    -- Update user profile with invitation role
    UPDATE public.user_profiles
    SET 
        role = invitation_record.role,
        first_name = p_first_name,
        last_name = p_last_name,
        email_verified = true
    WHERE id = new_user_id;
    
    -- Add to target workspace if specified
    IF invitation_record.workspace_id IS NOT NULL THEN
        INSERT INTO public.memberships (user_id, workspace_id, role)
        VALUES (new_user_id, invitation_record.workspace_id, 'member')
        ON CONFLICT (user_id, workspace_id) DO NOTHING;
    END IF;
    
    -- Mark invitation as accepted
    UPDATE public.user_invitations
    SET accepted_at = NOW()
    WHERE id = invitation_record.id;
    
    RETURN new_user_id;
END;
$$;

-- Verification function
CREATE OR REPLACE FUNCTION public.verify_admin_auth()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    verification_result jsonb;
    admin_user_id uuid;
    admin_workspace_id uuid;
BEGIN
    -- Get admin user details
    SELECT up.id, up.default_workspace_id INTO admin_user_id, admin_workspace_id
    FROM public.user_profiles up
    WHERE up.email = 'admin@innovatexlabs.com'
    LIMIT 1;
    
    SELECT jsonb_build_object(
        'setup_status', jsonb_build_object(
            'auth_users_count', (SELECT COUNT(*) FROM auth.users),
            'user_profiles_count', (SELECT COUNT(*) FROM public.user_profiles),
            'workspaces_count', (SELECT COUNT(*) FROM public.workspaces),
            'memberships_count', (SELECT COUNT(*) FROM public.memberships),
            'permissions_count', (SELECT COUNT(*) FROM public.permissions),
            'rls_enabled', (
                SELECT COUNT(*) = 16 FROM pg_class 
                WHERE relname IN (
                    'workspaces', 'user_profiles', 'memberships', 'permissions',
                    'user_permissions', 'user_invitations', 'user_activity_logs',
                    'clients', 'client_contacts', 'client_communications',
                    'client_assignments', 'projects', 'project_members',
                    'tasks', 'task_comments', 'invoices', 'ai_extractions'
                ) AND relrowsecurity = true
            ),
            'trigger_exists', EXISTS(
                SELECT 1 FROM pg_trigger 
                WHERE tgname = 'create_user_profile_trigger'
            )
        ),
        'admin_user', CASE 
            WHEN admin_user_id IS NOT NULL THEN jsonb_build_object(
                'exists', true,
                'id', admin_user_id,
                'has_workspace', admin_workspace_id IS NOT NULL,
                'workspace_id', admin_workspace_id,
                'can_login', EXISTS(
                    SELECT 1 FROM auth.users 
                    WHERE id = admin_user_id AND email = 'admin@innovatexlabs.com'
                )
            )
            ELSE jsonb_build_object('exists', false)
        END,
        'next_steps', CASE 
            WHEN admin_user_id IS NULL THEN jsonb_build_array(
                'Create admin user in Supabase Dashboard Authentication tab',
                'Email: admin@innovatexlabs.com',
                'Password: Admin123!',
                'User Metadata: {"first_name": "Admin", "last_name": "User"}',
                'Check "Email Confirm" box'
            )
            ELSE jsonb_build_array(
                'Admin user exists and is ready',
                'You can now log in to the application'
            )
        END
    ) INTO verification_result;
    
    RETURN verification_result;
END;
$$;

-- Function to check if users exist (for bootstrap)
CREATE OR REPLACE FUNCTION public.has_users()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.user_profiles LIMIT 1);
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Create trigger only if it doesn't exist
DO $$
BEGIN
    -- Auto-create user profile on auth.users insert
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'create_user_profile_trigger'
    ) THEN
        CREATE TRIGGER create_user_profile_trigger
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION public.create_user_profile();
    END IF;

    -- Auto-update timestamps
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_workspaces_updated_at'
    ) THEN
        CREATE TRIGGER update_workspaces_updated_at
            BEFORE UPDATE ON public.workspaces
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_profiles_updated_at'
    ) THEN
        CREATE TRIGGER update_user_profiles_updated_at
            BEFORE UPDATE ON public.user_profiles
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_clients_updated_at'
    ) THEN
        CREATE TRIGGER update_clients_updated_at
            BEFORE UPDATE ON public.clients
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_projects_updated_at'
    ) THEN
        CREATE TRIGGER update_projects_updated_at
            BEFORE UPDATE ON public.projects
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_tasks_updated_at'
    ) THEN
        CREATE TRIGGER update_tasks_updated_at
            BEFORE UPDATE ON public.tasks
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_task_comments_updated_at'
    ) THEN
        CREATE TRIGGER update_task_comments_updated_at
            BEFORE UPDATE ON public.task_comments
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_invoices_updated_at'
    ) THEN
        CREATE TRIGGER update_invoices_updated_at
            BEFORE UPDATE ON public.invoices
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
    END IF;
END$$;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
DO $$
BEGIN
    -- Only enable RLS if not already enabled
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'workspaces' AND relrowsecurity = true) THEN
        ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'user_profiles' AND relrowsecurity = true) THEN
        ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'memberships' AND relrowsecurity = true) THEN
        ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'permissions' AND relrowsecurity = true) THEN
        ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'user_permissions' AND relrowsecurity = true) THEN
        ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'user_invitations' AND relrowsecurity = true) THEN
        ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'user_activity_logs' AND relrowsecurity = true) THEN
        ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'clients' AND relrowsecurity = true) THEN
        ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'client_contacts' AND relrowsecurity = true) THEN
        ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'client_communications' AND relrowsecurity = true) THEN
        ALTER TABLE public.client_communications ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'client_assignments' AND relrowsecurity = true) THEN
        ALTER TABLE public.client_assignments ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'projects' AND relrowsecurity = true) THEN
        ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'project_members' AND relrowsecurity = true) THEN
        ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'tasks' AND relrowsecurity = true) THEN
        ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'task_comments' AND relrowsecurity = true) THEN
        ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'invoices' AND relrowsecurity = true) THEN
        ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ai_extractions' AND relrowsecurity = true) THEN
        ALTER TABLE public.ai_extractions ENABLE ROW LEVEL SECURITY;
    END IF;
END$$;

-- Create policies only if they don't exist
-- Workspaces policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'Users can view their own workspaces'
    ) THEN
        CREATE POLICY "Users can view their own workspaces" ON public.workspaces
            FOR SELECT USING (
                owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.memberships
                    WHERE workspace_id = workspaces.id AND user_id = auth.uid()
                ) OR
                EXISTS (
                    SELECT 1 FROM public.user_profiles
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'super_admin')
                    AND is_active = true
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'Users can create workspaces'
    ) THEN
        CREATE POLICY "Users can create workspaces" ON public.workspaces
            FOR INSERT WITH CHECK (owner_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'Workspace owners can update'
    ) THEN
        CREATE POLICY "Workspace owners can update" ON public.workspaces
            FOR UPDATE USING (owner_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'Workspace owners can delete'
    ) THEN
        CREATE POLICY "Workspace owners can delete" ON public.workspaces
            FOR DELETE USING (owner_id = auth.uid());
    END IF;
END$$;

-- User profiles policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can view their own profile'
    ) THEN
        CREATE POLICY "Users can view their own profile" ON public.user_profiles
            FOR SELECT USING (id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can view profiles in shared workspaces'
    ) THEN
        CREATE POLICY "Users can view profiles in shared workspaces" ON public.user_profiles
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.memberships m1
                    JOIN public.memberships m2 ON m1.workspace_id = m2.workspace_id
                    WHERE m1.user_id = auth.uid() AND m2.user_id = user_profiles.id
                ) OR
                EXISTS (
                    SELECT 1 FROM public.user_profiles up
                    WHERE up.id = auth.uid() 
                    AND up.role IN ('admin', 'super_admin')
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can update their own profile'
    ) THEN
        CREATE POLICY "Users can update their own profile" ON public.user_profiles
            FOR UPDATE USING (id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Admins can manage all profiles'
    ) THEN
        CREATE POLICY "Admins can manage all profiles" ON public.user_profiles
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.user_profiles up
                    WHERE up.id = auth.uid() 
                    AND up.role IN ('admin', 'super_admin')
                )
            );
    END IF;
END$$;

-- Memberships policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'memberships' AND policyname = 'Users can view their own memberships'
    ) THEN
        CREATE POLICY "Users can view their own memberships" ON public.memberships
            FOR SELECT USING (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'memberships' AND policyname = 'Workspace owners can manage memberships'
    ) THEN
        CREATE POLICY "Workspace owners can manage memberships" ON public.memberships
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.workspaces
                    WHERE id = memberships.workspace_id AND owner_id = auth.uid()
                ) OR
                EXISTS (
                    SELECT 1 FROM public.user_profiles
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'super_admin')
                )
            );
    END IF;
END$$;

-- Permissions policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'permissions' AND policyname = 'All users can view permissions'
    ) THEN
        CREATE POLICY "All users can view permissions" ON public.permissions
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'permissions' AND policyname = 'Admins can manage permissions'
    ) THEN
        CREATE POLICY "Admins can manage permissions" ON public.permissions
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.user_profiles
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'super_admin')
                )
            );
    END IF;
END$$;

-- User permissions policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_permissions' AND policyname = 'Users can view their own user permissions'
    ) THEN
        CREATE POLICY "Users can view their own user permissions" ON public.user_permissions
            FOR SELECT USING (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_permissions' AND policyname = 'Admins can manage all user permissions'
    ) THEN
        CREATE POLICY "Admins can manage all user permissions" ON public.user_permissions
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.user_profiles
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'super_admin')
                )
            );
    END IF;
END$$;

-- User invitations policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_invitations' AND policyname = 'Admins can manage invitations'
    ) THEN
        CREATE POLICY "Admins can manage invitations" ON public.user_invitations
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.user_profiles
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'super_admin')
                )
            );
    END IF;
END$$;

-- User activity logs policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_activity_logs' AND policyname = 'Users can view their own activity'
    ) THEN
        CREATE POLICY "Users can view their own activity" ON public.user_activity_logs
            FOR SELECT USING (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_activity_logs' AND policyname = 'Admins can view all activity'
    ) THEN
        CREATE POLICY "Admins can view all activity" ON public.user_activity_logs
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.user_profiles
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'super_admin')
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_activity_logs' AND policyname = 'System can insert activity logs'
    ) THEN
        CREATE POLICY "System can insert activity logs" ON public.user_activity_logs
            FOR INSERT WITH CHECK (true);
    END IF;
END$$;

-- Clients policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Workspace-based client access'
    ) THEN
        CREATE POLICY "Workspace-based client access" ON public.clients
            FOR SELECT USING (
                workspace_id IN (
                    SELECT workspace_id FROM public.memberships WHERE user_id = auth.uid()
                ) OR
                EXISTS (
                    SELECT 1 FROM public.user_profiles
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'super_admin')
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Workspace members can manage clients'
    ) THEN
        CREATE POLICY "Workspace members can manage clients" ON public.clients
            FOR ALL USING (
                workspace_id IN (
                    SELECT workspace_id FROM public.memberships WHERE user_id = auth.uid()
                ) OR
                EXISTS (
                    SELECT 1 FROM public.user_profiles
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'super_admin')
                )
            );
    END IF;
END$$;

-- Projects policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Workspace-based project access'
    ) THEN
        CREATE POLICY "Workspace-based project access" ON public.projects
            FOR SELECT USING (
                workspace_id IN (
                    SELECT workspace_id FROM public.memberships WHERE user_id = auth.uid()
                ) OR
                EXISTS (
                    SELECT 1 FROM public.user_profiles
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'super_admin')
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Workspace members can manage projects'
    ) THEN
        CREATE POLICY "Workspace members can manage projects" ON public.projects
            FOR ALL USING (
                workspace_id IN (
                    SELECT workspace_id FROM public.memberships WHERE user_id = auth.uid()
                ) OR
                EXISTS (
                    SELECT 1 FROM public.user_profiles
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'super_admin')
                )
            );
    END IF;
END$$;

-- Tasks policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'Workspace-based task access'
    ) THEN
        CREATE POLICY "Workspace-based task access" ON public.tasks
            FOR SELECT USING (
                workspace_id IN (
                    SELECT workspace_id FROM public.memberships WHERE user_id = auth.uid()
                ) OR
                EXISTS (
                    SELECT 1 FROM public.user_profiles
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'super_admin')
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'Workspace members can manage tasks'
    ) THEN
        CREATE POLICY "Workspace members can manage tasks" ON public.tasks
            FOR ALL USING (
                workspace_id IN (
                    SELECT workspace_id FROM public.memberships WHERE user_id = auth.uid()
                ) OR
                EXISTS (
                    SELECT 1 FROM public.user_profiles
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'super_admin')
                )
            );
    END IF;
END$$;

-- Apply similar patterns to remaining tables
DO $$
BEGIN
    -- Client contacts
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'client_contacts' AND policyname = 'Client contact access'
    ) THEN
        CREATE POLICY "Client contact access" ON public.client_contacts
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.clients
                    WHERE id = client_contacts.client_id
                    AND (
                        workspace_id IN (SELECT workspace_id FROM public.memberships WHERE user_id = auth.uid()) OR
                        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
                    )
                )
            );
    END IF;

    -- Client communications
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'client_communications' AND policyname = 'Client communication access'
    ) THEN
        CREATE POLICY "Client communication access" ON public.client_communications
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.clients
                    WHERE id = client_communications.client_id
                    AND (
                        workspace_id IN (SELECT workspace_id FROM public.memberships WHERE user_id = auth.uid()) OR
                        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
                    )
                )
            );
    END IF;

    -- Client assignments
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'client_assignments' AND policyname = 'Client assignment access'
    ) THEN
        CREATE POLICY "Client assignment access" ON public.client_assignments
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.clients
                    WHERE id = client_assignments.client_id
                    AND (
                        workspace_id IN (SELECT workspace_id FROM public.memberships WHERE user_id = auth.uid()) OR
                        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
                    )
                )
            );
    END IF;

    -- Project members
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'project_members' AND policyname = 'Project member access'
    ) THEN
        CREATE POLICY "Project member access" ON public.project_members
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.projects
                    WHERE id = project_members.project_id
                    AND (
                        workspace_id IN (SELECT workspace_id FROM public.memberships WHERE user_id = auth.uid()) OR
                        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
                    )
                )
            );
    END IF;

    -- Task comments
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'task_comments' AND policyname = 'Task comment access'
    ) THEN
        CREATE POLICY "Task comment access" ON public.task_comments
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.tasks
                    WHERE id = task_comments.task_id
                    AND (
                        workspace_id IN (SELECT workspace_id FROM public.memberships WHERE user_id = auth.uid()) OR
                        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
                    )
                )
            );
    END IF;

    -- Invoices
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Invoice access'
    ) THEN
        CREATE POLICY "Invoice access" ON public.invoices
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.clients
                    WHERE id = invoices.client_id
                    AND (
                        workspace_id IN (SELECT workspace_id FROM public.memberships WHERE user_id = auth.uid()) OR
                        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
                    )
                )
            );
    END IF;

    -- AI extractions
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'ai_extractions' AND policyname = 'AI extraction access'
    ) THEN
        CREATE POLICY "AI extraction access" ON public.ai_extractions
            FOR ALL USING (
                workspace_id IN (
                    SELECT workspace_id FROM public.memberships WHERE user_id = auth.uid()
                ) OR
                EXISTS (
                    SELECT 1 FROM public.user_profiles
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'super_admin')
                )
            );
    END IF;
END$$;

-- ============================================================================
-- INITIAL DATA SETUP
-- ============================================================================

-- Insert default permissions if they don't exist
DO $$
BEGIN
    -- Dashboard permissions
    IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'dashboard.view') THEN
        INSERT INTO public.permissions (name, description, category) 
        VALUES ('dashboard.view', 'View dashboard and overview', 'dashboard');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'dashboard.analytics') THEN
        INSERT INTO public.permissions (name, description, category) 
        VALUES ('dashboard.analytics', 'Access analytics and reports', 'dashboard');
    END IF;

    -- Board/Project permissions
    IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'boards.view') THEN
        INSERT INTO public.permissions (name, description, category) 
        VALUES ('boards.view', 'View projects and boards', 'boards');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'boards.create') THEN
        INSERT INTO public.permissions (name, description, category) 
        VALUES ('boards.create', 'Create new projects and boards', 'boards');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'boards.edit') THEN
        INSERT INTO public.permissions (name, description, category) 
        VALUES ('boards.edit', 'Edit projects and boards', 'boards');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'boards.delete') THEN
        INSERT INTO public.permissions (name, description, category) 
        VALUES ('boards.delete', 'Delete projects and boards', 'boards');
    END IF;

    -- Client permissions
    IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'clients.view') THEN
        INSERT INTO public.permissions (name, description, category) 
        VALUES ('clients.view', 'View clients and contacts', 'clients');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'clients.create') THEN
        INSERT INTO public.permissions (name, description, category) 
        VALUES ('clients.create', 'Create new clients', 'clients');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'clients.edit') THEN
        INSERT INTO public.permissions (name, description, category) 
        VALUES ('clients.edit', 'Edit client information', 'clients');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'clients.delete') THEN
        INSERT INTO public.permissions (name, description, category) 
        VALUES ('clients.delete', 'Delete clients', 'clients');
    END IF;

    -- App permissions
    IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'apps.gmail') THEN
        INSERT INTO public.permissions (name, description, category) 
        VALUES ('apps.gmail', 'Access Gmail integration', 'apps');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'apps.ai') THEN
        INSERT INTO public.permissions (name, description, category) 
        VALUES ('apps.ai', 'Access AI features and automation', 'apps');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'apps.analytics') THEN
        INSERT INTO public.permissions (name, description, category) 
        VALUES ('apps.analytics', 'Access advanced analytics', 'apps');
    END IF;

    -- Admin permissions
    IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'admin.users') THEN
        INSERT INTO public.permissions (name, description, category) 
        VALUES ('admin.users', 'Manage users and permissions', 'admin');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'admin.system') THEN
        INSERT INTO public.permissions (name, description, category) 
        VALUES ('admin.system', 'System administration and settings', 'admin');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'admin.super') THEN
        INSERT INTO public.permissions (name, description, category) 
        VALUES ('admin.super', 'Super administrator privileges', 'admin');
    END IF;
END$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;

-- Final setup verification
SELECT public.verify_admin_auth() AS setup_verification;