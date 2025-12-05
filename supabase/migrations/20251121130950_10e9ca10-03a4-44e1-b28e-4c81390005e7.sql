-- Add CarryBee courier credentials
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS carrybee_api_key text,
ADD COLUMN IF NOT EXISTS carrybee_secret_key text;

-- Add Paperfly courier credentials
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS paperfly_merchant_id text,
ADD COLUMN IF NOT EXISTS paperfly_api_key text;

-- Add Redex courier credentials
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS redex_merchant_id text,
ADD COLUMN IF NOT EXISTS redex_api_key text;