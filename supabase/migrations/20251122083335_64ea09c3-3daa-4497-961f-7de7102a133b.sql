-- Add zone selection method and polygon coordinates to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS delivery_zone_method text DEFAULT 'radius' CHECK (delivery_zone_method IN ('radius', 'manual')),
ADD COLUMN IF NOT EXISTS delivery_zone_polygon jsonb;