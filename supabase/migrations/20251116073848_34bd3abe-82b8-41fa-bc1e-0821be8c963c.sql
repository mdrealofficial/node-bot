-- Add sidebar menu visibility settings to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS sidebar_pages BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sidebar_flow BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sidebar_subscribers BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sidebar_broadcast BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sidebar_chat BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sidebar_templates BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sidebar_comment_replies BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sidebar_store BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sidebar_subscription BOOLEAN DEFAULT true;