-- Create canned_messages table for storing reusable message templates
CREATE TABLE IF NOT EXISTS public.canned_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.canned_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own canned messages"
  ON public.canned_messages
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own canned messages"
  ON public.canned_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own canned messages"
  ON public.canned_messages
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own canned messages"
  ON public.canned_messages
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_canned_messages_updated_at
  BEFORE UPDATE ON public.canned_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_canned_messages_user_id ON public.canned_messages(user_id);