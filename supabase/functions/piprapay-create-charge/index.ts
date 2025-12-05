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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { planId, topupPackageId, userId, returnUrl, callbackOrigin, isTopup } = await req.json();

    // Get Piprapay config
    const { data: config, error: configError } = await supabase
      .from('admin_config')
      .select('piprapay_base_url, piprapay_api_key')
      .single();

    if (configError || !config?.piprapay_base_url || !config?.piprapay_api_key) {
      throw new Error('Piprapay not configured. Please configure Base URL and API Key in admin settings.');
    }

    let itemDetails: any;
    let transactionType: string;
    let itemId: string;

    if (isTopup) {
      // Get topup package details
      const { data: topup, error: topupError } = await supabase
        .from('quota_topup_packages')
        .select('*')
        .eq('id', topupPackageId)
        .single();

      if (topupError || !topup) {
        throw new Error('Topup package not found');
      }

      itemDetails = {
        price: topup.price,
        name: topup.name,
        credits: topup.credits
      };
      transactionType = 'topup_purchase';
      itemId = topupPackageId;
    } else {
      // Get plan details
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError || !plan) {
        throw new Error('Plan not found');
      }

      itemDetails = {
        price: plan.monthly_price,
        name: plan.plan_name,
        replies_quota: plan.replies_quota
      };
      transactionType = 'subscription_payment';
      itemId = planId;
    }

    // Get user details
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('User not found');
    }

    // Get user's store (if exists)
    const { data: storeData } = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    // Determine frontend base URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const rawFrontendBaseUrl = callbackOrigin || supabaseUrl.replace('.supabase.co', '.lovable.app');
    const frontendBaseUrl = rawFrontendBaseUrl.replace(/\/+$/, '');
    
    // Construct redirect and cancel URLs - redirect to subscription page for inline processing
    const redirectUrl = `${frontendBaseUrl}/dashboard?tab=subscription&paymentStatus=processing&gateway=piprapay`;
    const cancelUrl = `${frontendBaseUrl}/dashboard?tab=subscription&paymentStatus=cancel`;
    
    // Construct webhook URL
    const webhookUrl = `${supabaseUrl}/functions/v1/piprapay-webhook`;

    console.log('Creating Piprapay charge:', {
      endpoint: `${config.piprapay_base_url}/create-charge`,
      amount: itemDetails.price,
      item_name: itemDetails.name,
      currency: 'BDT',
      transaction_type: transactionType,
      user_id: userId,
    });

    // Prepare request body according to Piprapay API documentation
    const requestBody = {
      full_name: profile.full_name || 'Customer',
      email_mobile: profile.email,
      amount: itemDetails.price.toString(),
      redirect_url: redirectUrl,
      return_type: 'GET', // pp_id will be sent as query parameter
      cancel_url: cancelUrl,
      webhook_url: webhookUrl,
      currency: 'BDT',
      metadata: {
        user_id: userId,
        item_id: itemId,
        item_name: itemDetails.name,
        transaction_type: transactionType,
        ...(isTopup 
          ? { topup_package_id: topupPackageId, credits: itemDetails.credits } 
          : { plan_id: planId, replies_quota: itemDetails.replies_quota }
        ),
      },
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    // Call Piprapay Create Charge API
    const chargeResponse = await fetch(`${config.piprapay_base_url}/create-charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'mh-piprapay-api-key': config.piprapay_api_key,
      },
      body: JSON.stringify(requestBody),
    });

    if (!chargeResponse.ok) {
      const errorData = await chargeResponse.text();
      console.error('Piprapay API error:', {
        status: chargeResponse.status,
        statusText: chargeResponse.statusText,
        body: errorData,
        url: `${config.piprapay_base_url}/create-charge`,
      });
      
      throw new Error(`Piprapay API error (${chargeResponse.status}): ${errorData.substring(0, 200)}`);
    }

    const chargeData = await chargeResponse.json();
    console.log('Charge created successfully:', chargeData);

    // Extract payment URL and pp_id from response
    const paymentUrl = chargeData.pp_url;
    const ppId = chargeData.pp_id;

    if (!paymentUrl) {
      throw new Error('No payment URL received from Piprapay');
    }

    // Store transaction record with user_id column set directly
    const transactionData: any = {
      charge_id: ppId,
      user_id: userId, // Set user_id column directly
      amount: itemDetails.price,
      payment_method: 'piprapay',
      transaction_type: isTopup ? 'topup_purchase' : 'subscription_payment',
      status: 'pending',
      metadata: {
        user_id: userId,
        item_name: itemDetails.name,
        transaction_type: transactionType,
        ...(isTopup 
          ? { topup_package_id: topupPackageId, credits: itemDetails.credits } 
          : { plan_name: itemDetails.name, plan_id: planId, replies_quota: itemDetails.replies_quota }
        ),
      },
    };

    // Add plan_id for subscription transactions
    if (!isTopup) {
      transactionData.plan_id = planId;
    }

    // Only add store_id if user has a store
    if (storeData?.id) {
      transactionData.store_id = storeData.id;
    }

    const { error: transactionError } = await supabase
      .from('payment_transactions')
      .insert(transactionData);

    if (transactionError) {
      console.error('Transaction insert error:', transactionError);
      throw new Error(`Failed to create transaction record: ${transactionError.message}`);
    }
    console.log('Transaction created successfully with user_id:', userId);

    return new Response(
      JSON.stringify({
        success: true,
        payment_url: paymentUrl,
        pp_id: ppId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
