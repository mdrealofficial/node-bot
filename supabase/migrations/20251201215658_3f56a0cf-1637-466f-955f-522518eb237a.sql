-- Add button text customization columns to stores table
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS carousel_see_details_text TEXT DEFAULT 'See Details',
ADD COLUMN IF NOT EXISTS carousel_buy_now_text TEXT DEFAULT 'Buy Now';