-- Add products_per_row setting to stores table
ALTER TABLE stores 
ADD COLUMN products_per_row INTEGER DEFAULT 2 CHECK (products_per_row >= 1 AND products_per_row <= 4);