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

    const {
      storeId,
      conversationId,
      conversationType,
      customerName,
      customerPhone,
      customerPlatformId,
      items,
      subtotal,
      shippingCharge,
      discountAmount,
      discountDetails,
      total,
      paymentType,
      advanceAmount,
      dueAmount,
      shippingAddress
    } = await req.json();

    console.log('Creating invoice:', { storeId, conversationId, paymentType, discountAmount });

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('chat_invoices')
      .insert({
        store_id: storeId,
        conversation_id: conversationId,
        conversation_type: conversationType,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_platform: conversationType,
        customer_platform_id: customerPlatformId,
        items,
        subtotal,
        shipping_charge: shippingCharge,
        discount_amount: discountAmount || 0,
        total_amount: total,
        payment_type: paymentType,
        advance_amount: advanceAmount || 0,
        due_amount: dueAmount || 0,
        shipping_address: { ...shippingAddress, discount_details: discountDetails },
        status: 'pending'
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Get store info
    const { data: store } = await supabase
      .from('stores')
      .select('name, currency, slug')
      .eq('id', storeId)
      .single();

    // Get admin config for app domain
    const { data: adminConfig } = await supabase
      .from('admin_config')
      .select('app_domain, site_url')
      .limit(1)
      .single();

    // Build invoice URL using admin configured domain
    let baseUrl = 'https://smecube.app'; // Default fallback
    if (adminConfig?.app_domain) {
      baseUrl = adminConfig.app_domain.startsWith('http') 
        ? adminConfig.app_domain 
        : `https://${adminConfig.app_domain}`;
    } else if (adminConfig?.site_url) {
      baseUrl = adminConfig.site_url;
    }
    baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    
    const invoiceUrl = `${baseUrl}/invoice/${invoice.id}/pay`;

    // Create invoice message
    let messageText = `📄 *Invoice from ${store?.name || 'Store'}*\n\n`;
    messageText += `🛍️ *Items:*\n`;
    items.forEach((item: any) => {
      messageText += `• ${item.name} (${item.quantity}x) - ${store?.currency || 'BDT'} ${item.price * item.quantity}\n`;
    });
    
    if (discountAmount && discountAmount > 0) {
      messageText += `\n💵 *Subtotal:* ${store?.currency || 'BDT'} ${subtotal}`;
      messageText += `\n🎁 *Discount:* -${store?.currency || 'BDT'} ${discountAmount}`;
      if (discountDetails?.coupon_code) {
        messageText += ` (${discountDetails.coupon_code})`;
      }
    }
    
    messageText += `\n💰 *Total:* ${store?.currency || 'BDT'} ${total}\n`;

    if (paymentType === 'full_cod') {
      messageText += `\n✅ Payment on Delivery`;
    } else if (paymentType === 'partial_payment') {
      messageText += `\n💳 Pay Advance: ${store?.currency || 'BDT'} ${advanceAmount}`;
      messageText += `\n📦 Due on Delivery: ${store?.currency || 'BDT'} ${dueAmount}`;
      messageText += `\n\n👉 Pay Now: ${invoiceUrl}`;
    } else if (paymentType === 'full_payment') {
      messageText += `\n\n👉 Pay Now: ${invoiceUrl}`;
    }

    // Send message based on platform
    if (conversationType === 'facebook') {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('page_id, facebook_pages(page_access_token)')
        .eq('id', conversationId)
        .single();

      if (conversation && conversation.facebook_pages) {
        const pageAccessToken = (conversation.facebook_pages as any).page_access_token;

        const messageData = {
          recipient: { id: customerPlatformId },
          message: { text: messageText }
        };

        await fetch(
          `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messageData)
          }
        );
      }
    } else if (conversationType === 'instagram') {
      const { data: conversation } = await supabase
        .from('instagram_conversations')
        .select('instagram_account_id, instagram_accounts(access_token)')
        .eq('id', conversationId)
        .single();

      if (conversation && conversation.instagram_accounts) {
        const accessToken = (conversation.instagram_accounts as any).access_token;

        const messageData = {
          recipient: { id: customerPlatformId },
          message: { text: messageText }
        };

        await fetch(
          `https://graph.facebook.com/v21.0/me/messages?access_token=${accessToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messageData)
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, invoiceId: invoice.id, invoiceUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});