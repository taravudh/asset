/*
  # Fix Policy Conflicts

  This migration cleans up existing policies that may conflict and ensures
  a clean state for the admin roles system.

  1. Drop all existing policies that might conflict
  2. Recreate them with proper names and logic
  3. Ensure no recursive policy issues
*/

-- Drop ALL existing policies to start fresh
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on user_roles
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_roles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_roles';
    END LOOP;
    
    -- Drop all policies on user_permissions
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_permissions') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_permissions';
    END LOOP;
    
    -- Drop all policies on role_permissions
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'role_permissions') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON role_permissions';
    END LOOP;
    
    -- Drop all policies on user_role_assignments
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_role_assignments') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_role_assignments';
    END LOOP;
    
    -- Drop all policies on audit_logs
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'audit_logs') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON audit_logs';
    END LOOP;
    
    -- Drop all policies on organizations
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'organizations') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON organizations';
    END LOOP;
    
    -- Drop all policies on organization_members
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'organization_members') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON organization_members';
    END LOOP;
    
    -- Drop all policies on organization_invitations
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'organization_invitations') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON organization_invitations';
    END LOOP;
    
    -- Drop all policies on projects
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'projects') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON projects';
    END LOOP;
    
    -- Drop all policies on assets
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'assets') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON assets';
    END LOOP;
    
    -- Drop all policies on layers
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'layers') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON layers';
    END LOOP;
END $$;

-- Create simple, non-recursive policies for all tables

-- User roles policies
CREATE POLICY "user_roles_select_policy" ON user_roles FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "user_roles_insert_policy" ON user_roles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "user_roles_update_policy" ON user_roles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "user_roles_delete_policy" ON user_roles FOR DELETE TO authenticated USING (true);

-- User permissions policies
CREATE POLICY "user_permissions_select_policy" ON user_permissions FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "user_permissions_insert_policy" ON user_permissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "user_permissions_update_policy" ON user_permissions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "user_permissions_delete_policy" ON user_permissions FOR DELETE TO authenticated USING (true);

-- Role permissions policies
CREATE POLICY "role_permissions_select_policy" ON role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_permissions_insert_policy" ON role_permissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "role_permissions_update_policy" ON role_permissions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "role_permissions_delete_policy" ON role_permissions FOR DELETE TO authenticated USING (true);

-- User role assignments policies
CREATE POLICY "user_role_assignments_select_policy" ON user_role_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_role_assignments_insert_policy" ON user_role_assignments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "user_role_assignments_update_policy" ON user_role_assignments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "user_role_assignments_delete_policy" ON user_role_assignments FOR DELETE TO authenticated USING (true);

-- Audit logs policies
CREATE POLICY "audit_logs_select_policy" ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_logs_insert_policy" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Organizations policies
CREATE POLICY "organizations_select_policy" ON organizations FOR SELECT TO authenticated USING (true);
CREATE POLICY "organizations_insert_policy" ON organizations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "organizations_update_policy" ON organizations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "organizations_delete_policy" ON organizations FOR DELETE TO authenticated USING (true);

-- Organization members policies
CREATE POLICY "organization_members_select_policy" ON organization_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "organization_members_insert_policy" ON organization_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "organization_members_update_policy" ON organization_members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "organization_members_delete_policy" ON organization_members FOR DELETE TO authenticated USING (true);

-- Organization invitations policies
CREATE POLICY "organization_invitations_select_policy" ON organization_invitations FOR SELECT TO authenticated USING (true);
CREATE POLICY "organization_invitations_insert_policy" ON organization_invitations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "organization_invitations_update_policy" ON organization_invitations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "organization_invitations_delete_policy" ON organization_invitations FOR DELETE TO authenticated USING (true);

-- Projects policies
CREATE POLICY "projects_select_policy" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_insert_policy" ON projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "projects_update_policy" ON projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "projects_delete_policy" ON projects FOR DELETE TO authenticated USING (true);

-- Assets policies
CREATE POLICY "assets_select_policy" ON assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "assets_insert_policy" ON assets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "assets_update_policy" ON assets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "assets_delete_policy" ON assets FOR DELETE TO authenticated USING (true);

-- Layers policies
CREATE POLICY "layers_select_policy" ON layers FOR SELECT TO authenticated USING (true);
CREATE POLICY "layers_insert_policy" ON layers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "layers_update_policy" ON layers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "layers_delete_policy" ON layers FOR DELETE TO authenticated USING (true);

-- Ensure all tables have RLS enabled
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE layers ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;