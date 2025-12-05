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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { accountId, to, message, mediaUrl, mediaType } = await req.json();

    if (!accountId || !to || !message) {
      throw new Error('Missing required parameters');
    }

    // Get WAHA config
    const { data: config, error: configError } = await supabase
      .from('admin_config')
      .select('waha_url, waha_api_key')
      .single();

    if (configError || !config?.waha_url || !config?.waha_api_key) {
      throw new Error('WAHA is not configured');
    }

    // Get account session ID
    const { data: account, error: accountError } = await supabase
      .from('whatsapp_accounts')
      .select('phone_number')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      throw new Error('WhatsApp account not found');
    }

    const sessionId = account.phone_number;
    const wahaUrl = config.waha_url;
    const wahaApiKey = config.waha_api_key;

    // Prepare message payload
    const messagePayload: any = {
      chatId: to,
      text: message,
    };

    // Add media if provided
    if (mediaUrl && mediaType) {
      if (mediaType === 'image') {
        messagePayload.media = {
          url: mediaUrl,
          mimetype: 'image/jpeg',
        };
        delete messagePayload.text;
        messagePayload.caption = message;
      } else if (mediaType === 'video') {
        messagePayload.media = {
          url: mediaUrl,
          mimetype: 'video/mp4',
        };
        delete messagePayload.text;
        messagePayload.caption = message;
      } else if (mediaType === 'audio') {
        messagePayload.media = {
          url: mediaUrl,
          mimetype: 'audio/ogg',
        };
        delete messagePayload.text;
      } else if (mediaType === 'document') {
        messagePayload.media = {
          url: mediaUrl,
          mimetype: 'application/pdf',
        };
        delete messagePayload.text;
        messagePayload.caption = message;
      }
    }

    // Send message via WAHA
    const sendResponse = await fetch(
      `${wahaUrl}/api/${sessionId}/messages/text`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': wahaApiKey,
        },
        body: JSON.stringify(messagePayload),
      }
    );

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text();
      console.error('WAHA send error:', errorText);
      throw new Error('Failed to send message via WAHA');
    }

    const sendData = await sendResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        messageId: sendData.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in whatsapp-waha-send-message:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
