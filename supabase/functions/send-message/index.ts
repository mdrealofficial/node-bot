import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { pageAccessToken, recipientPsid, messageText, conversationId, attachmentUrl, attachmentType, messageTag, productCards } = await req.json();

    if (!pageAccessToken || !recipientPsid || !conversationId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!messageText && !attachmentUrl && !productCards) {
      return new Response(
        JSON.stringify({ error: "Either messageText, attachmentUrl, or productCards is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check and consume quota
    const { data: quotaCheck, error: quotaError } = await supabase
      .rpc('check_and_consume_quota', {
        p_user_id: user.id,
        p_quota_amount: 1,
        p_action_type: 'message_sent',
        p_platform: 'facebook'
      });

    if (quotaError) {
      console.error('Quota check error:', quotaError);
      return new Response(
        JSON.stringify({ error: 'Failed to check message quota' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!quotaCheck.success) {
      console.log('Quota exceeded:', quotaCheck);
      return new Response(
        JSON.stringify({ 
          error: quotaCheck.error === 'quota_exceeded' ? 'Monthly message quota exceeded' : quotaCheck.message,
          errorCode: 'QUOTA_EXCEEDED',
          details: quotaCheck
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Quota check passed. Remaining: ${quotaCheck.remaining}`);

    // Check 24-hour messaging window (only if no message tag is provided)
    if (!messageTag) {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('last_message_at')
        .eq('id', conversationId)
        .single();

      if (conversation) {
        const lastMessageTime = new Date(conversation.last_message_at);
        const now = new Date();
        const hoursSinceLastMessage = (now.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastMessage > 24) {
          console.log(`Message blocked: ${hoursSinceLastMessage.toFixed(1)} hours since last message (24h window expired)`);
          return new Response(
            JSON.stringify({ 
              error: "Cannot send message: 24-hour messaging window has expired. Use a message template with an appropriate tag.",
              errorCode: "MESSAGING_WINDOW_EXPIRED",
              hoursSinceLastMessage: Math.floor(hoursSinceLastMessage)
            }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } else {
      console.log(`Sending message with tag: ${messageTag}`);
    }

    console.log(`Sending message to ${recipientPsid}${messageTag ? ` with tag: ${messageTag}` : ''}`);

    let messageData: any;
    
    if (productCards && productCards.length > 0) {
      // Send product carousel
      messageData = {
        recipient: { id: recipientPsid },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: productCards.slice(0, 10), // Facebook allows max 10 cards
            },
          },
        },
      };
    } else if (attachmentUrl) {
      // Send attachment
      const attachmentPayload: any = {
        url: attachmentUrl,
      };

      // Determine attachment type
      let type = 'file';
      if (attachmentType?.startsWith('image/')) {
        type = 'image';
      } else if (attachmentType?.startsWith('video/')) {
        type = 'video';
      } else if (attachmentType?.startsWith('audio/') || attachmentType === 'audio') {
        type = 'audio';
      } else if (attachmentType === 'application/pdf') {
        type = 'file';
      }

      messageData = {
        recipient: { id: recipientPsid },
        message: {
          attachment: {
            type,
            payload: attachmentPayload,
          },
        },
      };

      // Add text as separate message if provided
      if (messageText) {
        messageData.message.text = messageText;
      }
    } else {
      // Send text message
      messageData = {
        recipient: { id: recipientPsid },
        message: { text: messageText },
      };
    }

    // Add messaging tag if provided
    if (messageTag) {
      messageData.messaging_type = "MESSAGE_TAG";
      messageData.tag = messageTag;
    }

    const response = await fetch(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messageData),
      }
    );

    const result = await response.json();

    if (!response.ok || result.error) {
      console.error("Facebook API error:", result.error);
      
      // Handle specific Facebook errors
      if (result.error?.code === 10 || result.error?.error_subcode === 2018278) {
        const errorMessage = messageTag 
          ? "Message tag rejected: Your Facebook page may not have permission to use message tags outside the 24-hour window. Contact Facebook support or wait for the user to message you."
          : "24-hour messaging window expired. The user must message you first, or use a message tag if your page has permission.";
        
        return new Response(
          JSON.stringify({ 
            error: errorMessage,
            errorCode: "MESSAGING_WINDOW_EXPIRED",
            messageTagUsed: !!messageTag,
            facebookError: result.error
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(result.error?.message || "Failed to send message");
    }

    console.log("Message sent successfully:", result);

    // Store message in database
    const messageToStore = productCards && productCards.length > 0 
      ? `🛍️ Sent ${productCards.length} product card(s)`
      : (messageText || '');
    
    const { error: insertError } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "user",
      message_text: messageToStore,
      facebook_message_id: result.message_id,
      status: "delivered",
      attachment_url: attachmentUrl || null,
      attachment_type: attachmentType || null,
    });

    if (insertError) {
      console.error("Error storing message:", insertError);
    }

    // Update conversation
    const lastMessageText = productCards && productCards.length > 0
      ? `🛍️ Sent ${productCards.length} product(s)`
      : (messageText || (attachmentUrl ? '📎 Attachment' : ''));
      
    const { error: updateError } = await supabase
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_text: lastMessageText,
      })
      .eq("id", conversationId);

    if (updateError) {
      console.error("Error updating conversation:", updateError);
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.message_id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in send-message function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});