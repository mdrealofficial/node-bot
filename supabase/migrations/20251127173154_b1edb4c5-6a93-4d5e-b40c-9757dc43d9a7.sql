-- Enable Row Level Security on tables that have policies but RLS disabled
-- This fixes the critical security issue where policies exist but are not being enforced

-- Enable RLS on orders table
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Enable RLS on order_items table
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;