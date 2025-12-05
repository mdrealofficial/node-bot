-- Add WhatsApp configuration to admin_config
ALTER TABLE public.admin_config 
ADD COLUMN IF NOT EXISTS whatsapp_business_account_id TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_access_token TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_webhook_verify_token TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_app_id TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_app_secret TEXT;

-- Create whatsapp_accounts table
CREATE TABLE IF NOT EXISTS public.whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  phone_number_id TEXT NOT NULL UNIQUE,
  business_account_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  display_phone_number TEXT NOT NULL,
  quality_rating TEXT,
  verified_name TEXT,
  access_token TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_accounts
CREATE POLICY "Users can view their own WhatsApp accounts"
ON public.whatsapp_accounts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own WhatsApp accounts"
ON public.whatsapp_accounts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own WhatsApp accounts"
ON public.whatsapp_accounts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own WhatsApp accounts"
ON public.whatsapp_accounts FOR DELETE
USING (auth.uid() = user_id);

-- Create whatsapp_subscribers table
CREATE TABLE IF NOT EXISTS public.whatsapp_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  whatsapp_account_id UUID NOT NULL REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  profile_name TEXT,
  tags TEXT[] DEFAULT '{}',
  last_interaction_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(whatsapp_account_id, phone_number)
);

ALTER TABLE public.whatsapp_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their WhatsApp subscribers"
ON public.whatsapp_subscribers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their WhatsApp subscribers"
ON public.whatsapp_subscribers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their WhatsApp subscribers"
ON public.whatsapp_subscribers FOR UPDATE
USING (auth.uid() = user_id);

-- Create whatsapp_conversations table
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  whatsapp_account_id UUID NOT NULL REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES public.whatsapp_subscribers(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_text TEXT,
  unread_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(whatsapp_account_id, subscriber_id)
);

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their WhatsApp conversations"
ON public.whatsapp_conversations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their WhatsApp conversations"
ON public.whatsapp_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their WhatsApp conversations"
ON public.whatsapp_conversations FOR UPDATE
USING (auth.uid() = user_id);

-- Create whatsapp_messages table
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  whatsapp_message_id TEXT UNIQUE,
  message_text TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'subscriber')),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document', 'location', 'contact', 'sticker', 'template', 'interactive')),
  media_url TEXT,
  media_type TEXT,
  template_name TEXT,
  interactive_type TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations"
ON public.whatsapp_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations
    WHERE id = whatsapp_messages.conversation_id
    AND auth.uid() = whatsapp_conversations.user_id
  )
);

CREATE POLICY "Users can insert messages in their conversations"
ON public.whatsapp_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations
    WHERE id = whatsapp_messages.conversation_id
    AND auth.uid() = whatsapp_conversations.user_id
  )
);

-- Create whatsapp_chatbot_flows table
CREATE TABLE IF NOT EXISTS public.whatsapp_chatbot_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  whatsapp_account_id UUID NOT NULL REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_keyword TEXT,
  match_type TEXT DEFAULT 'exact' CHECK (match_type IN ('exact', 'contains', 'starts_with', 'any')),
  flow_data JSONB DEFAULT '{"nodes": [], "edges": []}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.whatsapp_chatbot_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their WhatsApp flows"
ON public.whatsapp_chatbot_flows FOR ALL
USING (auth.uid() = user_id);

-- Create whatsapp_flow_executions table
CREATE TABLE IF NOT EXISTS public.whatsapp_flow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  flow_id UUID NOT NULL REFERENCES public.whatsapp_chatbot_flows(id) ON DELETE CASCADE,
  whatsapp_account_id UUID NOT NULL REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE,
  subscriber_phone TEXT NOT NULL,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  error_message TEXT,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.whatsapp_flow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their WhatsApp flow executions"
ON public.whatsapp_flow_executions FOR SELECT
USING (auth.uid() = user_id);

-- Create whatsapp_template_messages table
CREATE TABLE IF NOT EXISTS public.whatsapp_template_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  whatsapp_account_id UUID NOT NULL REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_language TEXT DEFAULT 'en',
  category TEXT NOT NULL CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  components JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.whatsapp_template_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their WhatsApp templates"
ON public.whatsapp_template_messages FOR ALL
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_whatsapp_accounts_user_id ON public.whatsapp_accounts(user_id);
CREATE INDEX idx_whatsapp_subscribers_account_id ON public.whatsapp_subscribers(whatsapp_account_id);
CREATE INDEX idx_whatsapp_conversations_account_id ON public.whatsapp_conversations(whatsapp_account_id);
CREATE INDEX idx_whatsapp_messages_conversation_id ON public.whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_flows_account_id ON public.whatsapp_chatbot_flows(whatsapp_account_id);

-- Create updated_at triggers
CREATE TRIGGER update_whatsapp_accounts_updated_at
  BEFORE UPDATE ON public.whatsapp_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_subscribers_updated_at
  BEFORE UPDATE ON public.whatsapp_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_conversations_updated_at
  BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_chatbot_flows_updated_at
  BEFORE UPDATE ON public.whatsapp_chatbot_flows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();