import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, sessionId } = await req.json();

    // Get WAHA config from admin_config
    const { data: config, error: configError } = await supabase
      .from('admin_config')
      .select('waha_url, waha_api_key, waha_webhook_secret')
      .single();

    if (configError || !config?.waha_url || !config?.waha_api_key) {
      throw new Error('WAHA is not configured. Please contact administrator.');
    }

    const wahaUrl = config.waha_url;
    const wahaApiKey = config.waha_api_key;

    if (action === 'generate_qr') {
      // Create unique session ID for this user
      const userSessionId = `session_${user.id}_${Date.now()}`;
      
      // Start WAHA session
      const startResponse = await fetch(`${wahaUrl}/api/sessions/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': wahaApiKey,
        },
        body: JSON.stringify({
          name: userSessionId,
          config: {
            proxy: null,
            noweb: {
              store: {
                enabled: true,
                fullSync: false,
              },
            },
          },
        }),
      });

      if (!startResponse.ok) {
        const errorText = await startResponse.text();
        console.error('WAHA session start error:', errorText);
        throw new Error('Failed to start WAHA session');
      }

      // Wait a bit for session to initialize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get QR code
      const qrResponse = await fetch(`${wahaUrl}/api/${userSessionId}/auth/qr`, {
        headers: {
          'X-Api-Key': wahaApiKey,
        },
      });

      if (!qrResponse.ok) {
        throw new Error('Failed to get QR code');
      }

      const qrData = await qrResponse.json();

      // Store session info in database
      const { error: insertError } = await supabase
        .from('whatsapp_accounts')
        .insert({
          user_id: user.id,
          phone_number: userSessionId,
          display_phone_number: 'Pending Connection',
          verified_name: 'Connecting...',
          quality_rating: 'unknown',
          status: 'connecting',
        });

      if (insertError) {
        console.error('Error storing session:', insertError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          qr: qrData.qr,
          sessionId: userSessionId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'check_status' && sessionId) {
      // Check session status
      const statusResponse = await fetch(`${wahaUrl}/api/${sessionId}/status`, {
        headers: {
          'X-Api-Key': wahaApiKey,
        },
      });

      if (!statusResponse.ok) {
        throw new Error('Failed to check session status');
      }

      const statusData = await statusResponse.json();

      // Update database if connected
      if (statusData.status === 'WORKING') {
        // Get phone number info
        const meResponse = await fetch(`${wahaUrl}/api/${sessionId}/contacts/me`, {
          headers: {
            'X-Api-Key': wahaApiKey,
          },
        });

        if (meResponse.ok) {
          const meData = await meResponse.json();
          
          await supabase
            .from('whatsapp_accounts')
            .update({
              phone_number: meData.id.user || sessionId,
              display_phone_number: meData.id.user || sessionId,
              verified_name: meData.pushname || 'WhatsApp User',
              status: 'active',
            })
            .eq('phone_number', sessionId)
            .eq('user_id', user.id);
        }

        // Set up webhook
        await fetch(`${wahaUrl}/api/${sessionId}/webhooks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': wahaApiKey,
          },
          body: JSON.stringify({
            url: `${supabaseUrl}/functions/v1/whatsapp-waha-webhook`,
            events: ['message'],
          }),
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: statusData.status,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'disconnect' && sessionId) {
      // Stop WAHA session
      await fetch(`${wahaUrl}/api/sessions/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': wahaApiKey,
        },
        body: JSON.stringify({
          name: sessionId,
        }),
      });

      // Remove from database
      await supabase
        .from('whatsapp_accounts')
        .delete()
        .eq('phone_number', sessionId)
        .eq('user_id', user.id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error: any) {
    console.error('Error in whatsapp-waha-connect:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
