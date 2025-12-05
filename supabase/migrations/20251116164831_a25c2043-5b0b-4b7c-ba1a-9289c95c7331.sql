-- Create table for storing collected user inputs during flow execution
CREATE TABLE IF NOT EXISTS public.flow_user_inputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_execution_id UUID NOT NULL REFERENCES public.flow_executions(id) ON DELETE CASCADE,
  input_node_id TEXT NOT NULL,
  variable_name TEXT NOT NULL,
  user_response TEXT NOT NULL,
  collected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flow_user_inputs ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own flow inputs
CREATE POLICY "Users can view their own flow inputs"
ON public.flow_user_inputs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.flow_executions
    WHERE flow_executions.id = flow_user_inputs.flow_execution_id
    AND flow_executions.user_id = auth.uid()
  )
);

-- Create policy for system to insert flow inputs
CREATE POLICY "System can insert flow inputs"
ON public.flow_user_inputs
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_flow_user_inputs_execution_id 
ON public.flow_user_inputs(flow_execution_id);

CREATE INDEX idx_flow_user_inputs_variable_name 
ON public.flow_user_inputs(flow_execution_id, variable_name);