-- Add commenter information to comment_replies table
ALTER TABLE public.comment_replies
ADD COLUMN IF NOT EXISTS commenter_psid TEXT,
ADD COLUMN IF NOT EXISTS commenter_name TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_comment_replies_commenter_psid ON public.comment_replies(commenter_psid);