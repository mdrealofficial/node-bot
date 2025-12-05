-- Add payment configuration columns to products table
ALTER TABLE products 
ADD COLUMN requires_full_payment BOOLEAN DEFAULT false,
ADD COLUMN allows_cod BOOLEAN DEFAULT false,
ADD COLUMN minimum_payment_percentage INTEGER DEFAULT 0 CHECK (minimum_payment_percentage >= 0 AND minimum_payment_percentage <= 100);