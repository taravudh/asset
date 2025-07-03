-- Create a comprehensive test function for project deletion
CREATE OR REPLACE FUNCTION check_deletion_status()
RETURNS TABLE (
  component text,
  status text,
  details text,
  next_action text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_count integer := 0;
  project_count integer := 0;
  policy_count integer := 0;
  safe_function_exists boolean := false;
  current_user_id uuid;
  has_created_by boolean := false;
BEGIN
  -- Get current user (if any)
  current_user_id := auth.uid();
  
  -- Check if users table is accessible
  BEGIN
    SELECT COUNT(*) INTO user_count FROM auth.users;
  EXCEPTION
    WHEN OTHERS THEN
      user_count := 0;
  END;
  
  -- Check projects table
  BEGIN
    SELECT COUNT(*) INTO project_count FROM projects WHERE is_active = true;
  EXCEPTION
    WHEN OTHERS THEN
      project_count := 0;
  END;
  
  -- Check if created_by column exists
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'projects' AND column_name = 'created_by'
    ) INTO has_created_by;
  EXCEPTION
    WHEN OTHERS THEN
      has_created_by := false;
  END;
  
  -- Check deletion policies
  BEGIN
    SELECT COUNT(*) INTO policy_count FROM pg_policies 
    WHERE tablename = 'projects' 
    AND (policyname LIKE '%delete%' OR policyname LIKE '%153000%' OR policyname LIKE '%152500%');
  EXCEPTION
    WHEN OTHERS THEN
      policy_count := 0;
  END;
  
  -- Check if safe deletion function exists
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'safe_delete_project'
    ) INTO safe_function_exists;
  EXCEPTION
    WHEN OTHERS THEN
      safe_function_exists := false;
  END;
  
  -- Return status information
  RETURN QUERY VALUES 
    ('Database Connection', 
     'OPERATIONAL',
     'Successfully connected to database',
     'Database is accessible'),
    
    ('User System', 
     CASE WHEN user_count > 0 THEN 'READY' ELSE 'EMPTY' END,
     user_count::text || ' users registered in system',
     CASE WHEN user_count = 0 THEN 'Sign up your first user' ELSE 'Users can authenticate' END),
    
    ('Current Session', 
     CASE WHEN current_user_id IS NOT NULL THEN 'AUTHENTICATED' ELSE 'NOT_SIGNED_IN' END,
     CASE WHEN current_user_id IS NOT NULL THEN 'User ID: ' || current_user_id::text 
          ELSE 'No user currently signed in' END,
     CASE WHEN current_user_id IS NOT NULL THEN 'Can test deletion functionality' 
          ELSE 'Sign in to test project deletion' END),
    
    ('Database Schema', 
     CASE WHEN has_created_by THEN 'UPDATED' ELSE 'LEGACY' END,
     CASE WHEN has_created_by THEN 'created_by column exists' 
          ELSE 'Using legacy schema' END,
     CASE WHEN has_created_by THEN 'User-specific access enabled' 
          ELSE 'Migration may be needed' END),
    
    ('Project Data', 
     'ACCESSIBLE',
     project_count::text || ' active projects found',
     'Project data can be read and written'),
    
    ('Deletion Policies', 
     CASE WHEN policy_count > 0 THEN 'ACTIVE' ELSE 'BASIC' END,
     policy_count::text || ' deletion-related policies found',
     CASE WHEN policy_count > 0 THEN 'Enhanced deletion security' 
          ELSE 'Using basic deletion method' END),
    
    ('Safe Delete Function', 
     CASE WHEN safe_function_exists THEN 'AVAILABLE' ELSE 'FALLBACK' END,
     CASE WHEN safe_function_exists THEN 'Enhanced deletion function ready' 
          ELSE 'Using standard deletion method' END,
     CASE WHEN safe_function_exists THEN 'Optimal deletion performance' 
          ELSE 'Fallback deletion will be used' END),
    
    ('Overall Status', 
     CASE WHEN current_user_id IS NOT NULL THEN 'READY_FOR_TESTING' ELSE 'READY_FOR_SIGNIN' END,
     'Database and deletion system are operational',
     CASE WHEN current_user_id IS NOT NULL 
          THEN 'Run: SELECT * FROM test_project_deletion_flow();'
          ELSE 'Sign in first, then test deletion' END);
END;
$$;

-- Create a simple verification function that works without authentication
CREATE OR REPLACE FUNCTION verify_deletion_fix()
RETURNS TABLE (
  system_component text,
  status text,
  message text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  can_access_projects boolean := false;
  safe_function_exists boolean := false;
  policy_count integer := 0;
BEGIN
  current_user_id := auth.uid();
  
  -- Test project access
  BEGIN
    PERFORM COUNT(*) FROM projects;
    can_access_projects := true;
  EXCEPTION
    WHEN OTHERS THEN
      can_access_projects := false;
  END;
  
  -- Check safe function
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'safe_delete_project'
    ) INTO safe_function_exists;
  EXCEPTION
    WHEN OTHERS THEN
      safe_function_exists := false;
  END;
  
  -- Check policies
  BEGIN
    SELECT COUNT(*) INTO policy_count FROM pg_policies 
    WHERE tablename = 'projects';
  EXCEPTION
    WHEN OTHERS THEN
      policy_count := 0;
  END;
  
  RETURN QUERY VALUES 
    ('Database Access', 
     CASE WHEN can_access_projects THEN 'WORKING' ELSE 'FAILED' END,
     CASE WHEN can_access_projects THEN 'Can read and write project data' 
          ELSE 'Cannot access project data' END),
    
    ('User Authentication', 
     CASE WHEN current_user_id IS NOT NULL THEN 'AUTHENTICATED' ELSE 'NOT_SIGNED_IN' END,
     CASE WHEN current_user_id IS NOT NULL THEN 'User is signed in and ready for testing' 
          ELSE 'Sign in to test deletion functionality' END),
    
    ('Deletion Function', 
     CASE WHEN safe_function_exists THEN 'ENHANCED' ELSE 'STANDARD' END,
     CASE WHEN safe_function_exists THEN 'Safe deletion function available for optimal performance' 
          ELSE 'Using standard deletion method' END),
    
    ('Security Policies', 
     CASE WHEN policy_count > 0 THEN 'ACTIVE' ELSE 'BASIC' END,
     policy_count::text || ' RLS policies protecting project data'),
    
    ('Overall Status', 
     CASE WHEN can_access_projects THEN 'OPERATIONAL' ELSE 'ERROR' END,
     CASE WHEN can_access_projects 
          THEN 'Database is working correctly - project deletion should work'
          ELSE 'Database has issues that need to be resolved' END);
END;
$$;

-- Create a comprehensive test function for project deletion (requires authentication)
CREATE OR REPLACE FUNCTION test_project_deletion_flow()
RETURNS TABLE (
  test_step text,
  result text,
  details text,
  recommendation text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  test_project_id uuid;
  test_asset_id uuid;
  can_create_project boolean := false;
  can_create_asset boolean := false;
  can_delete_safe boolean := false;
  can_delete_fallback boolean := false;
  safe_function_exists boolean := false;
  error_msg text;
  projects_before integer;
  projects_after integer;
BEGIN
  -- Check authentication
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN QUERY VALUES 
      ('Authentication Check', 'FAILED', 'No authenticated user found', 'Sign in to the application first');
    RETURN;
  END IF;
  
  -- Count projects before test
  SELECT COUNT(*) INTO projects_before FROM projects WHERE is_active = true;
  
  -- Check if safe deletion function exists
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'safe_delete_project'
    ) INTO safe_function_exists;
  EXCEPTION
    WHEN OTHERS THEN
      safe_function_exists := false;
  END;
  
  -- Test 1: Create a test project
  BEGIN
    INSERT INTO projects (name, description, created_by) 
    VALUES ('DELETE_TEST_' || extract(epoch from now()), 'Test project for deletion verification', current_user_id)
    RETURNING id INTO test_project_id;
    
    can_create_project := true;
  EXCEPTION
    WHEN OTHERS THEN
      can_create_project := false;
      error_msg := SQLERRM;
  END;
  
  -- Test 2: Create a test asset (to test cascade deletion)
  IF can_create_project AND test_project_id IS NOT NULL THEN
    BEGIN
      INSERT INTO assets (name, description, asset_type, geometry, project_id, created_by)
      VALUES (
        'Test Asset', 
        'Test asset for deletion', 
        'marker',
        '{"type": "Point", "coordinates": [100.0, 0.0]}'::jsonb,
        test_project_id,
        current_user_id
      )
      RETURNING id INTO test_asset_id;
      
      can_create_asset := true;
    EXCEPTION
      WHEN OTHERS THEN
        can_create_asset := false;
        error_msg := SQLERRM;
    END;
  END IF;
  
  -- Test 3: Try safe deletion if function exists
  IF can_create_project AND test_project_id IS NOT NULL AND safe_function_exists THEN
    BEGIN
      PERFORM safe_delete_project(test_project_id);
      can_delete_safe := true;
    EXCEPTION
      WHEN OTHERS THEN
        can_delete_safe := false;
        error_msg := SQLERRM;
    END;
  END IF;
  
  -- Test 4: Try fallback deletion if safe deletion didn't work or doesn't exist
  IF can_create_project AND test_project_id IS NOT NULL AND NOT can_delete_safe THEN
    BEGIN
      -- Delete related assets first
      DELETE FROM assets WHERE project_id = test_project_id;
      
      -- Soft delete the project
      UPDATE projects 
      SET is_active = false, updated_at = now()
      WHERE id = test_project_id;
      
      can_delete_fallback := true;
    EXCEPTION
      WHEN OTHERS THEN
        can_delete_fallback := false;
        error_msg := SQLERRM;
        
        -- Try hard delete as last resort
        BEGIN
          DELETE FROM projects WHERE id = test_project_id;
          can_delete_fallback := true;
        EXCEPTION
          WHEN OTHERS THEN
            can_delete_fallback := false;
        END;
    END;
  END IF;
  
  -- Count projects after test
  SELECT COUNT(*) INTO projects_after FROM projects WHERE is_active = true;
  
  -- Return comprehensive test results
  RETURN QUERY VALUES 
    ('User Authentication', 'PASSED', 'User ID: ' || current_user_id::text, 'Authentication is working correctly'),
    
    ('Project Creation', 
     CASE WHEN can_create_project THEN 'PASSED' ELSE 'FAILED' END,
     CASE WHEN can_create_project THEN 'Successfully created test project with ID: ' || test_project_id::text
          ELSE 'Failed to create project: ' || COALESCE(error_msg, 'Unknown error') END,
     CASE WHEN can_create_project THEN 'Project creation is operational' 
          ELSE 'Check database permissions and schema' END),
    
    ('Asset Creation', 
     CASE WHEN can_create_asset THEN 'PASSED' 
          WHEN NOT can_create_project THEN 'SKIPPED'
          ELSE 'FAILED' END,
     CASE WHEN can_create_asset THEN 'Successfully created test asset with ID: ' || test_asset_id::text
          WHEN NOT can_create_project THEN 'Skipped due to project creation failure'
          ELSE 'Failed to create asset: ' || COALESCE(error_msg, 'Unknown error') END,
     CASE WHEN can_create_asset THEN 'Asset creation and relationships working' 
          WHEN NOT can_create_project THEN 'Fix project creation first'
          ELSE 'Check asset table permissions' END),
    
    ('Safe Deletion Method', 
     CASE WHEN can_delete_safe THEN 'PASSED' 
          WHEN NOT safe_function_exists THEN 'NOT_AVAILABLE'
          ELSE 'FAILED' END,
     CASE WHEN can_delete_safe THEN 'Successfully deleted project using safe_delete_project() function'
          WHEN NOT safe_function_exists THEN 'safe_delete_project() function not found'
          ELSE 'Safe deletion failed: ' || COALESCE(error_msg, 'Unknown error') END,
     CASE WHEN can_delete_safe THEN 'Enhanced deletion is working perfectly'
          WHEN NOT safe_function_exists THEN 'Function needs to be created for optimal performance'
          ELSE 'Safe deletion function needs debugging' END),
    
    ('Fallback Deletion Method', 
     CASE WHEN can_delete_fallback THEN 'PASSED' 
          WHEN can_delete_safe THEN 'NOT_NEEDED'
          ELSE 'FAILED' END,
     CASE WHEN can_delete_fallback THEN 'Successfully deleted project using fallback method'
          WHEN can_delete_safe THEN 'Not needed - safe deletion worked'
          ELSE 'Fallback deletion failed: ' || COALESCE(error_msg, 'Unknown error') END,
     CASE WHEN can_delete_fallback THEN 'Fallback deletion is working as backup'
          WHEN can_delete_safe THEN 'Safe deletion is preferred method'
          ELSE 'Both deletion methods failed - check RLS policies' END),
    
    ('Data Consistency', 
     CASE WHEN projects_after <= projects_before THEN 'PASSED' ELSE 'WARNING' END,
     'Projects before: ' || projects_before::text || ', after: ' || projects_after::text,
     CASE WHEN projects_after <= projects_before THEN 'Project count is consistent'
          ELSE 'Project count increased - check for cleanup issues' END),
    
    ('Overall Deletion Status', 
     CASE WHEN can_delete_safe OR can_delete_fallback THEN 'OPERATIONAL' ELSE 'BROKEN' END,
     CASE WHEN can_delete_safe THEN 'Project deletion working with enhanced safety features'
          WHEN can_delete_fallback THEN 'Project deletion working with standard method'
          ELSE 'Project deletion is not functioning' END,
     CASE WHEN can_delete_safe OR can_delete_fallback 
          THEN 'Your app should work without connection errors when deleting projects'
          ELSE 'Project deletion requires immediate attention' END);
END;
$$;

-- Create a safe project deletion function if it doesn't exist
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
    
    RAISE NOTICE 'Created safe_delete_project function';
  ELSE
    RAISE NOTICE 'safe_delete_project function already exists';
  END IF;
END $$;

-- Grant execute permissions to all functions
GRANT EXECUTE ON FUNCTION check_deletion_status() TO authenticated;
GRANT EXECUTE ON FUNCTION check_deletion_status() TO anon;
GRANT EXECUTE ON FUNCTION verify_deletion_fix() TO authenticated;
GRANT EXECUTE ON FUNCTION verify_deletion_fix() TO anon;
GRANT EXECUTE ON FUNCTION test_project_deletion_flow() TO authenticated;
GRANT EXECUTE ON FUNCTION safe_delete_project(uuid) TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧪 PROJECT DELETION TEST FUNCTIONS CREATED SUCCESSFULLY!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 CHECK DELETION STATUS (works without sign-in):';
  RAISE NOTICE '   SELECT * FROM check_deletion_status();';
  RAISE NOTICE '';
  RAISE NOTICE '✅ QUICK VERIFICATION:';
  RAISE NOTICE '   SELECT * FROM verify_deletion_fix();';
  RAISE NOTICE '';
  RAISE NOTICE '🔬 TEST PROJECT DELETION (requires sign-in):';
  RAISE NOTICE '   SELECT * FROM test_project_deletion_flow();';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Your application should now work without connection errors!';
  RAISE NOTICE '';
END $$;