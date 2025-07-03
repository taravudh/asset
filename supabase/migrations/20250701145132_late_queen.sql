/*
  # Fix Policy Conflicts and Complete Migration
  
  This migration safely handles the case where some policies already exist
  and completes the migration process without errors.
  
  1. Safely drop existing policies (if they exist)
  2. Add missing columns (if they don't exist)
  3. Create new policies with unique names
  4. Update existing data
  5. Add debugging functions
*/

-- Function to safely drop a policy if it exists
CREATE OR REPLACE FUNCTION drop_policy_if_exists(policy_name text, table_name text)
RETURNS void AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = policy_name AND tablename = table_name
  ) THEN
    EXECUTE format('DROP POLICY %I ON %I', policy_name, table_name);
    RAISE NOTICE 'Dropped existing policy: % on table %', policy_name, table_name;
  ELSE
    RAISE NOTICE 'Policy % on table % does not exist, skipping', policy_name, table_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add created_by column to projects table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE projects ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added created_by column to projects table';
  ELSE
    RAISE NOTICE 'created_by column already exists in projects table';
  END IF;
END $$;

-- Add created_by column to assets table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE assets ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added created_by column to assets table';
  ELSE
    RAISE NOTICE 'created_by column already exists in assets table';
  END IF;
END $$;

-- Add created_by column to layers table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'layers' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE layers ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added created_by column to layers table';
  ELSE
    RAISE NOTICE 'created_by column already exists in layers table';
  END IF;
END $$;

-- Create indexes for performance (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_assets_created_by ON assets(created_by);
CREATE INDEX IF NOT EXISTS idx_layers_created_by ON layers(created_by);

-- Safely drop ALL existing policies that might conflict
SELECT drop_policy_if_exists('projects_auth_select_final_2025', 'projects');
SELECT drop_policy_if_exists('projects_auth_insert_final_2025', 'projects');
SELECT drop_policy_if_exists('projects_auth_update_final_2025', 'projects');
SELECT drop_policy_if_exists('projects_auth_delete_final_2025', 'projects');
SELECT drop_policy_if_exists('projects_user_select_2025', 'projects');
SELECT drop_policy_if_exists('projects_user_insert_2025', 'projects');
SELECT drop_policy_if_exists('projects_user_update_2025', 'projects');
SELECT drop_policy_if_exists('projects_user_delete_2025', 'projects');
SELECT drop_policy_if_exists('projects_user_access_2025', 'projects');

SELECT drop_policy_if_exists('assets_auth_select_final_2025', 'assets');
SELECT drop_policy_if_exists('assets_auth_insert_final_2025', 'assets');
SELECT drop_policy_if_exists('assets_auth_update_final_2025', 'assets');
SELECT drop_policy_if_exists('assets_auth_delete_final_2025', 'assets');
SELECT drop_policy_if_exists('assets_user_select_2025', 'assets');
SELECT drop_policy_if_exists('assets_user_insert_2025', 'assets');
SELECT drop_policy_if_exists('assets_user_update_2025', 'assets');
SELECT drop_policy_if_exists('assets_user_delete_2025', 'assets');
SELECT drop_policy_if_exists('assets_user_access_2025', 'assets');

SELECT drop_policy_if_exists('layers_auth_select_final_2025', 'layers');
SELECT drop_policy_if_exists('layers_auth_insert_final_2025', 'layers');
SELECT drop_policy_if_exists('layers_auth_update_final_2025', 'layers');
SELECT drop_policy_if_exists('layers_auth_delete_final_2025', 'layers');
SELECT drop_policy_if_exists('layers_user_select_2025', 'layers');
SELECT drop_policy_if_exists('layers_user_insert_2025', 'layers');
SELECT drop_policy_if_exists('layers_user_update_2025', 'layers');
SELECT drop_policy_if_exists('layers_user_delete_2025', 'layers');
SELECT drop_policy_if_exists('layers_user_access_2025', 'layers');

-- Ensure RLS is enabled on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE layers ENABLE ROW LEVEL SECURITY;

-- Create new user-specific policies with unique names (using timestamp)
CREATE POLICY "projects_user_access_20250701" ON projects FOR ALL TO authenticated 
USING (created_by = auth.uid()) 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "assets_user_access_20250701" ON assets FOR ALL TO authenticated 
USING (created_by = auth.uid()) 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "layers_user_access_20250701" ON layers FOR ALL TO authenticated 
USING (created_by = auth.uid()) 
WITH CHECK (created_by = auth.uid());

-- Update existing data to set created_by to the first user (for backward compatibility)
DO $$
DECLARE
  first_user_id uuid;
  projects_updated integer;
  assets_updated integer;
  layers_updated integer;
BEGIN
  -- Get the first user ID from auth.users
  SELECT id INTO first_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    -- Update projects without created_by
    UPDATE projects 
    SET created_by = first_user_id 
    WHERE created_by IS NULL;
    GET DIAGNOSTICS projects_updated = ROW_COUNT;
    
    -- Update assets without created_by
    UPDATE assets 
    SET created_by = first_user_id 
    WHERE created_by IS NULL;
    GET DIAGNOSTICS assets_updated = ROW_COUNT;
    
    -- Update layers without created_by
    UPDATE layers 
    SET created_by = first_user_id 
    WHERE created_by IS NULL;
    GET DIAGNOSTICS layers_updated = ROW_COUNT;
    
    RAISE NOTICE 'Updated existing records to be owned by user: %', first_user_id;
    RAISE NOTICE 'Projects updated: %, Assets updated: %, Layers updated: %', 
                 projects_updated, assets_updated, layers_updated;
  ELSE
    RAISE NOTICE 'No users found - existing records will remain unassigned until first user signs up';
  END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Create or replace the debugging function
CREATE OR REPLACE FUNCTION debug_user_projects()
RETURNS TABLE (
  user_email text,
  user_id uuid,
  project_count bigint,
  project_names text[],
  asset_count bigint,
  layer_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.email::text,
    u.id,
    COUNT(DISTINCT p.id),
    ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL),
    COUNT(DISTINCT a.id),
    COUNT(DISTINCT l.id)
  FROM auth.users u
  LEFT JOIN projects p ON u.id = p.created_by AND p.is_active = true
  LEFT JOIN assets a ON u.id = a.created_by
  LEFT JOIN layers l ON u.id = l.created_by
  GROUP BY u.id, u.email
  ORDER BY u.created_at;
END;
$$;

-- Grant execute permission on the debug function
GRANT EXECUTE ON FUNCTION debug_user_projects() TO authenticated;

-- Create a function to check migration status
CREATE OR REPLACE FUNCTION check_migration_status()
RETURNS TABLE (
  table_name text,
  has_created_by_column boolean,
  policy_count bigint,
  row_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_name::text,
    EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = t.table_name AND column_name = 'created_by'
    ) as has_created_by_column,
    (
      SELECT COUNT(*) FROM pg_policies 
      WHERE tablename = t.table_name
    ) as policy_count,
    CASE 
      WHEN t.table_name = 'projects' THEN (SELECT COUNT(*) FROM projects)
      WHEN t.table_name = 'assets' THEN (SELECT COUNT(*) FROM assets)
      WHEN t.table_name = 'layers' THEN (SELECT COUNT(*) FROM layers)
      ELSE 0
    END as row_count
  FROM (VALUES ('projects'), ('assets'), ('layers')) AS t(table_name);
END;
$$;

-- Grant execute permission on the status function
GRANT EXECUTE ON FUNCTION check_migration_status() TO authenticated;

-- Clean up the helper function
DROP FUNCTION drop_policy_if_exists(text, text);

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '📋 Run "SELECT * FROM check_migration_status();" to verify the migration';
  RAISE NOTICE '👥 Run "SELECT * FROM debug_user_projects();" to see user data';
END $$;