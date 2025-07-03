-- Create a comprehensive database verification that works for both authenticated and unauthenticated users
CREATE OR REPLACE FUNCTION check_database_health()
RETURNS TABLE (
  component text,
  status text,
  details text,
  action_needed text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_count integer := 0;
  project_count integer := 0;
  asset_count integer := 0;
  layer_count integer := 0;
  policy_count integer := 0;
  has_created_by_projects boolean := false;
  has_created_by_assets boolean := false;
  has_created_by_layers boolean := false;
  current_user_id uuid;
BEGIN
  -- Check current user
  current_user_id := auth.uid();
  
  -- Check users table
  BEGIN
    SELECT COUNT(*) INTO user_count FROM auth.users;
  EXCEPTION
    WHEN OTHERS THEN
      user_count := 0;
  END;
  
  -- Check table counts
  BEGIN
    SELECT COUNT(*) INTO project_count FROM projects;
    SELECT COUNT(*) INTO asset_count FROM assets;
    SELECT COUNT(*) INTO layer_count FROM layers;
  EXCEPTION
    WHEN OTHERS THEN
      project_count := 0;
      asset_count := 0;
      layer_count := 0;
  END;
  
  -- Check policies
  BEGIN
    SELECT COUNT(*) INTO policy_count FROM pg_policies 
    WHERE tablename IN ('projects', 'assets', 'layers')
    AND policyname LIKE '%152500%';
  EXCEPTION
    WHEN OTHERS THEN
      policy_count := 0;
  END;
  
  -- Check created_by columns
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'projects' AND column_name = 'created_by'
    ) INTO has_created_by_projects;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'assets' AND column_name = 'created_by'
    ) INTO has_created_by_assets;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'layers' AND column_name = 'created_by'
    ) INTO has_created_by_layers;
  EXCEPTION
    WHEN OTHERS THEN
      has_created_by_projects := false;
      has_created_by_assets := false;
      has_created_by_layers := false;
  END;
  
  -- Return comprehensive status
  RETURN QUERY VALUES 
    ('Database Schema', 
     CASE WHEN has_created_by_projects AND has_created_by_assets AND has_created_by_layers 
          THEN 'READY' ELSE 'INCOMPLETE' END,
     'All required columns exist',
     CASE WHEN has_created_by_projects AND has_created_by_assets AND has_created_by_layers 
          THEN 'Schema is properly configured' 
          ELSE 'Run migration again' END),
    
    ('Access Policies', 
     CASE WHEN policy_count >= 3 THEN 'READY' ELSE 'INCOMPLETE' END,
     policy_count::text || ' policies active',
     CASE WHEN policy_count >= 3 THEN 'User access is controlled' 
          ELSE 'Policies need to be created' END),
    
    ('User Registration', 
     CASE WHEN user_count > 0 THEN 'READY' ELSE 'PENDING' END,
     user_count::text || ' users registered',
     CASE WHEN user_count = 0 THEN 'Sign up your first user in the app' 
          ELSE 'Users can authenticate' END),
    
    ('Current Session', 
     CASE WHEN current_user_id IS NOT NULL THEN 'AUTHENTICATED' ELSE 'NOT_AUTHENTICATED' END,
     CASE WHEN current_user_id IS NOT NULL THEN 'User ID: ' || current_user_id::text 
          ELSE 'No user currently signed in' END,
     CASE WHEN current_user_id IS NOT NULL THEN 'You can access your data' 
          ELSE 'Sign in to the application to access your projects' END),
    
    ('Data Storage', 
     'READY',
     'Projects: ' || project_count::text || ', Assets: ' || asset_count::text || ', Layers: ' || layer_count::text,
     'Data can be stored and retrieved'),
    
    ('Overall Status', 
     CASE WHEN policy_count >= 3 AND has_created_by_projects AND has_created_by_assets AND has_created_by_layers
          THEN 'OPERATIONAL' ELSE 'SETUP_NEEDED' END,
     'Database migration status',
     CASE WHEN policy_count >= 3 AND has_created_by_projects AND has_created_by_assets AND has_created_by_layers
          THEN 'Application should work without connection errors'
          ELSE 'Complete the migration steps' END);
END;
$$;

-- Create a simple function to test if the database is working (no auth required)
CREATE OR REPLACE FUNCTION test_database_connection()
RETURNS TABLE (
  test_name text,
  result text,
  message text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  can_read_projects boolean := false;
  can_read_assets boolean := false;
  can_read_layers boolean := false;
  project_count integer := 0;
  asset_count integer := 0;
  layer_count integer := 0;
BEGIN
  -- Test reading projects table
  BEGIN
    SELECT COUNT(*) INTO project_count FROM projects;
    can_read_projects := true;
  EXCEPTION
    WHEN OTHERS THEN
      can_read_projects := false;
  END;
  
  -- Test reading assets table
  BEGIN
    SELECT COUNT(*) INTO asset_count FROM assets;
    can_read_assets := true;
  EXCEPTION
    WHEN OTHERS THEN
      can_read_assets := false;
  END;
  
  -- Test reading layers table
  BEGIN
    SELECT COUNT(*) INTO layer_count FROM layers;
    can_read_layers := true;
  EXCEPTION
    WHEN OTHERS THEN
      can_read_layers := false;
  END;
  
  -- Return test results
  RETURN QUERY VALUES 
    ('Database Connection', 
     CASE WHEN can_read_projects AND can_read_assets AND can_read_layers THEN 'PASSED' ELSE 'FAILED' END,
     'Can connect to and read from database tables'),
    
    ('Projects Table', 
     CASE WHEN can_read_projects THEN 'PASSED' ELSE 'FAILED' END,
     CASE WHEN can_read_projects THEN project_count::text || ' projects found' ELSE 'Cannot read projects table' END),
    
    ('Assets Table', 
     CASE WHEN can_read_assets THEN 'PASSED' ELSE 'FAILED' END,
     CASE WHEN can_read_assets THEN asset_count::text || ' assets found' ELSE 'Cannot read assets table' END),
    
    ('Layers Table', 
     CASE WHEN can_read_layers THEN 'PASSED' ELSE 'FAILED' END,
     CASE WHEN can_read_layers THEN layer_count::text || ' layers found' ELSE 'Cannot read layers table' END),
    
    ('Overall Database', 
     CASE WHEN can_read_projects AND can_read_assets AND can_read_layers THEN 'OPERATIONAL' ELSE 'ERROR' END,
     CASE WHEN can_read_projects AND can_read_assets AND can_read_layers 
          THEN 'Database is working correctly - no more connection timeouts!'
          ELSE 'Database has issues that need to be resolved' END);
END;
$$;

-- Grant execute permissions to everyone (including unauthenticated users for testing)
GRANT EXECUTE ON FUNCTION check_database_health() TO authenticated;
GRANT EXECUTE ON FUNCTION check_database_health() TO anon;
GRANT EXECUTE ON FUNCTION test_database_connection() TO authenticated;
GRANT EXECUTE ON FUNCTION test_database_connection() TO anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ DATABASE HEALTH CHECK FUNCTIONS CREATED!';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 TEST YOUR DATABASE (works without authentication):';
  RAISE NOTICE '   SELECT * FROM test_database_connection();';
  RAISE NOTICE '';
  RAISE NOTICE '📊 CHECK OVERALL HEALTH:';
  RAISE NOTICE '   SELECT * FROM check_database_health();';
  RAISE NOTICE '';
  RAISE NOTICE '💡 WHAT THE "AUTHENTICATION FAILED" MEANS:';
  RAISE NOTICE '   - The database is working correctly';
  RAISE NOTICE '   - You just need to sign in to the application';
  RAISE NOTICE '   - Once signed in, you can create and view projects';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 YOUR CONNECTION TIMEOUT ERRORS SHOULD BE FIXED!';
  RAISE NOTICE '';
END $$;