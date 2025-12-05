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

    const { pageId } = await req.json();

    // Get page data
    const { data: pageData, error: pageError } = await supabaseClient
      .from("facebook_pages")
      .select("*")
      .eq("id", pageId)
      .eq("user_id", user.id)
      .single();

    if (pageError || !pageData) {
      return new Response(
        JSON.stringify({ error: "Page not found or access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Scanning subscribers for page:", pageData.page_name);

    // Fetch conversations from Facebook
    const conversationsUrl = `https://graph.facebook.com/v18.0/${pageData.page_id}/conversations?fields=participants,updated_time&access_token=${pageData.page_access_token}`;
    const conversationsResponse = await fetch(conversationsUrl);
    const conversationsData = await conversationsResponse.json();

    if (conversationsData.error) {
      console.error("Facebook API error:", conversationsData.error);
      throw new Error(`Facebook API error: ${conversationsData.error.message}. ${conversationsData.error.type === 'OAuthException' ? 'Please reconnect your Facebook page to update permissions.' : ''}`);
    }

    const subscribers = [];
    const seenPsids = new Set();

    // Process each conversation
    for (const conversation of conversationsData.data || []) {
      if (conversation.participants?.data) {
        for (const participant of conversation.participants.data) {
          const psid = participant.id;
          
          // Skip the page itself and duplicates
          if (psid === pageData.page_id || seenPsids.has(psid)) {
            continue;
          }
          
          seenPsids.add(psid);

          // Get participant details
          try {
            const userInfoUrl = `https://graph.facebook.com/v18.0/${psid}?fields=name,profile_pic&access_token=${pageData.page_access_token}`;
            const userInfoResponse = await fetch(userInfoUrl);
            const userInfo = await userInfoResponse.json();

            if (!userInfo.error) {
              subscribers.push({
                user_id: user.id,
                page_id: pageId,
                subscriber_psid: psid,
                subscriber_name: userInfo.name || "Unknown",
                profile_pic_url: userInfo.profile_pic || null,
                last_interaction_time: conversation.updated_time,
              });
            }
          } catch (error) {
            console.error(`Error fetching user info for ${psid}:`, error);
          }
        }
      }
    }

    console.log(`Found ${subscribers.length} unique subscribers`);

    let conversationsCount = 0;

    // Upsert subscribers to database
    if (subscribers.length > 0) {
      const { error: upsertError } = await supabaseClient
        .from("subscribers")
        .upsert(subscribers, {
          onConflict: "page_id,subscriber_psid",
          ignoreDuplicates: false
        });

      if (upsertError) {
        console.error("Error upserting subscribers:", upsertError);
        throw upsertError;
      }

      // Fetch the subscriber IDs for conversation creation
      const { data: subscriberData, error: fetchError } = await supabaseClient
        .from("subscribers")
        .select("id, subscriber_psid, last_interaction_time")
        .eq("page_id", pageId)
        .in("subscriber_psid", subscribers.map(s => s.subscriber_psid));

      if (fetchError) {
        console.error("Error fetching subscribers:", fetchError);
        throw fetchError;
      }

      // Create conversations for each subscriber if they don't exist
      const conversations = subscriberData.map(sub => ({
        user_id: user.id,
        page_id: pageId,
        subscriber_id: sub.id,
        last_message_at: sub.last_interaction_time || new Date().toISOString(),
        last_message_text: null,
        unread_count: 0
      }));

      conversationsCount = conversations.length;

      const { error: conversationError } = await supabaseClient
        .from("conversations")
        .upsert(conversations, {
          onConflict: "subscriber_id",
          ignoreDuplicates: false
        });

      if (conversationError) {
        console.error("Error creating conversations:", conversationError);
        throw conversationError;
      }

      console.log(`Created/updated ${conversationsCount} conversations`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscribersCount: subscribers.length,
        conversationsCount: conversationsCount,
        message: `Successfully scanned ${subscribers.length} subscribers and created ${conversationsCount} conversations`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Scan subscribers error:", error);
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