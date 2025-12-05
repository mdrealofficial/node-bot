-- Enable full row data for realtime on Instagram tables
ALTER TABLE public.instagram_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.instagram_messages REPLICA IDENTITY FULL;

-- Add Instagram tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.instagram_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.instagram_messages;