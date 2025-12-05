-- Create system_error_logs table for System Health monitoring
CREATE TABLE public.system_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL, -- 'client_error', 'edge_function_error', 'webhook_error', 'database_error', 'api_error'
  error_code TEXT,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  component TEXT, -- Component/function where error occurred
  severity TEXT DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  metadata JSONB DEFAULT '{}'::jsonb,
  user_agent TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row-Level Security
ALTER TABLE public.system_error_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage error logs
CREATE POLICY "Admins can view error logs" ON public.system_error_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update error logs" ON public.system_error_logs
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete error logs" ON public.system_error_logs
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow system to insert error logs (for edge functions)
CREATE POLICY "System can insert error logs" ON public.system_error_logs
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_system_error_logs_created_at ON public.system_error_logs(created_at DESC);
CREATE INDEX idx_system_error_logs_severity ON public.system_error_logs(severity);
CREATE INDEX idx_system_error_logs_error_type ON public.system_error_logs(error_type);
CREATE INDEX idx_system_error_logs_resolved ON public.system_error_logs(resolved);
CREATE INDEX idx_system_error_logs_user_id ON public.system_error_logs(user_id);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_error_logs;