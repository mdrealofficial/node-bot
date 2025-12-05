import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  phone: string;
  message: string;
  isTest?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { phone, message, isTest } = await req.json() as SMSRequest;

    console.log('[SYSTEM-SMS] Sending SMS to:', phone);

    // Get SMS config from admin_config
    const { data: config, error: configError } = await supabase
      .from('admin_config')
      .select('*')
      .single();

    if (configError) {
      console.error('[SYSTEM-SMS] Config error:', configError);
      throw new Error('Failed to load SMS configuration');
    }

    if (!config.system_sms_enabled) {
      throw new Error('System SMS is not enabled');
    }

    const endpoint = config.system_sms_gateway_endpoint;
    const gatewayType = config.system_sms_gateway_type || 'get';
    const apiKey = config.system_sms_api_key;
    const apiKeyParam = config.system_sms_api_key_param || 'api_key';
    const phoneParam = config.system_sms_phone_param || 'to';
    const messageParam = config.system_sms_message_param || 'msg';
    const senderId = config.system_sms_sender_id;
    const senderIdParam = config.system_sms_sender_id_param || 'sender_id';
    const additionalParams = config.system_sms_additional_params || {};
    const successResponse = config.system_sms_success_response;

    if (!endpoint) {
      throw new Error('SMS gateway endpoint not configured');
    }

    // Build parameters
    const params: Record<string, string> = {
      [phoneParam]: phone,
      [messageParam]: message,
    };

    if (apiKey) {
      params[apiKeyParam] = apiKey;
    }

    if (senderId) {
      params[senderIdParam] = senderId;
    }

    Object.assign(params, additionalParams);

    console.log('[SYSTEM-SMS] Sending request to:', endpoint);

    // Make request
    const url = gatewayType === 'get'
      ? `${endpoint}?${new URLSearchParams(params)}`
      : endpoint;

    const response = await fetch(url, {
      method: gatewayType.toUpperCase(),
      headers: gatewayType === 'post' ? { 'Content-Type': 'application/json' } : {},
      body: gatewayType === 'post' ? JSON.stringify(params) : undefined,
    });

    const result = await response.text();
    console.log('[SYSTEM-SMS] Gateway response:', result);

    const success = successResponse ? result.includes(successResponse) : response.ok;

    if (!success) {
      throw new Error(`SMS sending failed: ${result.substring(0, 200)}`);
    }

    return new Response(
      JSON.stringify({ success: true, response: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[SYSTEM-SMS] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});