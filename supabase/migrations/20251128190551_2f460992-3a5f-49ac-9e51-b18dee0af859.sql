-- Add shipping configuration to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS shipping_area_mode text DEFAULT 'both';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS default_shipping_inside_dhaka numeric DEFAULT 60;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS default_shipping_outside_dhaka numeric DEFAULT 120;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS default_return_charge numeric DEFAULT 50;

COMMENT ON COLUMN stores.shipping_area_mode IS 'Selling area: inside_dhaka, outside_dhaka, or both';
COMMENT ON COLUMN stores.default_shipping_inside_dhaka IS 'Default shipping charge for Inside Dhaka (BDT)';
COMMENT ON COLUMN stores.default_shipping_outside_dhaka IS 'Default shipping charge for Outside Dhaka (BDT)';
COMMENT ON COLUMN stores.default_return_charge IS 'Default return/exchange charge (BDT)';

-- Add shipping fields to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_inside_dhaka numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_outside_dhaka numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS return_charge numeric;

COMMENT ON COLUMN products.shipping_inside_dhaka IS 'Product-specific shipping for Inside Dhaka (null = use store default)';
COMMENT ON COLUMN products.shipping_outside_dhaka IS 'Product-specific shipping for Outside Dhaka (null = use store default)';
COMMENT ON COLUMN products.return_charge IS 'Product-specific return charge (null = use store default)';