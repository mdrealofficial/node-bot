-- Add show_decimals column to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS show_decimals boolean DEFAULT true;

COMMENT ON COLUMN public.stores.show_decimals IS 'Whether to show decimal places in prices';