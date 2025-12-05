-- Create flow_versions table for storing flow snapshots
CREATE TABLE IF NOT EXISTS public.flow_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES public.chatbot_flows(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  flow_data JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}'::jsonb,
  version_name TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  user_id UUID NOT NULL,
  UNIQUE(flow_id, version_number)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_flow_versions_flow_id ON public.flow_versions(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_versions_created_at ON public.flow_versions(created_at DESC);

-- Enable RLS
ALTER TABLE public.flow_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own flow versions"
  ON public.flow_versions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flow versions"
  ON public.flow_versions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() = created_by);

CREATE POLICY "Users can delete their own flow versions"
  ON public.flow_versions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically create version on flow update
CREATE OR REPLACE FUNCTION public.create_flow_version()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 
  INTO next_version
  FROM flow_versions 
  WHERE flow_id = NEW.id;
  
  -- Create version snapshot
  INSERT INTO flow_versions (
    flow_id,
    version_number,
    flow_data,
    version_name,
    created_by,
    user_id
  ) VALUES (
    NEW.id,
    next_version,
    NEW.flow_data,
    'Auto-save v' || next_version,
    auth.uid(),
    NEW.user_id
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create versions
CREATE TRIGGER create_flow_version_trigger
  AFTER UPDATE OF flow_data ON public.chatbot_flows
  FOR EACH ROW
  WHEN (OLD.flow_data IS DISTINCT FROM NEW.flow_data)
  EXECUTE FUNCTION public.create_flow_version();

-- Create initial version for existing flows
INSERT INTO public.flow_versions (flow_id, version_number, flow_data, version_name, created_by, user_id)
SELECT 
  id,
  1,
  flow_data,
  'Initial version',
  user_id,
  user_id
FROM public.chatbot_flows
WHERE NOT EXISTS (
  SELECT 1 FROM public.flow_versions WHERE flow_versions.flow_id = chatbot_flows.id
);