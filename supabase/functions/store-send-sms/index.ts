import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { storeId, campaignId, phone, message, isTest, filters } = await req.json();

    // Get store SMS gateway config
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (storeError || !store.sms_gateway_enabled) {
      throw new Error('SMS gateway not configured');
    }

    // Get customers to send to
    let customers = [];
    if (campaignId && filters) {
      let query = supabase.from('store_customers').select('*').eq('store_id', storeId);
      
      if (filters.delivery_location) query = query.eq('delivery_location', filters.delivery_location);
      if (filters.areas?.length) query = query.in('area', filters.areas);
      if (filters.min_orders) query = query.gte('total_orders', filters.min_orders);
      if (filters.tags?.length) query = query.overlaps('tags', filters.tags);

      const { data } = await query;
      customers = data || [];
    } else if (phone) {
      customers = [{ phone, full_name: 'Test User' }];
    }

    let successCount = 0;
    let failureCount = 0;

    for (const customer of customers) {
      try {
        const params: any = {
          [store.sms_gateway_phone_param]: customer.phone,
          [store.sms_gateway_message_param]: message.replace('{name}', customer.full_name || ''),
        };

        if (store.sms_gateway_api_key) {
          params[store.sms_gateway_api_key_param] = store.sms_gateway_api_key;
        }

        Object.assign(params, store.sms_gateway_additional_params || {});

        const url = store.sms_gateway_type === 'get' 
          ? `${store.sms_gateway_endpoint}?${new URLSearchParams(params)}`
          : store.sms_gateway_endpoint;

        const response = await fetch(url, {
          method: store.sms_gateway_type.toUpperCase(),
          headers: store.sms_gateway_type === 'post' ? { 'Content-Type': 'application/json' } : {},
          body: store.sms_gateway_type === 'post' ? JSON.stringify(params) : undefined,
        });

        const result = await response.text();
        const success = store.sms_gateway_success_response ? result.includes(store.sms_gateway_success_response) : response.ok;

        await supabase.from('store_sms_logs').insert({
          store_id: storeId,
          campaign_id: campaignId,
          phone: customer.phone,
          message,
          status: success ? 'sent' : 'failed',
          gateway_response: { result },
          sent_at: new Date().toISOString(),
        });

        if (success) successCount++;
        else failureCount++;
      } catch (error) {
        failureCount++;
      }
    }

    if (campaignId) {
      await supabase.from('store_sms_campaigns').update({
        status: 'completed',
        sent_count: successCount,
        failed_count: failureCount,
        sent_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      }).eq('id', campaignId);
    }

    return new Response(JSON.stringify({ success: true, successCount, failureCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});