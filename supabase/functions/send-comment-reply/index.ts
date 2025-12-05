import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { commentId, replyMessage, action, pageId, commenterPsid, commenterName } = await req.json();
    
    console.log('[COMMENT-REPLY] Processing:', { commentId, action, pageId });

    // Get page access token
    const { data: page, error: pageError } = await supabase
      .from('facebook_pages')
      .select('page_access_token, user_id')
      .eq('id', pageId)
      .single();

    if (pageError || !page) {
      throw new Error('Page not found');
    }

    const accessToken = page.page_access_token;
    let result;

    if (action === 'reply') {
      // Process template variables in reply message
      let processedMessage = replyMessage;
      
      // Split name into first and last name
      let firstName = '';
      let lastName = '';
      if (commenterName) {
        const nameParts = commenterName.trim().split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }
      
      console.log('[COMMENT-REPLY] Original message:', replyMessage);
      console.log('[COMMENT-REPLY] Commenter PSID:', commenterPsid);
      console.log('[COMMENT-REPLY] Commenter Name:', commenterName);
      
      // Replace @{user} with @[PSID] mention format
      if (processedMessage.includes('@{user}') && commenterPsid) {
        processedMessage = processedMessage.replace(/@\{user\}/g, `@[${commenterPsid}]`);
        console.log('[COMMENT-REPLY] Replaced @{user} with mention format');
      }
      
      // Replace {name} with commenter full name (backward compatibility)
      if (processedMessage.includes('{name}') && commenterName) {
        processedMessage = processedMessage.replace(/\{name\}/g, commenterName);
      }

      // Replace {first_name} with first name
      if (processedMessage.includes('{first_name}') && firstName) {
        processedMessage = processedMessage.replace(/\{first_name\}/g, firstName);
      }

      // Replace {last_name} with last name
      if (processedMessage.includes('{last_name}') && lastName) {
        processedMessage = processedMessage.replace(/\{last_name\}/g, lastName);
      }
      
      console.log('[COMMENT-REPLY] Processed message:', processedMessage);
      
      // Reply to comment
      const url = `https://graph.facebook.com/v21.0/${commentId}/comments`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: processedMessage,
          access_token: accessToken,
        }),
      });

      result = await response.json();
      console.log('[COMMENT-REPLY] Reply result:', result);

      if (result.error) {
        console.error('[COMMENT-REPLY] Error:', result.error);
        throw new Error(result.error.message);
      }
    } else if (action === 'hide') {
      // Hide comment
      const url = `https://graph.facebook.com/v21.0/${commentId}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_hidden: true,
          access_token: accessToken,
        }),
      });

      result = await response.json();
      console.log('[COMMENT-REPLY] Hide result:', result);

      if (result.error) {
        throw new Error(result.error.message);
      }
    } else if (action === 'delete') {
      // Delete comment
      const url = `https://graph.facebook.com/v21.0/${commentId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
        }),
      });

      result = await response.json();
      console.log('[COMMENT-REPLY] Delete result:', result);

      if (result.error) {
        throw new Error(result.error.message);
      }
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[COMMENT-REPLY] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
