-- Add image_url and display_order columns to categories table
ALTER TABLE public.categories
ADD COLUMN image_url text,
ADD COLUMN display_order integer DEFAULT 0;

-- Create index for faster ordering queries
CREATE INDEX idx_categories_display_order ON public.categories(store_id, display_order);