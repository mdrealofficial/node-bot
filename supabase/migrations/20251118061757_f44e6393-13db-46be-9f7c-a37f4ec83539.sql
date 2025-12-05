-- Add sidebar_analysis column to user_settings table
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS sidebar_analysis boolean DEFAULT true;