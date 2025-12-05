-- Create instagram_chatbot_flows table
CREATE TABLE IF NOT EXISTS public.instagram_chatbot_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  instagram_account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_keyword TEXT,
  match_type TEXT NOT NULL DEFAULT 'exact',
  is_active BOOLEAN NOT NULL DEFAULT false,
  flow_data JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_instagram_chatbot_flows_user_id ON public.instagram_chatbot_flows(user_id);
CREATE INDEX idx_instagram_chatbot_flows_account_id ON public.instagram_chatbot_flows(instagram_account_id);
CREATE INDEX idx_instagram_chatbot_flows_active ON public.instagram_chatbot_flows(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.instagram_chatbot_flows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own Instagram flows"
  ON public.instagram_chatbot_flows
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Instagram flows"
  ON public.instagram_chatbot_flows
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Instagram flows"
  ON public.instagram_chatbot_flows
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Instagram flows"
  ON public.instagram_chatbot_flows
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_instagram_chatbot_flows_updated_at
  BEFORE UPDATE ON public.instagram_chatbot_flows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create instagram_flow_executions table
CREATE TABLE IF NOT EXISTS public.instagram_flow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.instagram_chatbot_flows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  instagram_account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  subscriber_instagram_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  error_message TEXT,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster lookups
CREATE INDEX idx_instagram_flow_executions_flow_id ON public.instagram_flow_executions(flow_id);
CREATE INDEX idx_instagram_flow_executions_user_id ON public.instagram_flow_executions(user_id);

-- Enable RLS
ALTER TABLE public.instagram_flow_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own Instagram flow executions"
  ON public.instagram_flow_executions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Instagram flow executions"
  ON public.instagram_flow_executions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Instagram flow executions"
  ON public.instagram_flow_executions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create instagram_flow_user_inputs table
CREATE TABLE IF NOT EXISTS public.instagram_flow_user_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_execution_id UUID NOT NULL REFERENCES public.instagram_flow_executions(id) ON DELETE CASCADE,
  input_node_id TEXT NOT NULL,
  variable_name TEXT NOT NULL,
  user_response TEXT NOT NULL,
  collected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_instagram_flow_user_inputs_execution_id ON public.instagram_flow_user_inputs(flow_execution_id);

-- Enable RLS
ALTER TABLE public.instagram_flow_user_inputs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own Instagram flow inputs"
  ON public.instagram_flow_user_inputs
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.instagram_flow_executions
    WHERE instagram_flow_executions.id = instagram_flow_user_inputs.flow_execution_id
    AND instagram_flow_executions.user_id = auth.uid()
  ));

CREATE POLICY "System can insert Instagram flow inputs"
  ON public.instagram_flow_user_inputs
  FOR INSERT
  WITH CHECK (true);

-- Create instagram_node_executions table
CREATE TABLE IF NOT EXISTS public.instagram_node_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_execution_id UUID NOT NULL REFERENCES public.instagram_flow_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  execution_time_ms INTEGER,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_instagram_node_executions_execution_id ON public.instagram_node_executions(flow_execution_id);

-- Enable RLS
ALTER TABLE public.instagram_node_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own Instagram node executions"
  ON public.instagram_node_executions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.instagram_flow_executions
    WHERE instagram_flow_executions.id = instagram_node_executions.flow_execution_id
    AND instagram_flow_executions.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert Instagram node executions"
  ON public.instagram_node_executions
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.instagram_flow_executions
    WHERE instagram_flow_executions.id = instagram_node_executions.flow_execution_id
    AND instagram_flow_executions.user_id = auth.uid()
  ));