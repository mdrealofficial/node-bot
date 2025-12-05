-- Add max_tokens column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN max_tokens INTEGER DEFAULT 2048 CHECK (max_tokens >= 256 AND max_tokens <= 8192);