-- Add Piprapay configuration to admin_config
ALTER TABLE admin_config
ADD COLUMN IF NOT EXISTS piprapay_base_url TEXT,
ADD COLUMN IF NOT EXISTS piprapay_api_key TEXT;

-- Add plan_id to existing payment_transactions if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='payment_transactions' AND column_name='plan_id') THEN
    ALTER TABLE payment_transactions ADD COLUMN plan_id UUID REFERENCES subscription_plans(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='payment_transactions' AND column_name='charge_id') THEN
    ALTER TABLE payment_transactions ADD COLUMN charge_id TEXT;
  END IF;
END $$;

-- Create index for faster lookups if not exists
CREATE INDEX IF NOT EXISTS idx_payment_transactions_charge_id ON payment_transactions(charge_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_plan_id ON payment_transactions(plan_id);