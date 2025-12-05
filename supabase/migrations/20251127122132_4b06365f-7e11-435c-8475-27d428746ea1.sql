-- Create WhatsApp subscribers table
CREATE TABLE IF NOT EXISTS public.whatsapp_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  whatsapp_account_id UUID NOT NULL REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  subscriber_name TEXT,
  profile_pic_url TEXT,
  tags TEXT[] DEFAULT '{}',
  last_interaction_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(whatsapp_account_id, phone_number)
);

-- Create WhatsApp conversations table
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  whatsapp_account_id UUID NOT NULL REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES public.whatsapp_subscribers(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_text TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(whatsapp_account_id, subscriber_id)
);

-- Create WhatsApp messages table
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  whatsapp_message_id TEXT,
  message_text TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'subscriber')),
  attachment_type TEXT,
  attachment_url TEXT,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create WhatsApp chatbot flows table
CREATE TABLE IF NOT EXISTS public.whatsapp_chatbot_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  whatsapp_account_id UUID NOT NULL REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_keyword TEXT,
  match_type TEXT NOT NULL DEFAULT 'exact' CHECK (match_type IN ('exact', 'contains', 'starts_with', 'any')),
  flow_data JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create WhatsApp flow executions table
CREATE TABLE IF NOT EXISTS public.whatsapp_flow_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  flow_id UUID NOT NULL REFERENCES public.whatsapp_chatbot_flows(id) ON DELETE CASCADE,
  whatsapp_account_id UUID NOT NULL REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE,
  subscriber_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  error_message TEXT,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.whatsapp_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_chatbot_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_flow_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_subscribers
CREATE POLICY "Users can view their own WhatsApp subscribers"
  ON public.whatsapp_subscribers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own WhatsApp subscribers"
  ON public.whatsapp_subscribers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own WhatsApp subscribers"
  ON public.whatsapp_subscribers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own WhatsApp subscribers"
  ON public.whatsapp_subscribers FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for whatsapp_conversations
CREATE POLICY "Users can view their own WhatsApp conversations"
  ON public.whatsapp_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own WhatsApp conversations"
  ON public.whatsapp_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own WhatsApp conversations"
  ON public.whatsapp_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own WhatsApp conversations"
  ON public.whatsapp_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for whatsapp_messages
CREATE POLICY "Users can view messages from their conversations"
  ON public.whatsapp_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.whatsapp_conversations
    WHERE whatsapp_conversations.id = whatsapp_messages.conversation_id
    AND whatsapp_conversations.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert messages to their conversations"
  ON public.whatsapp_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.whatsapp_conversations
    WHERE whatsapp_conversations.id = whatsapp_messages.conversation_id
    AND whatsapp_conversations.user_id = auth.uid()
  ));

-- RLS Policies for whatsapp_chatbot_flows
CREATE POLICY "Users can view their own WhatsApp flows"
  ON public.whatsapp_chatbot_flows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own WhatsApp flows"
  ON public.whatsapp_chatbot_flows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own WhatsApp flows"
  ON public.whatsapp_chatbot_flows FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own WhatsApp flows"
  ON public.whatsapp_chatbot_flows FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for whatsapp_flow_executions
CREATE POLICY "Users can view their own WhatsApp flow executions"
  ON public.whatsapp_flow_executions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own WhatsApp flow executions"
  ON public.whatsapp_flow_executions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own WhatsApp flow executions"
  ON public.whatsapp_flow_executions FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_subscribers_user_id ON public.whatsapp_subscribers(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_subscribers_account_id ON public.whatsapp_subscribers(whatsapp_account_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_user_id ON public.whatsapp_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_account_id ON public.whatsapp_conversations(whatsapp_account_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_id ON public.whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chatbot_flows_user_id ON public.whatsapp_chatbot_flows(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_flow_executions_user_id ON public.whatsapp_flow_executions(user_id);