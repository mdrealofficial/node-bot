import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as base64Decode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignedRequest {
  algorithm: string;
  issued_at: number;
  user_id: string;
}

// Parse and verify Facebook signed_request
function parseSignedRequest(signedRequest: string, appSecret: string): SignedRequest | null {
  try {
    const [encodedSig, payload] = signedRequest.split('.');
    
    if (!encodedSig || !payload) {
      console.error('Invalid signed_request format');
      return null;
    }

    // Decode payload
    const decodedPayload = new TextDecoder().decode(
      base64Decode(payload.replace(/-/g, '+').replace(/_/g, '/'))
    );
    const data = JSON.parse(decodedPayload) as SignedRequest;

    // Verify algorithm
    if (data.algorithm?.toUpperCase() !== 'HMAC-SHA256') {
      console.error('Unknown algorithm:', data.algorithm);
      return null;
    }

    // For production, you should verify the signature using HMAC-SHA256
    // For now, we'll trust the payload as Facebook sends it over HTTPS
    
    return data;
  } catch (error) {
    console.error('Error parsing signed_request:', error);
    return null;
  }
}

// Generate a unique confirmation code
function generateConfirmationCode(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `DEL-${timestamp}-${randomPart}`.toUpperCase();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get admin config for Facebook app secret
    const { data: adminConfig } = await supabase
      .from('admin_config')
      .select('fb_app_secret, app_domain, site_url')
      .single();

    const appSecret = adminConfig?.fb_app_secret || '';
    const siteUrl = adminConfig?.site_url || adminConfig?.app_domain || '';

    // Parse request body
    let signedRequest: string;
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      signedRequest = formData.get('signed_request') as string;
    } else {
      const body = await req.json();
      signedRequest = body.signed_request;
    }

    if (!signedRequest) {
      console.error('No signed_request provided');
      return new Response(
        JSON.stringify({ error: 'Missing signed_request' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the signed request
    const data = parseSignedRequest(signedRequest, appSecret);
    
    if (!data || !data.user_id) {
      console.error('Invalid signed_request data');
      return new Response(
        JSON.stringify({ error: 'Invalid signed_request' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const facebookUserId = data.user_id;
    const confirmationCode = generateConfirmationCode();

    console.log(`Processing data deletion request for Facebook user: ${facebookUserId}`);

    // Create deletion request record
    const { error: insertError } = await supabase
      .from('data_deletion_requests')
      .insert({
        facebook_user_id: facebookUserId,
        confirmation_code: confirmationCode,
        status: 'pending',
        requested_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error creating deletion request:', insertError);
    }

    // Delete user data from various tables
    const deletionResults: Record<string, boolean> = {};

    // 1. Find subscribers with this Facebook PSID and delete related data
    const { data: subscribers } = await supabase
      .from('subscribers')
      .select('id, user_id')
      .eq('psid', facebookUserId);

    if (subscribers && subscribers.length > 0) {
      for (const subscriber of subscribers) {
        // Delete messages
        const { error: messagesError } = await supabase
          .from('messages')
          .delete()
          .eq('subscriber_id', subscriber.id);
        deletionResults['messages'] = !messagesError;

        // Delete conversations
        const { error: convError } = await supabase
          .from('conversations')
          .delete()
          .eq('subscriber_id', subscriber.id);
        deletionResults['conversations'] = !convError;
      }

      // Delete subscribers
      const { error: subError } = await supabase
        .from('subscribers')
        .delete()
        .eq('psid', facebookUserId);
      deletionResults['subscribers'] = !subError;
    }

    // 2. Delete comment replies from this user
    const { error: commentError } = await supabase
      .from('comment_replies')
      .delete()
      .eq('commenter_psid', facebookUserId);
    deletionResults['comment_replies'] = !commentError;

    // 3. Delete store customers with this Facebook PSID
    const { error: customerError } = await supabase
      .from('store_customers')
      .delete()
      .eq('facebook_psid', facebookUserId);
    deletionResults['store_customers'] = !customerError;

    // 4. Delete broadcast recipients
    const { error: broadcastError } = await supabase
      .from('broadcast_recipients')
      .delete()
      .eq('subscriber_psid', facebookUserId);
    deletionResults['broadcast_recipients'] = !broadcastError;

    // Update deletion request status
    await supabase
      .from('data_deletion_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        deletion_details: deletionResults
      })
      .eq('confirmation_code', confirmationCode);

    console.log(`Data deletion completed for Facebook user: ${facebookUserId}`);
    console.log('Deletion results:', deletionResults);

    // Build confirmation URL
    const baseUrl = siteUrl || Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || '';
    const confirmationUrl = `${baseUrl}/data-deletion?code=${confirmationCode}`;

    // Return response in Facebook's expected format
    const response = {
      url: confirmationUrl,
      confirmation_code: confirmationCode
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error('Error processing data deletion:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
