-- Create website_widgets table
CREATE TABLE public.website_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_name TEXT NOT NULL,
  widget_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  domain_whitelist TEXT[] DEFAULT '{}',
  primary_color TEXT DEFAULT '#6366f1',
  position TEXT DEFAULT 'bottom-right' CHECK (position IN ('bottom-right', 'bottom-left')),
  welcome_message TEXT DEFAULT 'Hi! How can we help you today?',
  offline_message TEXT DEFAULT 'We''re currently offline. Leave us a message!',
  avatar_url TEXT,
  business_name TEXT NOT NULL,
  auto_response_enabled BOOLEAN DEFAULT false,
  auto_response_message TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create website_visitors table
CREATE TABLE public.website_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_id UUID NOT NULL REFERENCES public.website_widgets(id) ON DELETE CASCADE,
  visitor_token TEXT UNIQUE NOT NULL,
  visitor_name TEXT DEFAULT 'Anonymous Visitor',
  visitor_email TEXT,
  visitor_ip TEXT,
  visitor_location JSONB,
  current_page_url TEXT,
  user_agent TEXT,
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Create website_conversations table
CREATE TABLE public.website_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_id UUID NOT NULL REFERENCES public.website_widgets(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL REFERENCES public.website_visitors(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_message_text TEXT,
  unread_count INTEGER DEFAULT 0,
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create website_messages table
CREATE TABLE public.website_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.website_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('visitor', 'user', 'system')),
  message_text TEXT NOT NULL,
  attachment_url TEXT,
  attachment_type TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_website_widgets_user_id ON public.website_widgets(user_id);
CREATE INDEX idx_website_widgets_token ON public.website_widgets(widget_token);
CREATE INDEX idx_website_visitors_user_id ON public.website_visitors(user_id);
CREATE INDEX idx_website_visitors_token ON public.website_visitors(visitor_token);
CREATE INDEX idx_website_conversations_user_id ON public.website_conversations(user_id);
CREATE INDEX idx_website_conversations_visitor_id ON public.website_conversations(visitor_id);
CREATE INDEX idx_website_messages_conversation_id ON public.website_messages(conversation_id);

-- Enable RLS
ALTER TABLE public.website_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for website_widgets
CREATE POLICY "Users can view their own widgets"
  ON public.website_widgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own widgets"
  ON public.website_widgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own widgets"
  ON public.website_widgets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own widgets"
  ON public.website_widgets FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for website_visitors
CREATE POLICY "Users can view their visitors"
  ON public.website_visitors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert visitors"
  ON public.website_visitors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their visitors"
  ON public.website_visitors FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for website_conversations
CREATE POLICY "Users can view their conversations"
  ON public.website_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their conversations"
  ON public.website_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their conversations"
  ON public.website_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their conversations"
  ON public.website_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for website_messages
CREATE POLICY "Users can view messages from their conversations"
  ON public.website_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.website_conversations
      WHERE website_conversations.id = website_messages.conversation_id
      AND website_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to their conversations"
  ON public.website_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.website_conversations
      WHERE website_conversations.id = website_messages.conversation_id
      AND website_conversations.user_id = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.website_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.website_conversations;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_website_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER website_widgets_updated_at
  BEFORE UPDATE ON public.website_widgets
  FOR EACH ROW
  EXECUTE FUNCTION update_website_updated_at();

CREATE TRIGGER website_conversations_updated_at
  BEFORE UPDATE ON public.website_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_website_updated_at();