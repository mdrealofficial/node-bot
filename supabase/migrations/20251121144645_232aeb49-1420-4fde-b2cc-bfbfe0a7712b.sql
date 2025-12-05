-- Add mobile and desktop products per row settings for general products
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS mobile_products_per_row INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS desktop_products_per_row INTEGER DEFAULT 4;

COMMENT ON COLUMN stores.mobile_products_per_row IS 'Number of general products to show per row on mobile devices';
COMMENT ON COLUMN stores.desktop_products_per_row IS 'Number of general products to show per row on desktop devices';