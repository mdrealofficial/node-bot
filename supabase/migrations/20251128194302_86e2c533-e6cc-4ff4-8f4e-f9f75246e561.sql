-- Add shipping calculation method to stores
ALTER TABLE stores ADD COLUMN shipping_calculation_method text DEFAULT 'flat_rate';

-- Add shipping charge to orders
ALTER TABLE orders ADD COLUMN shipping_charge numeric DEFAULT 0;

-- Create store_customers table
CREATE TABLE store_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  phone text NOT NULL,
  full_name text,
  email text,
  facebook_psid text,
  instagram_id text,
  whatsapp_phone text,
  profile_pic_url text,
  total_orders integer DEFAULT 0,
  total_spent numeric DEFAULT 0,
  first_order_at timestamptz,
  last_order_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(store_id, phone)
);

-- Enable RLS
ALTER TABLE store_customers ENABLE ROW LEVEL SECURITY;

-- Store owners can view their store customers
CREATE POLICY "Store owners can view their customers"
  ON store_customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = store_customers.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- Store owners can manage their customers
CREATE POLICY "Store owners can manage their customers"
  ON store_customers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = store_customers.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- Public can create customers during checkout
CREATE POLICY "Public can create customers"
  ON store_customers FOR INSERT
  WITH CHECK (true);