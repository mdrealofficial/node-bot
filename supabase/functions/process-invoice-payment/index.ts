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

    const { invoiceId, amount, customerName, customerPhone } = await req.json();

    console.log('Processing invoice payment:', { invoiceId, amount });

    // Get invoice
    const { data: invoice } = await supabase
      .from('chat_invoices')
      .select('*, stores(bkash_app_key, bkash_app_secret, bkash_app_username, bkash_app_password, bkash_sandbox_mode)')
      .eq('id', invoiceId)
      .single();

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const store = invoice.stores as any;

    // Check if bKash is configured
    if (!store.bkash_app_key || !store.bkash_app_secret) {
      throw new Error('Payment gateway not configured');
    }

    // Create bKash payment
    const bkashBaseUrl = store.bkash_sandbox_mode 
      ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
      : 'https://tokenized.pay.bka.sh/v1.2.0-beta';

    // Get bKash token
    const authResponse = await fetch(`${bkashBaseUrl}/tokenized/checkout/token/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'username': store.bkash_app_username,
        'password': store.bkash_app_password
      },
      body: JSON.stringify({
        app_key: store.bkash_app_key,
        app_secret: store.bkash_app_secret
      })
    });

    const authData = await authResponse.json();
    if (!authData.id_token) {
      throw new Error('Failed to get bKash token');
    }

    // Create payment
    const origin = Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.app') || 'https://chatbot-marketing-ai.lovable.app';
    const callbackUrl = `${origin}/invoice/${invoiceId}/success`;

    const createResponse = await fetch(`${bkashBaseUrl}/tokenized/checkout/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authData.id_token,
        'X-APP-Key': store.bkash_app_key
      },
      body: JSON.stringify({
        mode: '0011',
        payerReference: customerPhone || customerName,
        callbackURL: callbackUrl,
        amount: amount.toString(),
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: invoiceId
      })
    });

    const createData = await createResponse.json();
    
    if (!createData.bkashURL) {
      throw new Error('Failed to create payment');
    }

    // Update invoice with payment ID
    await supabase
      .from('chat_invoices')
      .update({
        payment_id: createData.paymentID
      })
      .eq('id', invoiceId);

    return new Response(
      JSON.stringify({ 
        success: true,
        paymentUrl: createData.bkashURL,
        paymentID: createData.paymentID
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error processing payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});