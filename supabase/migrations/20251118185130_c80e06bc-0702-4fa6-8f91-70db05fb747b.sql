-- Create admin impersonation tracking table
CREATE TABLE IF NOT EXISTS public.admin_impersonations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  impersonated_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL,
  ended_at timestamptz
);

-- Enable RLS
ALTER TABLE public.admin_impersonations ENABLE ROW LEVEL SECURITY;

-- Only admins can manage impersonations
CREATE POLICY "Admins can manage impersonations"
ON public.admin_impersonations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create index for faster lookups
CREATE INDEX idx_admin_impersonations_active 
ON public.admin_impersonations(impersonated_user_id, expires_at) 
WHERE ended_at IS NULL;