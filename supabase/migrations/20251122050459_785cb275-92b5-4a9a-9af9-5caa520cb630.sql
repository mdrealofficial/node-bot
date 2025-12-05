-- Add category_view_type column to stores table
ALTER TABLE stores 
ADD COLUMN category_view_type text DEFAULT 'icons' CHECK (category_view_type IN ('icons', 'cards', 'list'));