-- Add custom domain verification fields to stores table
ALTER TABLE public.stores
ADD COLUMN custom_domain_verified boolean DEFAULT false,
ADD COLUMN custom_domain_verified_at timestamp with time zone;