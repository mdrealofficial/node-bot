-- Add app_name to admin_config for dynamic software naming
ALTER TABLE admin_config ADD COLUMN IF NOT EXISTS app_name TEXT DEFAULT 'FB SmartReply';

-- Update the admin_config with the default app_name
UPDATE admin_config SET app_name = 'FB SmartReply' WHERE app_name IS NULL;