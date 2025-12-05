-- Add branding settings to admin_config table
ALTER TABLE admin_config
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS favicon_url TEXT;