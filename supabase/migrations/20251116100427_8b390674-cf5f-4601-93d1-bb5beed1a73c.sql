-- Add page_logo_url column to facebook_pages table
ALTER TABLE public.facebook_pages 
ADD COLUMN page_logo_url TEXT;

COMMENT ON COLUMN public.facebook_pages.page_logo_url IS 'URL to the Facebook page profile picture/logo';