-- Add moderation fields to comment_reply_templates
ALTER TABLE comment_reply_templates
ADD COLUMN IF NOT EXISTS censored_keywords text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS profanity_level text DEFAULT 'none' CHECK (profanity_level IN ('none', 'mild', 'moderate', 'severe')),
ADD COLUMN IF NOT EXISTS spam_detection_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS link_detection_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS moderation_action text DEFAULT 'none' CHECK (moderation_action IN ('none', 'hide', 'delete', 'warn', 'ban', 'review')),
ADD COLUMN IF NOT EXISTS whitelist_users text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS blacklist_users text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS max_comment_length integer;

-- Create user_reputation table for tracking repeat offenders
CREATE TABLE IF NOT EXISTS public.user_reputation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  page_id text NOT NULL,
  platform_user_id text NOT NULL,
  platform_username text,
  violation_count integer DEFAULT 0,
  spam_count integer DEFAULT 0,
  profanity_count integer DEFAULT 0,
  last_violation_at timestamptz,
  status text DEFAULT 'normal' CHECK (status IN ('normal', 'warned', 'flagged', 'banned')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, page_id, platform_user_id)
);

-- Create moderated_comments table for tracking moderation actions
CREATE TABLE IF NOT EXISTS public.moderated_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id text NOT NULL,
  post_id text NOT NULL,
  page_id text NOT NULL,
  user_id text NOT NULL,
  commenter_psid text,
  commenter_name text,
  comment_text text NOT NULL,
  violation_type text NOT NULL,
  action_taken text NOT NULL,
  template_id uuid REFERENCES comment_reply_templates(id) ON DELETE SET NULL,
  flagged_keywords text[],
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderated_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_reputation
CREATE POLICY "Users can view their own reputation data"
  ON public.user_reputation FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own reputation data"
  ON public.user_reputation FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own reputation data"
  ON public.user_reputation FOR UPDATE
  USING (auth.uid()::text = user_id);

-- RLS Policies for moderated_comments
CREATE POLICY "Users can view their own moderated comments"
  ON public.moderated_comments FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own moderated comments"
  ON public.moderated_comments FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_reputation_user_page ON public.user_reputation(user_id, page_id);
CREATE INDEX IF NOT EXISTS idx_user_reputation_platform_user ON public.user_reputation(platform_user_id);
CREATE INDEX IF NOT EXISTS idx_moderated_comments_user ON public.moderated_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_moderated_comments_page ON public.moderated_comments(page_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_reputation_updated_at
  BEFORE UPDATE ON public.user_reputation
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();