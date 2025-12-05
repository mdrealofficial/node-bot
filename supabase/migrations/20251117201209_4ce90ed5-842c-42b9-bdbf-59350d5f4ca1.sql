-- Create instagram_story_triggers table
CREATE TABLE public.instagram_story_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  instagram_account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trigger_type TEXT NOT NULL DEFAULT 'all_story_replies',
  sticker_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  dm_message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_story_trigger_per_account UNIQUE(instagram_account_id, name)
);

-- Create instagram_story_replies table to log interactions
CREATE TABLE public.instagram_story_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  instagram_account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  trigger_id UUID REFERENCES public.instagram_story_triggers(id) ON DELETE SET NULL,
  story_id TEXT NOT NULL,
  reply_text TEXT,
  reply_type TEXT NOT NULL,
  replier_instagram_id TEXT NOT NULL,
  sticker_type TEXT,
  sticker_response TEXT,
  dm_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.instagram_story_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_story_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for instagram_story_triggers
CREATE POLICY "Users can view their own Instagram story triggers"
  ON public.instagram_story_triggers
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own Instagram story triggers"
  ON public.instagram_story_triggers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Instagram story triggers"
  ON public.instagram_story_triggers
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Instagram story triggers"
  ON public.instagram_story_triggers
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for instagram_story_replies
CREATE POLICY "Users can view their own Instagram story replies"
  ON public.instagram_story_replies
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Instagram story replies"
  ON public.instagram_story_replies
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger for story triggers
CREATE TRIGGER update_instagram_story_triggers_updated_at
  BEFORE UPDATE ON public.instagram_story_triggers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_instagram_story_triggers_account_id 
  ON public.instagram_story_triggers(instagram_account_id);
  
CREATE INDEX idx_instagram_story_triggers_active 
  ON public.instagram_story_triggers(is_active) WHERE is_active = true;
  
CREATE INDEX idx_instagram_story_replies_account_id 
  ON public.instagram_story_replies(instagram_account_id);
  
CREATE INDEX idx_instagram_story_replies_created_at 
  ON public.instagram_story_replies(created_at DESC);