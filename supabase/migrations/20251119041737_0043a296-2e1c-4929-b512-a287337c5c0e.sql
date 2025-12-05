-- Phase 1: Create subscription plans configuration table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name TEXT NOT NULL UNIQUE CHECK (plan_name IN ('free', 'starter', 'creator', 'pro')),
  monthly_price NUMERIC NOT NULL DEFAULT 0,
  replies_quota INTEGER NOT NULL DEFAULT 100,
  max_connected_pages INTEGER NOT NULL DEFAULT 1,
  max_instagram_accounts INTEGER NOT NULL DEFAULT 1,
  max_tiktok_accounts INTEGER NOT NULL DEFAULT 0,
  max_flows INTEGER NOT NULL DEFAULT 3,
  max_broadcast_recipients INTEGER NOT NULL DEFAULT 100,
  features JSONB NOT NULL DEFAULT '{"advanced_analytics": false, "priority_support": false, "custom_templates": false, "api_access": false, "white_label": false, "ai_assistant": false}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view active plans
CREATE POLICY "Anyone can view active subscription plans"
  ON public.subscription_plans
  FOR SELECT
  USING (is_active = true);

-- Only admins can manage plans
CREATE POLICY "Admins can manage subscription plans"
  ON public.subscription_plans
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed initial plan data
INSERT INTO public.subscription_plans (plan_name, monthly_price, replies_quota, max_connected_pages, max_instagram_accounts, max_tiktok_accounts, max_flows, max_broadcast_recipients, features, display_order)
VALUES 
  ('free', 0, 100, 1, 1, 0, 3, 50, '{"advanced_analytics": false, "priority_support": false, "custom_templates": false, "api_access": false, "white_label": false, "ai_assistant": false}'::jsonb, 1),
  ('starter', 29, 1000, 3, 2, 1, 10, 500, '{"advanced_analytics": false, "priority_support": false, "custom_templates": true, "api_access": false, "white_label": false, "ai_assistant": true}'::jsonb, 2),
  ('creator', 79, 5000, 10, 5, 3, 25, 2000, '{"advanced_analytics": true, "priority_support": true, "custom_templates": true, "api_access": false, "white_label": false, "ai_assistant": true}'::jsonb, 3),
  ('pro', 149, 15000, 999, 999, 999, 999, 10000, '{"advanced_analytics": true, "priority_support": true, "custom_templates": true, "api_access": true, "white_label": true, "ai_assistant": true}'::jsonb, 4)
ON CONFLICT (plan_name) DO NOTHING;

-- Create usage history table for detailed tracking
CREATE TABLE IF NOT EXISTS public.usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('message_sent', 'broadcast', 'flow_execution', 'comment_reply')),
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'tiktok')),
  quota_consumed INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.usage_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage history
CREATE POLICY "Users can view their own usage history"
  ON public.usage_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert usage records
CREATE POLICY "System can insert usage history"
  ON public.usage_history
  FOR INSERT
  WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_usage_history_user_created ON public.usage_history(user_id, created_at DESC);

-- Create reusable quota check and consume function
CREATE OR REPLACE FUNCTION public.check_and_consume_quota(
  p_user_id UUID,
  p_quota_amount INTEGER DEFAULT 1,
  p_action_type TEXT DEFAULT 'message_sent',
  p_platform TEXT DEFAULT 'facebook'
) RETURNS JSONB AS $$
DECLARE
  v_subscription RECORD;
  v_result JSONB;
BEGIN
  -- Get subscription with lock to prevent race conditions
  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'subscription_not_found',
      'message', 'No subscription found for user'
    );
  END IF;
  
  -- Check if quota needs reset (monthly)
  IF v_subscription.quota_reset_at < NOW() THEN
    UPDATE public.subscriptions
    SET replies_used = 0,
        quota_reset_at = DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO v_subscription;
  END IF;
  
  -- Check if user has enough quota
  IF v_subscription.replies_used + p_quota_amount > v_subscription.replies_quota THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'quota_exceeded',
      'message', 'Monthly message quota exceeded',
      'current_usage', v_subscription.replies_used,
      'quota_limit', v_subscription.replies_quota,
      'remaining', GREATEST(0, v_subscription.replies_quota - v_subscription.replies_used),
      'required', p_quota_amount,
      'reset_at', v_subscription.quota_reset_at
    );
  END IF;
  
  -- Consume quota
  UPDATE public.subscriptions
  SET replies_used = replies_used + p_quota_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Log usage history
  INSERT INTO public.usage_history (user_id, action_type, platform, quota_consumed)
  VALUES (p_user_id, p_action_type, p_platform, p_quota_amount);
  
  RETURN jsonb_build_object(
    'success', true,
    'remaining', v_subscription.replies_quota - v_subscription.replies_used - p_quota_amount,
    'quota_limit', v_subscription.replies_quota,
    'reset_at', v_subscription.quota_reset_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check feature access
CREATE OR REPLACE FUNCTION public.has_feature_access(
  p_user_id UUID,
  p_feature_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  SELECT (sp.features->p_feature_name)::boolean INTO v_has_access
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan = sp.plan_name
  WHERE s.user_id = p_user_id;
  
  RETURN COALESCE(v_has_access, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get subscription limits
CREATE OR REPLACE FUNCTION public.get_subscription_limits(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_limits JSONB;
BEGIN
  SELECT jsonb_build_object(
    'plan', s.plan,
    'replies_quota', s.replies_quota,
    'replies_used', s.replies_used,
    'replies_remaining', s.replies_quota - s.replies_used,
    'quota_reset_at', s.quota_reset_at,
    'max_connected_pages', sp.max_connected_pages,
    'max_instagram_accounts', sp.max_instagram_accounts,
    'max_tiktok_accounts', sp.max_tiktok_accounts,
    'max_flows', sp.max_flows,
    'max_broadcast_recipients', sp.max_broadcast_recipients,
    'features', sp.features
  ) INTO v_limits
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan = sp.plan_name
  WHERE s.user_id = p_user_id;
  
  RETURN COALESCE(v_limits, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to update updated_at on subscription_plans
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();