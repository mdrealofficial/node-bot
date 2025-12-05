-- Add whatsapp_config_id column to admin_config table for Meta Embedded Signup
ALTER TABLE public.admin_config 
ADD COLUMN IF NOT EXISTS whatsapp_config_id TEXT;