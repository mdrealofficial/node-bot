-- Add tags column to subscribers table
ALTER TABLE public.subscribers 
ADD COLUMN tags TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.subscribers.tags IS 'Array of tags for categorizing subscribers';

-- Add cascade delete for conversations when subscriber is deleted
ALTER TABLE public.conversations 
DROP CONSTRAINT IF EXISTS conversations_subscriber_id_fkey,
ADD CONSTRAINT conversations_subscriber_id_fkey 
  FOREIGN KEY (subscriber_id) 
  REFERENCES public.subscribers(id) 
  ON DELETE CASCADE;

-- Add cascade delete for messages when conversation is deleted
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey,
ADD CONSTRAINT messages_conversation_id_fkey 
  FOREIGN KEY (conversation_id) 
  REFERENCES public.conversations(id) 
  ON DELETE CASCADE;