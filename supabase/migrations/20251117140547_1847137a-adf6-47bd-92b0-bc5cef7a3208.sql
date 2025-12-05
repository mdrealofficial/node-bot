-- Add token usage tracking and multi-modal model preferences to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS token_usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS text_model TEXT,
ADD COLUMN IF NOT EXISTS image_model TEXT,
ADD COLUMN IF NOT EXISTS vision_model TEXT,
ADD COLUMN IF NOT EXISTS audio_model TEXT,
ADD COLUMN IF NOT EXISTS video_model TEXT;

-- Create a table to track detailed token usage history
CREATE TABLE IF NOT EXISTS token_usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  model_used TEXT NOT NULL,
  task_type TEXT NOT NULL,
  tokens_consumed INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on token_usage_history
ALTER TABLE token_usage_history ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own token usage
CREATE POLICY "Users can view their own token usage"
ON token_usage_history FOR SELECT
USING (auth.uid() = user_id);

-- Create policy for edge functions to insert token usage
CREATE POLICY "Service role can insert token usage"
ON token_usage_history FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_token_usage_user_id ON token_usage_history(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON token_usage_history(created_at DESC);