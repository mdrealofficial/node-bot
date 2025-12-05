-- Add missing columns to instagram_comment_triggers for feature parity with Facebook
ALTER TABLE instagram_comment_triggers
ADD COLUMN IF NOT EXISTS dm_delay_seconds integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS send_dm_after_reply boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reply_mode text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS generic_message text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS keyword_reply_message text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS no_match_reply_message text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN instagram_comment_triggers.reply_mode IS 'Reply mode: keyword (reply based on keywords), generic (same reply for all), all (reply to all comments)';