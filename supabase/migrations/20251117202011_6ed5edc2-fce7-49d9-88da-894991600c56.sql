-- Create table for Instagram follow-to-DM triggers
CREATE TABLE IF NOT EXISTS public.instagram_follow_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  instagram_account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  dm_message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for tracking follow DMs sent
CREATE TABLE IF NOT EXISTS public.instagram_follow_dms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  instagram_account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  trigger_id UUID REFERENCES public.instagram_follow_triggers(id) ON DELETE SET NULL,
  follower_instagram_id TEXT NOT NULL,
  follower_username TEXT,
  dm_sent BOOLEAN DEFAULT false,
  dm_message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.instagram_follow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_follow_dms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for instagram_follow_triggers
CREATE POLICY "Users can view their own Instagram follow triggers"
  ON public.instagram_follow_triggers
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own Instagram follow triggers"
  ON public.instagram_follow_triggers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Instagram follow triggers"
  ON public.instagram_follow_triggers
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Instagram follow triggers"
  ON public.instagram_follow_triggers
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for instagram_follow_dms
CREATE POLICY "Users can view their own Instagram follow DMs"
  ON public.instagram_follow_dms
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Instagram follow DMs"
  ON public.instagram_follow_dms
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_instagram_follow_triggers_user_id ON public.instagram_follow_triggers(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_follow_triggers_instagram_account_id ON public.instagram_follow_triggers(instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_follow_triggers_is_active ON public.instagram_follow_triggers(is_active);
CREATE INDEX IF NOT EXISTS idx_instagram_follow_dms_user_id ON public.instagram_follow_dms(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_follow_dms_instagram_account_id ON public.instagram_follow_dms(instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_follow_dms_follower_instagram_id ON public.instagram_follow_dms(follower_instagram_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_instagram_follow_triggers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_instagram_follow_triggers_updated_at
  BEFORE UPDATE ON public.instagram_follow_triggers
  FOR EACH ROW
  EXECUTE FUNCTION update_instagram_follow_triggers_updated_at();