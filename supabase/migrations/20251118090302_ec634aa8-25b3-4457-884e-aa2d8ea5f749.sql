-- Add additional Facebook app configuration fields
ALTER TABLE admin_config
ADD COLUMN IF NOT EXISTS app_domain text,
ADD COLUMN IF NOT EXISTS site_url text,
ADD COLUMN IF NOT EXISTS privacy_policy_url text,
ADD COLUMN IF NOT EXISTS terms_of_service_url text,
ADD COLUMN IF NOT EXISTS data_deletion_callback_url text,
ADD COLUMN IF NOT EXISTS webhook_callback_url text;