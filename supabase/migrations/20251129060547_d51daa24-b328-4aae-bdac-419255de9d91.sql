-- Add free_shipping to coupon_discount_type enum
ALTER TYPE discount_type ADD VALUE IF NOT EXISTS 'free_shipping';