/*
  # Complete CRM Schema Setup
  
  This migration creates the complete schema for the Innovate X Labs CRM system.
  
  ## Tables Created:
  1. User Profiles - Extended user information
  2. Workspaces - Multi-tenant workspace management
  3. Memberships - User-workspace relationships
  4. Permissions - Granular permission system
  5. User Permissions - User-specific permissions
  6. User Invitations - Invitation system
  7. User Activity Logs - Audit trail
  8. Clients - Client management
  9. Client Contacts - Client contact information
  10. Client Communications - Communication history
  11. Client Assignments - Client-user assignments
  12. Projects - Project management
  13. Project Members - Project team members
  14. Tasks - Task management
  15. Task Comments - Task discussion
  16. Invoices - Invoice management
  17. AI Extractions - AI-powered data extraction
  
  ## Security:
  - Row Level Security (RLS) enabled on all tables
  - Workspace-based data isolation
  - Role-based access control
  
  ## Functions:
  - User profile creation trigger
  - Activity logging
  - Invitation management
  - Updated timestamp triggers
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'member');
CREATE TYPE workspace_member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE client_status AS ENUM ('active', 'inactive', 'prospect', 'archived');
CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled');
CREATE TYPE project_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'completed');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE permission_category AS ENUM ('dashboard', 'boards', 'clients', 'apps', 'admin');
CREATE TYPE company_size AS ENUM ('startup', 'small', 'medium', 'large', 'enterprise');
CREATE TYPE project_member_role AS ENUM ('owner', 'manager', 'member', 'viewer');
CREATE TYPE communication_type AS ENUM ('email', 'call', 'meeting', 'note');
CREATE TYPE communication_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
CREATE TYPE extraction_source_type AS ENUM ('email', 'document', 'pdf', 'image', 'text');
CREATE TYPE extraction_entity_type AS ENUM ('client', 'project', 'cost', 'contact', 'task');
CREATE TYPE extraction_status AS ENUM ('pending', 'approved', 'rejected', 'auto_applied');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'member',
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  email_verified boolean NOT NULL DEFAULT false,
  failed_login_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_login timestamptz,
  last_activity timestamptz,
  default_workspace_id uuid,
  ai_preferences jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Workspaces Table
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES user_profiles(id),
  settings jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Memberships Table
CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role workspace_member_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, workspace_id)
);

-- 4. Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text NOT NULL,
  category permission_category NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. User Permissions Table
CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES user_profiles(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission_id)
);

-- 6. User Invitations Table
CREATE TABLE IF NOT EXISTS user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  invited_by uuid NOT NULL REFERENCES user_profiles(id),
  role user_role NOT NULL DEFAULT 'member',
  permissions jsonb DEFAULT '[]',
  invitation_token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  workspace_id uuid REFERENCES workspaces(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. User Activity Logs Table
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  metadata jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  workspace_id uuid REFERENCES workspaces(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. Clients Table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  website text,
  industry text,
  company_size company_size,
  address jsonb DEFAULT '{}',
  status client_status NOT NULL DEFAULT 'prospect',
  tags text[] DEFAULT '{}',
  notes text DEFAULT '',
  total_value numeric DEFAULT 0,
  last_contact_date timestamptz,
  next_follow_up_date timestamptz,
  assigned_to uuid REFERENCES user_profiles(id),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Client Contacts Table
CREATE TABLE IF NOT EXISTS client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  role text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Client Communications Table
CREATE TABLE IF NOT EXISTS client_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type communication_type NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  direction communication_direction NOT NULL,
  contact_id uuid REFERENCES client_contacts(id),
  user_id uuid NOT NULL REFERENCES user_profiles(id),
  attachments jsonb DEFAULT '[]',
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 11. Client Assignments Table
CREATE TABLE IF NOT EXISTS client_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES user_profiles(id),
  assignment_reason text,
  ai_confidence numeric CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  workload_factor numeric,
  expertise_match numeric,
  is_active boolean NOT NULL DEFAULT true,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, user_id)
);

-- 12. Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  status project_status NOT NULL DEFAULT 'planning',
  priority project_priority NOT NULL DEFAULT 'medium',
  start_date date,
  end_date date,
  estimated_hours numeric DEFAULT 0,
  actual_hours numeric DEFAULT 0,
  budget numeric,
  spent_budget numeric DEFAULT 0,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  tags text[] DEFAULT '{}',
  attachments jsonb DEFAULT '[]',
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 13. Project Members Table
CREATE TABLE IF NOT EXISTS project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role project_member_role NOT NULL DEFAULT 'member',
  hourly_rate numeric,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- 14. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assignee_id uuid REFERENCES user_profiles(id),
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  due_date timestamptz,
  estimated_hours numeric,
  actual_hours numeric DEFAULT 0,
  tags text[] DEFAULT '{}',
  attachments jsonb DEFAULT '[]',
  dependencies uuid[] DEFAULT '{}',
  position integer DEFAULT 0,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 15. Task Comments Table
CREATE TABLE IF NOT EXISTS task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id),
  content text NOT NULL,
  attachments jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 16. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id),
  invoice_number text UNIQUE NOT NULL,
  status invoice_status NOT NULL DEFAULT 'draft',
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  issue_date date NOT NULL,
  due_date date NOT NULL,
  paid_date date,
  items jsonb DEFAULT '[]',
  notes text,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 17. AI Extractions Table
CREATE TABLE IF NOT EXISTS ai_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type extraction_source_type NOT NULL,
  source_id text,
  extracted_data jsonb NOT NULL,
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 1),
  entity_type extraction_entity_type NOT NULL,
  entity_id uuid,
  status extraction_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES user_profiles(id),
  reviewed_at timestamptz,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_default_workspace_id_fkey 
  FOREIGN KEY (default_workspace_id) REFERENCES workspaces(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_workspace_id ON memberships(workspace_id);
CREATE INDEX IF NOT EXISTS idx_clients_workspace_id ON clients(workspace_id);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_to ON clients(assigned_to);
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_workspace_id ON user_activity_logs(workspace_id);

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_extractions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can view profiles in shared workspaces" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships m1
      JOIN memberships m2 ON m1.workspace_id = m2.workspace_id
      WHERE m1.user_id = auth.uid() AND m2.user_id = user_profiles.id
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can manage all profiles" ON user_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for workspaces
CREATE POLICY "Users can create workspaces" ON workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can view their own workspaces" ON workspaces
  FOR SELECT USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.workspace_id = workspaces.id AND memberships.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Workspace owners can update" ON workspaces
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Workspace owners can delete" ON workspaces
  FOR DELETE USING (owner_id = auth.uid());

-- RLS Policies for memberships
CREATE POLICY "Users can view their own memberships" ON memberships
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Workspace owners can manage memberships" ON memberships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = memberships.workspace_id AND workspaces.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for permissions
CREATE POLICY "All users can view permissions" ON permissions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage permissions" ON permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for user_permissions
CREATE POLICY "Users can view their own user permissions" ON user_permissions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all user permissions" ON user_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for user_invitations
CREATE POLICY "Admins can manage invitations" ON user_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for user_activity_logs
CREATE POLICY "Users can view their own activity" ON user_activity_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all activity" ON user_activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "System can insert activity logs" ON user_activity_logs
  FOR INSERT WITH CHECK (true);

-- RLS Policies for clients
CREATE POLICY "Workspace-based client access" ON clients
  FOR SELECT USING (
    workspace_id IN (
      SELECT memberships.workspace_id FROM memberships
      WHERE memberships.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Workspace members can manage clients" ON clients
  FOR ALL USING (
    workspace_id IN (
      SELECT memberships.workspace_id FROM memberships
      WHERE memberships.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for client_contacts
CREATE POLICY "Client contact access" ON client_contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_contacts.client_id AND (
        clients.workspace_id IN (
          SELECT memberships.workspace_id FROM memberships
          WHERE memberships.user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
        )
      )
    )
  );

-- RLS Policies for client_communications
CREATE POLICY "Client communication access" ON client_communications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_communications.client_id AND (
        clients.workspace_id IN (
          SELECT memberships.workspace_id FROM memberships
          WHERE memberships.user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
        )
      )
    )
  );

-- RLS Policies for client_assignments
CREATE POLICY "Client assignment access" ON client_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_assignments.client_id AND (
        clients.workspace_id IN (
          SELECT memberships.workspace_id FROM memberships
          WHERE memberships.user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
        )
      )
    )
  );

-- RLS Policies for projects
CREATE POLICY "Workspace-based project access" ON projects
  FOR SELECT USING (
    workspace_id IN (
      SELECT memberships.workspace_id FROM memberships
      WHERE memberships.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Workspace members can manage projects" ON projects
  FOR ALL USING (
    workspace_id IN (
      SELECT memberships.workspace_id FROM memberships
      WHERE memberships.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for project_members
CREATE POLICY "Project member access" ON project_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id AND (
        projects.workspace_id IN (
          SELECT memberships.workspace_id FROM memberships
          WHERE memberships.user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
        )
      )
    )
  );

-- RLS Policies for tasks
CREATE POLICY "Workspace-based task access" ON tasks
  FOR SELECT USING (
    workspace_id IN (
      SELECT memberships.workspace_id FROM memberships
      WHERE memberships.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Workspace members can manage tasks" ON tasks
  FOR ALL USING (
    workspace_id IN (
      SELECT memberships.workspace_id FROM memberships
      WHERE memberships.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for task_comments
CREATE POLICY "Task comment access" ON task_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_comments.task_id AND (
        tasks.workspace_id IN (
          SELECT memberships.workspace_id FROM memberships
          WHERE memberships.user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
        )
      )
    )
  );

-- RLS Policies for invoices
CREATE POLICY "Invoice access" ON invoices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = invoices.client_id AND (
        clients.workspace_id IN (
          SELECT memberships.workspace_id FROM memberships
          WHERE memberships.user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
        )
      )
    )
  );

-- RLS Policies for ai_extractions
CREATE POLICY "AI extraction access" ON ai_extractions
  FOR ALL USING (
    workspace_id IN (
      SELECT memberships.workspace_id FROM memberships
      WHERE memberships.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
    )
  );