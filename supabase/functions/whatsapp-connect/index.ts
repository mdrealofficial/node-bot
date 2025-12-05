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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { action, code, phoneNumberId, accessToken, businessAccountId } = await req.json();

    // Get WhatsApp config from admin_config
    const { data: config } = await supabaseAdmin
      .from('admin_config')
      .select('whatsapp_app_id, whatsapp_app_secret')
      .single();

    // Helper function to check if account is active elsewhere
    const checkAccountActiveElsewhere = async (waPhoneNumberId: string): Promise<boolean> => {
      const { data: existingAccount } = await supabaseAdmin
        .from("whatsapp_accounts")
        .select("id, status")
        .eq("phone_number_id", waPhoneNumberId)
        .eq("status", "active")
        .neq("user_id", user.id)
        .maybeSingle();
      
      return !!existingAccount;
    };

    if (action === 'connect') {
      // If we have an access token, use it directly (embedded signup flow)
      let waAccessToken = accessToken;

      // If we have a code, exchange it for an access token (OAuth flow)
      if (code && !waAccessToken) {
        if (!config?.whatsapp_app_id || !config?.whatsapp_app_secret) {
          throw new Error('WhatsApp configuration not found');
        }
        
        const tokenResponse = await fetch(
          `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${config.whatsapp_app_id}&client_secret=${config.whatsapp_app_secret}&code=${code}`,
          { method: 'GET' }
        );

        if (!tokenResponse.ok) {
          throw new Error('Failed to exchange code for access token');
        }

        const tokenData = await tokenResponse.json();
        waAccessToken = tokenData.access_token;
      }

      if (!waAccessToken) {
        throw new Error('No access token available');
      }

      // Get phone number details
      const phoneResponse = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}?access_token=${waAccessToken}`,
        { method: 'GET' }
      );

      if (!phoneResponse.ok) {
        throw new Error('Failed to fetch phone number details');
      }

      const phoneData = await phoneResponse.json();

      // Check if account is active in another user's account
      const isActiveElsewhere = await checkAccountActiveElsewhere(phoneNumberId);
      const accountStatus = isActiveElsewhere ? 'inactive' : 'active';

      // Store WhatsApp account
      const { error: insertError } = await supabaseClient
        .from('whatsapp_accounts')
        .upsert({
          user_id: user.id,
          phone_number_id: phoneNumberId,
          business_account_id: businessAccountId,
          phone_number: phoneData.display_phone_number,
          display_phone_number: phoneData.display_phone_number,
          verified_name: phoneData.verified_name,
          quality_rating: phoneData.quality_rating,
          access_token: waAccessToken,
          status: accountStatus,
          connected_at: new Date().toISOString(),
        }, {
          onConflict: 'phone_number_id'
        });

      if (insertError) {
        throw insertError;
      }

      // Subscribe to webhooks only if active
      if (accountStatus === 'active') {
        const webhookResponse = await fetch(
          `https://graph.facebook.com/v18.0/${phoneNumberId}/subscribed_apps`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${waAccessToken}`,
            },
          }
        );

        if (!webhookResponse.ok) {
          console.error('Failed to subscribe to webhooks:', await webhookResponse.text());
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'WhatsApp account connected successfully',
          phoneNumber: phoneData.display_phone_number,
          status: accountStatus
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'disconnect') {
      const { error: deleteError } = await supabaseClient
        .from('whatsapp_accounts')
        .delete()
        .eq('phone_number_id', phoneNumberId)
        .eq('user_id', user.id);

      if (deleteError) {
        throw deleteError;
      }

      return new Response(
        JSON.stringify({ success: true, message: 'WhatsApp account disconnected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'list') {
      // Return list of connected WhatsApp accounts
      const { data: accounts, error } = await supabaseClient
        .from('whatsapp_accounts')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true, accounts }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error in whatsapp-connect:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
