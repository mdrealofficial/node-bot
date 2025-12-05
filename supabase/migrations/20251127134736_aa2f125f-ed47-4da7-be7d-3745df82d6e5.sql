-- Phase 1: Performance Optimization Migration

-- Add index for faster realtime queries
CREATE INDEX IF NOT EXISTS idx_website_messages_conversation_id_sent_at 
ON website_messages(conversation_id, sent_at DESC);

-- Add typing indicator columns
ALTER TABLE website_conversations 
ADD COLUMN IF NOT EXISTS visitor_typing_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS agent_typing_at TIMESTAMP WITH TIME ZONE;

-- Create storage bucket for message cache files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-sessions', 'chat-sessions', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for chat sessions storage
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow public read for chat sessions'
  ) THEN
    CREATE POLICY "Allow public read for chat sessions"
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'chat-sessions');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow service role write for chat sessions'
  ) THEN
    CREATE POLICY "Allow service role write for chat sessions"
    ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id = 'chat-sessions');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow service role update for chat sessions'
  ) THEN
    CREATE POLICY "Allow service role update for chat sessions"
    ON storage.objects FOR UPDATE 
    USING (bucket_id = 'chat-sessions');
  END IF;
END $$;