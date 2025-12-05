-- Create feature_announcements table
CREATE TABLE public.feature_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_id UUID REFERENCES public.features(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  target_roles TEXT[] NOT NULL DEFAULT ARRAY['user']::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_feature_announcements table to track who has read announcements
CREATE TABLE public.user_feature_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  announcement_id UUID NOT NULL REFERENCES public.feature_announcements(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, announcement_id)
);

-- Enable RLS
ALTER TABLE public.feature_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feature_announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feature_announcements
CREATE POLICY "Admins can manage announcements"
  ON public.feature_announcements
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view sent announcements"
  ON public.feature_announcements
  FOR SELECT
  USING (
    sent_at IS NOT NULL
    AND auth.uid() IS NOT NULL
  );

-- RLS Policies for user_feature_announcements
CREATE POLICY "Users can view their own announcement reads"
  ON public.user_feature_announcements
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark announcements as read"
  ON public.user_feature_announcements
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_user_feature_announcements_user_id ON public.user_feature_announcements(user_id);
CREATE INDEX idx_user_feature_announcements_announcement_id ON public.user_feature_announcements(announcement_id);
CREATE INDEX idx_feature_announcements_sent_at ON public.feature_announcements(sent_at);

-- Create trigger for updated_at
CREATE TRIGGER update_feature_announcements_updated_at
  BEFORE UPDATE ON public.feature_announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();