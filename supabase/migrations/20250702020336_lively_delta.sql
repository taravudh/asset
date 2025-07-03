-- COMPREHENSIVE DATABASE FIX FOR CONNECTION ERRORS
-- This SQL script fixes all connection timeout issues by properly setting up the database schema
-- and ensuring user-specific data access works correctly.

-- 1. Add created_by columns to all tables if they don't exist
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

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_assets_created_by ON assets(created_by);
CREATE INDEX IF NOT EXISTS idx_layers_created_by ON layers(created_by);

-- 3. Update existing data to assign to first user
DO $$
DECLARE
  first_user_id uuid;
BEGIN
  -- Get the first user ID from auth.users
  SELECT id INTO first_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    -- Update projects without created_by
    UPDATE projects SET created_by = first_user_id WHERE created_by IS NULL;
    
    -- Update assets without created_by
    UPDATE assets SET created_by = first_user_id WHERE created_by IS NULL;
    
    -- Update layers without created_by
    UPDATE layers SET created_by = first_user_id WHERE created_by IS NULL;
  END IF;
END $$;

-- 4. Drop all existing policies to avoid conflicts
DO $$
DECLARE
  pol_record RECORD;
BEGIN
  -- Drop all policies on projects
  FOR pol_record IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'projects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON projects', pol_record.policyname);
  END LOOP;
  
  -- Drop all policies on assets
  FOR pol_record IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'assets'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON assets', pol_record.policyname);
  END LOOP;
  
  -- Drop all policies on layers
  FOR pol_record IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'layers'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON layers', pol_record.policyname);
  END LOOP;
END $$;

-- 5. Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE layers ENABLE ROW LEVEL SECURITY;

-- 6. Create simple, working policies with unique names
CREATE POLICY "projects_final_fix" ON projects FOR ALL TO authenticated 
USING (
  CASE 
    WHEN created_by IS NULL THEN true  -- Allow access to legacy data
    ELSE created_by = auth.uid()       -- User-specific access
  END
) 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "assets_final_fix" ON assets FOR ALL TO authenticated 
USING (
  CASE 
    WHEN created_by IS NULL THEN true  -- Allow access to legacy data
    ELSE created_by = auth.uid()       -- User-specific access
  END
) 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "layers_final_fix" ON layers FOR ALL TO authenticated 
USING (
  CASE 
    WHEN created_by IS NULL THEN true  -- Allow access to legacy data
    ELSE created_by = auth.uid()       -- User-specific access
  END
) 
WITH CHECK (created_by = auth.uid());

-- 7. Create a safe project deletion function
CREATE OR REPLACE FUNCTION safe_delete_project(project_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  project_owner uuid;
  assets_deleted integer := 0;
  layers_deleted integer := 0;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Check if project exists
  SELECT created_by INTO project_owner 
  FROM projects 
  WHERE id = project_uuid AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found or already deleted';
  END IF;
  
  -- Check ownership (allow if user owns it OR if created_by is NULL for legacy data)
  IF project_owner IS NOT NULL AND project_owner != current_user_id THEN
    RAISE EXCEPTION 'Permission denied: you do not own this project';
  END IF;
  
  -- Delete related assets first
  DELETE FROM assets 
  WHERE project_id = project_uuid 
  AND (created_by = current_user_id OR created_by IS NULL);
  GET DIAGNOSTICS assets_deleted = ROW_COUNT;
  
  -- Delete related layers
  DELETE FROM layers 
  WHERE project_id = project_uuid 
  AND (created_by = current_user_id OR created_by IS NULL);
  GET DIAGNOSTICS layers_deleted = ROW_COUNT;
  
  -- Soft delete the project (set is_active = false)
  UPDATE projects 
  SET is_active = false, updated_at = now()
  WHERE id = project_uuid 
  AND (created_by = current_user_id OR created_by IS NULL);
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to delete project';
  END IF;
  
  RETURN true;
END;
$$;

-- 8. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION safe_delete_project(uuid) TO authenticated;

-- 9. Create a verification function
CREATE OR REPLACE FUNCTION verify_database_fix()
RETURNS TABLE (
  component text,
  status text,
  details text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_created_by_projects boolean := false;
  has_created_by_assets boolean := false;
  has_created_by_layers boolean := false;
  policy_count integer := 0;
  safe_function_exists boolean := false;
BEGIN
  -- Check created_by columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'created_by'
  ) INTO has_created_by_projects;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'created_by'
  ) INTO has_created_by_assets;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'layers' AND column_name = 'created_by'
  ) INTO has_created_by_layers;
  
  -- Check policies
  SELECT COUNT(*) INTO policy_count FROM pg_policies 
  WHERE tablename IN ('projects', 'assets', 'layers')
  AND policyname LIKE '%final_fix%';
  
  -- Check safe function
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'safe_delete_project'
  ) INTO safe_function_exists;
  
  -- Return status
  RETURN QUERY VALUES 
    ('Database Schema', 
     CASE WHEN has_created_by_projects AND has_created_by_assets AND has_created_by_layers 
          THEN 'READY' ELSE 'INCOMPLETE' END,
     'created_by columns: ' || 
     'projects=' || has_created_by_projects::text || ', ' ||
     'assets=' || has_created_by_assets::text || ', ' ||
     'layers=' || has_created_by_layers::text),
    
    ('Access Policies', 
     CASE WHEN policy_count >= 3 THEN 'READY' ELSE 'INCOMPLETE' END,
     policy_count::text || ' policies active'),
    
    ('Safe Delete Function', 
     CASE WHEN safe_function_exists THEN 'READY' ELSE 'MISSING' END,
     CASE WHEN safe_function_exists THEN 'Function exists and is ready to use' 
          ELSE 'Function not found' END),
    
    ('Overall Status', 
     CASE WHEN has_created_by_projects AND has_created_by_assets AND has_created_by_layers
               AND policy_count >= 3 AND safe_function_exists
          THEN 'FIXED' ELSE 'NEEDS_ATTENTION' END,
     CASE WHEN has_created_by_projects AND has_created_by_assets AND has_created_by_layers
               AND policy_count >= 3 AND safe_function_exists
          THEN 'Database is fixed and ready to use'
          ELSE 'Some components need attention' END);
END;
$$;

-- Grant execute permission on verification function
GRANT EXECUTE ON FUNCTION verify_database_fix() TO authenticated;
GRANT EXECUTE ON FUNCTION verify_database_fix() TO anon;