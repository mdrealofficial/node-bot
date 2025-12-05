import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
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
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { pageAccessToken, pageId, message, subscriberPsids } = await req.json();

    if (!pageAccessToken || !pageId || !message || !subscriberPsids || subscriberPsids.length === 0) {
      throw new Error('Missing required fields');
    }

    // Check quota for all recipients
    const recipientCount = subscriberPsids.length;
    const { data: quotaCheck, error: quotaError } = await supabase
      .rpc('check_and_consume_quota', {
        p_user_id: user.id,
        p_quota_amount: recipientCount,
        p_action_type: 'broadcast',
        p_platform: 'facebook'
      });

    if (quotaError) {
      console.error('Quota check error:', quotaError);
      throw new Error('Failed to check message quota');
    }

    if (!quotaCheck.success) {
      console.log('Quota exceeded for broadcast:', quotaCheck);
      return new Response(
        JSON.stringify({ 
          error: quotaCheck.error === 'quota_exceeded' ? `Insufficient quota. Need ${recipientCount} messages, have ${quotaCheck.remaining}` : quotaCheck.message,
          errorCode: 'QUOTA_EXCEEDED',
          details: quotaCheck
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Quota check passed for ${recipientCount} recipients. Remaining: ${quotaCheck.remaining}`);

    // Verify page ownership
    const { data: page, error: pageError } = await supabase
      .from('facebook_pages')
      .select('*')
      .eq('id', pageId)
      .eq('user_id', user.id)
      .single();

    if (pageError || !page) {
      throw new Error('Page not found or unauthorized');
    }

    console.log(`Broadcasting message to ${subscriberPsids.length} subscribers for page ${page.page_name}`);

    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    // Batch size for Facebook's batch API
    const BATCH_SIZE = 50;
    const batches: string[][] = [];
    
    // Group subscribers into batches
    for (let i = 0; i < subscriberPsids.length; i += BATCH_SIZE) {
      batches.push(subscriberPsids.slice(i, i + BATCH_SIZE));
    }

    console.log(`Sending ${subscriberPsids.length} messages in ${batches.length} batches`);

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      try {
        // Build batch request payload
        const batchRequests = batch.map((psid, index) => {
          const body = {
            recipient: { id: psid },
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
          `https://graph.facebook.com/v21.0/?access_token=${pageAccessToken}`,
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
          batch.forEach(psid => {
            errors.push(`${psid}: Batch request failed - ${batchResults.error?.message || 'Unknown error'}`);
          });
          continue;
        }

        // Process individual responses in batch
        batchResults.forEach((result: any, index: number) => {
          const psid = batch[index];
          
          if (result.code === 200) {
            const body = JSON.parse(result.body);
            if (body.error) {
              console.error(`Failed to send to ${psid}:`, body.error);
              failureCount++;
              errors.push(`${psid}: ${body.error.message || 'Unknown error'}`);
            } else {
              successCount++;
            }
          } else {
            const errorBody = result.body ? JSON.parse(result.body) : null;
            console.error(`Failed to send to ${psid}: HTTP ${result.code}`, errorBody);
            failureCount++;
            const errorMessage = errorBody?.error?.message || `HTTP ${result.code}`;
            errors.push(`${psid}: ${errorMessage}`);
          }
        });

        console.log(`Batch ${batchIndex + 1}/${batches.length} complete: ${successCount} success, ${failureCount} failed`);
      } catch (error: any) {
        console.error(`Error processing batch ${batchIndex + 1}:`, error);
        failureCount += batch.length;
        batch.forEach(psid => {
          errors.push(`${psid}: Batch error - ${error.message}`);
        });
      }
    }

    console.log(`Broadcast complete: ${successCount} success, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        successCount,
        failureCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in broadcast-message function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
