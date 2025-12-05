-- Add sms_gateway_username column to stores table
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS sms_gateway_username TEXT;