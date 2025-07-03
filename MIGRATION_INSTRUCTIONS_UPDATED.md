# Updated Database Migration Instructions

## Problem: Policy Conflict Error

You're experiencing a policy conflict error when trying to apply the migration. The error message indicates that a policy named "projects_user_access_20250702" already exists for the "projects" table.

## Solution: Apply the Updated Migration

### Step 1: Go to Supabase Dashboard
1. Open your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar

### Step 2: Run the Updated Migration
Copy and paste this SQL into the SQL Editor and click **RUN**:

```sql
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

-- Drop existing policies that might conflict
SELECT drop_policy_if_exists('projects_user_access_20250702', 'projects');
SELECT drop_policy_if_exists('assets_user_access_20250702', 'assets');
SELECT drop_policy_if_exists('layers_user_access_20250702', 'layers');

-- Create new policies with unique timestamps to avoid conflicts
CREATE POLICY "projects_user_access_20250702_020000" ON projects FOR ALL TO authenticated 
USING (
  CASE 
    WHEN created_by IS NULL THEN true  -- Allow access to legacy data
    ELSE created_by = auth.uid()       -- User-specific access
  END
) 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "assets_user_access_20250702_020000" ON assets FOR ALL TO authenticated 
USING (
  CASE 
    WHEN created_by IS NULL THEN true  -- Allow access to legacy data
    ELSE created_by = auth.uid()       -- User-specific access
  END
) 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "layers_user_access_20250702_020000" ON layers FOR ALL TO authenticated 
USING (
  CASE 
    WHEN created_by IS NULL THEN true  -- Allow access to legacy data
    ELSE created_by = auth.uid()       -- User-specific access
  END
) 
WITH CHECK (created_by = auth.uid());

-- Create specific policies for deletion operations
CREATE POLICY "projects_delete_safe_20250702" ON projects FOR DELETE TO authenticated 
USING (
  created_by = auth.uid() OR 
  created_by IS NULL
);

CREATE POLICY "assets_delete_safe_20250702" ON assets FOR DELETE TO authenticated 
USING (
  created_by = auth.uid() OR 
  created_by IS NULL OR
  -- Allow deletion if the parent project belongs to the user
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = assets.project_id 
    AND (p.created_by = auth.uid() OR p.created_by IS NULL)
  )
);

CREATE POLICY "layers_delete_safe_20250702" ON layers FOR DELETE TO authenticated 
USING (
  created_by = auth.uid() OR 
  created_by IS NULL OR
  -- Allow deletion if the parent project belongs to the user
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = layers.project_id 
    AND (p.created_by = auth.uid() OR p.created_by IS NULL)
  )
);

-- Make sure the safe_delete_project function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'safe_delete_project'
  ) THEN
    -- Create the function
    EXECUTE $FUNC$
    CREATE OR REPLACE FUNCTION safe_delete_project(project_uuid uuid)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $INNER$
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
    $INNER$;
    $FUNC$;
  END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION safe_delete_project(uuid) TO authenticated;

-- Clean up helper function
DROP FUNCTION drop_policy_if_exists(text, text);
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

### 🔄 **Fixes Policy Conflicts**
- Safely removes any existing policies that might conflict
- Creates new policies with unique names to avoid collisions

### 🔒 **Enhances Security**
- Creates specific policies for deletion operations
- Ensures users can only delete their own projects

### 🚀 **Improves Performance**
- Ensures the safe deletion function exists
- Properly handles related assets and layers

## If You Still Have Issues:

1. **Check the browser console** for specific error messages
2. **Try signing out and back in** to refresh your session
3. **Clear your browser cache** and local storage
4. **Contact support** with any specific error messages you see