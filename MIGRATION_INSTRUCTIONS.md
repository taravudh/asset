# Database Migration Instructions

## Problem: Connection Timeout Error

You're experiencing a connection timeout error when trying to delete projects or perform other database operations. This happens because the database schema is missing the `created_by` column that the application expects.

## Solution: Apply the Migration

### Step 1: Go to Supabase Dashboard
1. Open your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar

### Step 2: Run the Migration
Copy and paste this SQL into the SQL Editor and click **RUN**:

```sql
-- Add created_by column to projects table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE projects ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;
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
```

### Step 3: Verify Success
After running the migration, you should see:
- ✅ No error messages
- ✅ "Success" message or similar confirmation

### Step 4: Test the App
1. Refresh your application
2. Sign in
3. Try to delete a project
4. The connection timeout error should be resolved

## What This Migration Does:

### 🔗 **Adds User Association**
- Links projects, assets, and layers to specific users
- Ensures data privacy between users

### 🔒 **Updates Security**
- Users can only see their own projects and assets
- Prevents data leakage between accounts

### 📊 **Preserves Existing Data**
- Safely migrates any existing projects to the first user
- No data loss during the upgrade

### 🚀 **Improves Performance**
- Adds indexes for faster queries
- Creates a safe deletion function to prevent timeouts

## If You Still Have Issues:

1. **Check the browser console** for specific error messages
2. **Try signing out and back in** to refresh your session
3. **Clear your browser cache** and local storage
4. **Contact support** with any specific error messages you see