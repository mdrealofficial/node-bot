-- Add courier service fields to stores table
ALTER TABLE public.stores 
ADD COLUMN steadfast_api_key TEXT,
ADD COLUMN steadfast_secret_key TEXT,
ADD COLUMN pathao_client_id TEXT,
ADD COLUMN pathao_client_secret TEXT,
ADD COLUMN pathao_username TEXT,
ADD COLUMN pathao_password TEXT,
ADD COLUMN preferred_courier TEXT DEFAULT 'steadfast';

-- Add courier tracking fields to orders table
ALTER TABLE public.orders
ADD COLUMN courier_service TEXT,
ADD COLUMN courier_tracking_code TEXT,
ADD COLUMN courier_consignment_id TEXT;