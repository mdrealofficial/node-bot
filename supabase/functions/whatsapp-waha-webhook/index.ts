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

    const webhookData = await req.json();
    console.log('WAHA webhook received:', JSON.stringify(webhookData, null, 2));

    const { event, session, payload } = webhookData;

    if (event !== 'message') {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract session ID to find the user
    const sessionId = session;

    // Find the WhatsApp account and user
    const { data: account, error: accountError } = await supabase
      .from('whatsapp_accounts')
      .select('id, user_id, phone_number')
      .eq('phone_number', sessionId)
      .single();

    if (accountError || !account) {
      console.error('Account not found for session:', sessionId);
      return new Response(JSON.stringify({ error: 'Account not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Skip messages sent by us (fromMe: true)
    if (payload.fromMe) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract message data
    const from = payload.from;
    const messageText = payload.body || '';
    const messageId = payload.id;

    // Find or create subscriber
    let subscriberId: string;
    const { data: existingSubscriber } = await supabase
      .from('whatsapp_subscribers')
      .select('id')
      .eq('user_id', account.user_id)
      .eq('phone_number', from)
      .single();

    if (existingSubscriber) {
      subscriberId = existingSubscriber.id;
    } else {
      const { data: newSubscriber, error: subError } = await supabase
        .from('whatsapp_subscribers')
        .insert({
          user_id: account.user_id,
          whatsapp_account_id: account.id,
          phone_number: from,
          subscriber_name: payload.pushname || from,
        })
        .select('id')
        .single();

      if (subError || !newSubscriber) {
        console.error('Failed to create subscriber:', subError);
        throw new Error('Failed to create subscriber');
      }
      subscriberId = newSubscriber.id;
    }

    // Find or create conversation
    let conversationId: string;
    const { data: existingConversation } = await supabase
      .from('whatsapp_conversations')
      .select('id')
      .eq('user_id', account.user_id)
      .eq('subscriber_id', subscriberId)
      .single();

    if (existingConversation) {
      conversationId = existingConversation.id;
      
      // Update conversation
      await supabase
        .from('whatsapp_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_text: messageText,
          unread_count: supabase.rpc('increment', { x: 1, current: 0 }),
        })
        .eq('id', conversationId);
    } else {
      const { data: newConversation, error: convError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          user_id: account.user_id,
          whatsapp_account_id: account.id,
          subscriber_id: subscriberId,
          last_message_text: messageText,
          unread_count: 1,
        })
        .select('id')
        .single();

      if (convError || !newConversation) {
        console.error('Failed to create conversation:', convError);
        throw new Error('Failed to create conversation');
      }
      conversationId = newConversation.id;
    }

    // Store the message
    await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationId,
        whatsapp_message_id: messageId,
        message_text: messageText,
        sender_type: 'subscriber',
        status: 'received',
      });

    // Check for automation triggers (flows)
    const { data: flows } = await supabase
      .from('whatsapp_chatbot_flows')
      .select('*')
      .eq('user_id', account.user_id)
      .eq('whatsapp_account_id', account.id)
      .eq('is_active', true);

    if (flows && flows.length > 0) {
      for (const flow of flows) {
        const keyword = flow.trigger_keyword?.toLowerCase();
        const matchType = flow.match_type;
        const messageLower = messageText.toLowerCase();

        let shouldTrigger = false;
        if (matchType === 'exact' && keyword) {
          shouldTrigger = messageLower === keyword;
        } else if (matchType === 'contains' && keyword) {
          shouldTrigger = messageLower.includes(keyword);
        } else if (matchType === 'starts_with' && keyword) {
          shouldTrigger = messageLower.startsWith(keyword);
        } else if (matchType === 'any') {
          shouldTrigger = true;
        }

        if (shouldTrigger) {
          // Trigger flow execution
          await supabase.functions.invoke('execute-whatsapp-flow', {
            body: {
              flowId: flow.id,
              subscriberPhone: from,
              accountId: account.id,
              userId: account.user_id,
              triggerMessage: messageText,
              sessionId: sessionId,
            },
          });
          break; // Only trigger first matching flow
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in whatsapp-waha-webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
