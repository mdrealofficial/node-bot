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
    const { 
      storeId, 
      eventName, 
      orderId,
      userData,
      testMode = false 
    } = await req.json();

    console.log(`[TRACK CONVERSION] Event: ${eventName}, Store: ${storeId}, Order: ${orderId}`);

    if (!storeId || !eventName) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get store and order details
    const { data: store } = await supabaseClient
      .from('stores')
      .select('facebook_pixel_id, google_analytics_id, currency')
      .eq('id', storeId)
      .single();

    let order = null;
    let orderItems = [];

    if (orderId) {
      const { data: orderData } = await supabaseClient
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (*)
          )
        `)
        .eq('id', orderId)
        .single();

      order = orderData;
      orderItems = orderData?.order_items || [];
    }

    const results: any = {
      facebook: null,
      google: null,
    };

    // Prepare event data based on event type
    let eventData: any = {};
    
    switch (eventName) {
      case 'Purchase':
        eventData = {
          content_ids: orderItems.map((item: any) => item.product_id),
          content_type: 'product',
          value: order?.total_amount || 0,
          currency: store?.currency || 'BDT',
          num_items: orderItems.length,
          contents: orderItems.map((item: any) => ({
            id: item.product_id,
            quantity: item.quantity,
            item_price: item.unit_price,
          })),
        };
        break;

      case 'Refund':
        eventData = {
          content_ids: orderItems.map((item: any) => item.product_id),
          content_type: 'product',
          value: order?.total_amount || 0,
          currency: store?.currency || 'BDT',
        };
        break;

      case 'InitiateCheckout':
        eventData = {
          content_ids: orderItems.map((item: any) => item.product_id),
          content_type: 'product',
          value: order?.total_amount || 0,
          currency: store?.currency || 'BDT',
          num_items: orderItems.length,
        };
        break;

      default:
        eventData = userData?.customData || {};
    }

    // Track with Facebook Conversion API
    if (store?.facebook_pixel_id) {
      try {
        const fbResponse = await supabaseClient.functions.invoke('facebook-conversion-api', {
          body: {
            storeId,
            eventName,
            eventData,
            userData: {
              email: order?.customer_email || userData?.email,
              phone: order?.customer_phone || userData?.phone,
              firstName: order?.customer_name?.split(' ')[0] || userData?.firstName,
              lastName: order?.customer_name?.split(' ').slice(1).join(' ') || userData?.lastName,
              city: userData?.city,
              state: userData?.state,
              zip: userData?.zip,
              country: userData?.country,
              ip: userData?.ip,
              userAgent: userData?.userAgent,
              fbc: userData?.fbc,
              fbp: userData?.fbp,
            },
            testEventCode: testMode ? 'TEST12345' : undefined,
          }
        });
        
        results.facebook = fbResponse.data;
        console.log(`[TRACK CONVERSION] Facebook tracked: ${eventName}`);
      } catch (error) {
        console.error('[TRACK CONVERSION] Facebook error:', error);
        results.facebook = { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    // Track with Google Analytics
    if (store?.google_analytics_id) {
      try {
        let gaEventName = eventName.toLowerCase();
        let gaEventData: any = {};

        // Map Facebook event names to GA4 event names
        switch (eventName) {
          case 'Purchase':
            gaEventName = 'purchase';
            gaEventData = {
              transaction_id: orderId,
              value: order?.total_amount || 0,
              currency: store?.currency || 'BDT',
              tax: 0,
              shipping: 0,
              items: orderItems.map((item: any, index: number) => ({
                item_id: item.product_id,
                item_name: item.products?.name || `Product ${index + 1}`,
                price: item.unit_price,
                quantity: item.quantity,
              })),
            };
            break;

          case 'Refund':
            gaEventName = 'refund';
            gaEventData = {
              transaction_id: orderId,
              value: order?.total_amount || 0,
              currency: store?.currency || 'BDT',
            };
            break;

          case 'InitiateCheckout':
            gaEventName = 'begin_checkout';
            gaEventData = {
              value: order?.total_amount || 0,
              currency: store?.currency || 'BDT',
              items: orderItems.map((item: any, index: number) => ({
                item_id: item.product_id,
                item_name: item.products?.name || `Product ${index + 1}`,
                price: item.unit_price,
                quantity: item.quantity,
              })),
            };
            break;
        }

        const gaResponse = await supabaseClient.functions.invoke('google-analytics-api', {
          body: {
            storeId,
            eventName: gaEventName,
            eventData: gaEventData,
            userData: {
              email: order?.customer_email || userData?.email,
              phone: order?.customer_phone || userData?.phone,
              userId: userData?.userId,
              sessionId: userData?.sessionId,
            }
          }
        });

        results.google = gaResponse.data;
        console.log(`[TRACK CONVERSION] Google Analytics tracked: ${gaEventName}`);
      } catch (error) {
        console.error('[TRACK CONVERSION] Google Analytics error:', error);
        results.google = { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[TRACK CONVERSION] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
