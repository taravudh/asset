# 🔧 Database Migration Required

## The Issue
The error "Could not find the 'created_by' column of 'projects' in the schema cache" means the database migration hasn't been applied yet.

## Solution: Apply the Migration

### Step 1: Go to Supabase Dashboard
1. Open your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar

### Step 2: Run the Migration
Copy and paste this SQL into the SQL Editor and click **RUN**:

```sql
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
```

### Step 3: Verify Success
After running the migration, you should see:
- ✅ No error messages
- ✅ "Success. No rows returned" or similar success message

### Step 4: Test the App
1. Refresh your application
2. Sign in
3. You should now see your existing projects!

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

## After Migration Success:

You'll see a beautiful project selection screen with:
- **Your existing projects** displayed as elegant cards
- **Project details** with creation dates and descriptions
- **Create new project** option
- **Smooth animations** and professional design

The app will remember all your projects and assets between sessions!