-- Create product_attributes table for store-level attributes
CREATE TABLE product_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  values TEXT[] NOT NULL DEFAULT '{}',
  multi_select BOOLEAN DEFAULT false,
  optional BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE product_attributes ENABLE ROW LEVEL SECURITY;

-- Store owners can view their attributes
CREATE POLICY "Store owners can view their attributes"
  ON product_attributes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = product_attributes.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- Store owners can manage their attributes
CREATE POLICY "Store owners can manage their attributes"
  ON product_attributes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = product_attributes.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- Add index for better performance
CREATE INDEX idx_product_attributes_store_id ON product_attributes(store_id);

-- Add trigger for updated_at
CREATE TRIGGER update_product_attributes_updated_at
  BEFORE UPDATE ON product_attributes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();