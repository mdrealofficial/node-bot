-- Create table for comment reply templates
CREATE TABLE public.comment_reply_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  page_id UUID NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('full_page', 'general')),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- For full_page templates
  censored_keywords TEXT[], -- keywords to delete/hide comments
  full_page_reply_message TEXT,
  
  -- For general templates
  reply_mode TEXT CHECK (reply_mode IN ('generic', 'keyword_based')),
  generic_message TEXT,
  
  -- Keyword matching settings
  trigger_keywords TEXT[],
  match_type TEXT CHECK (match_type IN ('exact', 'contains')),
  keyword_reply_message TEXT,
  no_match_reply_message TEXT,
  
  -- Additional filtering
  exclude_keywords TEXT[], -- Don't reply if comment contains these
  min_comment_length INTEGER DEFAULT 0,
  max_comment_length INTEGER,
  reply_to_replies BOOLEAN DEFAULT false, -- Reply to comment replies
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comment_reply_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own templates"
  ON public.comment_reply_templates
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates"
  ON public.comment_reply_templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON public.comment_reply_templates
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON public.comment_reply_templates
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_comment_reply_templates_updated_at
  BEFORE UPDATE ON public.comment_reply_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for comment reply logs
CREATE TABLE public.comment_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  page_id UUID NOT NULL,
  template_id UUID,
  comment_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  reply_text TEXT NOT NULL,
  action_taken TEXT CHECK (action_taken IN ('replied', 'hidden', 'deleted', 'no_action')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comment_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own comment replies"
  ON public.comment_replies
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own comment replies"
  ON public.comment_replies
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);