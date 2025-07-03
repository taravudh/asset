# 🔧 Troubleshooting Database Issues

## Current Error: "Could not find the 'created_by' column"

This error indicates that the database migration hasn't been applied yet. Here are the steps to resolve it:

### Option 1: Apply the Migration (Recommended)

1. **Go to Supabase Dashboard**
   - Open [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Go to **SQL Editor**

2. **Run this SQL migration:**

```sql
-- Add created_by column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add created_by column to assets table  
ALTER TABLE assets ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add created_by column to layers table
ALTER TABLE layers ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_assets_created_by ON assets(created_by);
CREATE INDEX IF NOT EXISTS idx_layers_created_by ON layers(created_by);

-- Update existing projects to belong to the first user
UPDATE projects SET created_by = (SELECT id FROM auth.users LIMIT 1) WHERE created_by IS NULL;
UPDATE assets SET created_by = (SELECT id FROM auth.users LIMIT 1) WHERE created_by IS NULL;
UPDATE layers SET created_by = (SELECT id FROM auth.users LIMIT 1) WHERE created_by IS NULL;
```

3. **Click RUN**

4. **Refresh your app**

### Option 2: Temporary Fix (If migration fails)

The app has been updated with fallback logic that will:
- ✅ Try to use the `created_by` column if it exists
- ✅ Fall back to working without it if the column doesn't exist
- ✅ Show better error messages

### Option 3: Reset Database (Nuclear option)

If nothing else works:

1. Go to **Settings → General** in Supabase
2. Scroll down to **Reset Database**
3. This will delete all data but fix schema issues
4. You'll need to recreate your projects

### What Should Happen After Fix:

✅ **No more "created_by" errors**
✅ **See your existing projects in a beautiful grid**
✅ **Projects persist between sessions**
✅ **Proper user data isolation**

### If You Still See Errors:

1. **Check browser console** for detailed error messages
2. **Try signing out and back in**
3. **Clear browser cache/localStorage**
4. **Check Supabase project status** in dashboard

### Alternative: Use Without Database

If you want to test the app without database:
1. The app will work in "demo mode"
2. Projects won't persist between sessions
3. No user authentication required
4. All features work except data persistence

Let me know if you need help with any of these steps!