-- Phase 1: Flow Builder - No additional tables needed (whatsapp_chatbot_flows already exists)

-- Phase 2: Interactive Messages
CREATE TABLE IF NOT EXISTS public.whatsapp_interactive_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  interactive_type TEXT NOT NULL CHECK (interactive_type IN ('button', 'list', 'product')),
  header_text TEXT,
  body_text TEXT NOT NULL,
  footer_text TEXT,
  buttons JSONB,
  sections JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_button_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL,
  subscriber_id UUID REFERENCES public.whatsapp_subscribers(id) ON DELETE CASCADE,
  button_id TEXT NOT NULL,
  button_text TEXT NOT NULL,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phase 4: Broadcast Messaging
CREATE TABLE IF NOT EXISTS public.whatsapp_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  whatsapp_account_id UUID REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message_text TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'template', 'media')),
  template_name TEXT,
  media_url TEXT,
  target_type TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'tags', 'custom')),
  target_tags TEXT[],
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'failed')),
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID REFERENCES public.whatsapp_broadcasts(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES public.whatsapp_subscribers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phase 7: Custom Fields & AI
CREATE TABLE IF NOT EXISTS public.whatsapp_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  whatsapp_account_id UUID REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'number', 'date', 'select', 'boolean')),
  options JSONB,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(whatsapp_account_id, field_name)
);

CREATE TABLE IF NOT EXISTS public.whatsapp_subscriber_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID REFERENCES public.whatsapp_subscribers(id) ON DELETE CASCADE,
  field_id UUID REFERENCES public.whatsapp_custom_fields(id) ON DELETE CASCADE,
  field_value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(subscriber_id, field_id)
);

CREATE TABLE IF NOT EXISTS public.whatsapp_ai_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  whatsapp_account_id UUID REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE UNIQUE,
  instructions TEXT NOT NULL DEFAULT 'You are a helpful AI assistant.',
  knowledge_base TEXT,
  enabled BOOLEAN DEFAULT false,
  handoff_keywords TEXT[] DEFAULT ARRAY['human', 'agent', 'support']::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_interactive_messages_conversation ON public.whatsapp_interactive_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_button_responses_subscriber ON public.whatsapp_button_responses(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_button_responses_message ON public.whatsapp_button_responses(message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_broadcasts_user ON public.whatsapp_broadcasts(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_broadcasts_account ON public.whatsapp_broadcasts(whatsapp_account_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_broadcasts_status ON public.whatsapp_broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_broadcast_recipients_broadcast ON public.whatsapp_broadcast_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_broadcast_recipients_subscriber ON public.whatsapp_broadcast_recipients(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_custom_fields_account ON public.whatsapp_custom_fields(whatsapp_account_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_subscriber_field_values_subscriber ON public.whatsapp_subscriber_field_values(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_subscriber_field_values_field ON public.whatsapp_subscriber_field_values(field_id);

-- RLS Policies
ALTER TABLE public.whatsapp_interactive_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_button_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_broadcast_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_subscriber_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_ai_context ENABLE ROW LEVEL SECURITY;

-- Interactive Messages Policies
CREATE POLICY "Users can view their own interactive messages" ON public.whatsapp_interactive_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_conversations
      WHERE whatsapp_conversations.id = whatsapp_interactive_messages.conversation_id
      AND whatsapp_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert interactive messages" ON public.whatsapp_interactive_messages
  FOR INSERT WITH CHECK (true);

-- Button Responses Policies
CREATE POLICY "Users can view button responses" ON public.whatsapp_button_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_subscribers
      WHERE whatsapp_subscribers.id = whatsapp_button_responses.subscriber_id
      AND whatsapp_subscribers.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert button responses" ON public.whatsapp_button_responses
  FOR INSERT WITH CHECK (true);

-- Broadcast Policies
CREATE POLICY "Users can view their own broadcasts" ON public.whatsapp_broadcasts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own broadcasts" ON public.whatsapp_broadcasts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own broadcasts" ON public.whatsapp_broadcasts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own broadcasts" ON public.whatsapp_broadcasts
  FOR DELETE USING (auth.uid() = user_id);

-- Broadcast Recipients Policies
CREATE POLICY "Users can view their broadcast recipients" ON public.whatsapp_broadcast_recipients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_broadcasts
      WHERE whatsapp_broadcasts.id = whatsapp_broadcast_recipients.broadcast_id
      AND whatsapp_broadcasts.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage broadcast recipients" ON public.whatsapp_broadcast_recipients
  FOR ALL USING (true);

-- Custom Fields Policies
CREATE POLICY "Users can view their custom fields" ON public.whatsapp_custom_fields
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their custom fields" ON public.whatsapp_custom_fields
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their custom fields" ON public.whatsapp_custom_fields
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their custom fields" ON public.whatsapp_custom_fields
  FOR DELETE USING (auth.uid() = user_id);

-- Subscriber Field Values Policies
CREATE POLICY "Users can view subscriber field values" ON public.whatsapp_subscriber_field_values
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_subscribers
      WHERE whatsapp_subscribers.id = whatsapp_subscriber_field_values.subscriber_id
      AND whatsapp_subscribers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage subscriber field values" ON public.whatsapp_subscriber_field_values
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_subscribers
      WHERE whatsapp_subscribers.id = whatsapp_subscriber_field_values.subscriber_id
      AND whatsapp_subscribers.user_id = auth.uid()
    )
  );

-- AI Context Policies
CREATE POLICY "Users can view their AI context" ON public.whatsapp_ai_context
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their AI context" ON public.whatsapp_ai_context
  FOR ALL USING (auth.uid() = user_id);

-- Analytics View
CREATE OR REPLACE VIEW public.whatsapp_analytics_daily AS
SELECT 
  wc.user_id,
  wc.whatsapp_account_id,
  DATE(wm.created_at) as date,
  COUNT(*) as message_count,
  COUNT(DISTINCT wm.conversation_id) as conversation_count,
  COUNT(*) FILTER (WHERE wm.sender_type = 'user') as messages_received,
  COUNT(*) FILTER (WHERE wm.sender_type = 'bot') as messages_sent
FROM public.whatsapp_messages wm
JOIN public.whatsapp_conversations wc ON wc.id = wm.conversation_id
GROUP BY wc.user_id, wc.whatsapp_account_id, DATE(wm.created_at);

-- Enable realtime for live chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;