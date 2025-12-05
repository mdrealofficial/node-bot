-- Add sidebar menu order column to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS sidebar_menu_order TEXT[] DEFAULT ARRAY['pages', 'flow', 'subscribers', 'broadcast', 'chat', 'templates', 'comment_replies', 'store', 'subscription'];