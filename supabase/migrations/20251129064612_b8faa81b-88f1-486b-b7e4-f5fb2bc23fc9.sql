-- Create chat_invoices table for live chat sales
CREATE TABLE chat_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) NOT NULL,
  conversation_id UUID NOT NULL,
  conversation_type TEXT NOT NULL, -- 'facebook', 'instagram', 'whatsapp', 'website'
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_platform TEXT,
  customer_platform_id TEXT,
  
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  shipping_charge NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  
  payment_type TEXT NOT NULL DEFAULT 'full_cod',
  advance_amount NUMERIC DEFAULT 0,
  due_amount NUMERIC DEFAULT 0,
  
  status TEXT DEFAULT 'pending',
  payment_id TEXT,
  paid_amount NUMERIC DEFAULT 0,
  
  shipping_address JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  
  order_id UUID REFERENCES orders(id)
);

-- Enable RLS
ALTER TABLE chat_invoices ENABLE ROW LEVEL SECURITY;

-- Store owners can manage their invoices
CREATE POLICY "Store owners can manage invoices" ON chat_invoices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM stores 
      WHERE stores.id = chat_invoices.store_id 
      AND stores.user_id = auth.uid()
    )
  );

-- Anyone can view invoices by ID (for payment page)
CREATE POLICY "Anyone can view invoices by ID" ON chat_invoices
  FOR SELECT USING (true);

-- Anyone can update invoice payment status
CREATE POLICY "Anyone can update invoice payment" ON chat_invoices
  FOR UPDATE USING (true);

-- Add address request configuration to stores table
ALTER TABLE stores 
  ADD COLUMN IF NOT EXISTS address_request_instruction TEXT DEFAULT 'Please enter your delivery address to complete your order.',
  ADD COLUMN IF NOT EXISTS address_request_button_text TEXT DEFAULT 'Enter Shipping Address';

-- Create index for faster queries
CREATE INDEX idx_chat_invoices_store_id ON chat_invoices(store_id);
CREATE INDEX idx_chat_invoices_conversation_id ON chat_invoices(conversation_id);
CREATE INDEX idx_chat_invoices_status ON chat_invoices(status);