-- Add default message tag preference to profiles
ALTER TABLE profiles 
ADD COLUMN default_message_tag text DEFAULT 'HUMAN_AGENT';

-- Add preferred message tag to conversations
ALTER TABLE conversations 
ADD COLUMN preferred_message_tag text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN profiles.default_message_tag IS 'Global default message tag preference for the user';
COMMENT ON COLUMN conversations.preferred_message_tag IS 'Preferred message tag for this specific conversation (overrides global default)';