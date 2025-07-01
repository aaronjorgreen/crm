/*
# Fix RLS Infinite Recursion Issue

1. New Functions
   - `verify_admin_auth()` - SECURITY DEFINER function to safely check admin roles

2. Security
   - Updates all RLS policies to use the new function instead of direct EXISTS queries
   - Prevents infinite recursion in policy evaluation

3. Changes
   - All admin/super_admin role checks now use verify_admin_auth()
   - Maintains same security model but with safe execution
*/

-- Create the verify_admin_auth() function
CREATE OR REPLACE FUNCTION public.verify_admin_auth()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Update RLS policies to use verify_admin_auth()
-- Policies that grant admin/super_admin access
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
  FOR SELECT USING (public.verify_admin_auth());

DROP POLICY IF EXISTS "Admins can view all workspaces" ON public.workspaces;
CREATE POLICY "Admins can view all workspaces" ON public.workspaces
  FOR SELECT USING (public.verify_admin_auth());

DROP POLICY IF EXISTS "Admins can manage all memberships" ON public.memberships;
CREATE POLICY "Admins can manage all memberships" ON public.memberships
  FOR ALL USING (public.verify_admin_auth());

DROP POLICY IF EXISTS "Admins can manage permissions" ON public.permissions;
CREATE POLICY "Admins can manage permissions" ON public.permissions
  FOR ALL USING (public.verify_admin_auth());

DROP POLICY IF EXISTS "Admins can manage all user permissions" ON public.user_permissions;
CREATE POLICY "Admins can manage all user permissions" ON public.user_permissions
  FOR ALL USING (public.verify_admin_auth());

DROP POLICY IF EXISTS "Admins can manage invitations" ON public.user_invitations;
CREATE POLICY "Admins can manage invitations" ON public.user_invitations
  FOR ALL USING (public.verify_admin_auth());

DROP POLICY IF EXISTS "Admins can view all activity" ON public.user_activity_logs;
CREATE POLICY "Admins can view all activity" ON public.user_activity_logs
  FOR SELECT USING (public.verify_admin_auth());

-- Policies with complex OR conditions (replace only the admin/super_admin part)
DROP POLICY IF EXISTS "Workspace members can view clients" ON public.clients;
CREATE POLICY "Workspace members can view clients" ON public.clients
  FOR SELECT USING (
    (workspace_id IN ( SELECT memberships.workspace_id FROM memberships WHERE (memberships.user_id = auth.uid()))) OR
    (workspace_id IN ( SELECT workspaces.id FROM workspaces WHERE (workspaces.owner_id = auth.uid()))) OR
    public.verify_admin_auth()
  );

DROP POLICY IF EXISTS "Workspace members can manage clients" ON public.clients;
CREATE POLICY "Workspace members can manage clients" ON public.clients
  FOR ALL USING (
    (workspace_id IN ( SELECT memberships.workspace_id FROM memberships WHERE (memberships.user_id = auth.uid()))) OR
    (workspace_id IN ( SELECT workspaces.id FROM workspaces WHERE (workspaces.owner_id = auth.uid()))) OR
    public.verify_admin_auth()
  );

DROP POLICY IF EXISTS "Client contact access" ON public.client_contacts;
CREATE POLICY "Client contact access" ON public.client_contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = client_contacts.client_id AND (
        workspace_id IN (
          SELECT workspace_id FROM public.memberships
          WHERE user_id = auth.uid()
        ) OR
        public.verify_admin_auth()
      )
    )
  );

DROP POLICY IF EXISTS "Client communication access" ON public.client_communications;
CREATE POLICY "Client communication access" ON public.client_communications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = client_communications.client_id AND (
        workspace_id IN (
          SELECT workspace_id FROM public.memberships
          WHERE user_id = auth.uid()
        ) OR
        public.verify_admin_auth()
      )
    )
  );

DROP POLICY IF EXISTS "Client assignment access" ON public.client_assignments;
CREATE POLICY "Client assignment access" ON public.client_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = client_assignments.client_id AND (
        workspace_id IN (
          SELECT workspace_id FROM public.memberships
          WHERE user_id = auth.uid()
        ) OR
        public.verify_admin_auth()
      )
    )
  );

DROP POLICY IF EXISTS "Workspace members can view projects" ON public.projects;
CREATE POLICY "Workspace members can view projects" ON public.projects
  FOR SELECT USING (
    (workspace_id IN ( SELECT memberships.workspace_id FROM memberships WHERE (memberships.user_id = auth.uid()))) OR
    (workspace_id IN ( SELECT workspaces.id FROM workspaces WHERE (workspaces.owner_id = auth.uid()))) OR
    public.verify_admin_auth()
  );

DROP POLICY IF EXISTS "Workspace members can manage projects" ON public.projects;
CREATE POLICY "Workspace members can manage projects" ON public.projects
  FOR ALL USING (
    (workspace_id IN ( SELECT memberships.workspace_id FROM memberships WHERE (memberships.user_id = auth.uid()))) OR
    (workspace_id IN ( SELECT workspaces.id FROM workspaces WHERE (workspaces.owner_id = auth.uid()))) OR
    public.verify_admin_auth()
  );

DROP POLICY IF EXISTS "Project member access" ON public.project_members;
CREATE POLICY "Project member access" ON public.project_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_members.project_id AND (
        workspace_id IN (
          SELECT workspace_id FROM public.memberships
          WHERE user_id = auth.uid()
        ) OR
        public.verify_admin_auth()
      )
    )
  );

DROP POLICY IF EXISTS "Workspace members can view tasks" ON public.tasks;
CREATE POLICY "Workspace members can view tasks" ON public.tasks
  FOR SELECT USING (
    (workspace_id IN ( SELECT memberships.workspace_id FROM memberships WHERE (memberships.user_id = auth.uid()))) OR
    (workspace_id IN ( SELECT workspaces.id FROM workspaces WHERE (workspaces.owner_id = auth.uid()))) OR
    public.verify_admin_auth()
  );

DROP POLICY IF EXISTS "Workspace members can manage tasks" ON public.tasks;
CREATE POLICY "Workspace members can manage tasks" ON public.tasks
  FOR ALL USING (
    (workspace_id IN ( SELECT memberships.workspace_id FROM memberships WHERE (memberships.user_id = auth.uid()))) OR
    (workspace_id IN ( SELECT workspaces.id FROM workspaces WHERE (workspaces.owner_id = auth.uid()))) OR
    public.verify_admin_auth()
  );

DROP POLICY IF EXISTS "Task comment access" ON public.task_comments;
CREATE POLICY "Task comment access" ON public.task_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE id = task_comments.task_id AND (
        workspace_id IN (
          SELECT workspace_id FROM public.memberships
          WHERE user_id = auth.uid()
        ) OR
        public.verify_admin_auth()
      )
    )
  );

DROP POLICY IF EXISTS "Invoice access" ON public.invoices;
CREATE POLICY "Invoice access" ON public.invoices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = invoices.client_id AND (
        workspace_id IN (
          SELECT workspace_id FROM public.memberships
          WHERE user_id = auth.uid()
        ) OR
        public.verify_admin_auth()
      )
    )
  );

DROP POLICY IF EXISTS "AI extraction access" ON public.ai_extractions;
CREATE POLICY "AI extraction access" ON public.ai_extractions
  FOR ALL USING (
    (workspace_id IN ( SELECT memberships.workspace_id FROM memberships WHERE (memberships.user_id = auth.uid()))) OR
    public.verify_admin_auth()
  );