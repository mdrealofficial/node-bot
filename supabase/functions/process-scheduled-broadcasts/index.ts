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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all pending broadcasts that should be sent now
    const { data: broadcasts, error: fetchError } = await supabase
      .from('scheduled_broadcasts')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true });

    if (fetchError) {
      console.error('Error fetching broadcasts:', fetchError);
      throw fetchError;
    }

    if (!broadcasts || broadcasts.length === 0) {
      console.log('No broadcasts to process');
      return new Response(
        JSON.stringify({ message: 'No broadcasts to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${broadcasts.length} scheduled broadcasts`);

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
    };

    for (const broadcast of broadcasts) {
      try {
        // Get account details
        let accountToken = '';
        if (broadcast.account_type === 'facebook') {
          const { data: page } = await supabase
            .from('facebook_pages')
            .select('page_access_token')
            .eq('id', broadcast.account_id)
            .single();
          accountToken = page?.page_access_token || '';
        } else {
          const { data: account } = await supabase
            .from('instagram_accounts')
            .select('access_token')
            .eq('id', broadcast.account_id)
            .single();
          accountToken = account?.access_token || '';
        }

        if (!accountToken) {
          throw new Error('Account not found or token missing');
        }

        // Get active subscribers
        let subscribers = [];
        if (broadcast.account_type === 'facebook') {
          const { data } = await supabase
            .from('subscribers')
            .select('subscriber_psid, last_interaction_time')
            .eq('page_id', broadcast.account_id)
            .eq('user_id', broadcast.user_id);
          subscribers = data || [];
        } else {
          const { data } = await supabase
            .from('instagram_subscribers')
            .select('subscriber_instagram_id, last_interaction_time')
            .eq('instagram_account_id', broadcast.account_id)
            .eq('user_id', broadcast.user_id);
          subscribers = data || [];
        }

        // Filter active subscribers (within 24 hours)
        const activeSubscriberIds = subscribers
          .filter(sub => {
            if (!sub.last_interaction_time) return false;
            const hoursSince = (Date.now() - new Date(sub.last_interaction_time).getTime()) / (1000 * 60 * 60);
            return hoursSince < 24;
          })
          .map(sub => sub.subscriber_psid || sub.subscriber_instagram_id);

        if (activeSubscriberIds.length === 0) {
          await supabase
            .from('scheduled_broadcasts')
            .update({
              status: 'failed',
              error_message: 'No active recipients available',
              updated_at: new Date().toISOString(),
            })
            .eq('id', broadcast.id);
          
          results.failed++;
          continue;
        }

        // Call broadcast function
        const functionName = broadcast.account_type === 'facebook'
          ? 'broadcast-message'
          : 'instagram-broadcast-message';

        const { data: broadcastResult, error: broadcastError } = await supabase.functions.invoke(functionName, {
          body: broadcast.account_type === 'facebook'
            ? {
                pageAccessToken: accountToken,
                pageId: broadcast.account_id,
                message: broadcast.message,
                subscriberPsids: activeSubscriberIds,
              }
            : {
                accountId: broadcast.account_id,
                accessToken: accountToken,
                message: broadcast.message,
                subscriberInstagramIds: activeSubscriberIds,
              },
        });

        if (broadcastError) {
          throw broadcastError;
        }

        // Update broadcast status
        await supabase
          .from('scheduled_broadcasts')
          .update({
            status: 'sent',
            sent_count: broadcastResult.successCount || 0,
            failed_count: broadcastResult.failureCount || 0,
            error_message: broadcastResult.errors ? broadcastResult.errors.join(', ') : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', broadcast.id);

        results.succeeded++;
        console.log(`Broadcast ${broadcast.id} sent successfully`);

      } catch (error: any) {
        console.error(`Error processing broadcast ${broadcast.id}:`, error);
        
        // Update broadcast status to failed
        await supabase
          .from('scheduled_broadcasts')
          .update({
            status: 'failed',
            error_message: error.message || 'Unknown error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', broadcast.id);

        results.failed++;
      }

      results.processed++;
    }

    console.log('Processing complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in process-scheduled-broadcasts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
