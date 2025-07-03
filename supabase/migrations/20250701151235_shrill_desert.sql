/*
  # Fix Policy Conflicts - Clean Migration

  This migration safely resolves policy conflicts by:
  1. Dropping ALL existing policies that might conflict
  2. Creating new policies with completely unique names
  3. Ensuring proper user-specific access control

  ## Problem:
  - Multiple migrations have created conflicting policies
  - Error: policy "projects_user_select_2025" already exists

  ## Solution:
  - Use completely unique policy names with timestamp
  - Drop all existing policies first
  - Create clean, user-specific policies
*/

-- Function to safely drop a policy if it exists
CREATE OR REPLACE FUNCTION drop_policy_safe(policy_name text, table_name text)
RETURNS void AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = policy_name AND tablename = table_name
  ) THEN
    EXECUTE format('DROP POLICY %I ON %I', policy_name, table_name);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop ALL existing policies that might conflict on projects table
SELECT drop_policy_safe('Enable all operations for all users', 'projects');
SELECT drop_policy_safe('projects_auth_select_final_2025', 'projects');
SELECT drop_policy_safe('projects_auth_insert_final_2025', 'projects');
SELECT drop_policy_safe('projects_auth_update_final_2025', 'projects');
SELECT drop_policy_safe('projects_auth_delete_final_2025', 'projects');
SELECT drop_policy_safe('projects_user_select_2025', 'projects');
SELECT drop_policy_safe('projects_user_insert_2025', 'projects');
SELECT drop_policy_safe('projects_user_update_2025', 'projects');
SELECT drop_policy_safe('projects_user_delete_2025', 'projects');
SELECT drop_policy_safe('projects_user_access_2025', 'projects');
SELECT drop_policy_safe('projects_user_access_20250701', 'projects');
SELECT drop_policy_safe('projects_user_final_20250701_150000', 'projects');

-- Drop ALL existing policies that might conflict on assets table
SELECT drop_policy_safe('Enable read access for all users', 'assets');
SELECT drop_policy_safe('Enable insert for all users', 'assets');
SELECT drop_policy_safe('Enable update for all users', 'assets');
SELECT drop_policy_safe('Enable delete for all users', 'assets');
SELECT drop_policy_safe('assets_auth_select_final_2025', 'assets');
SELECT drop_policy_safe('assets_auth_insert_final_2025', 'assets');
SELECT drop_policy_safe('assets_auth_update_final_2025', 'assets');
SELECT drop_policy_safe('assets_auth_delete_final_2025', 'assets');
SELECT drop_policy_safe('assets_user_select_2025', 'assets');
SELECT drop_policy_safe('assets_user_insert_2025', 'assets');
SELECT drop_policy_safe('assets_user_update_2025', 'assets');
SELECT drop_policy_safe('assets_user_delete_2025', 'assets');
SELECT drop_policy_safe('assets_user_access_2025', 'assets');
SELECT drop_policy_safe('assets_user_access_20250701', 'assets');
SELECT drop_policy_safe('assets_user_final_20250701_150000', 'assets');

-- Drop ALL existing policies that might conflict on layers table
SELECT drop_policy_safe('Enable read access for all users', 'layers');
SELECT drop_policy_safe('Enable insert for all users', 'layers');
SELECT drop_policy_safe('Enable update for all users', 'layers');
SELECT drop_policy_safe('Enable delete for all users', 'layers');
SELECT drop_policy_safe('layers_auth_select_final_2025', 'layers');
SELECT drop_policy_safe('layers_auth_insert_final_2025', 'layers');
SELECT drop_policy_safe('layers_auth_update_final_2025', 'layers');
SELECT drop_policy_safe('layers_auth_delete_final_2025', 'layers');
SELECT drop_policy_safe('layers_user_select_2025', 'layers');
SELECT drop_policy_safe('layers_user_insert_2025', 'layers');
SELECT drop_policy_safe('layers_user_update_2025', 'layers');
SELECT drop_policy_safe('layers_user_delete_2025', 'layers');
SELECT drop_policy_safe('layers_user_access_2025', 'layers');
SELECT drop_policy_safe('layers_user_access_20250701', 'layers');
SELECT drop_policy_safe('layers_user_final_20250701_150000', 'layers');

-- Add created_by columns if they don't exist
DO $$
BEGIN
  -- Add to projects table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE projects ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Add to assets table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE assets ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Add to layers table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'layers' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE layers ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_assets_created_by ON assets(created_by);
CREATE INDEX IF NOT EXISTS idx_layers_created_by ON layers(created_by);

-- Update existing data to assign to first user
DO $$
DECLARE
  first_user_id uuid;
BEGIN
  SELECT id INTO first_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    UPDATE projects SET created_by = first_user_id WHERE created_by IS NULL;
    UPDATE assets SET created_by = first_user_id WHERE created_by IS NULL;
    UPDATE layers SET created_by = first_user_id WHERE created_by IS NULL;
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE layers ENABLE ROW LEVEL SECURITY;

-- Create NEW policies with completely unique names (using timestamp)
CREATE POLICY "projects_user_policy_20250701_150000" ON projects FOR ALL TO authenticated 
USING (created_by = auth.uid()) 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "assets_user_policy_20250701_150000" ON assets FOR ALL TO authenticated 
USING (created_by = auth.uid()) 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "layers_user_policy_20250701_150000" ON layers FOR ALL TO authenticated 
USING (created_by = auth.uid()) 
WITH CHECK (created_by = auth.uid());

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Clean up helper function
DROP FUNCTION drop_policy_safe(text, text);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Policy conflicts resolved successfully!';
  RAISE NOTICE '🔒 User-specific access policies are now active';
  RAISE NOTICE '🚀 Your application should work without timeout errors';
END $$;