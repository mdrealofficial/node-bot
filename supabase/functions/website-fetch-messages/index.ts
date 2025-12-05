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
    const { widget_token, visitor_token } = await req.json();

    if (!widget_token || !visitor_token) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get widget to verify it exists
    const { data: widget, error: widgetError } = await supabase
      .from('website_widgets')
      .select('*')
      .eq('widget_token', widget_token)
      .single();

    if (widgetError || !widget) {
      return new Response(
        JSON.stringify({ error: 'Widget not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create visitor
    const { data: visitor } = await supabase
      .from('website_visitors')
      .select('*')
      .eq('visitor_token', visitor_token)
      .eq('widget_id', widget.id)
      .single();

    if (!visitor) {
      return new Response(
        JSON.stringify({ messages: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get conversation
    const { data: conversation } = await supabase
      .from('website_conversations')
      .select('*')
      .eq('visitor_id', visitor.id)
      .single();

    if (!conversation) {
      return new Response(
        JSON.stringify({ messages: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch messages for this conversation
    const { data: messages, error: messagesError } = await supabase
      .from('website_messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('sent_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch messages' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        messages: messages || [],
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
