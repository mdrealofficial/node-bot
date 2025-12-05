import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, authCode, accountId } = await req.json();

    // Get TikTok app credentials from admin_config
    const { data: config } = await supabase
      .from('admin_config')
      .select('fb_app_id, fb_app_secret')
      .single();

    if (!config?.fb_app_id || !config?.fb_app_secret) {
      throw new Error('TikTok app credentials not configured');
    }

    const TIKTOK_CLIENT_KEY = config.fb_app_id; // Reusing fields for TikTok
    const TIKTOK_CLIENT_SECRET = config.fb_app_secret;

    if (action === 'connect') {
      if (!authCode) {
        throw new Error('Authorization code is required');
      }

      // Exchange auth code for access token
      const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: TIKTOK_CLIENT_KEY,
          client_secret: TIKTOK_CLIENT_SECRET,
          code: authCode,
          grant_type: 'authorization_code',
          redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/tiktok-connect/callback`,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('Token exchange error:', error);
        throw new Error('Failed to exchange authorization code');
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;
      const expiresIn = tokenData.expires_in;

      // Get user info
      const userInfoResponse = await fetch('https://open.tiktokapis.com/v2/user/info/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!userInfoResponse.ok) {
        throw new Error('Failed to fetch TikTok user info');
      }

      const userInfo = await userInfoResponse.json();
      const userData = userInfo.data.user;

      // Calculate token expiry
      const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      // Save account to database
      const { data: account, error: insertError } = await supabase
        .from('tiktok_accounts')
        .upsert({
          user_id: user.id,
          tiktok_account_id: userData.open_id,
          tiktok_username: userData.username || userData.display_name,
          display_name: userData.display_name,
          access_token: accessToken,
          profile_picture_url: userData.avatar_url,
          followers_count: userData.follower_count || 0,
          status: 'active',
          token_expires_at: tokenExpiresAt,
        }, {
          onConflict: 'tiktok_account_id',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Database error:', insertError);
        throw new Error('Failed to save TikTok account');
      }

      console.log(`[TIKTOK-CONNECT] Successfully connected account: ${userData.display_name}`);

      return new Response(
        JSON.stringify({
          success: true,
          account: {
            id: account.id,
            username: account.tiktok_username,
            displayName: account.display_name,
            profilePicture: account.profile_picture_url,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'disconnect') {
      if (!accountId) {
        throw new Error('Account ID is required');
      }

      const { error: deleteError } = await supabase
        .from('tiktok_accounts')
        .delete()
        .eq('id', accountId)
        .eq('user_id', user.id);

      if (deleteError) {
        throw new Error('Failed to disconnect TikTok account');
      }

      console.log(`[TIKTOK-CONNECT] Disconnected account: ${accountId}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('[TIKTOK-CONNECT] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
