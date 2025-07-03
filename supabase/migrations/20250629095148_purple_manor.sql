/*
  # Complete Policy Cleanup and Recreation
  
  This migration completely removes all existing policies and recreates them
  with unique names to avoid any conflicts from previous migration attempts.
  
  1. Drop ALL existing policies on ALL tables
  2. Create new policies with completely unique names
  3. Ensure proper permissions for authenticated users
  4. Avoid any recursive policy issues
*/

-- Function to drop all policies on a table
CREATE OR REPLACE FUNCTION drop_all_policies_on_table(table_name text)
RETURNS void AS $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = table_name
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_record.policyname, table_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Drop all existing policies on all tables
SELECT drop_all_policies_on_table('organizations');
SELECT drop_all_policies_on_table('organization_members');
SELECT drop_all_policies_on_table('organization_invitations');
SELECT drop_all_policies_on_table('projects');
SELECT drop_all_policies_on_table('assets');
SELECT drop_all_policies_on_table('layers');
SELECT drop_all_policies_on_table('user_roles');
SELECT drop_all_policies_on_table('user_permissions');
SELECT drop_all_policies_on_table('role_permissions');
SELECT drop_all_policies_on_table('user_role_assignments');
SELECT drop_all_policies_on_table('audit_logs');

-- Drop the helper function
DROP FUNCTION drop_all_policies_on_table(text);

-- Create new policies with unique names for organizations
CREATE POLICY "orgs_auth_select_2025" ON organizations FOR SELECT TO authenticated USING (true);
CREATE POLICY "orgs_auth_insert_2025" ON organizations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "orgs_auth_update_2025" ON organizations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "orgs_auth_delete_2025" ON organizations FOR DELETE TO authenticated USING (true);

-- Create new policies for organization_members
CREATE POLICY "org_members_auth_select_2025" ON organization_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "org_members_auth_insert_2025" ON organization_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "org_members_auth_update_2025" ON organization_members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "org_members_auth_delete_2025" ON organization_members FOR DELETE TO authenticated USING (true);

-- Create new policies for organization_invitations
CREATE POLICY "org_invites_auth_select_2025" ON organization_invitations FOR SELECT TO authenticated USING (true);
CREATE POLICY "org_invites_auth_insert_2025" ON organization_invitations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "org_invites_auth_update_2025" ON organization_invitations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "org_invites_auth_delete_2025" ON organization_invitations FOR DELETE TO authenticated USING (true);

-- Create new policies for projects
CREATE POLICY "projects_auth_select_2025" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_auth_insert_2025" ON projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "projects_auth_update_2025" ON projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "projects_auth_delete_2025" ON projects FOR DELETE TO authenticated USING (true);

-- Create new policies for assets
CREATE POLICY "assets_auth_select_2025" ON assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "assets_auth_insert_2025" ON assets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "assets_auth_update_2025" ON assets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "assets_auth_delete_2025" ON assets FOR DELETE TO authenticated USING (true);

-- Create new policies for layers
CREATE POLICY "layers_auth_select_2025" ON layers FOR SELECT TO authenticated USING (true);
CREATE POLICY "layers_auth_insert_2025" ON layers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "layers_auth_update_2025" ON layers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "layers_auth_delete_2025" ON layers FOR DELETE TO authenticated USING (true);

-- Create new policies for user_roles
CREATE POLICY "roles_auth_select_2025" ON user_roles FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "roles_auth_insert_2025" ON user_roles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "roles_auth_update_2025" ON user_roles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "roles_auth_delete_2025" ON user_roles FOR DELETE TO authenticated USING (true);

-- Create new policies for user_permissions
CREATE POLICY "perms_auth_select_2025" ON user_permissions FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "perms_auth_insert_2025" ON user_permissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "perms_auth_update_2025" ON user_permissions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "perms_auth_delete_2025" ON user_permissions FOR DELETE TO authenticated USING (true);

-- Create new policies for role_permissions
CREATE POLICY "role_perms_auth_select_2025" ON role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_perms_auth_insert_2025" ON role_permissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "role_perms_auth_update_2025" ON role_permissions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "role_perms_auth_delete_2025" ON role_permissions FOR DELETE TO authenticated USING (true);

-- Create new policies for user_role_assignments
CREATE POLICY "user_roles_auth_select_2025" ON user_role_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_auth_insert_2025" ON user_role_assignments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "user_roles_auth_update_2025" ON user_role_assignments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "user_roles_auth_delete_2025" ON user_role_assignments FOR DELETE TO authenticated USING (true);

-- Create new policies for audit_logs
CREATE POLICY "audit_auth_select_2025" ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_auth_insert_2025" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Ensure RLS is enabled on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Ensure default data exists (in case it was lost)
INSERT INTO user_roles (name, display_name, description, is_system_role) VALUES
  ('super_admin', 'Super Administrator', 'Full system access with all permissions', true),
  ('admin', 'Administrator', 'Administrative access to manage users and organizations', true),
  ('project_manager', 'Project Manager', 'Can manage projects and assets within organizations', true),
  ('user', 'Standard User', 'Basic user with access to assigned projects', true)
ON CONFLICT (name) DO NOTHING;

-- Ensure default permissions exist
INSERT INTO user_permissions (name, display_name, description, category) VALUES
  ('manage_users', 'Manage Users', 'Create, update, and delete user accounts', 'user_management'),
  ('view_users', 'View Users', 'View user accounts and profiles', 'user_management'),
  ('assign_roles', 'Assign Roles', 'Assign and remove roles from users', 'user_management'),
  ('manage_organizations', 'Manage Organizations', 'Create, update, and delete organizations', 'organization_management'),
  ('view_organizations', 'View Organizations', 'View organization details and members', 'organization_management'),
  ('manage_org_members', 'Manage Organization Members', 'Add and remove organization members', 'organization_management'),
  ('manage_projects', 'Manage Projects', 'Create, update, and delete projects', 'project_management'),
  ('view_projects', 'View Projects', 'View project details and assets', 'project_management'),
  ('manage_assets', 'Manage Assets', 'Create, update, and delete assets', 'project_management'),
  ('view_assets', 'View Assets', 'View asset details and data', 'project_management'),
  ('system_settings', 'System Settings', 'Modify system-wide settings and configuration', 'system_admin'),
  ('view_audit_logs', 'View Audit Logs', 'Access system audit logs and user activity', 'system_admin'),
  ('manage_permissions', 'Manage Permissions', 'Create and modify permission definitions', 'system_admin'),
  ('manage_roles', 'Manage Roles', 'Create and modify role definitions', 'system_admin'),
  ('export_data', 'Export Data', 'Export system data and reports', 'data_management'),
  ('import_data', 'Import Data', 'Import data into the system', 'data_management'),
  ('backup_data', 'Backup Data', 'Create and manage system backups', 'data_management')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to roles (only if they don't already exist)
DO $$
DECLARE
  super_admin_role_id uuid;
  admin_role_id uuid;
  project_manager_role_id uuid;
  user_role_id uuid;
  permission_record user_permissions%ROWTYPE;
BEGIN
  -- Get role IDs
  SELECT id INTO super_admin_role_id FROM user_roles WHERE name = 'super_admin';
  SELECT id INTO admin_role_id FROM user_roles WHERE name = 'admin';
  SELECT id INTO project_manager_role_id FROM user_roles WHERE name = 'project_manager';
  SELECT id INTO user_role_id FROM user_roles WHERE name = 'user';
  
  -- Super Admin gets all permissions
  FOR permission_record IN SELECT * FROM user_permissions WHERE is_active = true LOOP
    INSERT INTO role_permissions (role_id, permission_id) 
    VALUES (super_admin_role_id, permission_record.id)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END LOOP;
  
  -- Admin permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT admin_role_id, id FROM user_permissions 
  WHERE name IN (
    'manage_users', 'view_users', 'assign_roles',
    'manage_organizations', 'view_organizations', 'manage_org_members',
    'manage_projects', 'view_projects', 'manage_assets', 'view_assets',
    'view_audit_logs', 'export_data', 'import_data'
  )
  ON CONFLICT (role_id, permission_id) DO NOTHING;
  
  -- Project Manager permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT project_manager_role_id, id FROM user_permissions 
  WHERE name IN (
    'view_users', 'view_organizations',
    'manage_projects', 'view_projects', 'manage_assets', 'view_assets',
    'export_data'
  )
  ON CONFLICT (role_id, permission_id) DO NOTHING;
  
  -- User permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT user_role_id, id FROM user_permissions 
  WHERE name IN (
    'view_projects', 'view_assets'
  )
  ON CONFLICT (role_id, permission_id) DO NOTHING;
END $$;