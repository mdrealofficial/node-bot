-- Add enabled fields for each courier service
ALTER TABLE public.stores 
  ADD COLUMN IF NOT EXISTS steadfast_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pathao_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS carrybee_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS paperfly_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS redex_enabled boolean DEFAULT false;

-- Remove preferred_courier field as users may use multiple couriers
ALTER TABLE public.stores 
  DROP COLUMN IF EXISTS preferred_courier;