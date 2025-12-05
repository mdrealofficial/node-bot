-- Drop existing check constraint on plan_name
ALTER TABLE subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_plan_name_check;

-- Add trial_days column to subscription_plans if not exists
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS trial_days integer DEFAULT 0;

-- Add trial_expires_at column to subscriptions if not exists  
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_expires_at timestamp with time zone;

-- Insert Trial plan
INSERT INTO subscription_plans (plan_name, replies_quota, monthly_price, max_connected_pages, max_instagram_accounts, max_tiktok_accounts, max_flows, max_broadcast_recipients, features, display_order, is_active, trial_days)
VALUES ('trial', 50, 0, 1, 1, 0, 2, 25, '{"ai_assistant": true}', 0, true, 7)
ON CONFLICT (plan_name) DO NOTHING;

-- Update handle_new_user function to create user_settings and assign trial plan
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_full_name text;
BEGIN
  -- Extract full name from metadata, fallback to email username if not present
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, user_full_name)
  ON CONFLICT (id) DO NOTHING;
  
  -- Create default subscription with trial plan
  INSERT INTO public.subscriptions (user_id, plan, replies_quota, trial_expires_at)
  VALUES (NEW.id, 'trial', 50, NOW() + INTERVAL '7 days')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create user_settings with defaults (all menu items visible)
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Assign user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;