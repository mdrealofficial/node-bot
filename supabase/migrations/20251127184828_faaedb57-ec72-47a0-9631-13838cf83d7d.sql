-- Add currency field to admin_config
ALTER TABLE admin_config 
ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'USD';

-- Add currency field to subscription_plans
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Add user_id column to payment_transactions for easier querying
ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Drop policy if exists and recreate (since IF NOT EXISTS is not supported for policies)
DROP POLICY IF EXISTS "Users can view their own payment transactions" ON payment_transactions;

CREATE POLICY "Users can view their own payment transactions"
ON payment_transactions
FOR SELECT
USING (user_id = auth.uid());

-- Update existing payment transactions to set user_id from metadata
UPDATE payment_transactions
SET user_id = (metadata->>'user_id')::uuid
WHERE user_id IS NULL AND metadata->>'user_id' IS NOT NULL;