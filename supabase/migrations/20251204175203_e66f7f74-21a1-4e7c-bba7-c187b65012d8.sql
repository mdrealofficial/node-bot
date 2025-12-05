-- Drop the existing CHECK constraint on transaction_type
ALTER TABLE payment_transactions 
DROP CONSTRAINT IF EXISTS payment_transactions_transaction_type_check;

-- Add new CHECK constraint with all valid transaction types
ALTER TABLE payment_transactions
ADD CONSTRAINT payment_transactions_transaction_type_check 
CHECK (transaction_type = ANY (ARRAY['payment'::text, 'refund'::text, 'subscription_payment'::text, 'topup_purchase'::text]));