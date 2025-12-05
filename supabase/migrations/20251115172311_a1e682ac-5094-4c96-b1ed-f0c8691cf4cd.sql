-- Add value_prices column to product_attributes table to store price modifiers
ALTER TABLE product_attributes 
ADD COLUMN IF NOT EXISTS value_prices JSONB DEFAULT NULL;

COMMENT ON COLUMN product_attributes.value_prices IS 'Stores price modifiers for each attribute value as key-value pairs (e.g., {"Large": 5.00, "XL": 10.00})';