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

    const { action, sessionId, conversationId, visitorId, callType } = await req.json();

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

        // Create video call session
        const { data: session, error: sessionError } = await supabase
          .from('video_call_sessions')
          .insert({
            conversation_id: conversationId,
            user_id: user.id,
            visitor_id: visitorId,
            call_type: callType || 'video',
            status: 'pending'
          })
          .select()
          .single();

        if (sessionError) throw sessionError;

        console.log('Video call session created:', session.id);

        return new Response(JSON.stringify({ session }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'accept': {
        // Update session status
        const { data: session, error: updateError } = await supabase
          .from('video_call_sessions')
          .update({
            status: 'active',
            started_at: new Date().toISOString()
          })
          .eq('id', sessionId)
          .select()
          .single();

        if (updateError) throw updateError;

        console.log('Video call accepted:', sessionId);

        return new Response(JSON.stringify({ session }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'decline': {
        // Update session status
        const { error: updateError } = await supabase
          .from('video_call_sessions')
          .update({ status: 'declined' })
          .eq('id', sessionId);

        if (updateError) throw updateError;

        console.log('Video call declined:', sessionId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'end': {
        // Calculate duration if started
        const { data: session } = await supabase
          .from('video_call_sessions')
          .select('started_at')
          .eq('id', sessionId)
          .single();

        let durationSeconds = 0;
        if (session?.started_at) {
          const start = new Date(session.started_at);
          const end = new Date();
          durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
        }

        // End session
        const { error: updateError } = await supabase
          .from('video_call_sessions')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
            duration_seconds: durationSeconds
          })
          .eq('id', sessionId);

        if (updateError) throw updateError;

        console.log('Video call ended:', sessionId, 'Duration:', durationSeconds);

        return new Response(JSON.stringify({ success: true, duration: durationSeconds }), {
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
    console.error('Error in video-call-session:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
