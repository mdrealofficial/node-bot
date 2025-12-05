-- Create product_attribute_values table to link products with attribute values and price modifiers
CREATE TABLE product_attribute_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES product_attributes(id) ON DELETE CASCADE,
  attribute_value TEXT NOT NULL,
  price_modifier NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id, attribute_id, attribute_value)
);

-- Enable RLS
ALTER TABLE product_attribute_values ENABLE ROW LEVEL SECURITY;

-- Anyone can view attribute values for active products
CREATE POLICY "Anyone can view attribute values for active products"
  ON product_attribute_values
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_attribute_values.product_id
      AND products.is_active = true
    )
  );

-- Store owners can manage their product attribute values
CREATE POLICY "Store owners can manage their product attribute values"
  ON product_attribute_values
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM products
      JOIN stores ON products.store_id = stores.id
      WHERE products.id = product_attribute_values.product_id
      AND stores.user_id = auth.uid()
    )
  );

-- Add index for better performance
CREATE INDEX idx_product_attribute_values_product_id ON product_attribute_values(product_id);
CREATE INDEX idx_product_attribute_values_attribute_id ON product_attribute_values(attribute_id);