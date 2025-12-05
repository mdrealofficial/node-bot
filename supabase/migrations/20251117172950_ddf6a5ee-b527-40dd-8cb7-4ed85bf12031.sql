-- Create Instagram accounts table similar to facebook_pages
CREATE TABLE IF NOT EXISTS public.instagram_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  instagram_account_id TEXT NOT NULL,
  instagram_username TEXT NOT NULL,
  account_name TEXT NOT NULL,
  profile_picture_url TEXT,
  followers_count INTEGER DEFAULT 0,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active',
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(instagram_account_id, user_id)
);

-- Enable RLS
ALTER TABLE public.instagram_accounts ENABLE ROW LEVEL SECURITY;

-- Users can view their own Instagram accounts
CREATE POLICY "Users can view their own Instagram accounts"
ON public.instagram_accounts
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own Instagram accounts
CREATE POLICY "Users can insert their own Instagram accounts"
ON public.instagram_accounts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own Instagram accounts
CREATE POLICY "Users can update their own Instagram accounts"
ON public.instagram_accounts
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own Instagram accounts
CREATE POLICY "Users can delete their own Instagram accounts"
ON public.instagram_accounts
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all Instagram accounts
CREATE POLICY "Admins can view all Instagram accounts"
ON public.instagram_accounts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create Instagram subscribers table
CREATE TABLE IF NOT EXISTS public.instagram_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  instagram_account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  subscriber_instagram_id TEXT NOT NULL,
  subscriber_username TEXT,
  subscriber_name TEXT,
  profile_pic_url TEXT,
  tags TEXT[] DEFAULT '{}',
  last_interaction_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(instagram_account_id, subscriber_instagram_id)
);

-- Enable RLS
ALTER TABLE public.instagram_subscribers ENABLE ROW LEVEL SECURITY;

-- Users can view their own Instagram subscribers
CREATE POLICY "Users can view their own Instagram subscribers"
ON public.instagram_subscribers
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own Instagram subscribers
CREATE POLICY "Users can insert their own Instagram subscribers"
ON public.instagram_subscribers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own Instagram subscribers
CREATE POLICY "Users can update their own Instagram subscribers"
ON public.instagram_subscribers
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own Instagram subscribers
CREATE POLICY "Users can delete their own Instagram subscribers"
ON public.instagram_subscribers
FOR DELETE
USING (auth.uid() = user_id);

-- Create Instagram conversations table
CREATE TABLE IF NOT EXISTS public.instagram_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  instagram_account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES public.instagram_subscribers(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_text TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(instagram_account_id, subscriber_id)
);

-- Enable RLS
ALTER TABLE public.instagram_conversations ENABLE ROW LEVEL SECURITY;

-- Users can view their own Instagram conversations
CREATE POLICY "Users can view their own Instagram conversations"
ON public.instagram_conversations
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own Instagram conversations
CREATE POLICY "Users can insert their own Instagram conversations"
ON public.instagram_conversations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own Instagram conversations
CREATE POLICY "Users can update their own Instagram conversations"
ON public.instagram_conversations
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own Instagram conversations
CREATE POLICY "Users can delete their own Instagram conversations"
ON public.instagram_conversations
FOR DELETE
USING (auth.uid() = user_id);

-- Create Instagram messages table
CREATE TABLE IF NOT EXISTS public.instagram_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.instagram_conversations(id) ON DELETE CASCADE,
  instagram_message_id TEXT,
  message_text TEXT NOT NULL,
  sender_type TEXT NOT NULL,
  attachment_type TEXT,
  attachment_url TEXT,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.instagram_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages from their conversations
CREATE POLICY "Users can view Instagram messages from their conversations"
ON public.instagram_messages
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM instagram_conversations
  WHERE instagram_conversations.id = instagram_messages.conversation_id
  AND instagram_conversations.user_id = auth.uid()
));

-- Users can insert messages to their conversations
CREATE POLICY "Users can insert Instagram messages to their conversations"
ON public.instagram_messages
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM instagram_conversations
  WHERE instagram_conversations.id = instagram_messages.conversation_id
  AND instagram_conversations.user_id = auth.uid()
));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_user_id ON public.instagram_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_subscribers_account_id ON public.instagram_subscribers(instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_conversations_account_id ON public.instagram_conversations(instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_messages_conversation_id ON public.instagram_messages(conversation_id);