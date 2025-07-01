-- This migration provides a comprehensive and idempotent setup for the Innovate X Labs CRM database schema,
-- including core authentication, multi-tenancy, CRM features, and updated RLS policies.
-- It is designed to be safely applied to a database in any state (empty or partially migrated).

-- ============================================================================
-- DROP PROBLEMATIC FUNCTIONS (if they exist)
-- ============================================================================

-- Drop the create_first_admin function as it's being replaced by client-side signUp
DROP FUNCTION IF EXISTS public.create_first_admin(text, text, text, text) CASCADE;

-- ============================================================================
-- ENUM TYPES (Created idempotently)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('super_admin', 'admin', 'member');
        RAISE NOTICE 'Created user_role enum';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_member_role') THEN
        CREATE TYPE public.workspace_member_role AS ENUM ('owner', 'admin', 'member');
        RAISE NOTICE 'Created workspace_member_role enum';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_status') THEN
        CREATE TYPE public.client_status AS ENUM ('active', 'inactive', 'prospect', 'archived');
        RAISE NOTICE 'Created client_status enum';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
        CREATE TYPE public.project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled');
        RAISE NOTICE 'Created project_status enum';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_priority') THEN
        CREATE TYPE public.project_priority AS ENUM ('low', 'medium', 'high', 'urgent');
        RAISE NOTICE 'Created project_priority enum';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'review', 'completed');
        RAISE NOTICE 'Created task_status enum';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
        CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
        RAISE NOTICE 'Created task_priority enum';
    END IF;

    -- Additional enum types
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'permission_category') THEN
        CREATE TYPE public.permission_category AS ENUM ('dashboard', 'boards', 'clients', 'apps', 'admin');
        RAISE NOTICE 'Created permission_category enum';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_size') THEN
        CREATE TYPE public.company_size AS ENUM ('startup', 'small', 'medium', 'large', 'enterprise');
        RAISE NOTICE 'Created company_size enum';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_member_role') THEN
        CREATE TYPE public.project_member_role AS ENUM ('owner', 'manager', 'member', 'viewer');
        RAISE NOTICE 'Created project_member_role enum';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_type') THEN
        CREATE TYPE public.communication_type AS ENUM ('email', 'call', 'meeting', 'note');
        RAISE NOTICE 'Created communication_type enum';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_direction') THEN
        CREATE TYPE public.communication_direction AS ENUM ('inbound', 'outbound');
        RAISE NOTICE 'Created communication_direction enum';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
        RAISE NOTICE 'Created invoice_status enum';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extraction_source_type') THEN
        CREATE TYPE public.extraction_source_type AS ENUM ('email', 'document', 'pdf', 'image', 'text');
        RAISE NOTICE 'Created extraction_source_type enum';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extraction_entity_type') THEN
        CREATE TYPE public.extraction_entity_type AS ENUM ('client', 'project', 'cost', 'contact', 'task');
        RAISE NOTICE 'Created extraction_entity_type enum';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extraction_status') THEN
        CREATE TYPE public.extraction_status AS ENUM ('pending', 'approved', 'rejected', 'auto_applied');
        RAISE NOTICE 'Created extraction_status enum';
    END IF;
END $$;

-- ============================================================================
-- CORE TABLES (Created idempotently)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspaces') THEN
        CREATE TABLE public.workspaces (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            name text NOT NULL,
            owner_id uuid NOT NULL,
            settings jsonb DEFAULT '{}',
            created_at timestamptz DEFAULT now() NOT NULL,
            updated_at timestamptz DEFAULT now() NOT NULL
        );
        RAISE NOTICE 'Created workspaces table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
        CREATE TABLE public.user_profiles (
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
        RAISE NOTICE 'Created user_profiles table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'memberships') THEN
        CREATE TABLE public.memberships (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id uuid NOT NULL,
            workspace_id uuid NOT NULL,
            role public.workspace_member_role DEFAULT 'member' NOT NULL,
            joined_at timestamptz DEFAULT now() NOT NULL,
            UNIQUE(user_id, workspace_id)
        );
        RAISE NOTICE 'Created memberships table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permissions') THEN
        CREATE TABLE public.permissions (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            name text UNIQUE NOT NULL,
            description text NOT NULL,
            category public.permission_category NOT NULL,
            created_at timestamptz DEFAULT now() NOT NULL
        );
        RAISE NOTICE 'Created permissions table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_permissions') THEN
        CREATE TABLE public.user_permissions (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id uuid NOT NULL,
            permission_id uuid NOT NULL,
            granted_by uuid,
            granted_at timestamptz DEFAULT now() NOT NULL,
            UNIQUE(user_id, permission_id)
        );
        RAISE NOTICE 'Created user_permissions table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_invitations') THEN
        CREATE TABLE public.user_invitations (
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
        RAISE NOTICE 'Created user_invitations table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_activity_logs') THEN
        CREATE TABLE public.user_activity_logs (
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
        RAISE NOTICE 'Created user_activity_logs table';
    END IF;
END $$;

-- ============================================================================
-- CRM TABLES (Created idempotently)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clients') THEN
        CREATE TABLE public.clients (
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
        RAISE NOTICE 'Created clients table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_contacts') THEN
        CREATE TABLE public.client_contacts (
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
        RAISE NOTICE 'Created client_contacts table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_communications') THEN
        CREATE TABLE public.client_communications (
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
        RAISE NOTICE 'Created client_communications table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_assignments') THEN
        CREATE TABLE public.client_assignments (
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
        RAISE NOTICE 'Created client_assignments table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
        CREATE TABLE public.projects (
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
        RAISE NOTICE 'Created projects table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_members') THEN
        CREATE TABLE public.project_members (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            project_id uuid NOT NULL,
            user_id uuid NOT NULL,
            role public.project_member_role DEFAULT 'member' NOT NULL,
            hourly_rate numeric,
            joined_at timestamptz DEFAULT now() NOT NULL,
            UNIQUE(project_id, user_id)
        );
        RAISE NOTICE 'Created project_members table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        CREATE TABLE public.tasks (
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
        RAISE NOTICE 'Created tasks table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_comments') THEN
        CREATE TABLE public.task_comments (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            task_id uuid NOT NULL,
            user_id uuid NOT NULL,
            content text NOT NULL,
            attachments jsonb DEFAULT '[]',
            created_at timestamptz DEFAULT now() NOT NULL,
            updated_at timestamptz DEFAULT now() NOT NULL
        );
        RAISE NOTICE 'Created task_comments table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
        CREATE TABLE public.invoices (
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
        RAISE NOTICE 'Created invoices table';
    END IF;
END $$;

-- ============================================================================
-- AI & AUTOMATION TABLES (Created idempotently)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_extractions') THEN
        CREATE TABLE public.ai_extractions (
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
        RAISE NOTICE 'Created ai_extractions table';
    END IF;
END $$;

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS (Added idempotently)
-- ============================================================================

DO $$
BEGIN
    -- Workspaces
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'workspaces_owner_id_fkey') THEN
        ALTER TABLE public.workspaces ADD CONSTRAINT workspaces_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.user_profiles(id);
        RAISE NOTICE 'Added workspaces_owner_id_fkey';
    END IF;

    -- User Profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_profiles_id_fkey') THEN
        ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added user_profiles_id_fkey';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_profiles_default_workspace_id_fkey') THEN
        ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_default_workspace_id_fkey FOREIGN KEY (default_workspace_id) REFERENCES public.workspaces(id);
        RAISE NOTICE 'Added user_profiles_default_workspace_id_fkey';
    END IF;

    -- Memberships
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'memberships_user_id_fkey') THEN
        ALTER TABLE public.memberships ADD CONSTRAINT memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added memberships_user_id_fkey';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'memberships_workspace_id_fkey') THEN
        ALTER TABLE public.memberships ADD CONSTRAINT memberships_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added memberships_workspace_id_fkey';
    END IF;

    -- User Permissions
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_permissions_user_id_fkey') THEN
        ALTER TABLE public.user_permissions ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added user_permissions_user_id_fkey';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_permissions_permission_id_fkey') THEN
        ALTER TABLE public.user_permissions ADD CONSTRAINT user_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added user_permissions_permission_id_fkey';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_permissions_granted_by_fkey') THEN
        ALTER TABLE public.user_permissions ADD CONSTRAINT user_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.user_profiles(id);
        RAISE NOTICE 'Added user_permissions_granted_by_fkey';
    END IF;

    -- User Invitations
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_invitations_invited_by_fkey') THEN
        ALTER TABLE public.user_invitations ADD CONSTRAINT user_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.user_profiles(id);
        RAISE NOTICE 'Added user_invitations_invited_by_fkey';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_invitations_workspace_id_fkey') THEN
        ALTER TABLE public.user_invitations ADD CONSTRAINT user_invitations_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);
        RAISE NOTICE 'Added user_invitations_workspace_id_fkey';
    END IF;

    -- User Activity Logs
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_activity_logs_user_id_fkey') THEN
        ALTER TABLE public.user_activity_logs ADD CONSTRAINT user_activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added user_activity_logs_user_id_fkey';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_activity_logs_workspace_id_fkey') THEN
        ALTER TABLE public.user_activity_logs ADD CONSTRAINT user_activity_logs_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);
        RAISE NOTICE 'Added user_activity_logs_workspace_id_fkey';
    END IF;

    -- Clients
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'clients_assigned_to_fkey') THEN
        ALTER TABLE public.clients ADD CONSTRAINT clients_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.user_profiles(id);
        RAISE NOTICE 'Added clients_assigned_to_fkey';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'clients_workspace_id_fkey') THEN
        ALTER TABLE public.clients ADD CONSTRAINT clients_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);
        RAISE NOTICE 'Added clients_workspace_id_fkey';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'clients_created_by_fkey') THEN
        ALTER TABLE public.clients ADD CONSTRAINT clients_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);
        RAISE NOTICE 'Added clients_created_by_fkey';
    END IF;

    -- Client Contacts
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'client_contacts_client_id_fkey') THEN
        ALTER TABLE public.client_contacts ADD CONSTRAINT client_contacts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added client_contacts_client_id_fkey';
    END IF;

    -- Client Communications
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'client_communications_client_id_fkey') THEN
        ALTER TABLE public.client_communications ADD CONSTRAINT client_communications_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added client_communications_client_id_fkey';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'client_communications_contact_id_fkey') THEN
        ALTER TABLE public.client_communications ADD CONSTRAINT client_communications_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.client_contacts(id);
        RAISE NOTICE 'Added client_communications_contact_id_fkey';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'client_communications_user_id_fkey') THEN
        ALTER TABLE public.client_communications ADD CONSTRAINT client_communications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id);
        RAISE NOTICE 'Added client_communications_user_id_fkey';
    END IF;

    -- Client Assignments
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'client_assignments_client_id_fkey') THEN
        ALTER TABLE public.client_assignments ADD CONSTRAINT client_assignments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added client_assignments_client_id_fkey';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'client_assignments_user_id_fkey') THEN
        ALTER TABLE public.client_assignments ADD CONSTRAINT client_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added client_assignments_user_id_fkey';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'client_assignments_assigned_by_fkey') THEN
        ALTER TABLE public.client_assignments ADD CONSTRAINT client_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.user_profiles(id);
        RAISE NOTICE 'Added client_assignments_assigned_by_fkey';
    END IF;

    -- Projects
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'projects_client_id_fkey') THEN
        ALTER TABLE public.projects ADD CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added projects_client_id_fkey';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'projects_workspace_id_fkey') THEN
        ALTER TABLE public.projects ADD CONSTRAINT projects_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);
        RAISE NOTICE 'Added projects_workspace_id_fkey';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'projects_created_by_fkey') THEN
        ALTER TABLE public.projects ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);
        RAISE NOTICE 'Added projects_created_by_fkey';
    END IF;

    -- Project Members
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'project_members_project_id_fkey') THEN
        ALTER TABLE public.project_members ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added project_members_project_id_fkey';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'project_members_user_id_fkey') THEN
        ALTER TABLE public.project_members ADD CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added project_members_user_id_fkey';
    END IF;

    -- Tasks
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tasks_project_id_fkey') THEN
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added tasks_project_id_fkey';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tasks_assignee_id_fkey') THEN
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.user_profiles(id);
        RAISE NOTICE 'Added tasks_assignee_id_fkey';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tasks_workspace_id_fkey') THEN
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);
        RAISE NOTICE 'Added tasks_workspace_id_fkey';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tasks_created_by_fkey') THEN
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);
        RAISE NOTICE 'Added tasks_created_by_fkey';
    END IF;

    -- Task Comments
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'task_comments_task_id_fkey') THEN
        ALTER TABLE public.task_comments ADD CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added task_comments_task_id_fkey';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'task_comments_user_id_fkey') THEN
        ALTER TABLE public.task_comments ADD CONSTRAINT task_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id);
        RAISE NOTICE 'Added task_comments_user_id_fkey';
    END IF;

    -- Invoices
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'invoices_client_id_fkey') THEN
        ALTER TABLE public.invoices ADD CONSTRAINT invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added invoices_client_id_fkey';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'invoices_project_id_fkey') THEN
        ALTER TABLE public.invoices ADD CONSTRAINT invoices_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
        RAISE NOTICE 'Added invoices_project_id_fkey';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'invoices_created_by_fkey') THEN
        ALTER TABLE public.invoices ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);
        RAISE NOTICE 'Added invoices_created_by_fkey';
    END IF;

    -- AI Extractions
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ai_extractions_reviewed_by_fkey') THEN
        ALTER TABLE public.ai_extractions ADD CONSTRAINT ai_extractions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.user_profiles(id);
        RAISE NOTICE 'Added ai_extractions_reviewed_by_fkey';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ai_extractions_workspace_id_fkey') THEN
        ALTER TABLE public.ai_extractions ADD CONSTRAINT ai_extractions_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);
        RAISE NOTICE 'Added ai_extractions_workspace_id_fkey';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ai_extractions_created_by_fkey') THEN
        ALTER TABLE public.ai_extractions ADD CONSTRAINT ai_extractions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);
        RAISE NOTICE 'Added ai_extractions_created_by_fkey';
    END IF;
END $$;

-- ============================================================================
-- FUNCTIONS (Created or replaced)
-- ============================================================================

-- Auto-create user profile and workspace when user signs up
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
    
    -- Determine user role based on metadata passed during signup
    user_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'member'::public.user_role);
    
    workspace_name := user_first_name || '''s Workspace';
    
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
    
    -- Create a default workspace for the user
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

-- Check if any users exist (for bootstrap)
CREATE OR REPLACE FUNCTION public.has_users()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS(SELECT 1 FROM public.user_profiles LIMIT 1);
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
        jsonb_build_object('email', p_email, 'role', p_role),
        p_target_workspace_id -- Log in context of target workspace if specified
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
            'role', invitation_record.role -- Pass role from invitation to metadata
        )
    ) RETURNING id INTO new_user_id;
    
    -- Update user profile with invitation role and details (redundant if create_user_profile handles it, but safe)
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
    
    -- Apply custom permissions from invitation
    IF jsonb_array_length(invitation_record.permissions) > 0 THEN
        INSERT INTO public.user_permissions (user_id, permission_id, granted_by)
        SELECT new_user_id, p_id::uuid, invitation_record.invited_by
        FROM jsonb_array_elements_text(invitation_record.permissions) AS p_id
        ON CONFLICT (user_id, permission_id) DO NOTHING;
    END IF;
    
    -- Mark invitation as accepted
    UPDATE public.user_invitations
    SET accepted_at = NOW()
    WHERE id = invitation_record.id;
    
    -- Log activity
    PERFORM public.log_user_activity(
        new_user_id,
        'user_accepted_invitation',
        'invitation',
        invitation_record.id::text,
        jsonb_build_object('email', invitation_record.email, 'role', invitation_record.role),
        invitation_record.workspace_id
    );
    
    RETURN new_user_id;
END;
$$;

-- Update user permissions
CREATE OR REPLACE FUNCTION public.update_user_permissions(
    p_user_id uuid,
    p_permission_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid := auth.uid();
BEGIN
    -- Clear existing permissions for the user
    DELETE FROM public.user_permissions
    WHERE user_id = p_user_id;
    
    -- Insert new permissions
    IF array_length(p_permission_ids, 1) IS NOT NULL THEN
        INSERT INTO public.user_permissions (user_id, permission_id, granted_by)
        SELECT p_user_id, unnest(p_permission_ids), current_user_id;
    END IF;
    
    -- Log activity
    PERFORM public.log_user_activity(
        current_user_id,
        'user_permissions_updated',
        'user',
        p_user_id::text,
        jsonb_build_object('new_permissions', p_permission_ids)
    );
END;
$$;

-- ============================================================================
-- TRIGGERS (Created idempotently)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'create_user_profile_trigger') THEN
        CREATE TRIGGER create_user_profile_trigger
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION public.create_user_profile();
        RAISE NOTICE 'Created create_user_profile_trigger';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_workspaces_updated_at') THEN
        CREATE TRIGGER update_workspaces_updated_at
            BEFORE UPDATE ON public.workspaces
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
        RAISE NOTICE 'Created update_workspaces_updated_at trigger';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_profiles_updated_at') THEN
        CREATE TRIGGER update_user_profiles_updated_at
            BEFORE UPDATE ON public.user_profiles
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
        RAISE NOTICE 'Created update_user_profiles_updated_at trigger';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clients_updated_at') THEN
        CREATE TRIGGER update_clients_updated_at
            BEFORE UPDATE ON public.clients
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
        RAISE NOTICE 'Created update_clients_updated_at trigger';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_projects_updated_at') THEN
        CREATE TRIGGER update_projects_updated_at
            BEFORE UPDATE ON public.projects
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
        RAISE NOTICE 'Created update_projects_updated_at trigger';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tasks_updated_at') THEN
        CREATE TRIGGER update_tasks_updated_at
            BEFORE UPDATE ON public.tasks
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
        RAISE NOTICE 'Created update_tasks_updated_at trigger';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_task_comments_updated_at') THEN
        CREATE TRIGGER update_task_comments_updated_at
            BEFORE UPDATE ON public.task_comments
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
        RAISE NOTICE 'Created update_task_comments_updated_at trigger';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_invoices_updated_at') THEN
        CREATE TRIGGER update_invoices_updated_at
            BEFORE UPDATE ON public.invoices
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
        RAISE NOTICE 'Created update_invoices_updated_at trigger';
    END IF;
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES (Dropped and recreated for clarity and consistency)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
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

-- Drop all existing policies to ensure a clean slate before recreating
DO $$
DECLARE
    policy_name text;
    table_name text;
BEGIN
    FOR policy_name, table_name IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE FORMAT('DROP POLICY IF EXISTS "%s" ON public.%I;', policy_name, table_name);
        RAISE NOTICE 'Dropped policy "%" on table "%"', policy_name, table_name;
    END LOOP;
END $$;

-- Workspaces policies
CREATE POLICY "Users can view their own workspaces" ON public.workspaces
    FOR SELECT USING (
        owner_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE workspace_id = workspaces.id AND user_id = auth.uid()
        ) OR
        -- Admin/Super-admin bypass
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Users can create workspaces" ON public.workspaces
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Workspace owners can update" ON public.workspaces
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Workspace owners can delete" ON public.workspaces
    FOR DELETE USING (owner_id = auth.uid());

-- User profiles policies
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can view profiles in shared workspaces" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.memberships m1
            JOIN public.memberships m2 ON m1.workspace_id = m2.workspace_id
            WHERE m1.user_id = auth.uid() AND m2.user_id = user_profiles.id
        ) OR
        -- Admin/Super-admin bypass
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid() AND up.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can manage all profiles" ON public.user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid() AND up.role IN ('admin', 'super_admin')
        )
    );

-- Memberships policies
CREATE POLICY "Users can view their own memberships" ON public.memberships
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Workspace owners can manage memberships" ON public.memberships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspaces
            WHERE id = memberships.workspace_id AND owner_id = auth.uid()
        ) OR
        -- Admin/Super-admin bypass
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- Permissions policies
CREATE POLICY "All users can view permissions" ON public.permissions
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage permissions" ON public.permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- User permissions policies
CREATE POLICY "Users can view their own user permissions" ON public.user_permissions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all user permissions" ON public.user_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- User invitations policies
CREATE POLICY "Admins can manage invitations" ON public.user_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- User activity logs policies
CREATE POLICY "Users can view their own activity" ON public.user_activity_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all activity" ON public.user_activity_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "System can insert activity logs" ON public.user_activity_logs
    FOR INSERT WITH CHECK (true);

-- Clients policies
CREATE POLICY "Workspace-based client access" ON public.clients
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM public.memberships WHERE user_id = auth.uid()
        ) OR
        -- Admin/Super-admin bypass
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Workspace members can manage clients" ON public.clients
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM public.memberships WHERE user_id = auth.uid()
        ) OR
        -- Admin/Super-admin bypass
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- Client contacts policies
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

-- Client communications policies
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

-- Client assignments policies
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

-- Projects policies
CREATE POLICY "Workspace-based project access" ON public.projects
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM public.memberships WHERE user_id = auth.uid()
        ) OR
        -- Admin/Super-admin bypass
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Workspace members can manage projects" ON public.projects
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM public.memberships WHERE user_id = auth.uid()
        ) OR
        -- Admin/Super-admin bypass
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- Project members policies
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

-- Tasks policies
CREATE POLICY "Workspace-based task access" ON public.tasks
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM public.memberships WHERE user_id = auth.uid()
        ) OR
        -- Admin/Super-admin bypass
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Workspace members can manage tasks" ON public.tasks
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM public.memberships WHERE user_id = auth.uid()
        ) OR
        -- Admin/Super-admin bypass
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- Task comments policies
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

-- Invoices policies
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

-- AI extractions policies
CREATE POLICY "AI extraction access" ON public.ai_extractions
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM public.memberships WHERE user_id = auth.uid()
        ) OR
        -- Admin/Super-admin bypass
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- ============================================================================
-- INITIAL DATA SETUP (Inserted idempotently)
-- ============================================================================

-- Insert default permissions
INSERT INTO public.permissions (name, description, category) VALUES
('dashboard.view', 'View dashboard and overview', 'dashboard'),
('dashboard.analytics', 'Access analytics and reports', 'dashboard'),
('boards.view', 'View projects and boards', 'boards'),
('boards.create', 'Create new projects and boards', 'boards'),
('boards.edit', 'Edit projects and boards', 'boards'),
('boards.delete', 'Delete projects and boards', 'boards'),
('clients.view', 'View clients and contacts', 'clients'),
('clients.create', 'Create new clients', 'clients'),
('clients.edit', 'Edit client information', 'clients'),
('clients.delete', 'Delete clients', 'clients'),
('apps.gmail', 'Access Gmail integration', 'apps'),
('apps.ai', 'Access AI features and automation', 'apps'),
('apps.analytics', 'Access advanced analytics', 'apps'),
('admin.users', 'Manage users and permissions', 'admin'),
('admin.system', 'System administration and settings', 'admin'),
('admin.super', 'Super administrator privileges', 'admin')
ON CONFLICT (name) DO NOTHING; -- Prevents re-insertion on subsequent runs

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to authenticated and anon roles
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;

-- Grant service_role full access (for backend operations that bypass RLS)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================================================
-- VERIFICATION (for debugging and setup confirmation)
-- ============================================================================

-- Create verification function
CREATE OR REPLACE FUNCTION public.verify_setup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    setup_status jsonb;
BEGIN
    SELECT jsonb_build_object(
        'tables_created', (
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN (
                'workspaces', 'user_profiles', 'memberships', 'permissions', 'user_permissions',
                'user_invitations', 'user_activity_logs', 'clients', 'client_contacts',
                'client_communications', 'client_assignments', 'projects', 'project_members',
                'tasks', 'task_comments', 'invoices', 'ai_extractions'
            )
        ),
        'rls_enabled_tables', (
            SELECT COUNT(*) FROM pg_class
            WHERE relname IN (
                'workspaces', 'user_profiles', 'memberships', 'permissions', 'user_permissions',
                'user_invitations', 'user_activity_logs', 'clients', 'client_contacts',
                'client_communications', 'client_assignments', 'projects', 'project_members',
                'tasks', 'task_comments', 'invoices', 'ai_extractions'
            ) AND relrowsecurity = true
        ),
        'functions_created', (
            SELECT COUNT(*) FROM pg_proc
            WHERE proname IN (
                'create_user_profile', 'update_updated_at', 'has_users',
                'log_user_activity', 'create_user_invitation', 'accept_invitation',
                'update_user_permissions'
            )
        ),
        'triggers_created', (
            SELECT COUNT(*) FROM pg_trigger
            WHERE tgname LIKE '%user_profile%' OR tgname LIKE '%updated_at%'
        ),
        'permissions_seeded', (SELECT COUNT(*) FROM public.permissions),
        'has_users', public.has_users()
    ) INTO setup_status;

    RETURN setup_status;
END;
$$;

-- Run verification and show results
SELECT public.verify_setup() AS setup_verification;

-- Show current state
SELECT 'Database Setup Complete' as status,
       'Ready for admin user creation' as next_step;