-- Drop existing restrictive policies that block the trigger
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Create a policy that allows the trigger function to insert users
CREATE POLICY "Service role can insert users"
  ON users FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Recreate the existing policies for viewing and updating
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid()::uuid = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid()::uuid = id);
