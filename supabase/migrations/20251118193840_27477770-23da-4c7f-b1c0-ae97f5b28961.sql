-- Create table for tracking unsent Instagram messages
CREATE TABLE IF NOT EXISTS public.instagram_unsent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  sender_instagram_id TEXT NOT NULL,
  sender_name TEXT,
  message_text TEXT NOT NULL,
  unsent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  original_message_id TEXT,
  conversation_id UUID REFERENCES public.instagram_conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.instagram_unsent_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own unsent messages"
ON public.instagram_unsent_messages
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert unsent messages"
ON public.instagram_unsent_messages
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_instagram_unsent_messages_user_id ON public.instagram_unsent_messages(user_id);
CREATE INDEX idx_instagram_unsent_messages_account_id ON public.instagram_unsent_messages(instagram_account_id);
CREATE INDEX idx_instagram_unsent_messages_unsent_at ON public.instagram_unsent_messages(unsent_at DESC);