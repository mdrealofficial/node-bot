-- Add AI configuration columns to profiles table
ALTER TABLE profiles 
ADD COLUMN openai_api_key TEXT,
ADD COLUMN gemini_api_key TEXT,
ADD COLUMN preferred_ai_provider TEXT DEFAULT 'lovable',
ADD COLUMN preferred_ai_model TEXT;