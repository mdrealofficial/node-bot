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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Use service role to bypass RLS and check across all users
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { platform, platformId, currentUserId } = await req.json();

    console.log('Checking page activation:', { platform, platformId, currentUserId });

    let activeUser = null;

    if (platform === 'facebook') {
      // Check if this page is active in any other user's account
      const { data: activePage, error } = await supabaseAdmin
        .from('facebook_pages')
        .select('user_id, page_name')
        .eq('page_id', platformId)
        .eq('status', 'active')
        .neq('user_id', currentUserId)
        .maybeSingle();

      if (error) {
        console.error('Error checking Facebook page:', error);
        throw error;
      }

      if (activePage) {
        // Get user details
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('full_name, email, phone_number')
          .eq('id', activePage.user_id)
          .single();

        activeUser = {
          name: profile?.full_name || 'Unknown User',
          email: profile?.email || 'N/A',
          phone: profile?.phone_number || 'N/A',
        };
      }
    } else if (platform === 'instagram') {
      const { data: activeAccount, error } = await supabaseAdmin
        .from('instagram_accounts')
        .select('user_id, account_name')
        .eq('instagram_account_id', platformId)
        .eq('status', 'active')
        .neq('user_id', currentUserId)
        .maybeSingle();

      if (error) {
        console.error('Error checking Instagram account:', error);
        throw error;
      }

      if (activeAccount) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('full_name, email, phone_number')
          .eq('id', activeAccount.user_id)
          .single();

        activeUser = {
          name: profile?.full_name || 'Unknown User',
          email: profile?.email || 'N/A',
          phone: profile?.phone_number || 'N/A',
        };
      }
    } else if (platform === 'whatsapp') {
      const { data: activeAccount, error } = await supabaseAdmin
        .from('whatsapp_accounts')
        .select('user_id, verified_name')
        .eq('phone_number_id', platformId)
        .eq('status', 'active')
        .neq('user_id', currentUserId)
        .maybeSingle();

      if (error) {
        console.error('Error checking WhatsApp account:', error);
        throw error;
      }

      if (activeAccount) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('full_name, email, phone_number')
          .eq('id', activeAccount.user_id)
          .single();

        activeUser = {
          name: profile?.full_name || 'Unknown User',
          email: profile?.email || 'N/A',
          phone: profile?.phone_number || 'N/A',
        };
      }
    }

    return new Response(
      JSON.stringify({
        canActivate: !activeUser,
        activeUser,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-page-activation:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
