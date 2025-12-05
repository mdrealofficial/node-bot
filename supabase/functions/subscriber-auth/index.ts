import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, subscriber_id, subscriber_name, subscriber_pic, platform } = await req.json();

    console.log('Subscriber auth request:', { action, subscriber_id, platform });

    if (action === 'auto-auth' || action === 'signup') {
      // Check if subscriber account exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('subscriber_id', subscriber_id)
        .eq('subscriber_platform', platform)
        .maybeSingle();

      if (existingProfile) {
        // Auto-login existing user
        const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: existingProfile.email
        });

        if (sessionError) throw sessionError;

        return new Response(
          JSON.stringify({ 
            success: true,
            session: sessionData
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create a new account for the subscriber
      const email = `${subscriber_id}@${platform}.subscriber`;
      const password = `${subscriber_id}_${Date.now()}_${Math.random().toString(36)}`;

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: subscriber_name,
          avatar_url: subscriber_pic,
          subscriber_id: subscriber_id,
          subscriber_platform: platform,
          is_subscriber_account: true
        }
      });

      if (authError) {
        console.error('Auth creation error:', authError);
        throw authError;
      }

      // Update profile with subscriber info
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          subscriber_id: subscriber_id,
          subscriber_platform: platform,
          avatar_url: subscriber_pic
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      // Generate session
      const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email
      });

      if (sessionError) throw sessionError;

      return new Response(
        JSON.stringify({ 
          success: true, 
          user: authData.user,
          session: sessionData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'login') {
      // Find existing subscriber account
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('subscriber_id', subscriber_id)
        .eq('subscriber_platform', platform)
        .single();

      if (profileError || !profile) {
        throw new Error('Subscriber account not found');
      }

      // Generate session for existing user
      const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: profile.email
      });

      if (sessionError) throw sessionError;

      return new Response(
        JSON.stringify({ 
          success: true,
          session: sessionData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Subscriber auth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
