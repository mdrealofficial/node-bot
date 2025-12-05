-- Add shipping_address column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS shipping_address TEXT;