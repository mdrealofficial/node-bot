-- Update max_tokens constraint to allow up to 1 million tokens
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_max_tokens_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_max_tokens_check CHECK (max_tokens >= 256 AND max_tokens <= 1000000);