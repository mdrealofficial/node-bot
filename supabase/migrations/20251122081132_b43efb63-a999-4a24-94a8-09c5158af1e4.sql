-- Add Google Maps API key to admin config
ALTER TABLE admin_config 
ADD COLUMN IF NOT EXISTS google_maps_api_key text;

-- Add delivery area fields to stores table
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS delivery_area_type text DEFAULT 'none' CHECK (delivery_area_type IN ('none', 'country', 'map')),
ADD COLUMN IF NOT EXISTS delivery_countries text[],
ADD COLUMN IF NOT EXISTS delivery_zone_coordinates jsonb,
ADD COLUMN IF NOT EXISTS delivery_zone_radius numeric,
ADD COLUMN IF NOT EXISTS require_location boolean DEFAULT false;