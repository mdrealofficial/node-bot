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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, sessionId, conversationId, visitorId } = await req.json();

    switch (action) {
      case 'create': {
        // Get user from auth
        const authHeader = req.headers.get('Authorization')!;
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Create co-browse session
        const { data: session, error: sessionError } = await supabase
          .from('co_browse_sessions')
          .insert({
            conversation_id: conversationId,
            user_id: user.id,
            visitor_id: visitorId,
            status: 'pending'
          })
          .select()
          .single();

        if (sessionError) throw sessionError;

        console.log('Co-browse session created:', session.id);

        return new Response(JSON.stringify({ session }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'accept': {
        // Update session status
        const { data: session, error: updateError } = await supabase
          .from('co_browse_sessions')
          .update({
            status: 'active',
            started_at: new Date().toISOString()
          })
          .eq('id', sessionId)
          .select()
          .single();

        if (updateError) throw updateError;

        console.log('Co-browse session accepted:', sessionId);

        return new Response(JSON.stringify({ session }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'decline': {
        // Update session status
        const { error: updateError } = await supabase
          .from('co_browse_sessions')
          .update({ status: 'declined' })
          .eq('id', sessionId);

        if (updateError) throw updateError;

        console.log('Co-browse session declined:', sessionId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'end': {
        // End session
        const { error: updateError } = await supabase
          .from('co_browse_sessions')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        if (updateError) throw updateError;

        console.log('Co-browse session ended:', sessionId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error: any) {
    console.error('Error in co-browse-session:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
