-- Create default templates for existing Instagram accounts (unsent messages)
INSERT INTO public.instagram_unsent_reply_templates (instagram_account_id, user_id, name, reply_message, is_active)
SELECT 
  ia.id,
  ia.user_id,
  'Default Unsend Reply',
  'Hi! I noticed you unsent a message. If you need any help, feel free to reach out!',
  false
FROM public.instagram_accounts ia
WHERE NOT EXISTS (
  SELECT 1 FROM public.instagram_unsent_reply_templates 
  WHERE instagram_account_id = ia.id
);

-- Update follow triggers to have editable message field instead of being deletable
-- No changes needed to schema, just ensuring one template per account

-- Update story triggers to have editable message field instead of being deletable  
-- No changes needed to schema, just ensuring one template per account