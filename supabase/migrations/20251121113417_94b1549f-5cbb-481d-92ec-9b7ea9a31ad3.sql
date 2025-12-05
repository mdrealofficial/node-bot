-- Add subscriber fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscriber_id TEXT,
ADD COLUMN IF NOT EXISTS subscriber_platform TEXT;

-- Create index for faster subscriber lookups
CREATE INDEX IF NOT EXISTS idx_profiles_subscriber 
ON public.profiles(subscriber_id, subscriber_platform);