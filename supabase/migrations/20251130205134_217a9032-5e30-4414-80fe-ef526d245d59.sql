-- Drop the old constraint on reply_mode
ALTER TABLE public.comment_reply_templates 
DROP CONSTRAINT IF EXISTS comment_reply_templates_reply_mode_check;

-- Add new constraint that includes 'ai' as a valid value
ALTER TABLE public.comment_reply_templates 
ADD CONSTRAINT comment_reply_templates_reply_mode_check 
CHECK (reply_mode IN ('generic', 'keyword_based', 'ai'));