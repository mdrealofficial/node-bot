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
      origin // Origin passed from frontend
    } = await req.json();

    console.log('Sending address request:', { conversationId, conversationType, storeId, origin });

    // Get store configuration for custom text
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('slug, address_request_instruction, address_request_button_text')
      .eq('id', storeId)
      .single();

    console.log('Store query result:', { store, storeError });

    if (!store || storeError) {
      console.error('Store not found or error:', storeError);
      throw new Error('Store not found');
    }

    const instructionText = store.address_request_instruction || 'Please enter your delivery address to complete your order.';
    const buttonText = store.address_request_button_text || 'Enter Shipping Address';

    // Use the origin passed from frontend (preserves dev/prod/custom domain)
    // Fallback to admin config only if origin not provided
    let baseUrl = origin;
    
    if (!baseUrl) {
      // Get admin config for app domain as fallback
      const { data: adminConfig } = await supabase
        .from('admin_config')
        .select('app_domain, site_url')
        .limit(1)
        .single();

      if (adminConfig?.app_domain) {
        baseUrl = adminConfig.app_domain.startsWith('http') 
          ? adminConfig.app_domain 
          : `https://${adminConfig.app_domain}`;
      } else if (adminConfig?.site_url) {
        baseUrl = adminConfig.site_url;
      } else {
        baseUrl = 'https://smecube.app';
      }
    }
    
    // Remove trailing slash if present
    baseUrl = baseUrl.replace(/\/$/, '');
    
    // Build correct URL path: /store/{slug}/address-form (matches route in App.tsx)
    const addressUrl = `${baseUrl}/store/${store.slug}/address-form?conv=${conversationId}&platform=${conversationType}&pid=${customerPlatformId}&store=${store.slug}`;

    console.log('Address URL:', addressUrl);

    // Send message based on platform
    if (conversationType === 'facebook') {
      // Get conversation and page info
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('page_id')
        .eq('id', conversationId)
        .single();

      console.log('Conversation query result:', { conversation, convError });

      if (convError || !conversation?.page_id) {
        console.error('Conversation error:', convError);
        console.error('Conversation data:', conversation);
        throw new Error('Facebook conversation not found');
      }

      const { data: page, error: pageError } = await supabase
        .from('facebook_pages')
        .select('page_access_token')
        .eq('id', conversation.page_id)
        .single();

      console.log('Page query result:', { page, pageError, pageId: conversation.page_id });

      if (pageError || !page) {
        console.error('Page error details:', { pageError, page, pageId: conversation.page_id });
        throw new Error('Facebook page not found');
      }

      const pageAccessToken = page.page_access_token;

      // Send button message
      const messageData = {
        recipient: { id: customerPlatformId },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'button',
              text: instructionText,
              buttons: [{
                type: 'web_url',
                url: addressUrl,
                title: buttonText
              }]
            }
          }
        }
      };

      const response = await fetch(
        `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messageData)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Facebook API error: ${JSON.stringify(error)}`);
      }
    } else if (conversationType === 'instagram') {
      // Get Instagram conversation and account
      const { data: conversation, error: convError } = await supabase
        .from('instagram_conversations')
        .select('instagram_account_id')
        .eq('id', conversationId)
        .single();

      if (convError || !conversation?.instagram_account_id) {
        console.error('Instagram conversation error:', convError);
        throw new Error('Instagram conversation not found');
      }

      const { data: account, error: accountError } = await supabase
        .from('instagram_accounts')
        .select('access_token')
        .eq('id', conversation.instagram_account_id)
        .single();

      if (accountError || !account) {
        console.error('Instagram account error:', accountError);
        throw new Error('Instagram account not found');
      }

      const accessToken = account.access_token;

      // Instagram doesn't support button templates in the same way, send as text with link
      const messageText = `${instructionText}\n\n👉 ${buttonText}: ${addressUrl}`;

      const messageData = {
        recipient: { id: customerPlatformId },
        message: { text: messageText }
      };

      const response = await fetch(
        `https://graph.facebook.com/v21.0/me/messages?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messageData)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Instagram API error: ${JSON.stringify(error)}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-address-request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
