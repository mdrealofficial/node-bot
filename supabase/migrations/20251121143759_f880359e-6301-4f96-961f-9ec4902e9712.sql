-- Add featured products carousel settings to stores table
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS mobile_featured_per_row INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS desktop_featured_per_row INTEGER DEFAULT 5;

COMMENT ON COLUMN stores.mobile_featured_per_row IS 'Number of featured products to show per row on mobile devices';
COMMENT ON COLUMN stores.desktop_featured_per_row IS 'Number of featured products to show per row on desktop devices';