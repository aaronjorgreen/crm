/*
  # Fix RLS Policies - Remove Infinite Recursion
  
  This migration fixes the infinite recursion issue in the memberships table policies
  and simplifies other policies to prevent similar issues.
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view profiles in shared workspaces" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners can manage memberships" ON memberships;

-- Create simplified, non-recursive policies

-- User profiles - simplified access
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
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

-- Workspaces - simplified access
CREATE POLICY "Users can create workspaces" ON workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Workspace owners can view their workspaces" ON workspaces
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Workspace members can view workspaces" ON workspaces
  FOR SELECT USING (
    id IN (
      SELECT workspace_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all workspaces" ON workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Workspace owners can update" ON workspaces
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Workspace owners can delete" ON workspaces
  FOR DELETE USING (owner_id = auth.uid());

-- Memberships - simplified, non-recursive policies
CREATE POLICY "Users can view their own memberships" ON memberships
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Workspace owners can view memberships" ON memberships
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can manage memberships" ON memberships
  FOR ALL USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all memberships" ON memberships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Update other policies to be simpler and avoid recursion

-- Clients - use direct workspace ownership check
DROP POLICY IF EXISTS "Workspace-based client access" ON clients;
DROP POLICY IF EXISTS "Workspace members can manage clients" ON clients;

CREATE POLICY "Workspace members can view clients" ON clients
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM memberships WHERE user_id = auth.uid()
    ) OR
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Workspace members can manage clients" ON clients
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM memberships WHERE user_id = auth.uid()
    ) OR
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Projects - use direct workspace ownership check
DROP POLICY IF EXISTS "Workspace-based project access" ON projects;
DROP POLICY IF EXISTS "Workspace members can manage projects" ON projects;

CREATE POLICY "Workspace members can view projects" ON projects
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM memberships WHERE user_id = auth.uid()
    ) OR
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Workspace members can manage projects" ON projects
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM memberships WHERE user_id = auth.uid()
    ) OR
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Tasks - use direct workspace ownership check
DROP POLICY IF EXISTS "Workspace-based task access" ON tasks;
DROP POLICY IF EXISTS "Workspace members can manage tasks" ON tasks;

CREATE POLICY "Workspace members can view tasks" ON tasks
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM memberships WHERE user_id = auth.uid()
    ) OR
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Workspace members can manage tasks" ON tasks
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM memberships WHERE user_id = auth.uid()
    ) OR
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
    )
  );