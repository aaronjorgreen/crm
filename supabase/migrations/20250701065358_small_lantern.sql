/*
  # Complete CRM Database Schema
  
  This migration creates the complete database schema for the Innovate X Labs CRM platform.
  
  ## Tables Created:
  1. **user_profiles** - User account information and settings
  2. **workspaces** - Multi-tenant workspace organization
  3. **memberships** - User-workspace relationships
  4. **permissions** - System permissions catalog
  5. **user_permissions** - User-specific permission assignments
  6. **user_invitations** - Email invitation system
  7. **user_activity_logs** - Audit trail and activity tracking
  8. **clients** - Client/customer management
  9. **client_contacts** - Client contact information
  10. **client_communications** - Communication history
  11. **client_assignments** - AI-powered client assignments
  12. **projects** - Project management
  13. **project_members** - Project team membership
  14. **tasks** - Task management with kanban support
  15. **task_comments** - Task discussion threads
  16. **invoices** - Billing and invoicing
  17. **ai_extractions** - AI data extraction results
  
  ## Security Features:
  - Row Level Security (RLS) enabled on all tables
  - Role-based access control (super_admin, admin, member)
  - Workspace-based data isolation
  - Comprehensive audit logging
  
  ## Functions:
  - User profile creation triggers
  - Invitation management
  - Activity logging
  - Bootstrap checking
*/

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Create custom types
CREATE TYPE "public"."client_status" AS ENUM (
    'active',
    'inactive',
    'prospect',
    'archived'
);

CREATE TYPE "public"."communication_direction" AS ENUM (
    'inbound',
    'outbound'
);

CREATE TYPE "public"."communication_type" AS ENUM (
    'email',
    'call',
    'meeting',
    'note'
);

CREATE TYPE "public"."company_size" AS ENUM (
    'startup',
    'small',
    'medium',
    'large',
    'enterprise'
);

CREATE TYPE "public"."extraction_entity_type" AS ENUM (
    'client',
    'project',
    'cost',
    'contact',
    'task'
);

CREATE TYPE "public"."extraction_source_type" AS ENUM (
    'email',
    'document',
    'pdf',
    'image',
    'text'
);

CREATE TYPE "public"."extraction_status" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'auto_applied'
);

CREATE TYPE "public"."invoice_status" AS ENUM (
    'draft',
    'sent',
    'paid',
    'overdue',
    'cancelled'
);

CREATE TYPE "public"."permission_category" AS ENUM (
    'dashboard',
    'boards',
    'clients',
    'apps',
    'admin'
);

CREATE TYPE "public"."project_member_role" AS ENUM (
    'owner',
    'manager',
    'member',
    'viewer'
);

CREATE TYPE "public"."project_priority" AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);

CREATE TYPE "public"."project_status" AS ENUM (
    'planning',
    'active',
    'on_hold',
    'completed',
    'cancelled'
);

CREATE TYPE "public"."task_priority" AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);

CREATE TYPE "public"."task_status" AS ENUM (
    'todo',
    'in_progress',
    'review',
    'completed'
);

CREATE TYPE "public"."user_role" AS ENUM (
    'super_admin',
    'admin',
    'member'
);

CREATE TYPE "public"."workspace_member_role" AS ENUM (
    'owner',
    'admin',
    'member'
);

-- Create utility functions
CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create user profile creation trigger function
CREATE OR REPLACE FUNCTION "public"."create_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  new_workspace_id uuid;
  first text := coalesce(NEW.raw_user_meta->>'first_name', null);
  last text := coalesce(NEW.raw_user_meta->>'last_name', null);
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

-- Create bootstrap check function
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

-- Create activity logging function
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

-- Create invitation management functions
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

-- Create tables
CREATE TABLE IF NOT EXISTS "public"."workspaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'member'::"public"."user_role" NOT NULL,
    "avatar_url" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "email_verified" boolean DEFAULT false NOT NULL,
    "failed_login_attempts" integer DEFAULT 0 NOT NULL,
    "locked_until" timestamp with time zone,
    "last_login" timestamp with time zone,
    "last_activity" timestamp with time zone,
    "default_workspace_id" "uuid",
    "ai_preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "role" "public"."workspace_member_role" DEFAULT 'member'::"public"."workspace_member_role" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "category" "public"."permission_category" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."user_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "granted_by" "uuid",
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."user_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "role" "public"."user_role" DEFAULT 'member'::"public"."user_role" NOT NULL,
    "permissions" "jsonb" DEFAULT '[]'::"jsonb",
    "invitation_token" "text" NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "accepted_at" timestamp with time zone,
    "workspace_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."user_activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "resource_type" "text",
    "resource_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "workspace_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "website" "text",
    "industry" "text",
    "company_size" "public"."company_size",
    "address" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "public"."client_status" DEFAULT 'prospect'::"public"."client_status" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "notes" "text" DEFAULT ''::"text",
    "total_value" numeric DEFAULT 0,
    "last_contact_date" timestamp with time zone,
    "next_follow_up_date" timestamp with time zone,
    "assigned_to" "uuid",
    "workspace_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."client_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "role" "text",
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."client_communications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "type" "public"."communication_type" NOT NULL,
    "subject" "text" NOT NULL,
    "content" "text" NOT NULL,
    "direction" "public"."communication_direction" NOT NULL,
    "contact_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "scheduled_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."client_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "assigned_by" "uuid",
    "assignment_reason" "text",
    "ai_confidence" numeric,
    "workload_factor" numeric,
    "expertise_match" numeric,
    "is_active" boolean DEFAULT true NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "client_assignments_ai_confidence_check" CHECK ((("ai_confidence" >= (0)::numeric) AND ("ai_confidence" <= (1)::numeric)))
);

CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "client_id" "uuid",
    "status" "public"."project_status" DEFAULT 'planning'::"public"."project_status" NOT NULL,
    "priority" "public"."project_priority" DEFAULT 'medium'::"public"."project_priority" NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "estimated_hours" numeric DEFAULT 0,
    "actual_hours" numeric DEFAULT 0,
    "budget" numeric,
    "spent_budget" numeric DEFAULT 0,
    "progress" integer DEFAULT 0,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "workspace_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "projects_progress_check" CHECK ((("progress" >= 0) AND ("progress" <= 100)))
);

CREATE TABLE IF NOT EXISTS "public"."project_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."project_member_role" DEFAULT 'member'::"public"."project_member_role" NOT NULL,
    "hourly_rate" numeric,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "project_id" "uuid" NOT NULL,
    "assignee_id" "uuid",
    "status" "public"."task_status" DEFAULT 'todo'::"public"."task_status" NOT NULL,
    "priority" "public"."task_priority" DEFAULT 'medium'::"public"."task_priority" NOT NULL,
    "due_date" timestamp with time zone,
    "estimated_hours" numeric,
    "actual_hours" numeric DEFAULT 0,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "dependencies" "uuid"[] DEFAULT '{}'::"uuid"[],
    "position" integer DEFAULT 0,
    "workspace_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."task_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "invoice_number" "text" NOT NULL,
    "status" "public"."invoice_status" DEFAULT 'draft'::"public"."invoice_status" NOT NULL,
    "amount" numeric NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "issue_date" "date" NOT NULL,
    "due_date" "date" NOT NULL,
    "paid_date" "date",
    "items" "jsonb" DEFAULT '[]'::"jsonb",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."ai_extractions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_type" "public"."extraction_source_type" NOT NULL,
    "source_id" "text",
    "extracted_data" "jsonb" NOT NULL,
    "confidence_score" numeric,
    "entity_type" "public"."extraction_entity_type" NOT NULL,
    "entity_id" "uuid",
    "status" "public"."extraction_status" DEFAULT 'pending'::"public"."extraction_status" NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "workspace_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ai_extractions_confidence_score_check" CHECK ((("confidence_score" >= (0)::numeric) AND ("confidence_score" <= (1)::numeric)))
);

-- Add primary keys and constraints
ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_email_key" UNIQUE ("email");

ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_user_id_workspace_id_key" UNIQUE ("user_id", "workspace_id");

ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_name_key" UNIQUE ("name");

ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_user_id_permission_id_key" UNIQUE ("user_id", "permission_id");

ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_invitation_token_key" UNIQUE ("invitation_token");

ALTER TABLE ONLY "public"."user_activity_logs"
    ADD CONSTRAINT "user_activity_logs_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."client_contacts"
    ADD CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."client_communications"
    ADD CONSTRAINT "client_communications_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."client_assignments"
    ADD CONSTRAINT "client_assignments_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."client_assignments"
    ADD CONSTRAINT "client_assignments_client_id_user_id_key" UNIQUE ("client_id", "user_id");

ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_project_id_user_id_key" UNIQUE ("project_id", "user_id");

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_invoice_number_key" UNIQUE ("invoice_number");

ALTER TABLE ONLY "public"."ai_extractions"
    ADD CONSTRAINT "ai_extractions_pkey" PRIMARY KEY ("id");

-- Create indexes for performance
CREATE INDEX "idx_user_profiles_email" ON "public"."user_profiles" USING "btree" ("email");
CREATE INDEX "idx_user_profiles_role" ON "public"."user_profiles" USING "btree" ("role");
CREATE INDEX "idx_memberships_user_id" ON "public"."memberships" USING "btree" ("user_id");
CREATE INDEX "idx_memberships_workspace_id" ON "public"."memberships" USING "btree" ("workspace_id");
CREATE INDEX "idx_user_activity_logs_user_id" ON "public"."user_activity_logs" USING "btree" ("user_id");
CREATE INDEX "idx_user_activity_logs_workspace_id" ON "public"."user_activity_logs" USING "btree" ("workspace_id");
CREATE INDEX "idx_clients_workspace_id" ON "public"."clients" USING "btree" ("workspace_id");
CREATE INDEX "idx_clients_assigned_to" ON "public"."clients" USING "btree" ("assigned_to");
CREATE INDEX "idx_projects_workspace_id" ON "public"."projects" USING "btree" ("workspace_id");
CREATE INDEX "idx_projects_client_id" ON "public"."projects" USING "btree" ("client_id");
CREATE INDEX "idx_tasks_workspace_id" ON "public"."tasks" USING "btree" ("workspace_id");
CREATE INDEX "idx_tasks_project_id" ON "public"."tasks" USING "btree" ("project_id");
CREATE INDEX "idx_tasks_assignee_id" ON "public"."tasks" USING "btree" ("assignee_id");

-- Create update triggers
CREATE OR REPLACE TRIGGER "update_workspaces_updated_at" BEFORE UPDATE ON "public"."workspaces" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();
CREATE OR REPLACE TRIGGER "update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();
CREATE OR REPLACE TRIGGER "update_clients_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();
CREATE OR REPLACE TRIGGER "update_projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();
CREATE OR REPLACE TRIGGER "update_tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();
CREATE OR REPLACE TRIGGER "update_task_comments_updated_at" BEFORE UPDATE ON "public"."task_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();
CREATE OR REPLACE TRIGGER "update_invoices_updated_at" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();

-- Add foreign key constraints
ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_default_workspace_id_fkey" FOREIGN KEY ("default_workspace_id") REFERENCES "public"."workspaces"("id");

ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."user_profiles"("id");

ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."user_profiles"("id");

ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."user_profiles"("id");

ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id");

ALTER TABLE ONLY "public"."user_activity_logs"
    ADD CONSTRAINT "user_activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_activity_logs"
    ADD CONSTRAINT "user_activity_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id");

ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id");

ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");

ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."user_profiles"("id");

ALTER TABLE ONLY "public"."client_contacts"
    ADD CONSTRAINT "client_contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."client_communications"
    ADD CONSTRAINT "client_communications_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."client_communications"
    ADD CONSTRAINT "client_communications_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."client_contacts"("id");

ALTER TABLE ONLY "public"."client_communications"
    ADD CONSTRAINT "client_communications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id");

ALTER TABLE ONLY "public"."client_assignments"
    ADD CONSTRAINT "client_assignments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."client_assignments"
    ADD CONSTRAINT "client_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."client_assignments"
    ADD CONSTRAINT "client_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."user_profiles"("id");

ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id");

ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");

ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id");

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."user_profiles"("id");

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");

ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id");

ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");

ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");

ALTER TABLE ONLY "public"."ai_extractions"
    ADD CONSTRAINT "ai_extractions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id");

ALTER TABLE ONLY "public"."ai_extractions"
    ADD CONSTRAINT "ai_extractions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");

ALTER TABLE ONLY "public"."ai_extractions"
    ADD CONSTRAINT "ai_extractions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user_profiles"("id");

-- Enable Row Level Security
ALTER TABLE "public"."workspaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_activity_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."client_contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."client_communications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."client_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."project_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."task_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ai_extractions" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- User profiles policies
CREATE POLICY "Users can view their own profile" ON "public"."user_profiles" FOR SELECT USING (("id" = "auth"."uid"()));
CREATE POLICY "Users can update their own profile" ON "public"."user_profiles" FOR UPDATE USING (("id" = "auth"."uid"()));
CREATE POLICY "Admins can view all profiles" ON "public"."user_profiles" FOR SELECT USING ((EXISTS ( SELECT 1 FROM "public"."user_profiles" "up" WHERE (("up"."id" = "auth"."uid"()) AND ("up"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"]))))));
CREATE POLICY "Admins can manage all profiles" ON "public"."user_profiles" USING ((EXISTS ( SELECT 1 FROM "public"."user_profiles" "up" WHERE (("up"."id" = "auth"."uid"()) AND ("up"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"]))))));

-- Workspace policies
CREATE POLICY "Users can create workspaces" ON "public"."workspaces" FOR INSERT WITH CHECK (("owner_id" = "auth"."uid"()));
CREATE POLICY "Workspace owners can view their workspaces" ON "public"."workspaces" FOR SELECT USING (("owner_id" = "auth"."uid"()));
CREATE POLICY "Workspace members can view workspaces" ON "public"."workspaces" FOR SELECT USING (("id" IN ( SELECT "memberships"."workspace_id" FROM "public"."memberships" WHERE ("memberships"."user_id" = "auth"."uid"()))));
CREATE POLICY "Workspace owners can update" ON "public"."workspaces" FOR UPDATE USING (("owner_id" = "auth"."uid"()));
CREATE POLICY "Workspace owners can delete" ON "public"."workspaces" FOR DELETE USING (("owner_id" = "auth"."uid"()));
CREATE POLICY "Admins can view all workspaces" ON "public"."workspaces" FOR SELECT USING ((EXISTS ( SELECT 1 FROM "public"."user_profiles" WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"]))))));

-- Membership policies
CREATE POLICY "Users can view their own memberships" ON "public"."memberships" FOR SELECT USING (("user_id" = "auth"."uid"()));
CREATE POLICY "Workspace owners can view memberships" ON "public"."memberships" FOR SELECT USING (("workspace_id" IN ( SELECT "workspaces"."id" FROM "public"."workspaces" WHERE ("workspaces"."owner_id" = "auth"."uid"()))));
CREATE POLICY "Workspace owners can manage memberships" ON "public"."memberships" USING (("workspace_id" IN ( SELECT "workspaces"."id" FROM "public"."workspaces" WHERE ("workspaces"."owner_id" = "auth"."uid"()))));
CREATE POLICY "Admins can manage all memberships" ON "public"."memberships" USING ((EXISTS ( SELECT 1 FROM "public"."user_profiles" WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"]))))));

-- Permission policies
CREATE POLICY "All users can view permissions" ON "public"."permissions" FOR SELECT USING (true);
CREATE POLICY "Admins can manage permissions" ON "public"."permissions" USING ((EXISTS ( SELECT 1 FROM "public"."user_profiles" WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"]))))));

-- User permission policies
CREATE POLICY "Users can view their own user permissions" ON "public"."user_permissions" FOR SELECT USING (("user_id" = "auth"."uid"()));
CREATE POLICY "Admins can manage all user permissions" ON "public"."user_permissions" USING ((EXISTS ( SELECT 1 FROM "public"."user_profiles" WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"]))))));

-- Invitation policies
CREATE POLICY "Admins can manage invitations" ON "public"."user_invitations" USING ((EXISTS ( SELECT 1 FROM "public"."user_profiles" WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"]))))));

-- Activity log policies
CREATE POLICY "Users can view their own activity" ON "public"."user_activity_logs" FOR SELECT USING (("user_id" = "auth"."uid"()));
CREATE POLICY "Admins can view all activity" ON "public"."user_activity_logs" FOR SELECT USING ((EXISTS ( SELECT 1 FROM "public"."user_profiles" WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"]))))));
CREATE POLICY "System can insert activity logs" ON "public"."user_activity_logs" FOR INSERT WITH CHECK (true);

-- Client policies
CREATE POLICY "Workspace members can view clients" ON "public"."clients" FOR SELECT USING ((("workspace_id" IN ( SELECT "memberships"."workspace_id" FROM "public"."memberships" WHERE ("memberships"."user_id" = "auth"."uid"()))) OR ("workspace_id" IN ( SELECT "workspaces"."id" FROM "public"."workspaces" WHERE ("workspaces"."owner_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1 FROM "public"."user_profiles" WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"])))))));
CREATE POLICY "Workspace members can manage clients" ON "public"."clients" USING ((("workspace_id" IN ( SELECT "memberships"."workspace_id" FROM "public"."memberships" WHERE ("memberships"."user_id" = "auth"."uid"()))) OR ("workspace_id" IN ( SELECT "workspaces"."id" FROM "public"."workspaces" WHERE ("workspaces"."owner_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1 FROM "public"."user_profiles" WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"])))))));

-- Client contact policies
CREATE POLICY "Client contact access" ON "public"."client_contacts" USING ((EXISTS ( SELECT 1 FROM "public"."clients" WHERE (("clients"."id" = "client_contacts"."client_id") AND (("clients"."workspace_id" IN ( SELECT "memberships"."workspace_id" FROM "public"."memberships" WHERE ("memberships"."user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1 FROM "public"."user_profiles" WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"]))))))))));

-- Client communication policies
CREATE POLICY "Client communication access" ON "public"."client_communications" USING ((EXISTS ( SELECT 1 FROM "public"."clients" WHERE (("clients"."id" = "client_communications"."client_id") AND (("clients"."workspace_id" IN ( SELECT "memberships"."workspace_id" FROM "public"."memberships" WHERE ("memberships"."user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1 FROM "public"."user_profiles" WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"]))))))))));

-- Client assignment policies
CREATE POLICY "Client assignment access" ON "public"."client_assignments" USING ((EXISTS ( SELECT 1 FROM "public"."clients" WHERE (("clients"."id" = "client_assignments"."client_id") AND (("clients"."workspace_id" IN ( SELECT "memberships"."workspace_id" FROM "public"."memberships" WHERE ("memberships"."user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1 FROM "public"."user_profiles" WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"]))))))))));

-- Project policies
CREATE POLICY "Workspace members can view projects" ON "public"."projects" FOR SELECT USING ((("workspace_id" IN ( SELECT "memberships"."workspace_id" FROM "public"."memberships" WHERE ("memberships"."user_id" = "auth"."uid"()))) OR ("workspace_id" IN ( SELECT "workspaces"."id" FROM "public"."workspaces" WHERE ("workspaces"."owner_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1 FROM "public"."user_profiles" WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"])))))));
CREATE POLICY "Workspace members can manage projects" ON "public"."projects" USING ((("workspace_id" IN ( SELECT "memberships"."workspace_id" FROM "public"."memberships" WHERE ("memberships"."user_id" = "auth"."uid"()))) OR ("workspace_id" IN ( SELECT "workspaces"."id" FROM "public"."workspaces" WHERE ("workspaces"."owner_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1 FROM "public"."user_profiles" WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"])))))));

-- Project member policies
CREATE POLICY "Project member access" ON "public"."project_members" USING ((EXISTS ( SELECT 1 FROM "public"."projects" WHERE (("projects"."id" = "project_members"."project_id") AND (("projects"."workspace_id" IN ( SELECT "memberships"."workspace_id" FROM "public"."memberships" WHERE ("memberships"."user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1 FROM "public"."user_profiles" WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"]))))))))));

-- Task policies
CREATE POLICY "Workspace members can view tasks" ON "public"."tasks" FOR SELECT USING ((("workspace_id" IN ( SELECT "memberships"."workspace_id" FROM "public"."memberships" WHERE ("memberships"."user_id" = "auth"."uid"()))) OR ("workspace_id" IN ( SELECT "workspaces"."id" FROM "public"."workspaces" WHERE ("workspaces"."owner_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1 FROM "public"."user_profiles" WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"])))))));
CREATE POLICY "Workspace members can manage tasks" ON "public"."tasks" USING ((("workspace_id" IN ( SELECT "memberships"."workspace_id" FROM "public"."memberships" WHERE ("memberships"."user_id" = "auth"."uid"()))) OR ("workspace_id" IN ( SELECT "workspaces"."id" FROM "public"."workspaces" WHERE ("workspaces"."owner_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1 FROM "public"."user_profiles" WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"])))))));

-- Task comment policies
CREATE POLICY "Task comment access" ON "public"."task_comments" USING ((EXISTS ( SELECT 1 FROM "public"."tasks" WHERE (("tasks"."id" = "task_comments"."task_id") AND (("tasks"."workspace_id" IN ( SELECT "memberships"."workspace_id" FROM "public"."memberships" WHERE ("memberships"."user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1 FROM "public"."user_profiles" WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"]))))))))));

-- Invoice policies
CREATE POLICY "Invoice access" ON "public"."invoices" USING ((EXISTS ( SELECT 1 FROM "public"."clients" WHERE (("clients"."id" = "invoices"."client_id") AND (("clients"."workspace_id" IN ( SELECT "memberships"."workspace_id" FROM "public"."memberships" WHERE ("memberships"."user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1 FROM "public"."user_profiles" WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"]))))))))));

-- AI extraction policies
CREATE POLICY "AI extraction access" ON "public"."ai_extractions" USING ((("workspace_id" IN ( SELECT "memberships"."workspace_id" FROM "public"."memberships" WHERE ("memberships"."user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1 FROM "public"."user_profiles" WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"])))))));

-- Grant permissions to functions
GRANT ALL ON FUNCTION "public"."has_users"() TO "anon", "authenticated", "service_role";
GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "anon", "authenticated", "service_role";
GRANT ALL ON FUNCTION "public"."log_user_activity"("p_user_id" "uuid", "p_action" "text", "p_resource_type" "text", "p_resource_id" "text", "p_metadata" "jsonb", "p_workspace_id" "uuid") TO "anon", "authenticated", "service_role";
GRANT ALL ON FUNCTION "public"."create_user_invitation"("p_email" "text", "p_role" "public"."user_role", "p_permissions" "jsonb", "p_target_workspace_id" "uuid") TO "anon", "authenticated", "service_role";
GRANT ALL ON FUNCTION "public"."accept_invitation"("p_token" "text", "p_password" "text", "p_first_name" "text", "p_last_name" "text") TO "anon", "authenticated", "service_role";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon", "authenticated", "service_role";

-- Grant table permissions
GRANT ALL ON ALL TABLES IN SCHEMA "public" TO "anon", "authenticated", "service_role";

-- Reset settings
RESET ALL;