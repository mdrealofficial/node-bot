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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { conversationId, subscriberPsid, pageId, platform = 'facebook' } = await req.json();

    console.log("Fetching message history for conversation:", conversationId, "Platform:", platform);

    let accessToken: string;
    let accountId: string;

    if (platform === 'instagram') {
      // Get Instagram account data
      const { data: instagramData, error: instagramError } = await supabaseClient
        .from("instagram_accounts")
        .select("access_token, instagram_account_id")
        .eq("id", pageId)
        .eq("user_id", user.id)
        .single();

      if (instagramError || !instagramData) {
        return new Response(
          JSON.stringify({ error: "Instagram account not found or access denied" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      accessToken = instagramData.access_token;
      accountId = instagramData.instagram_account_id;
    } else {
      // Get Facebook page data
      const { data: pageData, error: pageError } = await supabaseClient
        .from("facebook_pages")
        .select("page_access_token, page_id")
        .eq("id", pageId)
        .eq("user_id", user.id)
        .single();

      if (pageError || !pageData) {
        return new Response(
          JSON.stringify({ error: "Page not found or access denied" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      accessToken = pageData.page_access_token;
      accountId = pageData.page_id;
    }

    let threadId: string;
    let messagesData: any;

    if (platform === 'instagram') {
      // For Instagram, use the direct messaging API
      console.log("Fetching Instagram messages for subscriber:", subscriberPsid);
      
      // Instagram doesn't have a conversation lookup API like Facebook
      // We'll directly try to fetch messages - Instagram API is simpler
      return new Response(
        JSON.stringify({ 
          messagesCount: 0, 
          message: "Instagram message history fetching is not yet supported through the API. Messages are captured in real-time through webhooks." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // First, find the conversation thread between the page and subscriber
      const conversationsUrl = `https://graph.facebook.com/v18.0/${accountId}/conversations?fields=id,participants&user_id=${subscriberPsid}&access_token=${accessToken}`;
      const conversationsResponse = await fetch(conversationsUrl);
      const conversationsData = await conversationsResponse.json();

      if (conversationsData.error) {
        console.error("Facebook API error:", conversationsData.error);
        throw new Error(`Facebook API error: ${conversationsData.error.message}`);
      }

      if (!conversationsData.data || conversationsData.data.length === 0) {
        console.log("No conversation found for this subscriber");
        return new Response(
          JSON.stringify({ messagesCount: 0, message: "No conversation history found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      threadId = conversationsData.data[0].id;
      console.log("Found conversation thread:", threadId);

      // Fetch messages from the conversation thread
      const messagesUrl = `https://graph.facebook.com/v18.0/${threadId}/messages?fields=id,created_time,from,to,message&limit=50&access_token=${accessToken}`;
      const messagesResponse = await fetch(messagesUrl);
      messagesData = await messagesResponse.json();
    }

    if (messagesData.error) {
      console.error("Facebook API error:", messagesData.error);
      throw new Error(`Facebook API error: ${messagesData.error.message}`);
    }

    const messages = [];
    const existingMessageIds = new Set();

    // Get existing messages to avoid duplicates
    const messageTable = platform === 'instagram' ? 'instagram_messages' : 'messages';
    const messageIdField = platform === 'instagram' ? 'instagram_message_id' : 'facebook_message_id';
    
    const { data: existingMessages } = await supabaseClient
      .from(messageTable)
      .select(messageIdField)
      .eq("conversation_id", conversationId)
      .not(messageIdField, "is", null);

    if (existingMessages) {
      existingMessages.forEach((msg: any) => {
        const msgId = platform === 'instagram' ? msg.instagram_message_id : msg.facebook_message_id;
        if (msgId) {
          existingMessageIds.add(msgId);
        }
      });
    }

    // Process messages from Facebook
    for (const fbMessage of messagesData.data || []) {
      // Skip if already exists
      if (existingMessageIds.has(fbMessage.id)) {
        continue;
      }

      // Determine sender type based on from.id matching subscriber PSID
      const senderType = fbMessage.from?.id === subscriberPsid ? "subscriber" : "user";
      
      messages.push({
        conversation_id: conversationId,
        facebook_message_id: fbMessage.id,
        sender_type: senderType,
        message_text: fbMessage.message || "",
        sent_at: fbMessage.created_time,
        status: "read",
      });
    }

    console.log(`Found ${messages.length} new historical messages`);

    // Insert messages into database
    if (messages.length > 0) {
      const { error: insertError } = await supabaseClient
        .from("messages")
        .insert(messages);

      if (insertError) {
        console.error("Error inserting messages:", insertError);
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        messagesCount: messages.length,
        message: `Loaded ${messages.length} historical messages`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Fetch message history error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
