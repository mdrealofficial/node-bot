-- Create data deletion requests table
CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facebook_user_id TEXT NOT NULL,
  confirmation_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  deletion_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Admin can view all deletion requests
CREATE POLICY "Admins can view all deletion requests"
ON public.data_deletion_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Service role can insert/update (edge function uses service role)
CREATE POLICY "Service role can manage deletion requests"
ON public.data_deletion_requests
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_data_deletion_confirmation_code 
ON public.data_deletion_requests(confirmation_code);

CREATE INDEX IF NOT EXISTS idx_data_deletion_facebook_user 
ON public.data_deletion_requests(facebook_user_id);