-- Create conversation_labels table for organizing conversations
CREATE TABLE IF NOT EXISTS public.conversation_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE public.conversation_labels ENABLE ROW LEVEL SECURITY;

-- Create policies for conversation_labels
CREATE POLICY "Users can view their own labels"
  ON public.conversation_labels
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own labels"
  ON public.conversation_labels
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own labels"
  ON public.conversation_labels
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own labels"
  ON public.conversation_labels
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create conversation_label_assignments table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.conversation_label_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  label_id UUID NOT NULL REFERENCES public.conversation_labels(id) ON DELETE CASCADE,
  conversation_type TEXT NOT NULL CHECK (conversation_type IN ('facebook', 'instagram', 'whatsapp')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(conversation_id, label_id, conversation_type)
);

-- Enable RLS
ALTER TABLE public.conversation_label_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for conversation_label_assignments
CREATE POLICY "Users can view label assignments for their conversations"
  ON public.conversation_label_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_labels
      WHERE conversation_labels.id = conversation_label_assignments.label_id
      AND conversation_labels.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create label assignments for their conversations"
  ON public.conversation_label_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversation_labels
      WHERE conversation_labels.id = conversation_label_assignments.label_id
      AND conversation_labels.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete label assignments for their conversations"
  ON public.conversation_label_assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_labels
      WHERE conversation_labels.id = conversation_label_assignments.label_id
      AND conversation_labels.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_conversation_labels_user_id ON public.conversation_labels(user_id);
CREATE INDEX idx_conversation_label_assignments_conversation ON public.conversation_label_assignments(conversation_id, conversation_type);
CREATE INDEX idx_conversation_label_assignments_label ON public.conversation_label_assignments(label_id);

-- Add updated_at trigger for conversation_labels
CREATE OR REPLACE FUNCTION update_conversation_labels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_labels_updated_at
  BEFORE UPDATE ON public.conversation_labels
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_labels_updated_at();