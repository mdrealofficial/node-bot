-- Ensure anyone can insert customer_profiles (including anonymous/guest users)
DROP POLICY IF EXISTS "Anyone can create customer profiles" ON customer_profiles;
CREATE POLICY "Anyone can create customer profiles" ON customer_profiles
  FOR INSERT WITH CHECK (true);

-- Allow users to read their own profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON customer_profiles;
CREATE POLICY "Users can view their own profile" ON customer_profiles
  FOR SELECT USING (
    auth.uid() = user_id OR 
    (is_guest = true AND guest_session_id IS NOT NULL)
  );

-- Allow users to update their own profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON customer_profiles;
CREATE POLICY "Users can update their own profile" ON customer_profiles
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    (is_guest = true AND guest_session_id IS NOT NULL)
  );