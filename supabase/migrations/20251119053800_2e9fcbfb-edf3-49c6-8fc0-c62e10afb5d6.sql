-- Add separate URL fields for Piprapay endpoints
ALTER TABLE public.admin_config 
ADD COLUMN IF NOT EXISTS piprapay_create_charge_url text,
ADD COLUMN IF NOT EXISTS piprapay_verify_webhook_url text;

-- Add comment for clarity
COMMENT ON COLUMN public.admin_config.piprapay_base_url IS 'Base URL for Piprapay instance (e.g., https://pay.yourdomain.com)';
COMMENT ON COLUMN public.admin_config.piprapay_create_charge_url IS 'Full URL for creating charges (e.g., https://pay.yourdomain.com/api/charge)';
COMMENT ON COLUMN public.admin_config.piprapay_verify_webhook_url IS 'Full URL for verifying webhooks (e.g., https://pay.yourdomain.com/api/webhook/verify)';