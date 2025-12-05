-- Make customer_email nullable in orders table since it's optional in checkout
ALTER TABLE orders ALTER COLUMN customer_email DROP NOT NULL;