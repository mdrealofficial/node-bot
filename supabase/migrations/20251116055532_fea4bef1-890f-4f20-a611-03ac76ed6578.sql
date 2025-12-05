-- Add phone verification fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS otp_code TEXT,
ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for OTP expiration lookup
CREATE INDEX IF NOT EXISTS idx_profiles_otp_expires ON public.profiles(otp_expires_at) WHERE otp_code IS NOT NULL;