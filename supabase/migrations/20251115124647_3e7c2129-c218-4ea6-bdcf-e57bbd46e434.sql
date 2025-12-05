-- Add custom_domain column to stores table
ALTER TABLE public.stores
ADD COLUMN custom_domain text;

-- Add unique constraint to ensure no duplicate custom domains
ALTER TABLE public.stores
ADD CONSTRAINT stores_custom_domain_unique UNIQUE (custom_domain);

-- Add check constraint to validate domain format (optional but recommended)
ALTER TABLE public.stores
ADD CONSTRAINT stores_custom_domain_check 
CHECK (custom_domain IS NULL OR custom_domain ~* '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$');