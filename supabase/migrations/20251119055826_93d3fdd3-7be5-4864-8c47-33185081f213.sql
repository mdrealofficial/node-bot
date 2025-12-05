-- Add bKash payment gateway configuration to admin_config
ALTER TABLE admin_config
ADD COLUMN IF NOT EXISTS bkash_app_key text,
ADD COLUMN IF NOT EXISTS bkash_app_secret text,
ADD COLUMN IF NOT EXISTS bkash_app_username text,
ADD COLUMN IF NOT EXISTS bkash_app_password text,
ADD COLUMN IF NOT EXISTS bkash_sandbox_mode boolean DEFAULT true;