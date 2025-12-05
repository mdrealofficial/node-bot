-- Add AI reply fields to comment_reply_templates table
ALTER TABLE comment_reply_templates 
ADD COLUMN IF NOT EXISTS ai_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_prompt text;