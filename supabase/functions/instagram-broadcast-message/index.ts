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

    const { accountId, accessToken, message, subscriberInstagramIds } = await req.json();

    if (!accountId || !accessToken || !message || !subscriberInstagramIds || subscriberInstagramIds.length === 0) {
      throw new Error('Missing required fields');
    }

    // Check quota for all recipients
    const recipientCount = subscriberInstagramIds.length;
    const { data: quotaCheck, error: quotaError } = await supabase
      .rpc('check_and_consume_quota', {
        p_user_id: user.id,
        p_quota_amount: recipientCount,
        p_action_type: 'broadcast',
        p_platform: 'instagram'
      });

    if (quotaError) {
      console.error('Quota check error:', quotaError);
      throw new Error('Failed to check message quota');
    }

    if (!quotaCheck.success) {
      console.log('Quota exceeded for Instagram broadcast:', quotaCheck);
      return new Response(
        JSON.stringify({ 
          error: quotaCheck.error === 'quota_exceeded' ? `Insufficient quota. Need ${recipientCount} messages, have ${quotaCheck.remaining}` : quotaCheck.message,
          errorCode: 'QUOTA_EXCEEDED',
          details: quotaCheck
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Quota check passed for ${recipientCount} Instagram recipients. Remaining: ${quotaCheck.remaining}`);

    console.log(`Broadcasting to ${subscriberInstagramIds.length} Instagram subscribers`);

    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    // Batch size for Facebook's batch API
    const BATCH_SIZE = 50;
    const batches: string[][] = [];
    
    // Group subscribers into batches
    for (let i = 0; i < subscriberInstagramIds.length; i += BATCH_SIZE) {
      batches.push(subscriberInstagramIds.slice(i, i + BATCH_SIZE));
    }

    console.log(`Sending ${subscriberInstagramIds.length} messages in ${batches.length} batches`);

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      try {
        // Build batch request payload
        const batchRequests = batch.map((instagramId, index) => {
          const body = {
            recipient: { id: instagramId },
            message: { text: message },
          };
          return {
            method: 'POST',
            relative_url: 'me/messages',
            body: new URLSearchParams({ 
              recipient: JSON.stringify(body.recipient),
              message: JSON.stringify(body.message)
            }).toString(),
            name: `request_${index}`,
          };
        });

        // Send batch request to Facebook
        const batchResponse = await fetch(
          `https://graph.facebook.com/v21.0/?access_token=${accessToken}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              batch: batchRequests,
            }),
          }
        );

        const batchResults = await batchResponse.json();

        if (!batchResponse.ok || batchResults.error) {
          console.error(`Batch ${batchIndex + 1} failed:`, batchResults.error);
          failureCount += batch.length;
          batch.forEach(instagramId => {
            errors.push(`${instagramId}: Batch request failed - ${batchResults.error?.message || 'Unknown error'}`);
          });
          continue;
        }

        // Process individual responses in batch
        batchResults.forEach((result: any, index: number) => {
          const instagramId = batch[index];
          
          if (result.code === 200) {
            const body = JSON.parse(result.body);
            if (body.error) {
              console.error(`Failed to send to ${instagramId}:`, body.error);
              failureCount++;
              errors.push(`${instagramId}: ${body.error.message || 'Unknown error'}`);
            } else {
              successCount++;
            }
          } else {
            const errorBody = result.body ? JSON.parse(result.body) : null;
            console.error(`Failed to send to ${instagramId}: HTTP ${result.code}`, errorBody);
            failureCount++;
            const errorMessage = errorBody?.error?.message || `HTTP ${result.code}`;
            errors.push(`${instagramId}: ${errorMessage}`);
          }
        });

        console.log(`Batch ${batchIndex + 1}/${batches.length} complete: ${successCount} success, ${failureCount} failed`);
      } catch (error: any) {
        console.error(`Error processing batch ${batchIndex + 1}:`, error);
        failureCount += batch.length;
        batch.forEach(instagramId => {
          errors.push(`${instagramId}: Batch error - ${error.message}`);
        });
      }
    }

    console.log(`Instagram broadcast complete: ${successCount} success, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        successCount,
        failureCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in instagram-broadcast-message:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
