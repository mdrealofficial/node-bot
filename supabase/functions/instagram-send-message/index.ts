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

    const { 
      recipientId, 
      messageText, 
      conversationId, 
      accountId,
      attachment,
      productCards
    } = await req.json();

    if (!recipientId || !accountId) {
      throw new Error('Missing required fields');
    }

    // Check and consume quota
    const { data: quotaCheck, error: quotaError } = await supabase
      .rpc('check_and_consume_quota', {
        p_user_id: user.id,
        p_quota_amount: 1,
        p_action_type: 'message_sent',
        p_platform: 'instagram'
      });

    if (quotaError) {
      console.error('Quota check error:', quotaError);
      throw new Error('Failed to check message quota');
    }

    if (!quotaCheck.success) {
      console.log('Quota exceeded:', quotaCheck);
      return new Response(
        JSON.stringify({ 
          error: quotaCheck.error === 'quota_exceeded' ? 'Monthly message quota exceeded' : quotaCheck.message,
          errorCode: 'QUOTA_EXCEEDED',
          details: quotaCheck
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Quota check passed. Remaining: ${quotaCheck.remaining}`);

    // Get Instagram account with access token
    const { data: account, error: accountError } = await supabase
      .from('instagram_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      throw new Error('Instagram account not found');
    }

    // Check 24-hour messaging window
    if (conversationId) {
      const { data: lastMessages, error: messageError } = await supabase
        .from('instagram_messages')
        .select('sent_at, sender_type')
        .eq('conversation_id', conversationId)
        .eq('sender_type', 'subscriber')
        .order('sent_at', { ascending: false })
        .limit(1);

      if (!messageError && lastMessages && lastMessages.length > 0) {
        const lastMessageTime = new Date(lastMessages[0].sent_at);
        const now = new Date();
        const hoursSinceLastMessage = (now.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastMessage > 24) {
          console.log('Message outside 24-hour window:', {
            lastMessageTime: lastMessages[0].sent_at,
            hoursSince: hoursSinceLastMessage
          });
          
          return new Response(
            JSON.stringify({ 
              error: 'Cannot send message. Instagram only allows messages within 24 hours of the customer\'s last message.',
              errorCode: 'MESSAGING_WINDOW_EXPIRED',
              lastMessageTime: lastMessages[0].sent_at
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Prepare message payload
    const messagePayload: any = {
      recipient: { id: recipientId },
      message: {},
    };

    if (productCards && productCards.length > 0) {
      // Send product carousel
      messagePayload.message.attachment = {
        type: "template",
        payload: {
          template_type: "generic",
          elements: productCards.slice(0, 10), // Instagram allows max 10 cards
        },
      };
    } else if (messageText) {
      messagePayload.message.text = messageText;
    }

    if (attachment) {
      messagePayload.message.attachment = {
        type: attachment.type,
        payload: {
          url: attachment.url,
          is_reusable: true,
        },
      };
    }

    // Send message via Instagram Graph API
    const response = await fetch(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${account.access_token}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      }
    );

    const result = await response.json();

    if (result.error) {
      console.error('Instagram API error:', result.error);
      
      // Handle 24-hour messaging window error
      if (result.error.code === 10 && result.error.error_subcode === 2534022) {
        return new Response(
          JSON.stringify({ 
            error: 'Cannot send message. Instagram only allows messages within 24 hours of the customer\'s last message.',
            errorCode: 'MESSAGING_WINDOW_EXPIRED'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(result.error.message || 'Failed to send message');
    }

    // Save message to database
    if (conversationId) {
      const messageToStore = productCards && productCards.length > 0 
        ? `🛍️ Sent ${productCards.length} product card(s)`
        : (messageText || '[Attachment]');
        
      await supabase
        .from('instagram_messages')
        .insert({
          conversation_id: conversationId,
          instagram_message_id: result.message_id,
          message_text: messageToStore,
          sender_type: 'page',
          attachment_type: attachment?.type,
          attachment_url: attachment?.url,
          status: 'sent',
        });

      const lastMessageText = productCards && productCards.length > 0
        ? `🛍️ Sent ${productCards.length} product(s)`
        : (messageText || '[Attachment]');

      // Update conversation
      await supabase
        .from('instagram_conversations')
        .update({
          last_message_text: lastMessageText,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversationId);
    }

    console.log('Instagram message sent successfully:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.message_id,
        recipientId: result.recipient_id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in instagram-send-message:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
