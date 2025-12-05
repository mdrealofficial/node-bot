import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log(`[TIKTOK-WEBHOOK] Received ${req.method} request`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle verification challenge
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const challenge = url.searchParams.get('challenge');
    
    if (challenge) {
      console.log('[TIKTOK-WEBHOOK] Responding to verification challenge');
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await req.json();
    console.log('[TIKTOK-WEBHOOK] Payload:', JSON.stringify(payload, null, 2));

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // TikTok webhook event structure
    const event = payload.event;
    
    if (!event) {
      console.log('[TIKTOK-WEBHOOK] No event in payload');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle different event types
    switch (event) {
      case 'message': {
        // Handle incoming DM
        await handleDirectMessage(supabase, payload);
        break;
      }
      case 'comment': {
        // Handle comment events
        await handleComment(supabase, payload);
        break;
      }
      default:
        console.log(`[TIKTOK-WEBHOOK] Unhandled event type: ${event}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[TIKTOK-WEBHOOK] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function handleDirectMessage(supabase: any, payload: any) {
  console.log('[TIKTOK-WEBHOOK] Processing direct message');
  
  const { sender_id, recipient_id, message, conversation_id } = payload;

  // Find the TikTok account
  const { data: account } = await supabase
    .from('tiktok_accounts')
    .select('*')
    .eq('tiktok_account_id', recipient_id)
    .single();

  if (!account) {
    console.log('[TIKTOK-WEBHOOK] TikTok account not found:', recipient_id);
    return;
  }

  // Upsert subscriber
  const { data: subscriber } = await supabase
    .from('tiktok_subscribers')
    .upsert({
      user_id: account.user_id,
      tiktok_account_id: account.id,
      subscriber_tiktok_id: sender_id,
      last_interaction_time: new Date().toISOString(),
    }, {
      onConflict: 'tiktok_account_id,subscriber_tiktok_id',
    })
    .select()
    .single();

  if (!subscriber) {
    console.error('[TIKTOK-WEBHOOK] Failed to create subscriber');
    return;
  }

  // Upsert conversation
  const { data: conversation } = await supabase
    .from('tiktok_conversations')
    .upsert({
      user_id: account.user_id,
      tiktok_account_id: account.id,
      subscriber_id: subscriber.id,
      last_message_at: new Date().toISOString(),
      last_message_text: message.text,
      unread_count: 1,
    }, {
      onConflict: 'tiktok_account_id,subscriber_id',
    })
    .select()
    .single();

  if (!conversation) {
    console.error('[TIKTOK-WEBHOOK] Failed to create conversation');
    return;
  }

  // Insert message
  await supabase
    .from('tiktok_messages')
    .insert({
      conversation_id: conversation.id,
      tiktok_message_id: message.message_id,
      message_text: message.text || '',
      sender_type: 'subscriber',
      sent_at: new Date().toISOString(),
    });

  console.log('[TIKTOK-WEBHOOK] Message saved successfully');
}

async function handleComment(supabase: any, payload: any) {
  console.log('[TIKTOK-WEBHOOK] Processing comment event');
  
  // TikTok comment handling will be implemented in Phase 3
  // For now, just log the event
  console.log('[TIKTOK-WEBHOOK] Comment event received but not yet implemented');
}
