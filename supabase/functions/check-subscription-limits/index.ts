import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { checkType, resourceAmount } = await req.json();

    // Get subscription limits
    const { data: limits, error: limitsError } = await supabase
      .rpc('get_subscription_limits', { p_user_id: user.id });

    if (limitsError) {
      console.error('Error fetching limits:', limitsError);
      throw new Error('Failed to fetch subscription limits');
    }

    let canProceed = true;
    let limitReached = false;
    let currentCount = 0;
    let maxAllowed = 0;
    let message = '';

    // Check specific limit based on type
    switch (checkType) {
      case 'message_quota':
        currentCount = limits.replies_used || 0;
        maxAllowed = limits.replies_quota || 0;
        const needed = resourceAmount || 1;
        limitReached = (currentCount + needed) > maxAllowed;
        canProceed = !limitReached;
        message = limitReached 
          ? `Insufficient quota. Have ${maxAllowed - currentCount} remaining, need ${needed}`
          : `Quota available: ${maxAllowed - currentCount} messages remaining`;
        break;

      case 'facebook_pages':
        const { count: fbPagesCount } = await supabase
          .from('facebook_pages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        currentCount = fbPagesCount || 0;
        maxAllowed = limits.max_connected_pages || 1;
        limitReached = currentCount >= maxAllowed;
        canProceed = !limitReached;
        message = limitReached
          ? `Maximum Facebook pages limit reached (${maxAllowed})`
          : `Can connect ${maxAllowed - currentCount} more Facebook page(s)`;
        break;

      case 'instagram_accounts':
        const { count: igAccountsCount } = await supabase
          .from('instagram_accounts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        currentCount = igAccountsCount || 0;
        maxAllowed = limits.max_instagram_accounts || 1;
        limitReached = currentCount >= maxAllowed;
        canProceed = !limitReached;
        message = limitReached
          ? `Maximum Instagram accounts limit reached (${maxAllowed})`
          : `Can connect ${maxAllowed - currentCount} more Instagram account(s)`;
        break;

      case 'chatbot_flows':
        const { count: flowsCount } = await supabase
          .from('chatbot_flows')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        currentCount = flowsCount || 0;
        maxAllowed = limits.max_flows || 3;
        limitReached = currentCount >= maxAllowed;
        canProceed = !limitReached;
        message = limitReached
          ? `Maximum chatbot flows limit reached (${maxAllowed})`
          : `Can create ${maxAllowed - currentCount} more flow(s)`;
        break;

      case 'broadcast_recipients':
        const requested = resourceAmount || 0;
        maxAllowed = limits.max_broadcast_recipients || 100;
        limitReached = requested > maxAllowed;
        canProceed = !limitReached;
        message = limitReached
          ? `Broadcast size exceeds limit. Maximum: ${maxAllowed}, requested: ${requested}`
          : `Broadcast size within limit (${requested}/${maxAllowed})`;
        break;

      case 'feature_access':
        const featureName = resourceAmount; // feature name passed as resourceAmount
        const hasAccess = limits.features?.[featureName] || false;
        canProceed = hasAccess;
        limitReached = !hasAccess;
        message = hasAccess
          ? `Feature '${featureName}' is available`
          : `Feature '${featureName}' requires plan upgrade`;
        break;

      default:
        throw new Error(`Unknown check type: ${checkType}`);
    }

    return new Response(
      JSON.stringify({
        canProceed,
        limitReached,
        currentCount,
        maxAllowed,
        message,
        plan: limits.plan,
        quotaResetAt: limits.quota_reset_at,
        limits: {
          replies_quota: limits.replies_quota,
          replies_used: limits.replies_used,
          replies_remaining: limits.replies_remaining,
          max_connected_pages: limits.max_connected_pages,
          max_instagram_accounts: limits.max_instagram_accounts,
          max_flows: limits.max_flows,
          max_broadcast_recipients: limits.max_broadcast_recipients,
          features: limits.features
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in check-subscription-limits:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
