-- Add dm_conditions column to instagram_comment_triggers table
ALTER TABLE instagram_comment_triggers
ADD COLUMN IF NOT EXISTS dm_conditions jsonb DEFAULT '{"always": true}'::jsonb;