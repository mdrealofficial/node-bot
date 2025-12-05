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
    console.log("Facebook connect function called");
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      throw new Error("Unauthorized");
    }

    console.log("User authenticated:", user.id);

    const { action, userAccessToken, pageId, importAll, code, redirectUri } = await req.json();
    console.log("Request params:", { action, pageId, importAll, hasCode: !!code });

    // Get Facebook App credentials from admin_config
    const { data: config, error: configError } = await supabaseAdmin
      .from("admin_config")
      .select("fb_app_id, fb_app_secret")
      .single();

    console.log("Config fetched:", { hasAppId: !!config?.fb_app_id, hasSecret: !!config?.fb_app_secret, error: configError });

    if (!config?.fb_app_id || !config?.fb_app_secret) {
      throw new Error("Facebook app not configured in admin_config");
    }

    // Helper function to check if page is active elsewhere
    const checkPageActiveElsewhere = async (fbPageId: string): Promise<boolean> => {
      const { data: existingPage } = await supabaseAdmin
        .from("facebook_pages")
        .select("id, status")
        .eq("page_id", fbPageId)
        .eq("status", "active")
        .neq("user_id", user.id)
        .maybeSingle();
      
      return !!existingPage;
    };

    // Handle OAuth callback - exchange code for access token
    if (action === "callback" && code) {
      console.log("Processing OAuth callback with code");
      
      // Exchange code for access token
      const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${config.fb_app_id}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${config.fb_app_secret}&code=${code}`;
      
      const tokenResponse = await fetch(tokenUrl);
      const tokenData = await tokenResponse.json();
      
      console.log("Token exchange response:", { success: !!tokenData.access_token, hasError: !!tokenData.error });

      if (tokenData.error) {
        throw new Error(`Facebook API error: ${tokenData.error.message || JSON.stringify(tokenData.error)}`);
      }

      if (!tokenData.access_token) {
        throw new Error("Failed to get access token from code");
      }

      // Exchange for long-lived token
      const longLivedUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${config.fb_app_id}&client_secret=${config.fb_app_secret}&fb_exchange_token=${tokenData.access_token}`;
      
      const longLivedResponse = await fetch(longLivedUrl);
      const longLivedData = await longLivedResponse.json();
      
      const longLivedToken = longLivedData.access_token || tokenData.access_token;

      // Get user's pages
      const pagesUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${longLivedToken}`;
      const pagesResponse = await fetch(pagesUrl);
      const pagesData = await pagesResponse.json();
      
      console.log("Pages response:", { pageCount: pagesData.data?.length || 0, error: pagesData.error });

      if (pagesData.error) {
        throw new Error(`Failed to get pages: ${pagesData.error.message}`);
      }

      const pages = pagesData.data || [];
      let imported = 0;
      
      for (const page of pages) {
        try {
          const pageDetailsUrl = `https://graph.facebook.com/v21.0/${page.id}?fields=name,followers_count,picture&access_token=${page.access_token}`;
          const pageDetailsResponse = await fetch(pageDetailsUrl);
          const pageDetails = await pageDetailsResponse.json();

          // Check if page is active in another account
          const isActiveElsewhere = await checkPageActiveElsewhere(page.id);
          const pageStatus = isActiveElsewhere ? 'inactive' : 'active';

          const { error: insertError } = await supabaseClient
            .from("facebook_pages")
            .upsert({
              user_id: user.id,
              page_id: page.id,
              page_name: pageDetails.name || page.name,
              page_access_token: page.access_token,
              page_logo_url: pageDetails.picture?.data?.url || null,
              followers_count: pageDetails.followers_count || 0,
              status: pageStatus
            }, {
              onConflict: 'user_id,page_id'
            });

          if (insertError) {
            console.error("Database insert error for page:", page.id, insertError);
            continue;
          }

          // Only subscribe to webhook if page is active
          if (pageStatus === 'active') {
            const webhookUrl = `https://graph.facebook.com/v21.0/${page.id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,messaging_optins,feed&access_token=${page.access_token}`;
            await fetch(webhookUrl, { method: 'POST' });
          }
          
          imported++;
        } catch (pageError) {
          console.error("Error importing page:", page.id, pageError);
        }
      }

      return new Response(
        JSON.stringify({ success: true, imported }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "connect") {
      console.log("Processing connect action with userAccessToken");
      
      // Exchange user token for long-lived token
      const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${config.fb_app_id}&client_secret=${config.fb_app_secret}&fb_exchange_token=${userAccessToken}`;
      console.log("Exchanging token with Facebook...");
      
      const tokenResponse = await fetch(tokenUrl);
      const tokenData = await tokenResponse.json();
      
      console.log("Token exchange response:", { success: !!tokenData.access_token, hasError: !!tokenData.error });

      if (tokenData.error) {
        throw new Error(`Facebook API error: ${tokenData.error.message || JSON.stringify(tokenData.error)}`);
      }

      if (!tokenData.access_token) {
        throw new Error("Failed to get long-lived token");
      }

      // Get user's pages
      const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${tokenData.access_token}`;
      console.log("Fetching user pages from Facebook...");
      
      const pagesResponse = await fetch(pagesUrl);
      const pagesData = await pagesResponse.json();
      
      console.log("Pages response:", { pageCount: pagesData.data?.length || 0, error: pagesData.error });

      const pages = pagesData.data || [];

      // Import all pages
      if (importAll) {
        let imported = 0;
        
        for (const page of pages) {
          try {
            const pageDetailsUrl = `https://graph.facebook.com/v18.0/${page.id}?fields=name,followers_count&access_token=${page.access_token}`;
            const pageDetailsResponse = await fetch(pageDetailsUrl);
            const pageDetails = await pageDetailsResponse.json();

            // Check if page is active in another account
            const isActiveElsewhere = await checkPageActiveElsewhere(page.id);
            const pageStatus = isActiveElsewhere ? 'inactive' : 'active';

            const { error: insertError } = await supabaseClient
              .from("facebook_pages")
              .upsert({
                user_id: user.id,
                page_id: page.id,
                page_name: pageDetails.name || page.name,
                page_access_token: page.access_token,
                followers_count: pageDetails.followers_count || 0,
                status: pageStatus
              }, {
                onConflict: 'user_id,page_id'
              });

            if (insertError) {
              console.error("Database insert error for page:", page.id, insertError);
              continue;
            }

            if (pageStatus === 'active') {
              const webhookUrl = `https://graph.facebook.com/v21.0/${page.id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,messaging_optins,feed&access_token=${page.access_token}`;
              await fetch(webhookUrl, { method: 'POST' });
            }
            
            imported++;
          } catch (pageError) {
            console.error("Error importing page:", page.id, pageError);
          }
        }

        return new Response(
          JSON.stringify({ success: true, imported }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If pageId specified, connect that page
      if (pageId) {
        const page = pages.find((p: any) => p.id === pageId);
        if (!page) {
          throw new Error("Page not found");
        }

        // Get page details
        const pageDetailsUrl = `https://graph.facebook.com/v18.0/${page.id}?fields=name,followers_count&access_token=${page.access_token}`;
        const pageDetailsResponse = await fetch(pageDetailsUrl);
        const pageDetails = await pageDetailsResponse.json();

        // Check if page is active in another account
        const isActiveElsewhere = await checkPageActiveElsewhere(page.id);
        const pageStatus = isActiveElsewhere ? 'inactive' : 'active';

        // Save page to database
        const { error: insertError } = await supabaseClient
          .from("facebook_pages")
          .upsert({
            user_id: user.id,
            page_id: page.id,
            page_name: pageDetails.name || page.name,
            page_access_token: page.access_token,
            followers_count: pageDetails.followers_count || 0,
            status: pageStatus,
          }, {
            onConflict: "user_id,page_id"
          });

        if (insertError) throw insertError;

        // Subscribe page to webhook only if active
        if (pageStatus === 'active') {
          console.log("Subscribing page to webhook for messaging and feed events");
          const webhookUrl = `https://graph.facebook.com/v21.0/${page.id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,messaging_optins,feed&access_token=${page.access_token}`;
          const webhookResponse = await fetch(webhookUrl, { method: "POST" });
          const webhookData = await webhookResponse.json();
          
          console.log("Webhook subscription result:", webhookData);
          
          if (webhookData.error) {
            console.error("Webhook subscription error:", webhookData.error);
          } else {
            console.log("Webhook subscribed successfully:", webhookData);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            page: {
              id: page.id,
              name: pageDetails.name || page.name,
              followers_count: pageDetails.followers_count || 0,
            },
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } else {
        // Return list of available pages
        return new Response(
          JSON.stringify({
            success: true,
            pages: pages.map((p: any) => ({
              id: p.id,
              name: p.name,
            })),
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else if (action === "disconnect") {
      // Delete page from database
      const { error: deleteError } = await supabaseClient
        .from("facebook_pages")
        .delete()
        .eq("page_id", pageId)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    console.error("Facebook connect error:", error);
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
