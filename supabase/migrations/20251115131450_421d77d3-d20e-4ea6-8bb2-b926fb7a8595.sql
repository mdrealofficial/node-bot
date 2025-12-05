-- Create discount_type enum
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');

-- Create coupon_applies_to enum
CREATE TYPE coupon_applies_to AS ENUM ('all', 'specific_products', 'categories');

-- Create coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  discount_type discount_type NOT NULL,
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  applies_to coupon_applies_to NOT NULL DEFAULT 'all',
  product_ids UUID[] DEFAULT '{}',
  category_ids UUID[] DEFAULT '{}',
  minimum_purchase NUMERIC DEFAULT 0,
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, code)
);

-- Create index for faster lookups
CREATE INDEX idx_coupons_store_code ON public.coupons(store_id, code) WHERE is_active = true;
CREATE INDEX idx_coupons_store_active ON public.coupons(store_id) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Store owners can manage their coupons
CREATE POLICY "Store owners can manage coupons"
  ON public.coupons
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = coupons.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- Anyone can view active coupons (needed for checkout validation)
CREATE POLICY "Anyone can view active coupons"
  ON public.coupons
  FOR SELECT
  USING (is_active = true);

-- Add trigger for updated_at
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add coupon_code to orders table
ALTER TABLE public.orders
ADD COLUMN coupon_code TEXT,
ADD COLUMN discount_amount NUMERIC DEFAULT 0;