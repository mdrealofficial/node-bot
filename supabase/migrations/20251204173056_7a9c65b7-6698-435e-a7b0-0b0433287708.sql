-- Make store_id nullable in payment_transactions for subscription payments without stores
ALTER TABLE payment_transactions ALTER COLUMN store_id DROP NOT NULL;