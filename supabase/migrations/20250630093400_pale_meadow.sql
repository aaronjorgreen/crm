/*
  # Create has_users function
  
  This migration adds a function to check if any users exist in the system.
  This is used by the AdminBootstrap component to determine if the first admin needs to be created.
*/

-- Function to check if any users exist
CREATE OR REPLACE FUNCTION public.has_users()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_count integer;
BEGIN
  SELECT COUNT(*) INTO user_count FROM auth.users;
  RETURN user_count > 0;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.has_users() TO authenticated, anon;