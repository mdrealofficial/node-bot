-- Add Instagram app configuration fields
ALTER TABLE admin_config
ADD COLUMN IF NOT EXISTS ig_app_id text,
ADD COLUMN IF NOT EXISTS ig_app_secret text,
ADD COLUMN IF NOT EXISTS ig_webhook_verify_token text;