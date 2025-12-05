-- Add SMS Gateway configuration to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS sms_gateway_enabled boolean DEFAULT false;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS sms_gateway_name text;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS sms_gateway_type text DEFAULT 'post';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS sms_gateway_endpoint text;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS sms_gateway_api_key text;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS sms_gateway_api_key_param text DEFAULT 'api_key';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS sms_gateway_message_param text DEFAULT 'msg';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS sms_gateway_phone_param text DEFAULT 'to';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS sms_gateway_additional_params jsonb DEFAULT '{}';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS sms_gateway_success_response text;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS sms_gateway_sender_id text;

-- Create SMS Campaigns table
CREATE TABLE IF NOT EXISTS store_sms_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  filters JSONB DEFAULT '{}',
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create SMS Logs table
CREATE TABLE IF NOT EXISTS store_sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES store_sms_campaigns(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES store_customers(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  gateway_response JSONB,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add additional columns to store_customers for better filtering
ALTER TABLE store_customers ADD COLUMN IF NOT EXISTS delivery_location text;
ALTER TABLE store_customers ADD COLUMN IF NOT EXISTS city_corporation text;
ALTER TABLE store_customers ADD COLUMN IF NOT EXISTS area text;
ALTER TABLE store_customers ADD COLUMN IF NOT EXISTS sub_area text;
ALTER TABLE store_customers ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE store_customers ADD COLUMN IF NOT EXISTS upazila text;
ALTER TABLE store_customers ADD COLUMN IF NOT EXISTS street_address text;
ALTER TABLE store_customers ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE store_customers ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_store_sms_campaigns_store_id ON store_sms_campaigns(store_id);
CREATE INDEX IF NOT EXISTS idx_store_sms_logs_store_id ON store_sms_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_store_sms_logs_campaign_id ON store_sms_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_store_customers_store_tags ON store_customers USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_store_customers_delivery_location ON store_customers(delivery_location);
CREATE INDEX IF NOT EXISTS idx_store_customers_area ON store_customers(area);