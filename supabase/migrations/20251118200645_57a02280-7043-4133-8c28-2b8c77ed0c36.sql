-- Add story private reply template for existing accounts that don't have one
INSERT INTO public.instagram_story_triggers (user_id, instagram_account_id, trigger_type, dm_message, is_active, name)
SELECT 
  ia.user_id,
  ia.id,
  'all_story_replies',
  'Thanks for replying to my story! 🎉 How can I help you today?',
  true,
  'Story Reply Auto-Response'
FROM public.instagram_accounts ia
WHERE NOT EXISTS (
  SELECT 1 FROM public.instagram_story_triggers ist
  WHERE ist.instagram_account_id = ia.id
  AND ist.trigger_type = 'all_story_replies'
);