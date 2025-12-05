-- Create table for Instagram unsent message auto-reply templates
CREATE TABLE IF NOT EXISTS public.instagram_unsent_reply_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  reply_message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.instagram_unsent_reply_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own unsent reply templates"
ON public.instagram_unsent_reply_templates
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own unsent reply templates"
ON public.instagram_unsent_reply_templates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own unsent reply templates"
ON public.instagram_unsent_reply_templates
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_instagram_unsent_reply_templates_account_id ON public.instagram_unsent_reply_templates(instagram_account_id);
CREATE INDEX idx_instagram_unsent_reply_templates_active ON public.instagram_unsent_reply_templates(is_active) WHERE is_active = true;

-- Create trigger for updated_at
CREATE TRIGGER update_instagram_unsent_reply_templates_updated_at
BEFORE UPDATE ON public.instagram_unsent_reply_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();