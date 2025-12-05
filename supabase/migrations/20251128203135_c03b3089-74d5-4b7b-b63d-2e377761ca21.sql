-- Add sub-area toggle setting to stores table
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS enable_sub_area_selection boolean DEFAULT true;