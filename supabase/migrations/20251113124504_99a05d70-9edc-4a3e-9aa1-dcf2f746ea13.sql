-- Add match_type column to chatbot_flows table
ALTER TABLE public.chatbot_flows 
ADD COLUMN match_type text NOT NULL DEFAULT 'exact' CHECK (match_type IN ('exact', 'partial'));

COMMENT ON COLUMN public.chatbot_flows.match_type IS 'Keyword matching type: exact (whole word) or partial (substring)';
COMMENT ON COLUMN public.chatbot_flows.trigger_keyword IS 'Comma-separated list of trigger keywords';