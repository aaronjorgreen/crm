-- 🧹 Step 1: Drop old policies safely
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Enable read for admins" ON user_profiles;
DROP POLICY IF EXISTS "Enable management for admins" ON user_profiles;

-- ✅ Step 2: Recreate clean, scoped RLS policies
CREATE POLICY "Enable read access for own profile"
  ON user_profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Enable update for own profile"
  ON user_profiles
  FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Enable insert for authenticated users"
  ON user_profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Enable read for admins"
  ON user_profiles
  FOR SELECT
  USING (
    role IN ('super_admin', 'admin') OR id = auth.uid()
  );

CREATE POLICY "Enable management for admins"
  ON user_profiles
  FOR ALL
  USING (
    role IN ('super_admin', 'admin')
  );

-- 🛠 Step 3: Replace the trigger function (safe overwrite)
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  workspace_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.id) THEN
    INSERT INTO public.workspaces (name, owner_id)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'User') || '''s Workspace',
      NEW.id
    )
    RETURNING id INTO workspace_id;

    INSERT INTO public.user_profiles (
      id,
      email,
      first_name,
      last_name,
      role,
      default_workspace_id,
      email_verified
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'member'),
      workspace_id,
      NEW.email_confirmed_at IS NOT NULL
    );

    INSERT INTO public.memberships (user_id, workspace_id, role)
    VALUES (NEW.id, workspace_id, 'owner');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ Step 4: Recreate the trigger only if needed
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();
