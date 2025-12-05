-- Add keyword_filters JSONB column to store multiple filter sets for Facebook
ALTER TABLE comment_reply_templates 
ADD COLUMN IF NOT EXISTS keyword_filters JSONB DEFAULT '[]'::jsonb;

-- Add keyword_filters JSONB column to store multiple filter sets for Instagram
ALTER TABLE instagram_comment_triggers 
ADD COLUMN IF NOT EXISTS keyword_filters JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN comment_reply_templates.keyword_filters IS 'Stores multiple keyword filter sets with their keywords, match types, and reply messages';
COMMENT ON COLUMN instagram_comment_triggers.keyword_filters IS 'Stores multiple keyword filter sets with their keywords, match types, and reply messages';