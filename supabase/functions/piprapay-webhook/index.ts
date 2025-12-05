import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, mh-piprapay-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[WEBHOOK] Received Piprapay webhook');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get Piprapay config to verify webhook
    const { data: config, error: configError } = await supabase
      .from('admin_config')
      .select('piprapay_api_key')
      .maybeSingle();

    if (configError || !config?.piprapay_api_key) {
      console.error('[WEBHOOK] Piprapay not configured');
      return new Response(
        JSON.stringify({ status: false, message: 'Piprapay not configured' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify webhook authenticity using API key from header
    const receivedApiKey = req.headers.get('mh-piprapay-api-key') || 
                          req.headers.get('Mh-Piprapay-Api-Key') ||
                          req.headers.get('MH-PIPRAPAY-API-KEY');

    if (receivedApiKey !== config.piprapay_api_key) {
      console.error('[WEBHOOK] Unauthorized webhook request - API key mismatch');
      return new Response(
        JSON.stringify({ status: false, message: 'Unauthorized request' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse webhook payload
    const payload = await req.json();
    console.log('[WEBHOOK] Payload:', JSON.stringify(payload, null, 2));

    const {
      pp_id,
      customer_name,
      customer_email_mobile,
      payment_method,
      amount,
      fee,
      refund_amount,
      total,
      currency,
      status,
      date,
      metadata,
      sender_number,
      transaction_id,
    } = payload;

    if (!pp_id) {
      console.error('[WEBHOOK] Missing pp_id in webhook payload');
      return new Response(
        JSON.stringify({ status: false, message: 'Missing pp_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find existing transaction
    const { data: transaction, error: txError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('charge_id', pp_id)
      .maybeSingle();

    if (txError) {
      console.error('[WEBHOOK] Error fetching transaction:', txError);
    }

    if (!transaction) {
      console.log('[WEBHOOK] Transaction not found, creating new one');
      // Create transaction if not exists (in case webhook arrives before redirect)
      const { error: insertError } = await supabase
        .from('payment_transactions')
        .insert({
          charge_id: pp_id,
          amount: parseFloat(amount),
          payment_method: 'piprapay',
          transaction_type: 'subscription_payment',
          status: status === 'completed' ? 'completed' : 'pending',
          metadata: metadata || {},
        });

      if (insertError) {
        console.error('[WEBHOOK] Error creating transaction:', insertError);
      }
    } else {
      // Update transaction status
      console.log('[WEBHOOK] Updating transaction status');
      const { error: updateError } = await supabase
        .from('payment_transactions')
        .update({
          status: status === 'completed' ? 'completed' : 'failed',
          payment_id: transaction_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('charge_id', pp_id);

      if (updateError) {
        console.error('[WEBHOOK] Error updating transaction:', updateError);
      }

      // If payment is completed and it's a subscription, update user's subscription
      if (status === 'completed' && transaction.transaction_type === 'subscription_payment') {
        const txMetadata = transaction.metadata as any;
        const userId = txMetadata?.user_id;
        const planId = transaction.plan_id;

        if (userId && planId) {
          console.log('[WEBHOOK] Updating subscription for user:', userId);

          // Get plan details
          const { data: plan } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('id', planId)
            .maybeSingle();

          if (plan) {
            // Update subscription
            const { error: subError } = await supabase
              .from('subscriptions')
              .update({
                plan: plan.plan_name,
                replies_quota: plan.replies_quota,
                quota_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', userId);

            if (subError) {
              console.error('[WEBHOOK] Error updating subscription:', subError);
            } else {
              console.log('[WEBHOOK] Subscription updated successfully');
            }
          }
        }
      }
    }

    // Return success response to Piprapay
    return new Response(
      JSON.stringify({ status: true, message: 'Webhook received' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[WEBHOOK] Error processing webhook:', error);
    return new Response(
      JSON.stringify({ status: false, message: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
