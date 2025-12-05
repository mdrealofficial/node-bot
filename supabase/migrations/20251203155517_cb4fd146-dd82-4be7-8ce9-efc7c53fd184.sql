-- Add system SMS gateway columns to admin_config
ALTER TABLE public.admin_config
ADD COLUMN IF NOT EXISTS system_sms_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS system_sms_gateway_type text DEFAULT 'get',
ADD COLUMN IF NOT EXISTS system_sms_gateway_endpoint text,
ADD COLUMN IF NOT EXISTS system_sms_api_key text,
ADD COLUMN IF NOT EXISTS system_sms_api_key_param text DEFAULT 'api_key',
ADD COLUMN IF NOT EXISTS system_sms_phone_param text DEFAULT 'to',
ADD COLUMN IF NOT EXISTS system_sms_message_param text DEFAULT 'msg',
ADD COLUMN IF NOT EXISTS system_sms_sender_id text,
ADD COLUMN IF NOT EXISTS system_sms_sender_id_param text DEFAULT 'sender_id',
ADD COLUMN IF NOT EXISTS system_sms_additional_params jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS system_sms_success_response text,
ADD COLUMN IF NOT EXISTS system_sms_gateway_preset text DEFAULT 'custom';

-- Add system SMTP columns to admin_config
ALTER TABLE public.admin_config
ADD COLUMN IF NOT EXISTS system_smtp_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS system_smtp_host text,
ADD COLUMN IF NOT EXISTS system_smtp_port integer DEFAULT 587,
ADD COLUMN IF NOT EXISTS system_smtp_secure boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS system_smtp_username text,
ADD COLUMN IF NOT EXISTS system_smtp_password text,
ADD COLUMN IF NOT EXISTS system_smtp_from_email text,
ADD COLUMN IF NOT EXISTS system_smtp_from_name text DEFAULT 'System';