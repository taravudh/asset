/*
  # Enhanced Admin Roles and Permissions System

  1. New Tables
    - `user_roles` - Define available roles in the system
    - `user_permissions` - Define granular permissions
    - `role_permissions` - Link roles to permissions
    - `user_role_assignments` - Assign roles to users
    - `audit_logs` - Track admin actions

  2. Security
    - Enable RLS on all new tables
    - Create policies for role-based access
    - Add functions for role checking

  3. Default Data
    - Create default admin and user roles
    - Set up basic permissions
    - Create system administrator account
*/

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text DEFAULT '',
  is_system_role boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'general',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES user_roles(id) ON DELETE CASCADE NOT NULL,
  permission_id uuid REFERENCES user_permissions(id) ON DELETE CASCADE NOT NULL,
  granted_at timestamptz DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id),
  UNIQUE(role_id, permission_id)
);

-- Create user_role_assignments table
CREATE TABLE IF NOT EXISTS user_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role_id uuid REFERENCES user_roles(id) ON DELETE CASCADE NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  UNIQUE(user_id, role_id)
);

-- Create audit_logs table for tracking admin actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_name ON user_roles(name);
CREATE INDEX IF NOT EXISTS idx_user_permissions_name ON user_permissions(name);
CREATE INDEX IF NOT EXISTS idx_user_permissions_category ON user_permissions(category);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role_id ON user_role_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable RLS on all tables
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_roles
CREATE POLICY "Anyone can view active roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Only super admins can manage roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = auth.uid() 
        AND ur.name = 'super_admin'
        AND ura.is_active = true
    )
  );

-- Create RLS policies for user_permissions
CREATE POLICY "Anyone can view permissions"
  ON user_permissions FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Only super admins can manage permissions"
  ON user_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = auth.uid() 
        AND ur.name = 'super_admin'
        AND ura.is_active = true
    )
  );

-- Create RLS policies for role_permissions
CREATE POLICY "Anyone can view role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only super admins can manage role permissions"
  ON role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = auth.uid() 
        AND ur.name = 'super_admin'
        AND ura.is_active = true
    )
  );

-- Create RLS policies for user_role_assignments
CREATE POLICY "Users can view their own role assignments"
  ON user_role_assignments FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = auth.uid() 
        AND ur.name IN ('super_admin', 'admin')
        AND ura.is_active = true
    )
  );

CREATE POLICY "Only admins can manage role assignments"
  ON user_role_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = auth.uid() 
        AND ur.name IN ('super_admin', 'admin')
        AND ura.is_active = true
    )
  );

-- Create RLS policies for audit_logs
CREATE POLICY "Only admins can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = auth.uid() 
        AND ur.name IN ('super_admin', 'admin')
        AND ura.is_active = true
    )
  );

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create functions for role and permission checking
CREATE OR REPLACE FUNCTION has_role(user_uuid uuid, role_name text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_role_assignments ura
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = user_uuid 
      AND ur.name = role_name
      AND ura.is_active = true
      AND ur.is_active = true
      AND (ura.expires_at IS NULL OR ura.expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION has_permission(user_uuid uuid, permission_name text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_role_assignments ura
    JOIN user_roles ur ON ura.role_id = ur.id
    JOIN role_permissions rp ON ur.id = rp.role_id
    JOIN user_permissions up ON rp.permission_id = up.id
    WHERE ura.user_id = user_uuid 
      AND up.name = permission_name
      AND ura.is_active = true
      AND ur.is_active = true
      AND up.is_active = true
      AND (ura.expires_at IS NULL OR ura.expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION get_user_roles(user_uuid uuid)
RETURNS TABLE (
  role_id uuid,
  role_name text,
  role_display_name text,
  assigned_at timestamptz,
  expires_at timestamptz
)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT 
    ur.id,
    ur.name,
    ur.display_name,
    ura.assigned_at,
    ura.expires_at
  FROM user_role_assignments ura
  JOIN user_roles ur ON ura.role_id = ur.id
  WHERE ura.user_id = user_uuid 
    AND ura.is_active = true
    AND ur.is_active = true
    AND (ura.expires_at IS NULL OR ura.expires_at > now())
  ORDER BY ura.assigned_at DESC;
$$;

CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid uuid)
RETURNS TABLE (
  permission_name text,
  permission_display_name text,
  category text,
  role_name text
)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT DISTINCT
    up.name,
    up.display_name,
    up.category,
    ur.name as role_name
  FROM user_role_assignments ura
  JOIN user_roles ur ON ura.role_id = ur.id
  JOIN role_permissions rp ON ur.id = rp.role_id
  JOIN user_permissions up ON rp.permission_id = up.id
  WHERE ura.user_id = user_uuid 
    AND ura.is_active = true
    AND ur.is_active = true
    AND up.is_active = true
    AND (ura.expires_at IS NULL OR ura.expires_at > now())
  ORDER BY up.category, up.name;
$$;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  action_name text,
  resource_type_name text,
  resource_id_value text DEFAULT NULL,
  action_details jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    auth.uid(),
    action_name,
    resource_type_name,
    resource_id_value,
    action_details
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Function to assign role to user
CREATE OR REPLACE FUNCTION assign_user_role(
  target_user_id uuid,
  role_name text,
  expires_at_param timestamptz DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  role_record user_roles%ROWTYPE;
  assignment_id uuid;
BEGIN
  -- Check if current user has permission to assign roles
  IF NOT has_permission(auth.uid(), 'manage_users') THEN
    RAISE EXCEPTION 'Insufficient permissions to assign roles';
  END IF;
  
  -- Get role
  SELECT * INTO role_record FROM user_roles WHERE name = role_name AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Role not found: %', role_name;
  END IF;
  
  -- Insert or update role assignment
  INSERT INTO user_role_assignments (user_id, role_id, assigned_by, expires_at)
  VALUES (target_user_id, role_record.id, auth.uid(), expires_at_param)
  ON CONFLICT (user_id, role_id) 
  DO UPDATE SET 
    is_active = true,
    assigned_by = auth.uid(),
    assigned_at = now(),
    expires_at = expires_at_param
  RETURNING id INTO assignment_id;
  
  -- Log the action
  PERFORM log_admin_action(
    'assign_role',
    'user',
    target_user_id::text,
    jsonb_build_object('role', role_name, 'expires_at', expires_at_param)
  );
  
  RETURN true;
END;
$$;

-- Function to remove role from user
CREATE OR REPLACE FUNCTION remove_user_role(
  target_user_id uuid,
  role_name text
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  role_record user_roles%ROWTYPE;
BEGIN
  -- Check if current user has permission to manage roles
  IF NOT has_permission(auth.uid(), 'manage_users') THEN
    RAISE EXCEPTION 'Insufficient permissions to remove roles';
  END IF;
  
  -- Get role
  SELECT * INTO role_record FROM user_roles WHERE name = role_name AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Role not found: %', role_name;
  END IF;
  
  -- Deactivate role assignment
  UPDATE user_role_assignments 
  SET is_active = false
  WHERE user_id = target_user_id AND role_id = role_record.id;
  
  -- Log the action
  PERFORM log_admin_action(
    'remove_role',
    'user',
    target_user_id::text,
    jsonb_build_object('role', role_name)
  );
  
  RETURN true;
END;
$$;

-- Insert default roles
INSERT INTO user_roles (name, display_name, description, is_system_role) VALUES
  ('super_admin', 'Super Administrator', 'Full system access with all permissions', true),
  ('admin', 'Administrator', 'Administrative access to manage users and organizations', true),
  ('project_manager', 'Project Manager', 'Can manage projects and assets within organizations', true),
  ('user', 'Standard User', 'Basic user with access to assigned projects', true)
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO user_permissions (name, display_name, description, category) VALUES
  -- User Management
  ('manage_users', 'Manage Users', 'Create, update, and delete user accounts', 'user_management'),
  ('view_users', 'View Users', 'View user accounts and profiles', 'user_management'),
  ('assign_roles', 'Assign Roles', 'Assign and remove roles from users', 'user_management'),
  
  -- Organization Management
  ('manage_organizations', 'Manage Organizations', 'Create, update, and delete organizations', 'organization_management'),
  ('view_organizations', 'View Organizations', 'View organization details and members', 'organization_management'),
  ('manage_org_members', 'Manage Organization Members', 'Add and remove organization members', 'organization_management'),
  
  -- Project Management
  ('manage_projects', 'Manage Projects', 'Create, update, and delete projects', 'project_management'),
  ('view_projects', 'View Projects', 'View project details and assets', 'project_management'),
  ('manage_assets', 'Manage Assets', 'Create, update, and delete assets', 'project_management'),
  ('view_assets', 'View Assets', 'View asset details and data', 'project_management'),
  
  -- System Administration
  ('system_settings', 'System Settings', 'Modify system-wide settings and configuration', 'system_admin'),
  ('view_audit_logs', 'View Audit Logs', 'Access system audit logs and user activity', 'system_admin'),
  ('manage_permissions', 'Manage Permissions', 'Create and modify permission definitions', 'system_admin'),
  ('manage_roles', 'Manage Roles', 'Create and modify role definitions', 'system_admin'),
  
  -- Data Management
  ('export_data', 'Export Data', 'Export system data and reports', 'data_management'),
  ('import_data', 'Import Data', 'Import data into the system', 'data_management'),
  ('backup_data', 'Backup Data', 'Create and manage system backups', 'data_management')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to roles
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

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_roles_updated_at') THEN
    CREATE TRIGGER update_user_roles_updated_at
      BEFORE UPDATE ON user_roles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;