import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BKashConfig {
  app_key: string;
  app_secret: string;
  username: string;
  password: string;
  sandbox_mode: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, storeId, orderId, amount, paymentId } = await req.json();

    // Get store's bKash configuration
    const { data: store, error: storeError } = await supabaseClient
      .from('stores')
      .select('bkash_app_key, bkash_app_secret, bkash_app_username, bkash_app_password, bkash_sandbox_mode')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      console.error('Store not found or error:', storeError);
      return new Response(
        JSON.stringify({ error: 'Store configuration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!store.bkash_app_key || !store.bkash_app_secret || !store.bkash_app_username || !store.bkash_app_password) {
      console.error('bKash credentials not configured for store');
      return new Response(
        JSON.stringify({ error: 'bKash payment gateway not configured. Please configure in Payment Settings.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config: BKashConfig = {
      app_key: store.bkash_app_key,
      app_secret: store.bkash_app_secret,
      username: store.bkash_app_username,
      password: store.bkash_app_password,
      sandbox_mode: store.bkash_sandbox_mode ?? false,
    };

    const baseUrl = config.sandbox_mode
      ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
      : 'https://tokenized.pay.bka.sh/v1.2.0-beta';

    console.log('Processing bKash action:', action, 'Sandbox mode:', config.sandbox_mode);

    // Get Grant Token
    const getGrantToken = async (): Promise<string> => {
      const response = await fetch(`${baseUrl}/tokenized/checkout/token/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'username': config.username,
          'password': config.password,
        },
        body: JSON.stringify({
          app_key: config.app_key,
          app_secret: config.app_secret,
        }),
      });

      const data = await response.json();
      console.log('Grant token response:', data);

      if (!response.ok || !data.id_token) {
        throw new Error(data.statusMessage || 'Failed to get grant token');
      }

      return data.id_token;
    };

    switch (action) {
      case 'create_payment': {
        const token = await getGrantToken();

        // Get order details
        const { data: order } = await supabaseClient
          .from('orders')
          .select('total_amount, customer_name, customer_email')
          .eq('id', orderId)
          .single();

        if (!order) {
          throw new Error('Order not found');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const callbackURL = `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/payment/callback`;
        
        const createPaymentResponse = await fetch(`${baseUrl}/tokenized/checkout/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
            'X-APP-Key': config.app_key,
          },
          body: JSON.stringify({
            mode: '0011',
            payerReference: orderId,
            callbackURL,
            amount: order.total_amount.toString(),
            currency: 'BDT',
            intent: 'sale',
            merchantInvoiceNumber: `INV-${orderId.substring(0, 8)}`,
          }),
        });

        const paymentData = await createPaymentResponse.json();
        console.log('Create payment response:', paymentData);

        if (!createPaymentResponse.ok || !paymentData.paymentID) {
          throw new Error(paymentData.statusMessage || 'Failed to create payment');
        }

        return new Response(
          JSON.stringify({
            success: true,
            paymentId: paymentData.paymentID,
            bkashURL: paymentData.bkashURL,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'execute_payment': {
        const token = await getGrantToken();

        const executeResponse = await fetch(`${baseUrl}/tokenized/checkout/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
            'X-APP-Key': config.app_key,
          },
          body: JSON.stringify({
            paymentID: paymentId,
          }),
        });

        const executeData = await executeResponse.json();
        console.log('Execute payment response:', executeData);

        if (!executeResponse.ok || executeData.statusCode !== '0000') {
          throw new Error(executeData.statusMessage || 'Payment execution failed');
        }

        // Update order status to paid
        const { data: updatedOrder, error: updateError } = await supabaseClient
          .from('orders')
          .update({
            status: 'paid',
            paid_amount: parseFloat(executeData.amount),
            stripe_payment_id: executeData.trxID, // Store transaction ID
            payment_method: 'bkash',
          })
          .eq('id', orderId)
          .select('store_id')
          .single();

        if (updateError) {
          console.error('Error updating order:', updateError);
        }

        // Record transaction in payment_transactions table
        if (updatedOrder) {
          await supabaseClient
            .from('payment_transactions')
            .insert({
              order_id: orderId,
              store_id: updatedOrder.store_id,
              transaction_type: 'payment',
              amount: parseFloat(executeData.amount),
              payment_method: 'bkash',
              payment_id: executeData.trxID,
              status: 'success',
              metadata: {
                customer_msisdn: executeData.customerMsisdn,
                transaction_status: executeData.transactionStatus,
              },
            });
        }

        return new Response(
          JSON.stringify({
            success: true,
            transactionId: executeData.trxID,
            amount: executeData.amount,
            customerMsisdn: executeData.customerMsisdn,
            transactionStatus: executeData.transactionStatus,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'query_payment': {
        const token = await getGrantToken();

        const queryResponse = await fetch(`${baseUrl}/tokenized/checkout/payment/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
            'X-APP-Key': config.app_key,
          },
          body: JSON.stringify({
            paymentID: paymentId,
          }),
        });

        const queryData = await queryResponse.json();
        console.log('Query payment response:', queryData);

        if (!queryResponse.ok) {
          throw new Error(queryData.statusMessage || 'Failed to query payment');
        }

        return new Response(
          JSON.stringify({
            success: true,
            transactionStatus: queryData.transactionStatus,
            amount: queryData.amount,
            transactionId: queryData.trxID,
            payerReference: queryData.payerReference,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'refund_payment': {
        const token = await getGrantToken();

        // First query the payment to get the transaction ID
        const queryResponse = await fetch(`${baseUrl}/tokenized/checkout/payment/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
            'X-APP-Key': config.app_key,
          },
          body: JSON.stringify({
            paymentID: paymentId,
          }),
        });

        const queryData = await queryResponse.json();
        console.log('Query payment for refund:', queryData);

        if (!queryResponse.ok || !queryData.trxID) {
          throw new Error('Unable to retrieve transaction ID for refund');
        }

        const refundResponse = await fetch(`${baseUrl}/tokenized/checkout/payment/refund`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
            'X-APP-Key': config.app_key,
          },
          body: JSON.stringify({
            paymentID: paymentId,
            amount: amount.toString(),
            trxID: queryData.trxID,
            sku: 'refund',
            reason: 'Customer request',
          }),
        });

        const refundData = await refundResponse.json();
        console.log('Refund payment response:', refundData);

        if (!refundResponse.ok || refundData.statusCode !== '0000') {
          throw new Error(refundData.statusMessage || 'Refund failed');
        }

        // Get order details for transaction logging
        const { data: order } = await supabaseClient
          .from('orders')
          .select('store_id')
          .eq('id', orderId)
          .single();

        // Record refund transaction
        if (order) {
          await supabaseClient
            .from('payment_transactions')
            .insert({
              order_id: orderId,
              store_id: order.store_id,
              transaction_type: 'refund',
              amount: parseFloat(refundData.amount),
              payment_method: 'bkash',
              payment_id: refundData.refundTrxID,
              status: 'success',
              metadata: {
                original_trx_id: queryData.trxID,
                transaction_status: refundData.transactionStatus,
              },
            });
        }

        return new Response(
          JSON.stringify({
            success: true,
            refundTrxId: refundData.refundTrxID,
            transactionStatus: refundData.transactionStatus,
            amount: refundData.amount,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in bkash-payment function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
