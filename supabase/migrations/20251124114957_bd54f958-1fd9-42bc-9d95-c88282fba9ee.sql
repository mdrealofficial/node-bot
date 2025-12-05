-- Add Comment-to-DM Automation columns to comment_reply_templates
ALTER TABLE public.comment_reply_templates
ADD COLUMN IF NOT EXISTS send_dm_after_reply BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dm_message_text TEXT,
ADD COLUMN IF NOT EXISTS dm_delay_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dm_conditions JSONB DEFAULT '{"always": true}'::jsonb;

-- Add comment explaining the new columns
COMMENT ON COLUMN public.comment_reply_templates.send_dm_after_reply IS 
'When true, automatically sends a DM to the commenter after replying to their comment';

COMMENT ON COLUMN public.comment_reply_templates.dm_message_text IS 
'Template text for the DM message. Supports variables: {name}, {first_name}, {last_name}';

COMMENT ON COLUMN public.comment_reply_templates.dm_delay_seconds IS 
'Delay in seconds before sending the DM (0 = immediate)';

COMMENT ON COLUMN public.comment_reply_templates.dm_conditions IS 
'JSON object defining when to send DM. Examples: {"always": true}, {"min_comment_length": 10}, {"keywords": ["interested", "buy"]}';