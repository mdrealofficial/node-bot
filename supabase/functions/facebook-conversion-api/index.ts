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
    const { storeId, eventName, eventData, userData, testEventCode } = await req.json();

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

    // Get store details including Facebook Pixel ID
    const { data: store, error: storeError } = await supabaseClient
      .from('stores')
      .select('facebook_pixel_id')
      .eq('id', storeId)
      .single();

    if (storeError || !store || !store.facebook_pixel_id) {
      return new Response(
        JSON.stringify({ error: 'Store not found or Facebook Pixel not configured' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Facebook Conversion API endpoint
    const pixelId = store.facebook_pixel_id;
    const accessToken = Deno.env.get('FACEBOOK_CONVERSION_API_TOKEN');

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Facebook Conversion API token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare event data for Facebook Conversion API
    const eventTime = Math.floor(Date.now() / 1000);
    const eventId = `${storeId}_${eventName}_${eventTime}`;

    const conversionEvent = {
      data: [
        {
          event_name: eventName, // e.g., 'Purchase', 'AddToCart', 'ViewContent', 'InitiateCheckout'
          event_time: eventTime,
          event_id: eventId,
          event_source_url: userData?.sourceUrl || '',
          action_source: 'website',
          user_data: {
            client_ip_address: userData?.ip || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
            client_user_agent: userData?.userAgent || req.headers.get('user-agent') || '',
            em: userData?.email ? await hashEmail(userData.email) : undefined,
            ph: userData?.phone ? await hashPhone(userData.phone) : undefined,
            fbc: userData?.fbc, // Facebook click ID from _fbc cookie
            fbp: userData?.fbp, // Facebook browser ID from _fbp cookie
            fn: userData?.firstName ? await hashData(userData.firstName) : undefined,
            ln: userData?.lastName ? await hashData(userData.lastName) : undefined,
            ct: userData?.city ? await hashData(userData.city) : undefined,
            st: userData?.state ? await hashData(userData.state) : undefined,
            zp: userData?.zip ? await hashData(userData.zip) : undefined,
            country: userData?.country ? await hashData(userData.country) : undefined,
          },
          custom_data: eventData || {},
        },
      ],
      test_event_code: testEventCode || undefined,
    };

    // Send to Facebook Conversion API
    const fbResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conversionEvent),
      }
    );

    const fbResult = await fbResponse.json();

    if (!fbResponse.ok) {
      console.error('Facebook API error:', fbResult);
      return new Response(
        JSON.stringify({ error: 'Failed to send event to Facebook', details: fbResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, eventId, fbResult }),
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

// Helper function to hash email (SHA-256)
async function hashEmail(email: string): Promise<string> {
  const normalized = email.toLowerCase().trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper function to hash phone (SHA-256)
async function hashPhone(phone: string): Promise<string> {
  const normalized = phone.replace(/[^0-9]/g, '');
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper function to hash any data (SHA-256)
async function hashData(data: string): Promise<string> {
  const normalized = data.toLowerCase().trim();
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encodedData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
