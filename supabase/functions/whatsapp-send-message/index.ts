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

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { 
      phoneNumberId, 
      to, 
      message, 
      messageType = 'text',
      mediaUrl,
      templateName,
      templateLanguage = 'en',
      templateComponents
    } = await req.json();

    // Get WhatsApp account
    const { data: account } = await supabaseClient
      .from('whatsapp_accounts')
      .select('*')
      .eq('phone_number_id', phoneNumberId)
      .eq('user_id', user.id)
      .single();

    if (!account) {
      throw new Error('WhatsApp account not found');
    }

    // Check quota
    const quotaCheck = await supabaseClient.rpc('check_and_consume_quota', {
      p_user_id: user.id,
      p_quota_amount: 1,
      p_action_type: 'message_sent',
      p_platform: 'whatsapp'
    });

    if (quotaCheck.error || !quotaCheck.data?.success) {
      throw new Error(quotaCheck.data?.message || 'Quota exceeded');
    }

    // Build message payload
    let messagePayload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
    };

    if (messageType === 'template') {
      messagePayload.type = 'template';
      messagePayload.template = {
        name: templateName,
        language: { code: templateLanguage },
        components: templateComponents || []
      };
    } else if (messageType === 'text') {
      messagePayload.type = 'text';
      messagePayload.text = { body: message };
    } else if (messageType === 'image') {
      messagePayload.type = 'image';
      messagePayload.image = { link: mediaUrl };
    } else if (messageType === 'video') {
      messagePayload.type = 'video';
      messagePayload.video = { link: mediaUrl };
    } else if (messageType === 'document') {
      messagePayload.type = 'document';
      messagePayload.document = { link: mediaUrl };
    }

    // Send message via WhatsApp API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`WhatsApp API error: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();

    // Get or create subscriber
    const { data: subscriber } = await supabaseClient
      .from('whatsapp_subscribers')
      .upsert({
        user_id: user.id,
        whatsapp_account_id: account.id,
        phone_number: to,
        last_interaction_time: new Date().toISOString(),
      }, {
        onConflict: 'whatsapp_account_id,phone_number',
        ignoreDuplicates: false
      })
      .select()
      .single();

    // Get or create conversation
    const { data: conversation } = await supabaseClient
      .from('whatsapp_conversations')
      .upsert({
        user_id: user.id,
        whatsapp_account_id: account.id,
        subscriber_id: subscriber.id,
        last_message_at: new Date().toISOString(),
        last_message_text: message?.substring(0, 100) || `[${messageType}]`,
      }, {
        onConflict: 'whatsapp_account_id,subscriber_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    // Store the message
    await supabaseClient
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversation.id,
        whatsapp_message_id: result.messages[0].id,
        message_text: message || `[${messageType}]`,
        sender_type: 'user',
        message_type: messageType,
        media_url: mediaUrl,
        template_name: templateName,
        status: 'sent',
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.messages[0].id,
        remaining: quotaCheck.data.remaining
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in whatsapp-send-message:', error);
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