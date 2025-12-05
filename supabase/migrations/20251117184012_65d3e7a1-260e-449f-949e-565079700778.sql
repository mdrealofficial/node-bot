-- Create Instagram comment automation triggers table
CREATE TABLE IF NOT EXISTS public.instagram_comment_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  instagram_account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trigger_type TEXT NOT NULL DEFAULT 'keyword', -- 'keyword', 'all_comments', 'post_specific'
  post_id TEXT, -- Specific post ID if post_specific type
  trigger_keywords TEXT[] DEFAULT '{}',
  match_type TEXT NOT NULL DEFAULT 'contains', -- 'exact', 'contains', 'starts_with'
  exclude_keywords TEXT[] DEFAULT '{}',
  dm_message TEXT NOT NULL,
  public_reply_message TEXT,
  reply_to_replies BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.instagram_comment_triggers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own Instagram comment triggers"
  ON public.instagram_comment_triggers
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own Instagram comment triggers"
  ON public.instagram_comment_triggers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Instagram comment triggers"
  ON public.instagram_comment_triggers
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Instagram comment triggers"
  ON public.instagram_comment_triggers
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_instagram_comment_triggers_user_account 
  ON public.instagram_comment_triggers(user_id, instagram_account_id);

CREATE INDEX idx_instagram_comment_triggers_active 
  ON public.instagram_comment_triggers(is_active);

-- Create table for tracking Instagram comment replies
CREATE TABLE IF NOT EXISTS public.instagram_comment_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  instagram_account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  trigger_id UUID REFERENCES public.instagram_comment_triggers(id) ON DELETE SET NULL,
  post_id TEXT NOT NULL,
  comment_id TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  commenter_instagram_id TEXT NOT NULL,
  dm_sent BOOLEAN DEFAULT false,
  public_reply_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.instagram_comment_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own Instagram comment replies"
  ON public.instagram_comment_replies
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Instagram comment replies"
  ON public.instagram_comment_replies
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_instagram_comment_replies_user_account 
  ON public.instagram_comment_replies(user_id, instagram_account_id);

-- Add updated_at trigger for instagram_comment_triggers
CREATE TRIGGER update_instagram_comment_triggers_updated_at
  BEFORE UPDATE ON public.instagram_comment_triggers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();