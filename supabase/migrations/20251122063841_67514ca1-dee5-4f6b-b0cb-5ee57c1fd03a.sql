-- Create scheduled_broadcasts table
CREATE TABLE public.scheduled_broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('facebook', 'instagram')),
  message TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  active_recipients_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_broadcasts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own scheduled broadcasts"
ON public.scheduled_broadcasts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scheduled broadcasts"
ON public.scheduled_broadcasts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled broadcasts"
ON public.scheduled_broadcasts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled broadcasts"
ON public.scheduled_broadcasts FOR DELETE
USING (auth.uid() = user_id);

-- Index for efficient queries
CREATE INDEX idx_scheduled_broadcasts_user_id ON public.scheduled_broadcasts(user_id);
CREATE INDEX idx_scheduled_broadcasts_status ON public.scheduled_broadcasts(status);
CREATE INDEX idx_scheduled_broadcasts_scheduled_for ON public.scheduled_broadcasts(scheduled_for);

-- Trigger for updated_at
CREATE TRIGGER update_scheduled_broadcasts_updated_at
BEFORE UPDATE ON public.scheduled_broadcasts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();