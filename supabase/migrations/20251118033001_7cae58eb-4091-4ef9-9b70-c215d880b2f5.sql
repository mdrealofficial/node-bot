-- Create TikTok Accounts table
CREATE TABLE public.tiktok_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tiktok_account_id TEXT NOT NULL UNIQUE,
  tiktok_username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  access_token TEXT NOT NULL,
  profile_picture_url TEXT,
  followers_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  token_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create TikTok Subscribers table
CREATE TABLE public.tiktok_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tiktok_account_id UUID NOT NULL REFERENCES public.tiktok_accounts(id) ON DELETE CASCADE,
  subscriber_tiktok_id TEXT NOT NULL,
  subscriber_username TEXT,
  subscriber_name TEXT,
  profile_pic_url TEXT,
  tags TEXT[] DEFAULT '{}',
  last_interaction_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tiktok_account_id, subscriber_tiktok_id)
);

-- Create TikTok Conversations table
CREATE TABLE public.tiktok_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tiktok_account_id UUID NOT NULL REFERENCES public.tiktok_accounts(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES public.tiktok_subscribers(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_text TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tiktok_account_id, subscriber_id)
);

-- Create TikTok Messages table
CREATE TABLE public.tiktok_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.tiktok_conversations(id) ON DELETE CASCADE,
  tiktok_message_id TEXT,
  message_text TEXT NOT NULL,
  sender_type TEXT NOT NULL,
  attachment_type TEXT,
  attachment_url TEXT,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tiktok_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tiktok_accounts
CREATE POLICY "Users can view their own TikTok accounts"
  ON public.tiktok_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own TikTok accounts"
  ON public.tiktok_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own TikTok accounts"
  ON public.tiktok_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own TikTok accounts"
  ON public.tiktok_accounts FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all TikTok accounts"
  ON public.tiktok_accounts FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for tiktok_subscribers
CREATE POLICY "Users can view their own TikTok subscribers"
  ON public.tiktok_subscribers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own TikTok subscribers"
  ON public.tiktok_subscribers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own TikTok subscribers"
  ON public.tiktok_subscribers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own TikTok subscribers"
  ON public.tiktok_subscribers FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for tiktok_conversations
CREATE POLICY "Users can view their own TikTok conversations"
  ON public.tiktok_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own TikTok conversations"
  ON public.tiktok_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own TikTok conversations"
  ON public.tiktok_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own TikTok conversations"
  ON public.tiktok_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for tiktok_messages
CREATE POLICY "Users can view TikTok messages from their conversations"
  ON public.tiktok_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tiktok_conversations
      WHERE tiktok_conversations.id = tiktok_messages.conversation_id
      AND tiktok_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert TikTok messages to their conversations"
  ON public.tiktok_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tiktok_conversations
      WHERE tiktok_conversations.id = tiktok_messages.conversation_id
      AND tiktok_conversations.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_tiktok_accounts_user_id ON public.tiktok_accounts(user_id);
CREATE INDEX idx_tiktok_subscribers_account_id ON public.tiktok_subscribers(tiktok_account_id);
CREATE INDEX idx_tiktok_subscribers_user_id ON public.tiktok_subscribers(user_id);
CREATE INDEX idx_tiktok_conversations_account_id ON public.tiktok_conversations(tiktok_account_id);
CREATE INDEX idx_tiktok_conversations_subscriber_id ON public.tiktok_conversations(subscriber_id);
CREATE INDEX idx_tiktok_messages_conversation_id ON public.tiktok_messages(conversation_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_tiktok_accounts_updated_at
  BEFORE UPDATE ON public.tiktok_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tiktok_subscribers_updated_at
  BEFORE UPDATE ON public.tiktok_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tiktok_conversations_updated_at
  BEFORE UPDATE ON public.tiktok_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();