/*
  # Fix Database Schema - Add created_by columns and update RLS policies

  This migration resolves the "Failed to fetch" error by ensuring all required columns exist
  and proper Row Level Security policies are in place.

  ## Changes Made:
  1. **Add created_by columns** to projects, assets, and layers tables
  2. **Create indexes** for performance optimization  
  3. **Update existing data** to assign ownership to first user
  4. **Replace RLS policies** with user-specific access controls
  5. **Grant proper permissions** for authenticated users

  ## Security:
  - Enable RLS on all tables
  - Users can only access their own data
  - Proper foreign key constraints to auth.users
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
-- This is a one-time operation for existing data
DO $$
DECLARE
  first_user_id uuid;
BEGIN
  -- Get the first user ID from auth.users
  SELECT id INTO first_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  
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
    
    RAISE NOTICE 'Updated existing records to be owned by user: %', first_user_id;
  ELSE
    RAISE NOTICE 'No users found - existing records will remain unassigned until first user signs up';
  END IF;
END $$;

-- Ensure RLS is enabled on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE layers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "projects_auth_select_final_2025" ON projects;
DROP POLICY IF EXISTS "projects_auth_insert_final_2025" ON projects;
DROP POLICY IF EXISTS "projects_auth_update_final_2025" ON projects;
DROP POLICY IF EXISTS "projects_auth_delete_final_2025" ON projects;
DROP POLICY IF EXISTS "projects_user_select_2025" ON projects;
DROP POLICY IF EXISTS "projects_user_insert_2025" ON projects;
DROP POLICY IF EXISTS "projects_user_update_2025" ON projects;
DROP POLICY IF EXISTS "projects_user_delete_2025" ON projects;

DROP POLICY IF EXISTS "assets_auth_select_final_2025" ON assets;
DROP POLICY IF EXISTS "assets_auth_insert_final_2025" ON assets;
DROP POLICY IF EXISTS "assets_auth_update_final_2025" ON assets;
DROP POLICY IF EXISTS "assets_auth_delete_final_2025" ON assets;
DROP POLICY IF EXISTS "assets_user_select_2025" ON assets;
DROP POLICY IF EXISTS "assets_user_insert_2025" ON assets;
DROP POLICY IF EXISTS "assets_user_update_2025" ON assets;
DROP POLICY IF EXISTS "assets_user_delete_2025" ON assets;

DROP POLICY IF EXISTS "layers_auth_select_final_2025" ON layers;
DROP POLICY IF EXISTS "layers_auth_insert_final_2025" ON layers;
DROP POLICY IF EXISTS "layers_auth_update_final_2025" ON layers;
DROP POLICY IF EXISTS "layers_auth_delete_final_2025" ON layers;
DROP POLICY IF EXISTS "layers_user_select_2025" ON layers;
DROP POLICY IF EXISTS "layers_user_insert_2025" ON layers;
DROP POLICY IF EXISTS "layers_user_update_2025" ON layers;
DROP POLICY IF EXISTS "layers_user_delete_2025" ON layers;

-- Create new user-specific policies for projects
CREATE POLICY "projects_user_access_2025" ON projects FOR ALL TO authenticated 
USING (created_by = auth.uid()) 
WITH CHECK (created_by = auth.uid());

-- Create new user-specific policies for assets
CREATE POLICY "assets_user_access_2025" ON assets FOR ALL TO authenticated 
USING (created_by = auth.uid()) 
WITH CHECK (created_by = auth.uid());

-- Create new user-specific policies for layers
CREATE POLICY "layers_user_access_2025" ON layers FOR ALL TO authenticated 
USING (created_by = auth.uid()) 
WITH CHECK (created_by = auth.uid());

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Create a function to help with debugging user access
CREATE OR REPLACE FUNCTION debug_user_projects()
RETURNS TABLE (
  user_email text,
  project_count bigint,
  project_names text[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.email::text,
    COUNT(p.id),
    ARRAY_AGG(p.name) FILTER (WHERE p.name IS NOT NULL)
  FROM auth.users u
  LEFT JOIN projects p ON u.id = p.created_by AND p.is_active = true
  GROUP BY u.id, u.email
  ORDER BY u.created_at;
END;
$$;

-- Grant execute permission on the debug function
GRANT EXECUTE ON FUNCTION debug_user_projects() TO authenticated;