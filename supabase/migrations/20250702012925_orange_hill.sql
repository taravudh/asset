/*
  Fix Database Connection Timeout

  This migration resolves the connection timeout error by:
  1. Adding the missing created_by columns to tables
  2. Creating proper indexes for performance
  3. Setting up appropriate RLS policies
  4. Migrating existing data
*/

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_assets_created_by ON assets(created_by);
CREATE INDEX IF NOT EXISTS idx_layers_created_by ON layers(created_by);

-- Update existing data to set created_by to the first user (for backward compatibility)
DO $$
DECLARE
  first_user_id uuid;
  projects_updated integer := 0;
  assets_updated integer := 0;
  layers_updated integer := 0;
BEGIN
  -- Get the first user ID from auth.users
  SELECT id INTO first_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    -- Update projects without created_by
    UPDATE projects SET created_by = first_user_id WHERE created_by IS NULL;
    GET DIAGNOSTICS projects_updated = ROW_COUNT;
    
    -- Update assets without created_by
    UPDATE assets SET created_by = first_user_id WHERE created_by IS NULL;
    GET DIAGNOSTICS assets_updated = ROW_COUNT;
    
    -- Update layers without created_by
    UPDATE layers SET created_by = first_user_id WHERE created_by IS NULL;
    GET DIAGNOSTICS layers_updated = ROW_COUNT;
    
    RAISE NOTICE 'Updated existing records to be owned by user: %', first_user_id;
    RAISE NOTICE 'Projects updated: %, Assets updated: %, Layers updated: %', 
                 projects_updated, assets_updated, layers_updated;
  ELSE
    RAISE NOTICE 'No users found - existing records will remain unassigned until first user signs up';
  END IF;
END $$;

-- Ensure RLS is enabled on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE layers ENABLE ROW LEVEL SECURITY;

-- Create new user-specific policies with unique names
CREATE POLICY "projects_user_access_20250702" ON projects FOR ALL TO authenticated 
USING (
  CASE 
    WHEN created_by IS NULL THEN true  -- Allow access to legacy data
    ELSE created_by = auth.uid()       -- User-specific access
  END
) 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "assets_user_access_20250702" ON assets FOR ALL TO authenticated 
USING (
  CASE 
    WHEN created_by IS NULL THEN true  -- Allow access to legacy data
    ELSE created_by = auth.uid()       -- User-specific access
  END
) 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "layers_user_access_20250702" ON layers FOR ALL TO authenticated 
USING (
  CASE 
    WHEN created_by IS NULL THEN true  -- Allow access to legacy data
    ELSE created_by = auth.uid()       -- User-specific access
  END
) 
WITH CHECK (created_by = auth.uid());

-- Create a safe project deletion function
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
  
  -- Check if project exists and user owns it
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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION safe_delete_project(uuid) TO authenticated;