-- Add status column to messages table
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages(status);

-- Add index for conversation_id and sent_at for efficient message loading
CREATE INDEX IF NOT EXISTS idx_messages_conversation_sent_at ON public.messages(conversation_id, sent_at DESC);