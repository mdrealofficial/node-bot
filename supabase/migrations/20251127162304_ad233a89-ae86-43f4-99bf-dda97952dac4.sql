-- Create customer_profiles table for both authenticated and guest customers
CREATE TABLE customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  is_guest BOOLEAN DEFAULT false,
  guest_session_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create customer_addresses table for managing multiple addresses
CREATE TABLE customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_profile_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT,
  postal_code TEXT,
  country TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add customer_profile_id to orders table
ALTER TABLE orders ADD COLUMN customer_profile_id UUID REFERENCES customer_profiles(id);

-- Enable RLS
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_profiles
-- Authenticated users can manage their own profile
CREATE POLICY "Users can view their own profile" ON customer_profiles
  FOR SELECT
  USING (auth.uid() = user_id OR (is_guest AND guest_session_id = current_setting('request.jwt.claims', true)::json->>'guest_session_id'));

CREATE POLICY "Users can update their own profile" ON customer_profiles
  FOR UPDATE
  USING (auth.uid() = user_id OR (is_guest AND guest_session_id = current_setting('request.jwt.claims', true)::json->>'guest_session_id'));

-- Allow anyone to create customer profiles (for guest checkout)
CREATE POLICY "Anyone can create customer profiles" ON customer_profiles
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies for customer_addresses
CREATE POLICY "Users can view their own addresses" ON customer_addresses
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM customer_profiles 
    WHERE customer_profiles.id = customer_addresses.customer_profile_id 
    AND (customer_profiles.user_id = auth.uid() OR customer_profiles.guest_session_id = current_setting('request.jwt.claims', true)::json->>'guest_session_id')
  ));

CREATE POLICY "Users can manage their own addresses" ON customer_addresses
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM customer_profiles 
    WHERE customer_profiles.id = customer_addresses.customer_profile_id 
    AND (customer_profiles.user_id = auth.uid() OR customer_profiles.guest_session_id = current_setting('request.jwt.claims', true)::json->>'guest_session_id')
  ));

-- Create trigger for updated_at
CREATE TRIGGER update_customer_profiles_updated_at
  BEFORE UPDATE ON customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_addresses_updated_at
  BEFORE UPDATE ON customer_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle new authenticated customer
CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customer_profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger to create customer profile when user signs up
CREATE TRIGGER on_customer_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_customer();