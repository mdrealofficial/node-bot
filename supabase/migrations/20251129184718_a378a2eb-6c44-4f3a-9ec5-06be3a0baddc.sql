-- Add dm_message_text column to instagram_comment_triggers for consistency with Facebook
ALTER TABLE instagram_comment_triggers
ADD COLUMN IF NOT EXISTS dm_message_text text DEFAULT NULL;