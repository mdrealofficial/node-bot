-- Update products_per_row constraint to allow 1-7 products per row
ALTER TABLE stores 
DROP CONSTRAINT IF EXISTS stores_products_per_row_check;

ALTER TABLE stores 
ADD CONSTRAINT stores_products_per_row_check CHECK (products_per_row >= 1 AND products_per_row <= 7);