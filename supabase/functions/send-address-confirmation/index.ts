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
      conversationId,
      conversationType,
      customerPlatformId,
      storeId,
      customerName,
      customerPhone,
      addressData
    } = await req.json();

    console.log('Sending address confirmation:', { conversationId, conversationType, storeId });

    // Get store info including custom confirmation message
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('name, user_id, address_confirmation_message')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      throw new Error('Store not found');
    }

    // Format address nicely
    const formatAddress = (addr: any) => {
      const parts: string[] = [];
      
      if (addr.delivery_location === 'inside_dhaka') {
        parts.push('📍 Inside Dhaka');
        if (addr.city_corporation) parts.push(`🏢 ${addr.city_corporation.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}`);
        if (addr.area) parts.push(`📌 ${addr.area}`);
        if (addr.sub_area) parts.push(`   └ ${addr.sub_area}`);
      } else {
        parts.push('📍 Outside Dhaka');
        if (addr.district) parts.push(`🏛️ District: ${addr.district}`);
        if (addr.upazila) parts.push(`📌 Upazila: ${addr.upazila}`);
      }
      
      if (addr.street_address) parts.push(`🏠 ${addr.street_address}`);
      
      return parts.join('\n');
    };

    const formattedAddress = formatAddress(addressData);

    // Use custom confirmation message or default with all variables
    const defaultMessage = 'Your delivery address has been saved!\n\n👤 {customer_name}\n📞 {phone}\n\n{address}\n\nThank you! Your seller will process your order soon.';
    let customerMessage = store.address_confirmation_message || defaultMessage;
    
    // Replace variables in the message
    customerMessage = customerMessage
      .replace(/{customer_name}/g, customerName || 'Customer')
      .replace(/{phone}/g, customerPhone || 'N/A')
      .replace(/{address}/g, formattedAddress);
    
    // Add checkmark emoji at start if not present
    if (!customerMessage.startsWith('✅')) {
      customerMessage = '✅ ' + customerMessage;
    }

    // Message for seller (notification) - includes all customer details
    const sellerMessage = `📬 Customer submitted delivery address!\n\n👤 ${customerName}\n📞 ${customerPhone}\n\n${formattedAddress}`;

    // Send confirmation to customer
    if (conversationType === 'facebook') {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('page_id')
        .eq('id', conversationId)
        .single();

      if (!conversation?.page_id) {
        throw new Error('Facebook conversation not found');
      }

      const { data: page } = await supabase
        .from('facebook_pages')
        .select('page_access_token')
        .eq('id', conversation.page_id)
        .single();

      if (!page?.page_access_token) {
        throw new Error('Facebook page not found');
      }

      // Send to customer
      await fetch(
        `https://graph.facebook.com/v21.0/me/messages?access_token=${page.page_access_token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: customerPlatformId },
            message: { text: customerMessage }
          })
        }
      );

      // Store message in database for seller to see (as user message so it appears as incoming)
      const { data: convData } = await supabase
        .from('conversations')
        .select('subscriber_id')
        .eq('id', conversationId)
        .single();

      if (convData?.subscriber_id) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          message_text: sellerMessage,
          sender_type: 'user', // Show as incoming message for seller notification
          sent_at: new Date().toISOString()
        });

        // Get current unread count and increment
        const { data: currentConv } = await supabase
          .from('conversations')
          .select('unread_count')
          .eq('id', conversationId)
          .single();

        // Update conversation last message and increment unread
        await supabase
          .from('conversations')
          .update({
            last_message_text: sellerMessage,
            last_message_at: new Date().toISOString(),
            unread_count: (currentConv?.unread_count || 0) + 1
          })
          .eq('id', conversationId);
      }

    } else if (conversationType === 'instagram') {
      const { data: conversation } = await supabase
        .from('instagram_conversations')
        .select('instagram_account_id, subscriber_id')
        .eq('id', conversationId)
        .single();

      if (!conversation?.instagram_account_id) {
        throw new Error('Instagram conversation not found');
      }

      const { data: account } = await supabase
        .from('instagram_accounts')
        .select('access_token')
        .eq('id', conversation.instagram_account_id)
        .single();

      if (!account?.access_token) {
        throw new Error('Instagram account not found');
      }

      // Send to customer
      await fetch(
        `https://graph.facebook.com/v21.0/me/messages?access_token=${account.access_token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: customerPlatformId },
            message: { text: customerMessage }
          })
        }
      );

      // Store message in database for seller to see (as user message for notification)
      await supabase.from('instagram_messages').insert({
        conversation_id: conversationId,
        message_text: sellerMessage,
        sender_type: 'user', // Show as incoming message for seller notification
        sent_at: new Date().toISOString()
      });

      // Update conversation last message and unread count
      const { data: convData } = await supabase
        .from('instagram_conversations')
        .select('unread_count')
        .eq('id', conversationId)
        .single();
      
      await supabase
        .from('instagram_conversations')
        .update({
          last_message_text: sellerMessage,
          last_message_at: new Date().toISOString(),
          unread_count: (convData?.unread_count || 0) + 1
        })
        .eq('id', conversationId);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-address-confirmation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});