/*
  # Add created_by columns for user association

  1. Changes
    - Add `created_by` column to `projects` table
    - Add `created_by` column to `assets` table (if not exists)
    - Add indexes for performance
    - Update RLS policies to use created_by for user-specific access

  2. Security
    - Users can only see their own projects and assets
    - Maintain backward compatibility with existing data
*/

-- Add created_by column to projects table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE projects ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add created_by column to assets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE assets ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add created_by column to layers table
DO $$
BEGIN
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

-- Update existing data to set created_by to the first user (for backward compatibility)
-- This is a one-time operation for existing data
DO $$
DECLARE
  first_user_id uuid;
BEGIN
  -- Get the first user ID from auth.users
  SELECT id INTO first_user_id FROM auth.users LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    -- Update projects without created_by
    UPDATE projects 
    SET created_by = first_user_id 
    WHERE created_by IS NULL;
    
    -- Update assets without created_by
    UPDATE assets 
    SET created_by = first_user_id 
    WHERE created_by IS NULL;
    
    -- Update layers without created_by
    UPDATE layers 
    SET created_by = first_user_id 
    WHERE created_by IS NULL;
  END IF;
END $$;

-- Drop existing policies and create new user-specific ones
DROP POLICY IF EXISTS "projects_auth_select_final_2025" ON projects;
DROP POLICY IF EXISTS "projects_auth_insert_final_2025" ON projects;
DROP POLICY IF EXISTS "projects_auth_update_final_2025" ON projects;
DROP POLICY IF EXISTS "projects_auth_delete_final_2025" ON projects;

DROP POLICY IF EXISTS "assets_auth_select_final_2025" ON assets;
DROP POLICY IF EXISTS "assets_auth_insert_final_2025" ON assets;
DROP POLICY IF EXISTS "assets_auth_update_final_2025" ON assets;
DROP POLICY IF EXISTS "assets_auth_delete_final_2025" ON assets;

DROP POLICY IF EXISTS "layers_auth_select_final_2025" ON layers;
DROP POLICY IF EXISTS "layers_auth_insert_final_2025" ON layers;
DROP POLICY IF EXISTS "layers_auth_update_final_2025" ON layers;
DROP POLICY IF EXISTS "layers_auth_delete_final_2025" ON layers;

-- Create new user-specific policies for projects
CREATE POLICY "projects_user_select_2025" ON projects FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "projects_user_insert_2025" ON projects FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "projects_user_update_2025" ON projects FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "projects_user_delete_2025" ON projects FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Create new user-specific policies for assets
CREATE POLICY "assets_user_select_2025" ON assets FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "assets_user_insert_2025" ON assets FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "assets_user_update_2025" ON assets FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "assets_user_delete_2025" ON assets FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Create new user-specific policies for layers
CREATE POLICY "layers_user_select_2025" ON layers FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "layers_user_insert_2025" ON layers FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "layers_user_update_2025" ON layers FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "layers_user_delete_2025" ON layers FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;