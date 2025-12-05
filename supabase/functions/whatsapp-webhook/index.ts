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

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Webhook verification
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      // Get verify token from admin config
      const { data: config } = await supabaseClient
        .from('admin_config')
        .select('whatsapp_webhook_verify_token')
        .single();

      if (mode === 'subscribe' && token === config?.whatsapp_webhook_verify_token) {
        console.log('Webhook verified successfully');
        return new Response(challenge, { status: 200 });
      }

      return new Response('Forbidden', { status: 403 });
    }

    // Handle webhook events
    const payload = await req.json();
    console.log('WhatsApp Webhook received:', JSON.stringify(payload, null, 2));

    if (payload.object !== 'whatsapp_business_account') {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field === 'messages') {
          const value = change.value;
          
          // Get WhatsApp account from database
          const { data: account } = await supabaseClient
            .from('whatsapp_accounts')
            .select('*')
            .eq('phone_number_id', value.metadata.phone_number_id)
            .single();

          if (!account) {
            console.log('WhatsApp account not found for phone_number_id:', value.metadata.phone_number_id);
            continue;
          }

          // Handle incoming messages
          if (value.messages) {
            for (const message of value.messages) {
              const fromPhone = message.from;
              const messageText = message.text?.body || '';
              const messageType = message.type;

              // Create or get subscriber
              const { data: subscriber, error: subError } = await supabaseClient
                .from('whatsapp_subscribers')
                .upsert({
                  user_id: account.user_id,
                  whatsapp_account_id: account.id,
                  phone_number: fromPhone,
                  profile_name: value.contacts?.[0]?.profile?.name || fromPhone,
                  last_interaction_time: new Date().toISOString(),
                }, {
                  onConflict: 'whatsapp_account_id,phone_number',
                  ignoreDuplicates: false
                })
                .select()
                .single();

              if (subError) {
                console.error('Error creating subscriber:', subError);
                continue;
              }

              // Create or get conversation
              const { data: conversation } = await supabaseClient
                .from('whatsapp_conversations')
                .upsert({
                  user_id: account.user_id,
                  whatsapp_account_id: account.id,
                  subscriber_id: subscriber.id,
                  last_message_at: new Date().toISOString(),
                  last_message_text: messageText.substring(0, 100),
                  unread_count: 1,
                }, {
                  onConflict: 'whatsapp_account_id,subscriber_id',
                  ignoreDuplicates: false
                })
                .select()
                .single();

              if (!conversation) {
                console.error('Failed to create conversation');
                continue;
              }

              // Store the message
              await supabaseClient
                .from('whatsapp_messages')
                .insert({
                  conversation_id: conversation.id,
                  whatsapp_message_id: message.id,
                  message_text: messageText,
                  sender_type: 'subscriber',
                  message_type: messageType,
                  media_url: message.image?.link || message.video?.link || message.audio?.link || message.document?.link,
                  status: 'delivered',
                });

              // Check for matching flows
              const { data: flows } = await supabaseClient
                .from('whatsapp_chatbot_flows')
                .select('*')
                .eq('whatsapp_account_id', account.id)
                .eq('is_active', true);

              if (flows && flows.length > 0) {
                for (const flow of flows) {
                  let shouldTrigger = false;

                  if (!flow.trigger_keyword || flow.match_type === 'any') {
                    shouldTrigger = true;
                  } else if (flow.match_type === 'exact') {
                    shouldTrigger = messageText.toLowerCase() === flow.trigger_keyword.toLowerCase();
                  } else if (flow.match_type === 'contains') {
                    shouldTrigger = messageText.toLowerCase().includes(flow.trigger_keyword.toLowerCase());
                  } else if (flow.match_type === 'starts_with') {
                    shouldTrigger = messageText.toLowerCase().startsWith(flow.trigger_keyword.toLowerCase());
                  }

                  if (shouldTrigger) {
                    console.log(`Triggering WhatsApp flow: ${flow.name}`);
                    
                    // Execute flow
                    await supabaseClient.functions.invoke('execute-whatsapp-flow', {
                      body: {
                        flowId: flow.id,
                        subscriberPhone: fromPhone,
                        accountId: account.id,
                        userId: account.user_id,
                        triggerMessage: messageText,
                      }
                    });

                    break; // Only trigger the first matching flow
                  }
                }
              }
            }
          }

          // Handle message status updates
          if (value.statuses) {
            for (const status of value.statuses) {
              await supabaseClient
                .from('whatsapp_messages')
                .update({ status: status.status })
                .eq('whatsapp_message_id', status.id);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in whatsapp-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 200, // Return 200 to prevent webhook retry
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});