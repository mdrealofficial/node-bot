import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storeId, eventName, eventData, userData } = await req.json();

    if (!storeId || !eventName) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get store details including Google Analytics ID
    const { data: store, error: storeError } = await supabaseClient
      .from('stores')
      .select('google_analytics_id')
      .eq('id', storeId)
      .single();

    if (storeError || !store || !store.google_analytics_id) {
      return new Response(
        JSON.stringify({ error: 'Store not found or Google Analytics not configured' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const measurementId = store.google_analytics_id;
    const apiSecret = Deno.env.get('GOOGLE_ANALYTICS_API_SECRET');

    if (!apiSecret) {
      return new Response(
        JSON.stringify({ error: 'Google Analytics API secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate client ID (use user email hash or random)
    const clientId = userData?.email 
      ? await generateClientId(userData.email)
      : crypto.randomUUID();

    // Prepare event data for Google Analytics Measurement Protocol
    const gaEvent: any = {
      client_id: clientId,
      user_id: userData?.userId || undefined,
      events: [{
        name: eventName, // e.g., 'purchase', 'refund', 'add_to_cart'
        params: {
          ...eventData,
          engagement_time_msec: '100',
          session_id: userData?.sessionId || Date.now().toString(),
        }
      }]
    };

    // Add user properties if available
    if (userData?.email || userData?.phone) {
      gaEvent.user_properties = {
        user_email: { value: userData.email },
        user_phone: { value: userData.phone },
      };
    }

    // Send to Google Analytics Measurement Protocol v2
    const gaResponse = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gaEvent),
      }
    );

    if (!gaResponse.ok) {
      const gaError = await gaResponse.text();
      console.error('Google Analytics API error:', gaError);
      return new Response(
        JSON.stringify({ error: 'Failed to send event to Google Analytics', details: gaError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, clientId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to generate consistent client ID from email
async function generateClientId(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 32); // Use first 32 chars as client ID
}
