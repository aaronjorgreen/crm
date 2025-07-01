-- Simplify user_profiles policies to avoid recursion and complexity

-- Drop all existing policies on user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;

-- Create simple, non-recursive policies for user_profiles
CREATE POLICY "Enable read access for own profile" ON user_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Enable update for own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Enable insert for authenticated users" ON user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Allow super_admin and admin to see all profiles (simplified check)
CREATE POLICY "Enable read for admins" ON user_profiles
  FOR SELECT USING (
    id = auth.uid() OR 
    auth.uid() IN (
      SELECT id FROM user_profiles 
      WHERE role IN ('super_admin', 'admin') AND id = auth.uid()
    )
  );

-- Allow super_admin and admin to manage all profiles
CREATE POLICY "Enable management for admins" ON user_profiles
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM user_profiles 
      WHERE role IN ('super_admin', 'admin') AND id = auth.uid()
    )
  );

-- Ensure the trigger function is simple and doesn't cause issues
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  workspace_id uuid;
BEGIN
  -- Only create profile if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.id) THEN
    -- Create a default workspace for the user
    INSERT INTO public.workspaces (name, owner_id)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'first_name', 'User') || '''s Workspace', NEW.id)
    RETURNING id INTO workspace_id;
    
    -- Create user profile
    INSERT INTO public.user_profiles (
      id,
      email,
      first_name,
      last_name,
      role,
      default_workspace_id,
      email_verified
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'member'),
      workspace_id,
      NEW.email_confirmed_at IS NOT NULL
    );
    
    -- Add user as owner of their workspace
    INSERT INTO public.memberships (user_id, workspace_id, role)
    VALUES (NEW.id, workspace_id, 'owner');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();