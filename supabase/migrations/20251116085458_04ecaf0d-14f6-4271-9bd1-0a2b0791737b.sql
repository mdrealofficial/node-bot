-- Add unique constraint on subscriber_id in conversations table
-- This ensures each subscriber can only have one conversation
ALTER TABLE conversations 
ADD CONSTRAINT conversations_subscriber_id_unique UNIQUE (subscriber_id);