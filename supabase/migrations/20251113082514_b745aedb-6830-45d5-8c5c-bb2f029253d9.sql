-- Create subscribers table
CREATE TABLE IF NOT EXISTS public.subscribers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  page_id uuid NOT NULL REFERENCES public.facebook_pages(id) ON DELETE CASCADE,
  subscriber_psid text NOT NULL,
  subscriber_name text,
  profile_pic_url text,
  last_interaction_time timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(page_id, subscriber_psid)
);

-- Enable RLS
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own subscribers"
  ON public.subscribers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscribers"
  ON public.subscribers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscribers"
  ON public.subscribers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscribers"
  ON public.subscribers FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_subscribers_page_id ON public.subscribers(page_id);
CREATE INDEX idx_subscribers_user_id ON public.subscribers(user_id);

-- Add updated_at trigger
CREATE TRIGGER update_subscribers_updated_at
  BEFORE UPDATE ON public.subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();