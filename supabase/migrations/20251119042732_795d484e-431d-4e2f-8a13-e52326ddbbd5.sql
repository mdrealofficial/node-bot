-- Enable RLS on subscription_plans table
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Policy for admins to view all plans
CREATE POLICY "Admins can view all plans"
ON public.subscription_plans
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy for admins to insert plans
CREATE POLICY "Admins can insert plans"
ON public.subscription_plans
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policy for admins to update plans
CREATE POLICY "Admins can update plans"
ON public.subscription_plans
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy for admins to delete plans
CREATE POLICY "Admins can delete plans"
ON public.subscription_plans
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy for users to view active plans
CREATE POLICY "Users can view active plans"
ON public.subscription_plans
FOR SELECT
TO authenticated
USING (is_active = true);