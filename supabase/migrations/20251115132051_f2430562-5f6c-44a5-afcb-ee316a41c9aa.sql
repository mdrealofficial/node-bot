-- Add new discount types to enum
ALTER TYPE discount_type ADD VALUE IF NOT EXISTS 'bogo';
ALTER TYPE discount_type ADD VALUE IF NOT EXISTS 'tiered';

-- Add BOGO configuration fields
ALTER TABLE public.coupons
ADD COLUMN IF NOT EXISTS bogo_buy_quantity INTEGER,
ADD COLUMN IF NOT EXISTS bogo_get_quantity INTEGER,
ADD COLUMN IF NOT EXISTS bogo_get_discount_percentage INTEGER DEFAULT 100;

-- Add tiered discount configuration
ALTER TABLE public.coupons
ADD COLUMN IF NOT EXISTS discount_tiers JSONB DEFAULT '[]';

-- Add comments for clarity
COMMENT ON COLUMN public.coupons.bogo_buy_quantity IS 'Number of items customer must buy for BOGO offer';
COMMENT ON COLUMN public.coupons.bogo_get_quantity IS 'Number of items customer gets free/discounted';
COMMENT ON COLUMN public.coupons.bogo_get_discount_percentage IS 'Percentage discount on free items (100 = completely free)';
COMMENT ON COLUMN public.coupons.discount_tiers IS 'Array of tier objects: [{min_amount: number, discount_value: number, discount_type: "percentage"|"fixed"}]';