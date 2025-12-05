-- Add foreign key relationship between chatbot_flows and facebook_pages
ALTER TABLE public.chatbot_flows
ADD CONSTRAINT chatbot_flows_page_id_fkey 
FOREIGN KEY (page_id) 
REFERENCES public.facebook_pages(id) 
ON DELETE CASCADE;