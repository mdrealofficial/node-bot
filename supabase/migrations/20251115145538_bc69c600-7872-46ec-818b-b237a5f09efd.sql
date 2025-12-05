-- Add new fields to stores table for contact info, address, analytics, and currency
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS street_address text,
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS locale text DEFAULT 'en',
ADD COLUMN IF NOT EXISTS rtl_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS google_analytics_id text,
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS terms_of_service text,
ADD COLUMN IF NOT EXISTS refund_policy text;