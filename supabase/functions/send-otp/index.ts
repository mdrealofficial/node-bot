import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber } = await req.json();

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number for Bangladeshi SMS API
    let cleanNumber = phoneNumber.replace(/\D/g, '');
    
    if (cleanNumber.startsWith('880')) {
      cleanNumber = cleanNumber;
    } else if (cleanNumber.startsWith('0')) {
      cleanNumber = '880' + cleanNumber.substring(1);
    } else if (cleanNumber.length === 10) {
      cleanNumber = '880' + cleanNumber;
    }

    if (!/^880\d{10}$/.test(cleanNumber)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid phone number format',
          details: 'Please enter a valid Bangladeshi phone number (e.g., 01712345678 or +8801712345678)'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabase = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Check if profile exists, create if not
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!existingProfile) {
      // Create profile first
      const { error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          phone_number: cleanNumber,
          otp_code: otp,
          otp_expires_at: expiresAt.toISOString(),
          phone_verified: false
        });

      if (createError) {
        console.error('Failed to create profile:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Update existing profile with OTP
      const { error: dbError } = await supabaseAdmin
        .from('profiles')
        .update({
          otp_code: otp,
          otp_expires_at: expiresAt.toISOString(),
          phone_number: cleanNumber
        })
        .eq('id', user.id);

      if (dbError) {
        console.error('Database error:', dbError);
        return new Response(
          JSON.stringify({ error: 'Failed to save OTP' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get admin SMS config
    const { data: config, error: configError } = await supabaseAdmin
      .from('admin_config')
      .select('*')
      .single();

    if (configError) {
      console.error('Config error:', configError);
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!config.system_sms_enabled) {
      return new Response(
        JSON.stringify({ error: 'System SMS is not enabled. Please contact administrator.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      return new Response(
        JSON.stringify({ error: 'SMS gateway endpoint not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const message = `Your verification code is: ${otp}. Valid for 10 minutes.`;

    // Build parameters
    const params: Record<string, string> = {
      [phoneParam]: cleanNumber,
      [messageParam]: message,
    };

    if (apiKey) {
      params[apiKeyParam] = apiKey;
    }

    if (senderId) {
      params[senderIdParam] = senderId;
    }

    Object.assign(params, additionalParams);

    console.log('[SEND-OTP] Sending SMS via admin-configured gateway');

    // Make request based on gateway type
    const url = gatewayType === 'get'
      ? `${endpoint}?${new URLSearchParams(params)}`
      : endpoint;

    const smsResponse = await fetch(url, {
      method: gatewayType.toUpperCase(),
      headers: gatewayType === 'post' ? { 'Content-Type': 'application/json' } : {},
      body: gatewayType === 'post' ? JSON.stringify(params) : undefined,
    });

    const smsResult = await smsResponse.text();
    console.log('SMS sent:', smsResult);

    const success = successResponse ? smsResult.includes(successResponse) : smsResponse.ok;

    if (!success) {
      return new Response(
        JSON.stringify({ error: 'Failed to send SMS', details: smsResult.substring(0, 200) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'OTP sent successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-otp:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
