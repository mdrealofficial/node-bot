-- Create flow_executions table to track each flow trigger
CREATE TABLE public.flow_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES public.chatbot_flows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  page_id UUID NOT NULL REFERENCES public.facebook_pages(id) ON DELETE CASCADE,
  subscriber_psid TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running', -- running, completed, failed
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Create node_executions table to track each node execution
CREATE TABLE public.node_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_execution_id UUID NOT NULL REFERENCES public.flow_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  status TEXT NOT NULL, -- success, error
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  error_message TEXT,
  execution_time_ms INTEGER
);

-- Enable Row Level Security
ALTER TABLE public.flow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for flow_executions
CREATE POLICY "Users can view their own flow executions"
  ON public.flow_executions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flow executions"
  ON public.flow_executions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flow executions"
  ON public.flow_executions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for node_executions
CREATE POLICY "Users can view their own node executions"
  ON public.node_executions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.flow_executions
      WHERE flow_executions.id = node_executions.flow_execution_id
      AND flow_executions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert node executions"
  ON public.node_executions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.flow_executions
      WHERE flow_executions.id = node_executions.flow_execution_id
      AND flow_executions.user_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX idx_flow_executions_flow_id ON public.flow_executions(flow_id);
CREATE INDEX idx_flow_executions_user_id ON public.flow_executions(user_id);
CREATE INDEX idx_flow_executions_triggered_at ON public.flow_executions(triggered_at);
CREATE INDEX idx_node_executions_flow_execution_id ON public.node_executions(flow_execution_id);
CREATE INDEX idx_node_executions_node_id ON public.node_executions(node_id);
CREATE INDEX idx_node_executions_status ON public.node_executions(status);