-- Fix SECURITY DEFINER view issue by explicitly setting security_invoker to true
-- This ensures the view executes with the querying user's permissions, not the view creator's

ALTER VIEW public.whatsapp_analytics_daily SET (security_invoker = true);

-- Add comment explaining the security model
COMMENT ON VIEW public.whatsapp_analytics_daily IS 
'Analytics view that aggregates WhatsApp message data. Executes with querying user permissions (security_invoker=true) to respect RLS policies on underlying tables.';