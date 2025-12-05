import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Facebook credentials from admin_config
    const { data: config, error: configError } = await supabase
      .from('admin_config')
      .select('fb_app_id, fb_app_secret')
      .single();

    if (configError || !config?.fb_app_id || !config?.fb_app_secret) {
      console.error('Config error:', configError);
      return new Response(
        JSON.stringify({ error: 'Facebook credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fbAppId = config.fb_app_id;
    const fbAppSecret = config.fb_app_secret;
    const redirectUri = `${supabaseUrl}/functions/v1/facebook-auth?action=callback`;

    // ACTION: Initiate OAuth flow
    if (action === 'init') {
      const frontendUrl = url.searchParams.get('redirect') || `${url.origin}/dashboard`;
      
      // Store redirect URL in a state parameter
      const state = btoa(JSON.stringify({ redirect: frontendUrl }));
      
      const fbAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
        `client_id=${fbAppId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${encodeURIComponent(state)}` +
        `&response_type=code` +
        `&scope=public_profile,email,business_management`;

      console.log('Initiating Facebook OAuth with:', { fbAppId, redirectUri, scope: 'public_profile,email,business_management' });

      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': fbAuthUrl,
        },
      });
    }

    // ACTION: Handle OAuth callback
    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      
      if (!code) {
        return new Response(
          JSON.stringify({ error: 'No authorization code received' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Parse state to get redirect URL
      let redirectUrl = `${url.origin}/dashboard`;
      try {
        if (state) {
          const stateData = JSON.parse(atob(state));
          redirectUrl = stateData.redirect || redirectUrl;
        }
      } catch (e) {
        console.error('Error parsing state:', e);
      }

      // Exchange code for access token
      const tokenResponse = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?` +
        `client_id=${fbAppId}` +
        `&client_secret=${fbAppSecret}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&code=${code}`
      );

      const tokenData = await tokenResponse.json();
      
      if (!tokenResponse.ok || !tokenData.access_token) {
        console.error('Token exchange error:', tokenData);
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            'Location': `${url.origin}/login?error=auth_failed`,
          },
        });
      }

      // Get user info from Facebook
      const userResponse = await fetch(
        `https://graph.facebook.com/v18.0/me?fields=id,name,email,picture&access_token=${tokenData.access_token}`
      );

      const fbUser = await userResponse.json();
      
      if (!userResponse.ok || !fbUser.id) {
        console.error('User info error:', fbUser);
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            'Location': `${url.origin}/login?error=user_info_failed`,
          },
        });
      }

      // Create or sign in user in Supabase
      // Use Facebook ID as a unique identifier
      const email = fbUser.email || `facebook_${fbUser.id}@temp.local`;
      
      // Check if user exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .single();

      let userId: string;

      if (existingUser) {
        // User exists, sign them in
        userId = existingUser.id;
      } else {
        // Create new user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: email,
          email_confirm: true,
          user_metadata: {
            full_name: fbUser.name,
            avatar_url: fbUser.picture?.data?.url,
            facebook_id: fbUser.id,
            provider: 'facebook',
          },
        });

        if (createError || !newUser.user) {
          console.error('User creation error:', createError);
          return new Response(null, {
            status: 302,
            headers: {
              ...corsHeaders,
              'Location': `${url.origin}/login?error=user_creation_failed`,
            },
          });
        }

        userId = newUser.user.id;
      }

      // Generate a session for the user
      const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
      });

      if (sessionError || !sessionData) {
        console.error('Session generation error:', sessionError);
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            'Location': `${url.origin}/login?error=session_failed`,
          },
        });
      }

      // Redirect to the URL with token hash
      const redirectWithToken = sessionData.properties.action_link;
      
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': redirectWithToken,
        },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Facebook auth error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
