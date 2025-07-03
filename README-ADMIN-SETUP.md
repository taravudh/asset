# Admin Roles Database Setup Guide

This guide explains how to set up proper admin roles in your Asset Survey application database.

## 🏗️ Database Schema Overview

The admin role system consists of several interconnected tables:

### Core Tables

1. **`user_roles`** - Defines available roles (admin, user, etc.)
2. **`user_permissions`** - Defines granular permissions 
3. **`role_permissions`** - Links roles to permissions
4. **`user_role_assignments`** - Assigns roles to users
5. **`audit_logs`** - Tracks admin actions for security

### Default Roles Created

- **`super_admin`** - Full system access with all permissions
- **`admin`** - Administrative access to manage users and organizations  
- **`project_manager`** - Can manage projects and assets within organizations
- **`user`** - Basic user with access to assigned projects

### Default Permissions Categories

- **User Management** - Create, update, delete users and assign roles
- **Organization Management** - Manage organizations and memberships
- **Project Management** - Manage projects and assets
- **System Administration** - System settings and audit logs
- **Data Management** - Import/export and backup operations

## 🚀 Quick Setup Steps

### 1. Run the Database Migration

The migration file `20250629080000_admin_roles_system.sql` will:
- Create all necessary tables
- Set up Row Level Security (RLS) policies
- Insert default roles and permissions
- Create helper functions for role checking

### 2. Create Your First Admin User

You have several options:

#### Option A: Through the Application UI
1. Sign up with an email containing "admin" (e.g., `admin@company.com`)
2. The system will automatically detect admin status
3. Use the Admin Dashboard to assign proper roles

#### Option B: Using the Database Functions
```sql
-- First, get the user ID from auth.users
SELECT id, email FROM auth.users WHERE email = 'your-email@company.com';

-- Then assign the super_admin role
SELECT assign_user_role(
  'user-id-here'::uuid, 
  'super_admin'
);
```

#### Option C: Using the CreateAdminUser Component
The application includes a `CreateAdminUser` component that can be used to create admin accounts programmatically.

### 3. Verify Admin Access

Once you have an admin user:
1. Sign in with the admin account
2. You should see a purple admin badge in the user menu
3. Click "Admin Dashboard" to access admin features
4. Verify you can see the User Management section

## 🔐 Security Features

### Row Level Security (RLS)
All tables have RLS enabled with policies that:
- Only allow admins to manage users and roles
- Users can only see their own role assignments
- Audit logs are only visible to administrators

### Permission Checking
The system includes helper functions:
- `has_role(user_id, role_name)` - Check if user has specific role
- `has_permission(user_id, permission_name)` - Check if user has permission
- `get_user_roles(user_id)` - Get all roles for a user
- `get_user_permissions(user_id)` - Get all permissions for a user

### Audit Logging
All admin actions are automatically logged with:
- User who performed the action
- Action type and target resource
- Timestamp and additional details
- IP address and user agent (when available)

## 🛠️ Managing Roles and Permissions

### Adding New Roles
```sql
INSERT INTO user_roles (name, display_name, description) 
VALUES ('custom_role', 'Custom Role', 'Description of the role');
```

### Adding New Permissions
```sql
INSERT INTO user_permissions (name, display_name, description, category) 
VALUES ('custom_permission', 'Custom Permission', 'Description', 'category_name');
```

### Linking Roles to Permissions
```sql
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM user_roles r, user_permissions p 
WHERE r.name = 'role_name' AND p.name = 'permission_name';
```

### Assigning Roles to Users
```sql
-- Using the helper function (recommended)
SELECT assign_user_role('user-id'::uuid, 'role_name');

-- Or direct insert
INSERT INTO user_role_assignments (user_id, role_id, assigned_by)
SELECT 'user-id'::uuid, r.id, auth.uid()
FROM user_roles r WHERE r.name = 'role_name';
```

## 📊 Monitoring and Maintenance

### View Current Role Assignments
```sql
SELECT 
  u.email,
  r.display_name as role,
  ura.assigned_at,
  ura.expires_at
FROM auth.users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles r ON ura.role_id = r.id
WHERE ura.is_active = true
ORDER BY u.email, ura.assigned_at;
```

### Check User Permissions
```sql
SELECT * FROM get_user_permissions('user-id'::uuid);
```

### View Audit Logs
```sql
SELECT 
  u.email,
  al.action,
  al.resource_type,
  al.details,
  al.created_at
FROM audit_logs al
LEFT JOIN auth.users u ON al.user_id = u.id
ORDER BY al.created_at DESC
LIMIT 50;
```

## 🔧 Troubleshooting

### Common Issues

1. **"Access Denied" when trying to access admin features**
   - Verify the user has the correct role assigned
   - Check that the role is active and not expired
   - Ensure RLS policies are properly set up

2. **Functions not found errors**
   - Make sure the migration ran successfully
   - Check that functions were created with proper permissions
   - Verify the user has EXECUTE permissions on functions

3. **Permission denied on tables**
   - Ensure RLS policies are correctly configured
   - Check that the user is authenticated
   - Verify role assignments are active

### Useful Queries for Debugging

```sql
-- Check if user has specific role
SELECT has_role(auth.uid(), 'admin');

-- Check if user has specific permission  
SELECT has_permission(auth.uid(), 'manage_users');

-- View all roles for current user
SELECT * FROM get_user_roles(auth.uid());

-- View all permissions for current user
SELECT * FROM get_user_permissions(auth.uid());
```

## 🎯 Best Practices

1. **Principle of Least Privilege** - Only assign the minimum permissions needed
2. **Regular Audits** - Review role assignments and audit logs regularly
3. **Role Expiration** - Use expiration dates for temporary access
4. **Backup Admin Access** - Always maintain at least one super_admin account
5. **Monitor Activity** - Regularly check audit logs for suspicious activity

## 📝 Next Steps

After setting up the admin role system:

1. Create your admin users
2. Configure organization-specific permissions
3. Set up project-level access controls
4. Implement data export/import workflows
5. Configure backup and monitoring procedures

For more advanced configurations or custom requirements, refer to the Supabase documentation on Row Level Security and the PostgreSQL documentation for advanced SQL features.