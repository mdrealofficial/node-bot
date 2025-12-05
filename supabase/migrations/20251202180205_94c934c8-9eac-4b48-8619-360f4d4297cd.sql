-- Create table for multiple customer addresses
CREATE TABLE IF NOT EXISTS store_customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES store_customers(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Default',
  is_default BOOLEAN DEFAULT false,
  delivery_location TEXT,
  city_corporation TEXT,
  area TEXT,
  sub_area TEXT,
  district TEXT,
  upazila TEXT,
  street_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE store_customer_addresses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Store owners can view customer addresses"
ON store_customer_addresses FOR SELECT
USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));

CREATE POLICY "Store owners can insert customer addresses"
ON store_customer_addresses FOR INSERT
WITH CHECK (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));

CREATE POLICY "Store owners can update customer addresses"
ON store_customer_addresses FOR UPDATE
USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));

CREATE POLICY "Store owners can delete customer addresses"
ON store_customer_addresses FOR DELETE
USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));

CREATE POLICY "System can insert addresses"
ON store_customer_addresses FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update addresses"
ON store_customer_addresses FOR UPDATE
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_store_customer_addresses_customer ON store_customer_addresses(customer_id);
CREATE INDEX idx_store_customer_addresses_store ON store_customer_addresses(store_id);

-- Update trigger for updated_at
CREATE TRIGGER update_store_customer_addresses_updated_at
BEFORE UPDATE ON store_customer_addresses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();