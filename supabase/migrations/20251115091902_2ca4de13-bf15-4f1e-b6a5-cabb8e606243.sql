-- Add post_id column to comment_reply_templates for individual post templates
ALTER TABLE public.comment_reply_templates
ADD COLUMN IF NOT EXISTS post_id TEXT;