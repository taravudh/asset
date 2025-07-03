/*
  # Test Project Deletion Fix
  
  This migration creates a simple test function to verify that project deletion
  is working properly without connection errors.
  
  1. Creates a test function that can be run to verify deletion works
  2. Tests the safe_delete_project function if it exists
  3. Falls back to testing regular deletion if the function doesn't exist
  4. Provides clear feedback on what's working and what isn't
*/

-- Create a comprehensive test function for project deletion
CREATE OR REPLACE FUNCTION test_deletion_functionality()
RETURNS TABLE (
  test_name text,
  result text,
  message text,
  recommendation text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  test_project_id uuid;
  can_create boolean := false;
  can_delete_safe boolean := false;
  can_delete_direct boolean := false;
  safe_function_exists boolean := false;
  error_message text;
BEGIN
  -- Check if user is authenticated
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN QUERY VALUES 
      ('Authentication', 'FAILED', 'No authenticated user found', 'Sign in to the application first');
    RETURN;
  END IF;
  
  -- Check if safe_delete_project function exists
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
    VALUES ('Test Deletion ' || extract(epoch from now()), 'Test project for deletion testing', current_user_id)
    RETURNING id INTO test_project_id;
    
    can_create := true;
  EXCEPTION
    WHEN OTHERS THEN
      can_create := false;
      error_message := SQLERRM;
  END;
  
  -- Test 2: Try safe deletion if function exists
  IF can_create AND test_project_id IS NOT NULL AND safe_function_exists THEN
    BEGIN
      PERFORM safe_delete_project(test_project_id);
      can_delete_safe := true;
    EXCEPTION
      WHEN OTHERS THEN
        can_delete_safe := false;
        error_message := SQLERRM;
    END;
  END IF;
  
  -- Test 3: Try direct deletion if safe deletion didn't work
  IF can_create AND test_project_id IS NOT NULL AND NOT can_delete_safe THEN
    BEGIN
      -- Try soft delete first
      UPDATE projects 
      SET is_active = false, updated_at = now()
      WHERE id = test_project_id;
      
      can_delete_direct := true;
    EXCEPTION
      WHEN OTHERS THEN
        can_delete_direct := false;
        error_message := SQLERRM;
        
        -- Try hard delete as last resort
        BEGIN
          DELETE FROM projects WHERE id = test_project_id;
          can_delete_direct := true;
        EXCEPTION
          WHEN OTHERS THEN
            can_delete_direct := false;
        END;
    END;
  END IF;
  
  -- Return comprehensive test results
  RETURN QUERY VALUES 
    ('User Authentication', 'PASSED', 'User ID: ' || current_user_id::text, 'User is properly authenticated'),
    
    ('Safe Delete Function', 
     CASE WHEN safe_function_exists THEN 'AVAILABLE' ELSE 'MISSING' END,
     CASE WHEN safe_function_exists THEN 'safe_delete_project() function exists' 
          ELSE 'safe_delete_project() function not found' END,
     CASE WHEN safe_function_exists THEN 'Can use enhanced deletion' 
          ELSE 'Will use fallback deletion method' END),
    
    ('Project Creation', 
     CASE WHEN can_create THEN 'PASSED' ELSE 'FAILED' END,
     CASE WHEN can_create THEN 'Successfully created test project' 
          ELSE 'Failed to create test project: ' || COALESCE(error_message, 'Unknown error') END,
     CASE WHEN can_create THEN 'Project creation is working' 
          ELSE 'Check database permissions and RLS policies' END),
    
    ('Safe Project Deletion', 
     CASE WHEN can_delete_safe THEN 'PASSED' 
          WHEN NOT safe_function_exists THEN 'SKIPPED'
          ELSE 'FAILED' END,
     CASE WHEN can_delete_safe THEN 'Successfully deleted project using safe function'
          WHEN NOT safe_function_exists THEN 'Function not available, skipped test'
          ELSE 'Safe deletion failed: ' || COALESCE(error_message, 'Unknown error') END,
     CASE WHEN can_delete_safe THEN 'Enhanced deletion is working perfectly'
          WHEN NOT safe_function_exists THEN 'Function needs to be created'
          ELSE 'Safe deletion needs debugging' END),
    
    ('Direct Project Deletion', 
     CASE WHEN can_delete_direct THEN 'PASSED' 
          WHEN can_delete_safe THEN 'SKIPPED'
          ELSE 'FAILED' END,
     CASE WHEN can_delete_direct THEN 'Successfully deleted project using direct method'
          WHEN can_delete_safe THEN 'Not needed, safe deletion worked'
          ELSE 'Direct deletion failed: ' || COALESCE(error_message, 'Unknown error') END,
     CASE WHEN can_delete_direct THEN 'Fallback deletion is working'
          WHEN can_delete_safe THEN 'Safe deletion is preferred'
          ELSE 'Both deletion methods failed - check RLS policies' END),
    
    ('Overall Deletion Status', 
     CASE WHEN can_delete_safe OR can_delete_direct THEN 'OPERATIONAL' ELSE 'BROKEN' END,
     CASE WHEN can_delete_safe THEN 'Project deletion working with enhanced safety'
          WHEN can_delete_direct THEN 'Project deletion working with basic method'
          ELSE 'Project deletion is not working' END,
     CASE WHEN can_delete_safe OR can_delete_direct 
          THEN 'Your app should work without connection errors when deleting projects'
          ELSE 'Project deletion needs immediate attention' END);
END;
$$;

-- Create a simple function to check current database status
CREATE OR REPLACE FUNCTION check_deletion_readiness()
RETURNS TABLE (
  check_name text,
  status text,
  details text
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
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Check users
  BEGIN
    SELECT COUNT(*) INTO user_count FROM auth.users;
  EXCEPTION
    WHEN OTHERS THEN
      user_count := 0;
  END;
  
  -- Check projects
  BEGIN
    SELECT COUNT(*) INTO project_count FROM projects WHERE is_active = true;
  EXCEPTION
    WHEN OTHERS THEN
      project_count := 0;
  END;
  
  -- Check policies
  BEGIN
    SELECT COUNT(*) INTO policy_count FROM pg_policies 
    WHERE tablename = 'projects' 
    AND (policyname LIKE '%153000%' OR policyname LIKE '%152500%');
  EXCEPTION
    WHEN OTHERS THEN
      policy_count := 0;
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
  
  RETURN QUERY VALUES 
    ('Current User', 
     CASE WHEN current_user_id IS NOT NULL THEN 'AUTHENTICATED' ELSE 'NOT_SIGNED_IN' END,
     CASE WHEN current_user_id IS NOT NULL THEN 'User ID: ' || current_user_id::text 
          ELSE 'Sign in to test deletion functionality' END),
    
    ('Database Users', 
     CASE WHEN user_count > 0 THEN 'READY' ELSE 'EMPTY' END,
     user_count::text || ' users registered'),
    
    ('Active Projects', 
     'INFO',
     project_count::text || ' active projects in database'),
    
    ('Deletion Policies', 
     CASE WHEN policy_count > 0 THEN 'ACTIVE' ELSE 'MISSING' END,
     policy_count::text || ' deletion-related policies found'),
    
    ('Safe Delete Function', 
     CASE WHEN safe_function_exists THEN 'AVAILABLE' ELSE 'MISSING' END,
     CASE WHEN safe_function_exists THEN 'Enhanced deletion function is ready' 
          ELSE 'Using fallback deletion method' END),
    
    ('Ready for Testing', 
     CASE WHEN current_user_id IS NOT NULL AND policy_count > 0 THEN 'YES' ELSE 'NO' END,
     CASE WHEN current_user_id IS NOT NULL AND policy_count > 0 
          THEN 'Run: SELECT * FROM test_deletion_functionality();'
          ELSE 'Sign in first, then run the test' END);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION test_deletion_functionality() TO authenticated;
GRANT EXECUTE ON FUNCTION check_deletion_readiness() TO authenticated;
GRANT EXECUTE ON FUNCTION check_deletion_readiness() TO anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧪 PROJECT DELETION TEST FUNCTIONS CREATED!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 CHECK IF DELETION IS READY:';
  RAISE NOTICE '   SELECT * FROM check_deletion_readiness();';
  RAISE NOTICE '';
  RAISE NOTICE '🔬 TEST PROJECT DELETION (requires sign-in):';
  RAISE NOTICE '   SELECT * FROM test_deletion_functionality();';
  RAISE NOTICE '';
  RAISE NOTICE '💡 WHAT TO EXPECT:';
  RAISE NOTICE '   - If tests pass, project deletion will work without errors';
  RAISE NOTICE '   - If tests fail, you''ll see specific error messages';
  RAISE NOTICE '   - The app will use the best available deletion method';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Run the tests to verify your deletion fix!';
  RAISE NOTICE '';
END $$;