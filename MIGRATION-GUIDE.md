# Admin System Migration Guide

## 🎯 Apply Database Migrations

You have 4 migration files that need to be applied in order:

### Step 1: Go to Supabase Dashboard
1. Open your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar

### Step 2: Apply Migrations in Order

Copy and paste each migration file content into the SQL Editor and run them **in this exact order**:

#### Migration 1: Organizations System
```sql
-- File: supabase/migrations/20250629072632_black_firefly.sql
-- This creates the organization structure and updates existing tables
```
**Status:** ✅ Ready to apply

#### Migration 2: Assets and Layers
```sql
-- File: supabase/migrations/20250629074316_floating_lake.sql  
-- This ensures assets and layers tables are properly configured
```
**Status:** ✅ Ready to apply

#### Migration 3: Projects System
```sql
-- File: supabase/migrations/20250629074328_scarlet_boat.sql
-- This creates the projects system with proper relationships
```
**Status:** ✅ Ready to apply

#### Migration 4: Admin Roles System
```sql
-- File: supabase/migrations/20250629080306_yellow_shape.sql
-- This creates the complete admin role and permission system
```
**Status:** ✅ Ready to apply

### Step 3: Verify Migration Success

After running each migration, check for:
- ✅ No error messages in the SQL Editor
- ✅ Tables created successfully
- ✅ Functions and triggers working
- ✅ RLS policies applied

### Step 4: Create Your First Admin User

Once migrations are complete, you have several options:

#### Option A: Sign up with admin email
1. Use the app's signup form
2. Register with: `admin@company.com` (or similar admin email)
3. The system will auto-detect admin status

#### Option B: Use SQL to assign admin role
```sql
-- First sign up normally, then run this SQL:
-- Replace 'your-user-id' with actual user ID from auth.users table

SELECT assign_user_role(
  'your-user-id'::uuid, 
  'super_admin'
);
```

#### Option C: Check existing users
```sql
-- See all current users
SELECT id, email, created_at FROM auth.users;

-- Assign admin role to existing user
SELECT assign_user_role(
  'user-id-here'::uuid, 
  'super_admin'
);
```

## 🔍 Verification Steps

### 1. Check Tables Created
```sql
-- Verify all admin tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_roles', 
  'user_permissions', 
  'role_permissions', 
  'user_role_assignments',
  'organizations',
  'organization_members'
);
```

### 2. Check Default Roles
```sql
-- Verify default roles were created
SELECT name, display_name, description FROM user_roles WHERE is_active = true;
```

### 3. Check Default Permissions
```sql
-- Verify permissions were created
SELECT name, display_name, category FROM user_permissions WHERE is_active = true;
```

### 4. Test Role Assignment
```sql
-- Check if role assignment function works
SELECT has_role(auth.uid(), 'super_admin');
```

## 🎉 Success Indicators

You'll know the setup worked when:
- ✅ All SQL migrations run without errors
- ✅ Tables and functions are created
- ✅ You can sign in to the app
- ✅ Admin users see purple admin badge
- ✅ "Admin Dashboard" option appears in user menu
- ✅ Admin dashboard loads with user management

## 🚨 Troubleshooting

### Common Issues:

**1. Migration Errors**
- Run migrations one at a time
- Check for syntax errors in SQL Editor
- Ensure you have proper permissions

**2. RLS Policy Issues**
- Verify policies were created correctly
- Check that authenticated users have proper access

**3. Function Not Found**
- Ensure all functions were created
- Check function permissions

**4. Admin Access Denied**
- Verify user has admin role assigned
- Check role assignment is active
- Ensure RLS policies allow admin access

### Debug Queries:
```sql
-- Check current user's roles
SELECT * FROM get_user_roles(auth.uid());

-- Check current user's permissions  
SELECT * FROM get_user_permissions(auth.uid());

-- View all role assignments
SELECT u.email, r.name as role, ura.assigned_at
FROM auth.users u
JOIN user_role_assignments ura ON u.id = ura.user_id  
JOIN user_roles r ON ura.role_id = r.id
WHERE ura.is_active = true;
```

## 📞 Need Help?

If you encounter issues:
1. Check the Supabase logs for detailed error messages
2. Verify your database permissions
3. Ensure you're using the correct project
4. Try running migrations individually to isolate issues

Once complete, you'll have a fully functional admin system ready for production deployment!