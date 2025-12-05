-- Add favicon and facebook pixel fields to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS favicon_url text,
ADD COLUMN IF NOT EXISTS facebook_pixel_id text;