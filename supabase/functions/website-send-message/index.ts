import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to update message cache in storage
async function updateMessageCache(supabase: any, conversationId: string) {
  try {
    // Get last 100 messages for this conversation
    const { data: messages, error } = await supabase
      .from('website_messages')
      .select('id, message_text, sender_type, sent_at')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching messages for cache:', error);
      return;
    }

    // Reverse to get chronological order
    const chronologicalMessages = (messages || []).reverse().map((msg: any) => ({
      id: msg.id,
      text: msg.message_text,
      sender: msg.sender_type === 'visitor' ? 'visitor' : 'agent',
      timestamp: msg.sent_at
    }));

    const cacheData = {
      conversation_id: conversationId,
      updated_at: new Date().toISOString(),
      messages: chronologicalMessages
    };

    const bucketPath = `${conversationId}.json`;
    
    // Upload/update cache file
    const { error: uploadError } = await supabase.storage
      .from('chat-sessions')
      .upload(bucketPath, JSON.stringify(cacheData), {
        contentType: 'application/json',
        upsert: true
      });

    if (uploadError) {
      console.error('Error updating cache:', uploadError);
    } else {
      console.log('Cache updated successfully for conversation:', conversationId);
    }
  } catch (error) {
    console.error('Error in updateMessageCache:', error);
  }
}

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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { conversation_id, message, attachment_url, attachment_type } = await req.json();

    if (!conversation_id || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns this conversation
    const { data: conversation, error: convError } = await supabase
      .from('website_conversations')
      .select('*')
      .eq('id', conversation_id)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store message
    const { data: newMessage, error: msgError } = await supabase
      .from('website_messages')
      .insert({
        conversation_id,
        sender_type: 'user',
        message_text: message,
        attachment_url,
        attachment_type,
      })
      .select()
      .single();

    if (msgError) {
      console.error('Error storing message:', msgError);
      return new Response(
        JSON.stringify({ error: 'Failed to store message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update conversation
    await supabase
      .from('website_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_text: message.substring(0, 100),
        unread_count: 0, // Reset unread count when user replies
      })
      .eq('id', conversation_id);

    // Update message cache in background (don't await to keep response fast)
    updateMessageCache(supabase, conversation_id);

    return new Response(
      JSON.stringify({ success: true, message: newMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
