-- Add missing moderation columns to instagram_comment_triggers table
ALTER TABLE instagram_comment_triggers
ADD COLUMN IF NOT EXISTS whitelist_users text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS blacklist_users text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS censored_keywords text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS profanity_level text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS moderation_action text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS spam_detection_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS link_detection_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_prompt text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS min_comment_length integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_comment_length integer DEFAULT NULL;