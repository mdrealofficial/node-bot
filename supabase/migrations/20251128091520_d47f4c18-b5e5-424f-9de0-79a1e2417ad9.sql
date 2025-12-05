-- Make order_id nullable in payment_transactions table
-- This is needed because subscription payments don't have associated orders
ALTER TABLE payment_transactions 
ALTER COLUMN order_id DROP NOT NULL;