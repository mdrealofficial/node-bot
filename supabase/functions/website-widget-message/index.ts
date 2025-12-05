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
    const { 
      widget_token, 
      visitor_token, 
      message, 
      visitor_name, 
      visitor_email,
      visitor_phone,
      page_url, 
      user_agent,
      update_visitor_only 
    } = await req.json();

    if (!widget_token || !visitor_token) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!update_visitor_only && !message) {
      return new Response(
        JSON.stringify({ error: 'Missing message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get widget
    const { data: widget, error: widgetError } = await supabase
      .from('website_widgets')
      .select('*')
      .eq('widget_token', widget_token)
      .eq('is_active', true)
      .single();

    if (widgetError || !widget) {
      return new Response(
        JSON.stringify({ error: 'Widget not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create visitor
    let { data: visitor, error: visitorError } = await supabase
      .from('website_visitors')
      .select('*')
      .eq('visitor_token', visitor_token)
      .single();

    if (visitorError || !visitor) {
      const { data: newVisitor, error: createError } = await supabase
        .from('website_visitors')
        .insert({
          user_id: widget.user_id,
          widget_id: widget.id,
          visitor_token,
          visitor_name: visitor_name || 'Anonymous Visitor',
          visitor_email,
          current_page_url: page_url,
          user_agent,
          visitor_ip: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip'),
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating visitor:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create visitor' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      visitor = newVisitor;
    } else {
      // Update visitor details
      const updates: any = { last_seen_at: new Date().toISOString() };
      if (page_url) updates.current_page_url = page_url;
      if (visitor_name) updates.visitor_name = visitor_name;
      if (visitor_email) updates.visitor_email = visitor_email;
      if (visitor_phone !== undefined) updates.visitor_phone = visitor_phone;
      
      await supabase
        .from('website_visitors')
        .update(updates)
        .eq('id', visitor.id);
      
      visitor = { ...visitor, ...updates };
    }
    
    // If this is just a visitor update (pre-chat form), return early
    if (update_visitor_only) {
      return new Response(
        JSON.stringify({ success: true, visitor }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Get or create conversation
    let { data: conversation, error: convError } = await supabase
      .from('website_conversations')
      .select('*')
      .eq('visitor_id', visitor.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (convError || !conversation) {
      const { data: newConv, error: createConvError } = await supabase
        .from('website_conversations')
        .insert({
          user_id: widget.user_id,
          widget_id: widget.id,
          visitor_id: visitor.id,
          status: 'active',
          last_message_text: message.substring(0, 100),
        })
        .select()
        .single();

      if (createConvError) {
        console.error('Error creating conversation:', createConvError);
        return new Response(
          JSON.stringify({ error: 'Failed to create conversation' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      conversation = newConv;
    }

    // Store message
    const { data: newMessage, error: msgError } = await supabase
      .from('website_messages')
      .insert({
        conversation_id: conversation.id,
        sender_type: 'visitor',
        message_text: message,
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
        unread_count: conversation.unread_count + 1,
      })
      .eq('id', conversation.id);

    // Update message cache in background (don't await to keep response fast)
    updateMessageCache(supabase, conversation.id);

    // Send auto-response if enabled
    if (widget.auto_response_enabled && widget.auto_response_message) {
      const { data: autoResponse } = await supabase
        .from('website_messages')
        .insert({
          conversation_id: conversation.id,
          sender_type: 'system',
          message_text: widget.auto_response_message,
        })
        .select()
        .single();

      // Update cache again for auto-response
      if (autoResponse) {
        updateMessageCache(supabase, conversation.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: newMessage.id,
        conversation_id: conversation.id 
      }),
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
