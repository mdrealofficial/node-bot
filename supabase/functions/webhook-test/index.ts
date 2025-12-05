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
        JSON.stringify({ error: "Unauthorized" }),
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
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { pageId } = await req.json();

    // Get page details
    const { data: page } = await supabase
      .from("facebook_pages")
      .select("*")
      .eq("id", pageId)
      .eq("user_id", user.id)
      .single();

    if (!page) {
      throw new Error("Page not found");
    }

    // Check current webhook subscription
    const checkUrl = `https://graph.facebook.com/v21.0/${page.page_id}/subscribed_apps?access_token=${page.page_access_token}`;
    const checkResponse = await fetch(checkUrl);
    const checkData = await checkResponse.json();

    console.log("Current subscriptions:", checkData);

    // Subscribe to webhooks
    const subscribeUrl = `https://graph.facebook.com/v21.0/${page.page_id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,messaging_optins&access_token=${page.page_access_token}`;
    const subscribeResponse = await fetch(subscribeUrl, { method: "POST" });
    const subscribeData = await subscribeResponse.json();

    console.log("Subscribe result:", subscribeData);

    return new Response(
      JSON.stringify({
        success: true,
        currentSubscriptions: checkData,
        subscribeResult: subscribeData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});