/*
  # Seed Permissions Data
  
  This migration seeds the permissions table with all the necessary permissions
  for the CRM system.
*/

-- Insert permissions
INSERT INTO public.permissions (name, description, category) VALUES
  -- Dashboard permissions
  ('dashboard.view', 'View dashboard and overview', 'dashboard'),
  ('dashboard.analytics', 'View analytics and reports', 'dashboard'),
  
  -- Boards/Projects permissions
  ('boards.view', 'View projects and boards', 'boards'),
  ('boards.create', 'Create new projects and boards', 'boards'),
  ('boards.edit', 'Edit existing projects and boards', 'boards'),
  ('boards.delete', 'Delete projects and boards', 'boards'),
  ('boards.manage_members', 'Manage project team members', 'boards'),
  
  -- Client permissions
  ('clients.view', 'View client information', 'clients'),
  ('clients.create', 'Create new clients', 'clients'),
  ('clients.edit', 'Edit client information', 'clients'),
  ('clients.delete', 'Delete clients', 'clients'),
  ('clients.assign', 'Assign clients to team members', 'clients'),
  ('clients.communicate', 'Manage client communications', 'clients'),
  
  -- Apps/Integrations permissions
  ('apps.gmail', 'Access Gmail integration', 'apps'),
  ('apps.ai', 'Access AI assistant features', 'apps'),
  ('apps.analytics', 'Access advanced analytics', 'apps'),
  
  -- Admin permissions
  ('admin.users', 'Manage users and invitations', 'admin'),
  ('admin.permissions', 'Manage user permissions', 'admin'),
  ('admin.workspaces', 'Manage workspaces', 'admin'),
  ('admin.system', 'System administration', 'admin'),
  ('admin.super', 'Super administrator access', 'admin')
ON CONFLICT (name) DO NOTHING;