-- Create default follow triggers for existing Instagram accounts
INSERT INTO public.instagram_follow_triggers (instagram_account_id, user_id, name, dm_message, description, is_active)
SELECT 
  ia.id,
  ia.user_id,
  'Default Follow Welcome',
  'Thanks for following! We''re excited to connect with you. Feel free to send us a message anytime!',
  'Automatic welcome message for new followers',
  false
FROM public.instagram_accounts ia
WHERE NOT EXISTS (
  SELECT 1 FROM public.instagram_follow_triggers 
  WHERE instagram_account_id = ia.id
);

-- Create default story triggers for existing Instagram accounts
INSERT INTO public.instagram_story_triggers (instagram_account_id, user_id, name, dm_message, description, trigger_type, is_active)
SELECT 
  ia.id,
  ia.user_id,
  'Default Story Reply',
  'Thanks for engaging with our story! We appreciate your interaction. Let us know if you have any questions!',
  'Automatic reply for story interactions',
  'all_story_replies',
  false
FROM public.instagram_accounts ia
WHERE NOT EXISTS (
  SELECT 1 FROM public.instagram_story_triggers 
  WHERE instagram_account_id = ia.id
);