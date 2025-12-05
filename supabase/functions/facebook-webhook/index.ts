import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log(`[WEBHOOK] Received ${req.method} request from ${req.headers.get('user-agent')}`);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    console.log("[WEBHOOK] Supabase client initialized");

    // Webhook verification (GET request from Facebook)
    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      console.log("Webhook verification request:", { mode, token });

      // Get verify token from admin config
      const { data: config } = await supabaseClient
        .from("admin_config")
        .select("webhook_verify_token")
        .single();

      if (mode === "subscribe" && token === config?.webhook_verify_token) {
        console.log("Webhook verified successfully");
        return new Response(challenge, { status: 200 });
      } else {
        console.log("Webhook verification failed");
        return new Response("Forbidden", { status: 403 });
      }
    }

    // Handle webhook events (POST request from Facebook)
    if (req.method === "POST") {
      const body = await req.json();
      console.log("[WEBHOOK] POST - Full payload:", JSON.stringify(body, null, 2));

      // Process each entry in the webhook payload
      for (const entry of body.entry || []) {
        const pageId = entry.id;
        console.log(`[WEBHOOK] Processing entry for page: ${pageId}`);

        // Handle messaging events
        if (entry.messaging) {
          console.log(`[WEBHOOK] Found ${entry.messaging.length} messaging events`);
          for (const messagingEvent of entry.messaging) {
            console.log("[WEBHOOK] Processing messaging event");
            
            // Check if this is a postback event
            if (messagingEvent.postback) {
              await processPostback(supabaseClient, pageId, messagingEvent);
            } else {
              await processMessage(supabaseClient, pageId, messagingEvent);
            }
          }
        } else if (entry.changes) {
          // Handle comment/feed events
          console.log(`[WEBHOOK] Found ${entry.changes.length} feed change events`);
          for (const change of entry.changes) {
            if (change.field === 'feed' && change.value.item === 'comment') {
              console.log("[WEBHOOK] Processing comment event");
              await processComment(supabaseClient, pageId, change.value);
            }
          }
        } else {
          console.log("[WEBHOOK] No messaging or feed events found in entry");
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


async function processMessage(supabaseClient: any, pageId: string, messagingEvent: any) {
  try {
    console.log("[PROCESS_MESSAGE] Starting with data:", JSON.stringify(messagingEvent, null, 2));

    // Check if this is a message sent by the page (from Business Suite) or from a user
    const isPageMessage = messagingEvent.message?.is_echo === true;
    const senderPsid = isPageMessage ? messagingEvent.recipient?.id : messagingEvent.sender?.id;
    const messageText = messagingEvent.message?.text || '';
    const messageId = messagingEvent.message?.mid;
    const attachments = messagingEvent.message?.attachments || [];
    const quickReply = messagingEvent.message?.quick_reply;

    if (!senderPsid || !messageId) {
      console.log("[PROCESS_MESSAGE] Missing required fields");
      return;
    }
    
    // If this is a quick reply response, handle it like a postback
    if (quickReply && quickReply.payload) {
      console.log("[PROCESS_MESSAGE] Quick reply detected, handling as postback");
      await processQuickReply(supabaseClient, pageId, messagingEvent, quickReply.payload);
      return;
    }

    // Extract attachment info if present
    let attachmentUrl = null;
    let attachmentType = null;
    
    if (attachments.length > 0) {
      const attachment = attachments[0];
      attachmentType = attachment.type;
      attachmentUrl = attachment.payload?.url || null;
      console.log(`[PROCESS_MESSAGE] Found attachment: ${attachmentType} - ${attachmentUrl}`);
    }

    console.log(`[PROCESS_MESSAGE] Processing ${isPageMessage ? 'page' : 'user'} message`);

    // Check for chatbot flow triggers (only for user messages, not echo)
    if (!isPageMessage && messageText.trim()) {
      console.log("[PROCESS_MESSAGE] Checking for flow triggers");
      
      // First, get the page UUID from our database using the Facebook page_id
      const { data: page } = await supabaseClient
        .from("facebook_pages")
        .select("*")
        .eq("page_id", pageId)
        .single();

      if (page) {
        console.log(`[PROCESS_MESSAGE] Found page in database: ${page.page_name} (UUID: ${page.id})`);
        
        // Check if there's a paused flow waiting for input from this user
        const { data: pausedFlows } = await supabaseClient
          .from("flow_executions")
          .select("*")
          .eq("page_id", page.id)
          .eq("subscriber_psid", senderPsid)
          .eq("status", "waiting_for_input")
          .order("triggered_at", { ascending: false })
          .limit(1);

        if (pausedFlows && pausedFlows.length > 0) {
          console.log(`[PROCESS_MESSAGE] Found paused flow waiting for input: ${pausedFlows[0].id}`);
          
          // Resume the flow with user's response
          fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/execute-flow`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              resumeFlowExecutionId: pausedFlows[0].id,
              userResponse: messageText,
            }),
          }).catch(err => console.error("Error resuming flow:", err));
          
          console.log("[PROCESS_MESSAGE] Flow resumption initiated");
          return; // Don't process this message further
        }
        
        // Now check for flows using the page UUID
        const { data: flows } = await supabaseClient
          .from("chatbot_flows")
          .select("*")
          .eq("page_id", page.id)
          .eq("is_active", true);

        console.log(`[PROCESS_MESSAGE] Found ${flows?.length || 0} active flows for this page`);

        if (flows && flows.length > 0) {
          const triggeredFlow = flows.find((flow: any) => 
            flow.trigger_keyword && 
            messageText.toLowerCase().includes(flow.trigger_keyword.toLowerCase())
          );

          if (triggeredFlow) {
            console.log(`[PROCESS_MESSAGE] Flow triggered: ${triggeredFlow.name} by keyword: ${triggeredFlow.trigger_keyword}`);
            
            // Execute the flow asynchronously
            fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/execute-flow`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                flowId: triggeredFlow.id,
                recipientPsid: senderPsid,
                pageAccessToken: page.page_access_token,
              }),
            }).catch(err => console.error("Error executing flow:", err));
            
            console.log("[PROCESS_MESSAGE] Flow execution initiated, skipping normal message handling");
            return; // Don't store the trigger message
          } else {
            console.log("[PROCESS_MESSAGE] No flow triggered - message text doesn't match any keywords");
          }
        }
      } else {
        console.log("[PROCESS_MESSAGE] Page not found in database");
      }
    }

    // Find the page in our database
    const { data: page, error: pageError } = await supabaseClient
      .from("facebook_pages")
      .select("*")
      .eq("page_id", pageId)
      .single();

    if (pageError || !page) {
      console.error("[PROCESS_MESSAGE] Page not found in database:", pageId, pageError);
      return;
    }
    console.log("[PROCESS_MESSAGE] Page found:", page.page_name);

    // Fetch subscriber profile from Facebook Graph API
    let subscriberName = null;
    let profilePicUrl = null;
    try {
      const userInfoResponse = await fetch(
        `https://graph.facebook.com/v21.0/${senderPsid}?fields=name,profile_pic&access_token=${page.page_access_token}`
      );
      const userInfo = await userInfoResponse.json();
      if (!userInfo.error) {
        subscriberName = userInfo.name || null;
        profilePicUrl = userInfo.profile_pic || null;
        console.log(`[PROCESS_MESSAGE] Fetched user info: ${subscriberName}`);
      } else {
        console.log('[PROCESS_MESSAGE] Could not fetch user info:', userInfo.error);
      }
    } catch (e) {
      console.log('[PROCESS_MESSAGE] Error fetching Facebook user info:', e);
    }

    // Find or create subscriber
    const { data: subscriber, error: subscriberError } = await supabaseClient
      .from("subscribers")
      .select("*")
      .eq("page_id", page.id)
      .eq("subscriber_psid", senderPsid)
      .maybeSingle();

    let subscriberId = subscriber?.id;

    if (!subscriber) {
      // Create new subscriber with fetched profile data
      console.log("[PROCESS_MESSAGE] Creating new subscriber");
      const { data: newSubscriber, error: createError } = await supabaseClient
        .from("subscribers")
        .insert({
          user_id: page.user_id,
          page_id: page.id,
          subscriber_psid: senderPsid,
          subscriber_name: subscriberName || "Unknown User",
          profile_pic_url: profilePicUrl,
          last_interaction_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error("[PROCESS_MESSAGE] Error creating subscriber:", createError);
        return;
      }
      subscriberId = newSubscriber.id;
    } else {
      // Update last interaction time and profile data if fetched
      const updateData: any = { 
        last_interaction_time: new Date().toISOString() 
      };
      
      if (subscriberName) {
        updateData.subscriber_name = subscriberName;
      }
      if (profilePicUrl) {
        updateData.profile_pic_url = profilePicUrl;
      }
      
      await supabaseClient
        .from("subscribers")
        .update(updateData)
        .eq("id", subscriberId);
    }

    // Find or create conversation
    const { data: conversation, error: conversationError } = await supabaseClient
      .from("conversations")
      .select("*")
      .eq("page_id", page.id)
      .eq("subscriber_id", subscriberId)
      .maybeSingle();

    let conversationId = conversation?.id;

    if (!conversation) {
      // Create new conversation
      console.log("[PROCESS_MESSAGE] Creating new conversation");
      const { data: newConversation, error: createError } = await supabaseClient
        .from("conversations")
        .insert({
          user_id: page.user_id,
          page_id: page.id,
          subscriber_id: subscriberId,
          last_message_at: new Date().toISOString(),
          last_message_text: messageText || (attachmentUrl ? '📎 Attachment' : ''),
          unread_count: isPageMessage ? 0 : 1,
        })
        .select()
        .single();

      if (createError) {
        console.error("[PROCESS_MESSAGE] Error creating conversation:", createError);
        return;
      }
      conversationId = newConversation.id;
    } else {
      // Update conversation
      await supabaseClient
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_text: messageText || (attachmentUrl ? '📎 Attachment' : ''),
          unread_count: isPageMessage ? conversation.unread_count : (conversation.unread_count || 0) + 1,
        })
        .eq("id", conversationId);
    }

    // Store message
    const { error: messageError } = await supabaseClient
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_type: isPageMessage ? "user" : "subscriber",
        message_text: messageText,
        facebook_message_id: messageId,
        status: isPageMessage ? "delivered" : "read",
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
      });

    if (messageError) {
      console.error("[PROCESS_MESSAGE] Error storing message:", messageError);
    } else {
      console.log("[PROCESS_MESSAGE] Message stored successfully");
    }
  } catch (error) {
    console.error("Error processing message:", error);
  }
}

async function processPostback(supabaseClient: any, pageId: string, messagingEvent: any) {
  try {
    console.log("[PROCESS_POSTBACK] Starting with data:", JSON.stringify(messagingEvent, null, 2));
    
    const senderPsid = messagingEvent.sender?.id;
    const payload = messagingEvent.postback?.payload;
    
    if (!senderPsid || !payload) {
      console.log("[PROCESS_POSTBACK] Missing required fields");
      return;
    }
    
    // Check for product details postback
    if (payload.startsWith('PRODUCT_DETAILS_')) {
      const payloadParts = payload.replace('PRODUCT_DETAILS_', '').split('_');
      const productId = payloadParts[0];
      const linkType = payloadParts[1] || 'internal'; // 'internal' or 'external'
      console.log("[PROCESS_POSTBACK] Product details request for:", productId, "Link type:", linkType);
      await handleProductDetailsRequest(supabaseClient, pageId, senderPsid, productId, linkType);
      return;
    }
    
    // Try to parse the payload as JSON first
    let payloadData;
    try {
      payloadData = JSON.parse(payload);
      console.log("[PROCESS_POSTBACK] Parsed JSON payload:", payloadData);
      await handlePayloadAction(supabaseClient, pageId, senderPsid, payloadData);
    } catch (e) {
      // If not JSON, treat as a button node ID (from carousel buttons)
      console.log("[PROCESS_POSTBACK] Treating payload as button node ID:", payload);
      await handleButtonNodeClick(supabaseClient, pageId, senderPsid, payload);
    }
  } catch (error) {
    console.error("Error processing postback:", error);
  }
}

async function processQuickReply(supabaseClient: any, pageId: string, messagingEvent: any, payload: string) {
  try {
    console.log("[PROCESS_QUICK_REPLY] Starting with payload:", payload);
    
    const senderPsid = messagingEvent.sender?.id;
    
    if (!senderPsid) {
      console.log("[PROCESS_QUICK_REPLY] Missing sender PSID");
      return;
    }
    
    // Parse the payload
    let payloadData;
    try {
      payloadData = JSON.parse(payload);
    } catch (e) {
      console.error("[PROCESS_QUICK_REPLY] Failed to parse payload:", e);
      return;
    }
    
    console.log("[PROCESS_QUICK_REPLY] Parsed payload:", payloadData);
    
    await handlePayloadAction(supabaseClient, pageId, senderPsid, payloadData);
  } catch (error) {
    console.error("Error processing quick reply:", error);
  }
}

async function handleProductDetailsRequest(supabaseClient: any, pageId: string, senderPsid: string, productId: string, linkType: string = 'internal') {
  try {
    console.log("[PRODUCT_DETAILS] Fetching product:", productId, "Link type:", linkType);
    
    // Get page info
    const { data: page } = await supabaseClient
      .from("facebook_pages")
      .select("*")
      .eq("page_id", pageId)
      .single();
    
    if (!page) {
      console.error("[PRODUCT_DETAILS] Page not found");
      return;
    }
    
    // Fetch product
    const { data: product } = await supabaseClient
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();
    
    if (!product) {
      console.error("[PRODUCT_DETAILS] Product not found");
      return;
    }

    // Fetch store info for custom button text
    const { data: store } = await supabaseClient
      .from("stores")
      .select("subdomain, carousel_buy_now_text")
      .eq("id", product.store_id)
      .single();
    
    // Fetch variations
    const { data: variations } = await supabaseClient
      .from("product_variations")
      .select("name")
      .eq("product_id", productId);
    
    // Fetch all images
    const { data: images } = await supabaseClient
      .from("product_images")
      .select("url")
      .eq("product_id", productId)
      .order("display_order");
    
    const allImages = images?.map((img: any) => img.url) || product.images || [];
    const variationNames = variations?.map((v: any) => v.name) || [];
    
    // Send images first
    for (const imageUrl of allImages) {
      if (imageUrl) {
        await fetch(
          `https://graph.facebook.com/v21.0/me/messages?access_token=${page.page_access_token}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipient: { id: senderPsid },
              message: {
                attachment: {
                  type: "image",
                  payload: { url: imageUrl }
                }
              }
            })
          }
        );
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Send details text
    const detailsParts = [
      `📦 ${product.name}`,
      variationNames.length > 0 ? `Available in: ${variationNames.join(', ')}` : '',
      `💰 Price: ${product.price}`,
      product.description || ''
    ].filter(Boolean);
    
    await fetch(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${page.page_access_token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: senderPsid },
          message: { text: detailsParts.join('\n') }
        })
      }
    );

    // Send Buy Now button
    const storeUrl = store?.subdomain
      ? `${Deno.env.get('SITE_URL')}/store/${store.subdomain}`
      : `${Deno.env.get('SITE_URL')}/store/${product.store_id}`;
    const buyNowUrl = linkType === 'external'
      ? (product.landing_page_url || `${storeUrl}/product/${productId}`)
      : `${storeUrl}/product/${productId}`;

    await fetch(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${page.page_access_token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: senderPsid },
          message: {
            attachment: {
              type: "template",
              payload: {
                template_type: "button",
                text: "Ready to purchase?",
                buttons: [{
                  type: "web_url",
                  title: store?.carousel_buy_now_text || "Buy Now",
                  url: buyNowUrl
                }]
              }
            }
          }
        })
      }
    );
    
    console.log("[PRODUCT_DETAILS] Details sent successfully");
  } catch (error) {
    console.error("[PRODUCT_DETAILS] Error:", error);
  }
}

async function handleButtonNodeClick(supabaseClient: any, pageId: string, senderPsid: string, buttonNodeId: string) {
  try {
    console.log(`[HANDLE_BUTTON_CLICK] Processing button node: ${buttonNodeId}`);
    
    // Get page info
    const { data: page } = await supabaseClient
      .from("facebook_pages")
      .select("*")
      .eq("page_id", pageId)
      .single();
    
    if (!page) {
      console.error("[HANDLE_BUTTON_CLICK] Page not found");
      return;
    }
    
    // Get all active flows for this page
    const { data: flows } = await supabaseClient
      .from("chatbot_flows")
      .select("*")
      .eq("page_id", page.id)
      .eq("is_active", true);
    
    if (!flows || flows.length === 0) {
      console.log("[HANDLE_BUTTON_CLICK] No active flows found");
      return;
    }
    
    // Find the flow containing this button node
    let targetFlow = null;
    let buttonNode = null;
    
    for (const flow of flows) {
      const flowData = flow.flow_data as any;
      const nodes = flowData.nodes || [];
      const foundButton = nodes.find((n: any) => n.id === buttonNodeId && n.type === 'button');
      
      if (foundButton) {
        targetFlow = flow;
        buttonNode = foundButton;
        console.log(`[HANDLE_BUTTON_CLICK] Found button in flow: ${flow.name}`);
        break;
      }
    }
    
    if (!targetFlow || !buttonNode) {
      console.log("[HANDLE_BUTTON_CLICK] Button node not found in any flow");
      return;
    }
    
    // Find what's connected to this button
    const flowData = targetFlow.flow_data as any;
    const edges = flowData.edges || [];
    const nodes = flowData.nodes || [];
    
    const outgoingEdge = edges.find((e: any) => e.source === buttonNodeId);
    
    if (!outgoingEdge) {
      console.log("[HANDLE_BUTTON_CLICK] No outgoing edge from button");
      return;
    }
    
    const nextNode = nodes.find((n: any) => n.id === outgoingEdge.target);
    
    if (!nextNode) {
      console.log("[HANDLE_BUTTON_CLICK] Next node not found");
      return;
    }
    
    console.log(`[HANDLE_BUTTON_CLICK] Executing next node: ${nextNode.id} (${nextNode.type})`);
    
    // Execute the flow starting from the next node
    await supabaseClient.functions.invoke('execute-flow', {
      body: {
        flowId: targetFlow.id,
        recipientPsid: senderPsid,
        pageAccessToken: page.page_access_token,
        startFromNodeId: nextNode.id,
      }
    });
    
  } catch (error) {
    console.error("Error handling button node click:", error);
  }
}

async function handlePayloadAction(supabaseClient: any, pageId: string, senderPsid: string, payloadData: any) {
  try {
    // Handle button/quick reply actions: next_message, start_flow
    if (payloadData.type === 'next_message' && payloadData.nodeId) {
      console.log(`[HANDLE_PAYLOAD] Executing node: ${payloadData.nodeId}`);
      
      // Get page info
      const { data: page } = await supabaseClient
        .from("facebook_pages")
        .select("*")
        .eq("page_id", pageId)
        .single();
      
      if (!page) {
        console.error("[HANDLE_PAYLOAD] Page not found");
        return;
      }
      
      // Find the flow containing this node
      const { data: flows } = await supabaseClient
        .from("chatbot_flows")
        .select("*")
        .eq("page_id", page.id)
        .eq("is_active", true);
      
      if (!flows || flows.length === 0) {
        console.log("[HANDLE_PAYLOAD] No active flows found");
        return;
      }
      
      // Find which flow contains this node
      let targetFlow = null;
      
      for (const flow of flows) {
        const flowData = flow.flow_data;
        const nodes = flowData.nodes || [];
        
        // Check if this flow contains the target node
        const nodeExists = nodes.find((n: any) => n.id === payloadData.nodeId);
        if (nodeExists) {
          targetFlow = flow;
          console.log(`[HANDLE_PAYLOAD] Found node in flow: ${flow.name}`);
          break;
        }
      }
      
      if (targetFlow) {
        console.log(`[HANDLE_PAYLOAD] Executing node: ${payloadData.nodeId} from flow: ${targetFlow.id}`);
        
        // Execute the flow starting from the specified node
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/execute-flow`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            flowId: targetFlow.id,
            recipientPsid: senderPsid,
            pageAccessToken: page.page_access_token,
            startFromNodeId: payloadData.nodeId,
          }),
        }).catch(err => console.error("Error executing flow:", err));
      } else {
        console.warn(`[HANDLE_PAYLOAD] Node ${payloadData.nodeId} not found in any active flow`);
      }
      return;
    }
    
    if (payloadData.type === 'start_flow' && payloadData.flowId) {
      console.log(`[HANDLE_PAYLOAD] Starting flow: ${payloadData.flowId}`);
      
      const { data: page } = await supabaseClient
        .from("facebook_pages")
        .select("*")
        .eq("page_id", pageId)
        .single();
      
      if (!page) return;
      
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/execute-flow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          flowId: payloadData.flowId,
          recipientPsid: senderPsid,
          pageAccessToken: page.page_access_token,
        }),
      }).catch(err => console.error("Error starting flow:", err));
      return;
    }
    
    // Handle product details request
    if (payloadData.action === 'product_details') {
      console.log(`[PROCESS_POSTBACK] Fetching product details for: ${payloadData.product_id}`);
      
      // Get the page info from database
      const { data: page } = await supabaseClient
        .from("facebook_pages")
        .select("*")
        .eq("page_id", pageId)
        .single();
      
      if (!page) {
        console.error("[PROCESS_POSTBACK] Page not found");
        return;
      }
      
      // Call execute-flow function's sendProductDetailsMessage
      // We need to invoke the function directly here
      const { data: product, error: productError } = await supabaseClient
        .from("products")
        .select(`
          *,
          stores (slug, custom_domain, custom_domain_verified),
          product_images (image_url, display_order, is_primary),
          product_variations (name, price_modifier, stock_quantity)
        `)
        .eq("id", payloadData.product_id)
        .single();
      
      // Fetch product attributes
      const { data: attributeValues } = await supabaseClient
        .from("product_attribute_values")
        .select(`
          *,
          product_attributes (name)
        `)
        .eq("product_id", payloadData.product_id);
      
      if (productError || !product) {
        console.error("[PROCESS_POSTBACK] Failed to fetch product:", productError);
        return;
      }
      
      // 1. Send up to 3 images from product gallery
      const images = product.product_images?.sort((a: any, b: any) => 
        (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || 
        (a.display_order || 0) - (b.display_order || 0)
      ) || [];
      
      for (const img of images.slice(0, 3)) {
        await sendImageFromUrl(img.image_url, senderPsid, page.page_access_token);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // 2. Build detailed message
      let detailsText = "";
      
      // Add attribute prices if available
      if (attributeValues && attributeValues.length > 0) {
        // Group attributes by attribute name
        const attributeGroups: { [key: string]: any[] } = {};
        for (const attrValue of attributeValues) {
          const attrName = attrValue.product_attributes?.name || 'Attribute';
          if (!attributeGroups[attrName]) {
            attributeGroups[attrName] = [];
          }
          attributeGroups[attrName].push(attrValue);
        }
        
        // Format each attribute group
        for (const [attrName, values] of Object.entries(attributeGroups)) {
          for (const val of values) {
            const attrPrice = parseFloat(product.price) + parseFloat(val.price_modifier || 0);
            detailsText += `${attrName} (${val.attribute_value}): $${attrPrice.toFixed(2)}\n`;
          }
        }
        detailsText += `\n`;
      }
      
      // Add variations if available
      if (product.product_variations && product.product_variations.length > 0) {
        for (const variation of product.product_variations) {
          const varPrice = parseFloat(product.price) + parseFloat(variation.price_modifier || 0);
          detailsText += `${variation.name}: $${varPrice.toFixed(2)}\n`;
        }
        detailsText += `\n`;
      }
      
      // Add product details
      detailsText += `Product Details:\n${product.description || 'No description available'}`;
      
      // Build store URL
      const store = product.stores;
      const productUrl = store.custom_domain_verified && store.custom_domain
        ? `https://${store.custom_domain}/product/${product.id}`
        : `https://${store.slug}.lovable.app/product/${product.id}`;
      
      // 3. Send message with "Buy Now" button
      const buttonMessageData = {
        recipient: { id: senderPsid },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: detailsText,
              buttons: [{
                type: "web_url",
                url: productUrl,
                title: "Buy Now",
              }],
            },
          },
        },
      };

      await fetch(
        `https://graph.facebook.com/v21.0/me/messages?access_token=${page.page_access_token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buttonMessageData),
        }
      );
    } else if (payloadData.action === "product_external_details") {
      console.log("[PROCESS_POSTBACK] Handling product_external_details postback");
      
      // Get the page info from database
      const { data: externalPage } = await supabaseClient
        .from("facebook_pages")
        .select("*")
        .eq("page_id", pageId)
        .single();
      
      if (!externalPage) {
        console.error("[PROCESS_POSTBACK] Page not found");
        return;
      }
      
      // Fetch product details including variations and images
      const { data: product, error: productError } = await supabaseClient
        .from("products")
        .select(`
          *,
          stores (slug, custom_domain, custom_domain_verified),
          product_images (image_url, display_order, is_primary),
          product_variations (name, price_modifier, stock_quantity)
        `)
        .eq("id", payloadData.product_id)
        .single();
      
      // Fetch product attributes
      const { data: attributeValues } = await supabaseClient
        .from("product_attribute_values")
        .select(`
          *,
          product_attributes (name)
        `)
        .eq("product_id", payloadData.product_id);
      
      if (productError || !product) {
        console.error("[PROCESS_POSTBACK] Failed to fetch product:", productError);
        return;
      }
      
      // 1. Send up to 3 images from product gallery
      const images = product.product_images?.sort((a: any, b: any) => 
        (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || 
        (a.display_order || 0) - (b.display_order || 0)
      ) || [];
      
      for (const img of images.slice(0, 3)) {
        await sendImageFromUrl(img.image_url, senderPsid, externalPage.page_access_token);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // 2. Build detailed message
      let detailsText = "";
      
      // Add attribute prices if available
      if (attributeValues && attributeValues.length > 0) {
        // Group attributes by attribute name
        const attributeGroups: { [key: string]: any[] } = {};
        for (const attrValue of attributeValues) {
          const attrName = attrValue.product_attributes?.name || 'Attribute';
          if (!attributeGroups[attrName]) {
            attributeGroups[attrName] = [];
          }
          attributeGroups[attrName].push(attrValue);
        }
        
        // Format each attribute group
        for (const [attrName, values] of Object.entries(attributeGroups)) {
          for (const val of values) {
            const attrPrice = parseFloat(product.price) + parseFloat(val.price_modifier || 0);
            detailsText += `${attrName} (${val.attribute_value}): $${attrPrice.toFixed(2)}\n`;
          }
        }
        detailsText += `\n`;
      }
      
      // Add variations if available
      if (product.product_variations && product.product_variations.length > 0) {
        for (const variation of product.product_variations) {
          const varPrice = parseFloat(product.price) + parseFloat(variation.price_modifier || 0);
          detailsText += `${variation.name}: $${varPrice.toFixed(2)}\n`;
        }
        detailsText += `\n`;
      }
      
      // Add product details
      detailsText += `Product Details:\n${product.description || 'No description available'}`;
      
      // Use landing_page_url if available, otherwise fallback to inbuilt store
      const store = product.stores;
      const productUrl = product.landing_page_url || (
        store.custom_domain_verified && store.custom_domain
          ? `https://${store.custom_domain}/product/${product.id}`
          : `https://${store.slug}.lovable.app/product/${product.id}`
      );
      
      // 3. Send message with "Buy Now" button
      const externalButtonMessageData = {
        recipient: { id: senderPsid },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: detailsText,
              buttons: [{
                type: "web_url",
                url: productUrl,
                title: "Buy Now",
              }],
            },
          },
        },
      };

      await fetch(
        `https://graph.facebook.com/v21.0/me/messages?access_token=${externalPage.page_access_token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(externalButtonMessageData),
        }
      );
    }
  } catch (error) {
    console.error("[HANDLE_PAYLOAD] Error:", error);
  }
}

// Helper function to send image
async function sendImageFromUrl(imageUrl: string, recipientPsid: string, pageAccessToken: string) {
  const messageData = {
    recipient: { id: recipientPsid },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: imageUrl,
          is_reusable: true,
        },
      },
    },
  };

  const response = await fetch(
    `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messageData),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to send image:", error);
  }
}

async function processComment(supabaseClient: any, pageId: string, commentData: any) {
  console.log('[WEBHOOK] Processing comment:', commentData);

  try {
    const commentId = commentData.comment_id;
    const postId = commentData.post_id;
    const message = commentData.message || '';
    const parentId = commentData.parent_id;
    const commenterPsid = commentData.from?.id || '';
    const commenterName = commentData.from?.name || 'Unknown User';

    // Get page info from database
    const { data: page, error: pageError } = await supabaseClient
      .from('facebook_pages')
      .select('id, user_id, page_access_token')
      .eq('page_id', pageId)
      .single();

    if (pageError || !page) {
      console.error('[WEBHOOK] Page not found:', pageError);
      return;
    }

    // Get active comment reply templates for this page
    const { data: templates, error: templatesError } = await supabaseClient
      .from('comment_reply_templates')
      .select('*')
      .eq('page_id', page.id)
      .eq('is_active', true)
      .order('template_type', { ascending: false }); // full_page first

    if (templatesError) {
      console.error('[WEBHOOK] Error fetching templates:', templatesError);
      return;
    }

    if (!templates || templates.length === 0) {
      console.log('[WEBHOOK] No active templates found');
      return;
    }

    const messageLower = message.toLowerCase().trim();
    let actionTaken = 'no_action';
    let replyText = '';
    let templateUsed = null;

    // Priority 1: Check individual_post templates first (highest priority)
    // First try to find template with exact post match, then try templates without post_id (applies to all posts)
    const individualPostTemplate = templates.find((t: any) => 
      t.template_type === 'individual_post' && t.post_id === postId
    ) || templates.find((t: any) => 
      t.template_type === 'individual_post' && (!t.post_id || t.post_id === '')
    );
    
    if (individualPostTemplate) {
      // Check whitelist/blacklist
      const whitelistUsers = individualPostTemplate.whitelist_users || [];
      const blacklistUsers = individualPostTemplate.blacklist_users || [];
      
      // Check if commenter is blacklisted - skip if yes
      const isBlacklisted = blacklistUsers.length > 0 && blacklistUsers.some((user: string) => 
        commenterPsid === user || commenterName.toLowerCase().includes(user.toLowerCase())
      );
      
      if (isBlacklisted) {
        console.log('[WEBHOOK] Commenter is blacklisted, skipping individual post template');
        // Continue to full_page check
      } else {
        // Check whitelist - only skip if whitelist exists AND user not on it
        const hasWhitelist = whitelistUsers.length > 0;
        const isWhitelisted = !hasWhitelist || whitelistUsers.some((user: string) => 
          commenterPsid === user || commenterName.toLowerCase().includes(user.toLowerCase())
        );
        
        if (!isWhitelisted) {
          console.log('[WEBHOOK] Commenter not on whitelist, skipping individual post template');
          // Continue to full_page check
        } else {
          // Proceed with normal processing
          // Check exclusion keywords
          const excludeKeywords = individualPostTemplate.exclude_keywords || [];
          const hasExcludedKeyword = excludeKeywords.some((keyword: string) => 
            messageLower.includes(keyword.toLowerCase())
          );

          if (!hasExcludedKeyword) {
            // Check comment length
            const lengthValid = (
              (!individualPostTemplate.min_comment_length || message.length >= individualPostTemplate.min_comment_length) &&
              (!individualPostTemplate.max_comment_length || message.length <= individualPostTemplate.max_comment_length)
            );

            // Check if it's a reply and we should process it
            const shouldProcess = parentId === postId || individualPostTemplate.reply_to_replies;

            if (lengthValid && shouldProcess) {
              if (individualPostTemplate.reply_mode === 'generic') {
                replyText = individualPostTemplate.generic_message || '';
                actionTaken = 'replied';
                templateUsed = individualPostTemplate.id;
              } else if (individualPostTemplate.reply_mode === 'ai') {
                // AI-generated reply
                if (individualPostTemplate.ai_prompt) {
                  try {
                    // Fetch user's AI configuration
                    const { data: profile } = await supabaseClient
                      .from('profiles')
                      .select('preferred_ai_provider, openai_api_key, gemini_api_key, text_model, max_tokens')
                      .eq('id', page.user_id)
                      .single();

                    console.log('[AI CONFIG] Fetched profile:', { 
                      hasProfile: !!profile, 
                      provider: profile?.preferred_ai_provider,
                      hasOpenAI: !!profile?.openai_api_key,
                      hasGemini: !!profile?.gemini_api_key
                    });

                    if (profile && (profile.openai_api_key || profile.gemini_api_key)) {
                      console.log('[WEBHOOK] Generating AI reply with provider:', profile.preferred_ai_provider);
                      
                      const aiPrompt = individualPostTemplate.ai_prompt;
                      const userMessage = `Comment from ${commenterName}: "${message}"\n\nPlease generate an appropriate reply.`;
                      
                      let aiReply = '';
                      
                      if (profile.preferred_ai_provider === 'openai' && profile.openai_api_key) {
                        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${profile.openai_api_key}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            model: profile.text_model || 'gpt-4o-mini',
                            messages: [
                              { role: 'system', content: aiPrompt },
                              { role: 'user', content: userMessage }
                            ],
                            max_tokens: profile.max_tokens || 150,
                          }),
                        });
                        
                        if (openaiResponse.ok) {
                          const openaiData = await openaiResponse.json();
                          aiReply = openaiData.choices[0]?.message?.content || '';
                          console.log('[AI REPLY] OpenAI reply generated, length:', aiReply.length);
                        } else {
                          const errorBody = await openaiResponse.text();
                          console.error('[AI REPLY] OpenAI API error:', openaiResponse.status, errorBody);
                        }
                      } else if (profile.preferred_ai_provider === 'gemini' && profile.gemini_api_key) {
                        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${profile.text_model || 'gemini-pro'}:generateContent?key=${profile.gemini_api_key}`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            contents: [{
                              parts: [{
                                text: `${aiPrompt}\n\n${userMessage}`
                              }]
                            }],
                            generationConfig: {
                              maxOutputTokens: profile.max_tokens || 150,
                            }
                          }),
                        });
                        
                        if (geminiResponse.ok) {
                          const geminiData = await geminiResponse.json();
                          aiReply = geminiData.candidates[0]?.content?.parts[0]?.text || '';
                          console.log('[AI REPLY] Gemini reply generated, length:', aiReply.length);
                        } else {
                          const errorBody = await geminiResponse.text();
                          console.error('[AI REPLY] Gemini API error:', geminiResponse.status, errorBody);
                        }
                      }
                      
                      if (aiReply) {
                        replyText = aiReply.trim();
                        actionTaken = 'replied';
                        templateUsed = individualPostTemplate.id;
                        console.log('[WEBHOOK] AI reply generated successfully');
                      } else {
                        console.log('[WEBHOOK] Failed to generate AI reply, no fallback');
                      }
                    } else {
                      console.log('[WEBHOOK] No API key configured (provider:', profile?.preferred_ai_provider || 'none', ')');
                    }
                  } catch (aiError) {
                    console.error('[WEBHOOK] Error generating AI reply:', aiError);
                  }
                }
              } else if (individualPostTemplate.reply_mode === 'keyword_based') {
                // Check if we have new keyword_filters structure (multiple filter sets)
                if (individualPostTemplate.keyword_filters && Array.isArray(individualPostTemplate.keyword_filters) && individualPostTemplate.keyword_filters.length > 0) {
                  console.log('[WEBHOOK] Using keyword_filters array with', individualPostTemplate.keyword_filters.length, 'filter sets');
                  
                  for (const filter of individualPostTemplate.keyword_filters) {
                    if (!filter.keywords) continue;
                    
                    // Handle both array (new) and string (legacy) formats
                    const filterKeywords = Array.isArray(filter.keywords) 
                      ? filter.keywords 
                      : filter.keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
                    const matchType = filter.matchType || 'contains';
                    let keywordMatched = false;

                    if (matchType === 'exact') {
                      keywordMatched = filterKeywords.some((keyword: string) => 
                        messageLower === keyword.toLowerCase()
                      );
                    } else { // contains
                      keywordMatched = filterKeywords.some((keyword: string) => 
                        messageLower.includes(keyword.toLowerCase())
                      );
                    }

                    if (keywordMatched) {
                      console.log('[WEBHOOK] Matched filter set with keywords:', filter.keywords);
                      replyText = filter.replyMessage || '';
                      actionTaken = 'replied';
                      templateUsed = individualPostTemplate.id;
                      break;
                    }
                  }
                  
                  // If no filter matched and no_match_reply_message exists
                  if (actionTaken === 'no_action' && individualPostTemplate.no_match_reply_message) {
                    replyText = individualPostTemplate.no_match_reply_message;
                    actionTaken = 'replied';
                    templateUsed = individualPostTemplate.id;
                  }
                } else {
                  // Fallback to old trigger_keywords structure for backward compatibility
                  const triggerKeywords = individualPostTemplate.trigger_keywords || [];
                  let keywordMatched = false;

                  if (individualPostTemplate.match_type === 'exact') {
                    keywordMatched = triggerKeywords.some((keyword: string) => 
                      messageLower === keyword.toLowerCase()
                    );
                  } else { // contains
                    keywordMatched = triggerKeywords.some((keyword: string) => 
                      messageLower.includes(keyword.toLowerCase())
                    );
                  }

                  if (keywordMatched) {
                    replyText = individualPostTemplate.keyword_reply_message || '';
                    actionTaken = 'replied';
                    templateUsed = individualPostTemplate.id;
                  } else if (individualPostTemplate.no_match_reply_message) {
                    replyText = individualPostTemplate.no_match_reply_message;
                    actionTaken = 'replied';
                    templateUsed = individualPostTemplate.id;
                  }
                }
              }
            }
          }
        }
      }
    }

    // Priority 2: Check full_page templates if no individual post template matched
    if (actionTaken === 'no_action') {
      const fullPageTemplate = templates.find((t: any) => t.template_type === 'full_page');
      if (fullPageTemplate) {
        // Check exclusion keywords
        const excludeKeywords = fullPageTemplate.exclude_keywords || [];
        const hasExcludedKeyword = excludeKeywords.some((keyword: string) => 
          messageLower.includes(keyword.toLowerCase())
        );

        if (!hasExcludedKeyword) {
          // Check comment length
          const lengthValid = (
            (!fullPageTemplate.min_comment_length || message.length >= fullPageTemplate.min_comment_length) &&
            (!fullPageTemplate.max_comment_length || message.length <= fullPageTemplate.max_comment_length)
          );

          // Check if it's a reply and we should process it
          const shouldProcess = parentId === postId || fullPageTemplate.reply_to_replies;

          if (lengthValid && shouldProcess) {
            // Check for censored keywords (moderation)
            const censoredKeywords = fullPageTemplate.censored_keywords || [];
            const hasCensoredKeyword = censoredKeywords.some((keyword: string) => 
              messageLower.includes(keyword.toLowerCase())
            );

            if (hasCensoredKeyword && fullPageTemplate.moderation_action) {
              console.log('[WEBHOOK] Comment contains censored keyword, applying moderation');
              
              if (fullPageTemplate.moderation_action === 'hide' || fullPageTemplate.moderation_action === 'delete') {
                await fetch(`https://graph.facebook.com/v21.0/${commentId}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    is_hidden: true,
                    access_token: page.page_access_token,
                  }),
                });
                actionTaken = 'hidden';
              }
            }

            // Process reply based on reply_mode
            if (fullPageTemplate.reply_mode === 'generic') {
              replyText = fullPageTemplate.generic_message || '';
              actionTaken = 'replied';
              templateUsed = fullPageTemplate.id;
            } else if (fullPageTemplate.reply_mode === 'ai') {
              // AI-generated reply (same logic as individual post)
              if (fullPageTemplate.ai_prompt) {
                try {
                  const { data: profile } = await supabaseClient
                    .from('profiles')
                    .select('preferred_ai_provider, openai_api_key, gemini_api_key, text_model, max_tokens')
                    .eq('id', page.user_id)
                    .single();

                  console.log('[AI CONFIG] Full page template - Fetched profile:', { 
                    hasProfile: !!profile, 
                    provider: profile?.preferred_ai_provider,
                    hasOpenAI: !!profile?.openai_api_key,
                    hasGemini: !!profile?.gemini_api_key
                  });

                  if (profile && (profile.openai_api_key || profile.gemini_api_key)) {
                    console.log('[WEBHOOK] Generating AI reply for full_page template with provider:', profile.preferred_ai_provider);
                    
                    const aiPrompt = fullPageTemplate.ai_prompt;
                    const userMessage = `Comment from ${commenterName}: "${message}"\n\nPlease generate an appropriate reply.`;
                    
                    let aiReply = '';
                    
                    if (profile.preferred_ai_provider === 'openai' && profile.openai_api_key) {
                      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${profile.openai_api_key}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          model: profile.text_model || 'gpt-4o-mini',
                          messages: [
                            { role: 'system', content: aiPrompt },
                            { role: 'user', content: userMessage }
                          ],
                          max_tokens: profile.max_tokens || 150,
                        }),
                      });
                      
                      if (openaiResponse.ok) {
                        const openaiData = await openaiResponse.json();
                        aiReply = openaiData.choices[0]?.message?.content || '';
                        console.log('[AI REPLY] Full page - OpenAI reply generated, length:', aiReply.length);
                      } else {
                        const errorBody = await openaiResponse.text();
                        console.error('[AI REPLY] Full page - OpenAI API error:', openaiResponse.status, errorBody);
                      }
                    } else if (profile.preferred_ai_provider === 'gemini' && profile.gemini_api_key) {
                      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${profile.text_model || 'gemini-pro'}:generateContent?key=${profile.gemini_api_key}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          contents: [{
                            parts: [{
                              text: `${aiPrompt}\n\n${userMessage}`
                            }]
                          }],
                          generationConfig: {
                            maxOutputTokens: profile.max_tokens || 150,
                          }
                        }),
                      });
                      
                      if (geminiResponse.ok) {
                        const geminiData = await geminiResponse.json();
                        aiReply = geminiData.candidates[0]?.content?.parts[0]?.text || '';
                        console.log('[AI REPLY] Full page - Gemini reply generated, length:', aiReply.length);
                      } else {
                        const errorBody = await geminiResponse.text();
                        console.error('[AI REPLY] Full page - Gemini API error:', geminiResponse.status, errorBody);
                      }
                    }
                    
                    if (aiReply) {
                      replyText = aiReply.trim();
                      actionTaken = 'replied';
                      templateUsed = fullPageTemplate.id;
                    } else {
                      console.log('[WEBHOOK] Full page - Failed to generate AI reply');
                    }
                  } else {
                    console.log('[WEBHOOK] Full page - No API key configured (provider:', profile?.preferred_ai_provider || 'none', ')');
                  }
                } catch (aiError) {
                  console.error('[WEBHOOK] Error generating AI reply for full_page:', aiError);
                }
              }
            } else if (fullPageTemplate.reply_mode === 'keyword_based') {
              // Check keyword filters (same logic as individual post)
              if (fullPageTemplate.keyword_filters && Array.isArray(fullPageTemplate.keyword_filters) && fullPageTemplate.keyword_filters.length > 0) {
                for (const filter of fullPageTemplate.keyword_filters) {
                  if (!filter.keywords) continue;
                  
                  const filterKeywords = Array.isArray(filter.keywords) 
                    ? filter.keywords 
                    : filter.keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
                  const matchType = filter.matchType || 'contains';
                  let keywordMatched = false;

                  if (matchType === 'exact') {
                    keywordMatched = filterKeywords.some((keyword: string) => 
                      messageLower === keyword.toLowerCase()
                    );
                  } else {
                    keywordMatched = filterKeywords.some((keyword: string) => 
                      messageLower.includes(keyword.toLowerCase())
                    );
                  }

                  if (keywordMatched) {
                    replyText = filter.replyMessage || '';
                    actionTaken = 'replied';
                    templateUsed = fullPageTemplate.id;
                    break;
                  }
                }
                
                // If no filter matched and no_match_reply_message exists
                if (actionTaken === 'no_action' && fullPageTemplate.no_match_reply_message) {
                  replyText = fullPageTemplate.no_match_reply_message;
                  actionTaken = 'replied';
                  templateUsed = fullPageTemplate.id;
                }
              } else {
                // Fallback to old trigger_keywords structure
                const triggerKeywords = fullPageTemplate.trigger_keywords || [];
                let keywordMatched = false;

                if (fullPageTemplate.match_type === 'exact') {
                  keywordMatched = triggerKeywords.some((keyword: string) => 
                    messageLower === keyword.toLowerCase()
                  );
                } else {
                  keywordMatched = triggerKeywords.some((keyword: string) => 
                    messageLower.includes(keyword.toLowerCase())
                  );
                }

                if (keywordMatched) {
                  replyText = fullPageTemplate.keyword_reply_message || '';
                  actionTaken = 'replied';
                  templateUsed = fullPageTemplate.id;
                } else if (fullPageTemplate.no_match_reply_message) {
                  replyText = fullPageTemplate.no_match_reply_message;
                  actionTaken = 'replied';
                  templateUsed = fullPageTemplate.id;
                }
              }
            }
          }
        }
      }
    }

    // Priority 2: Check full_page templates if no individual post template matched
    if (actionTaken === 'no_action') {
      const fullPageTemplate = templates.find((t: any) => t.template_type === 'full_page');
      if (fullPageTemplate) {
        // Check whitelist/blacklist
        const whitelistUsers = fullPageTemplate.whitelist_users || [];
        const blacklistUsers = fullPageTemplate.blacklist_users || [];
        
        // If there's a whitelist and commenter is not on it, skip
        if (whitelistUsers.length > 0) {
          const isWhitelisted = whitelistUsers.some((user: string) => 
            commenterPsid === user || commenterName.toLowerCase().includes(user.toLowerCase())
          );
          if (!isWhitelisted) {
            console.log('[WEBHOOK] Commenter not on whitelist, skipping');
            return;
          }
        }
        
        // If commenter is blacklisted, skip
        if (blacklistUsers.length > 0) {
          const isBlacklisted = blacklistUsers.some((user: string) => 
            commenterPsid === user || commenterName.toLowerCase().includes(user.toLowerCase())
          );
          if (isBlacklisted) {
            console.log('[WEBHOOK] Commenter is blacklisted, skipping');
            return;
          }
        }
        
        // Check exclusion keywords
        const excludeKeywords = fullPageTemplate.exclude_keywords || [];
        const hasExcludedKeyword = excludeKeywords.some((keyword: string) => 
          messageLower.includes(keyword.toLowerCase())
        );

        if (!hasExcludedKeyword) {
          // Check comment length
          const lengthValid = (
            (!fullPageTemplate.min_comment_length || message.length >= fullPageTemplate.min_comment_length) &&
            (!fullPageTemplate.max_comment_length || message.length <= fullPageTemplate.max_comment_length)
          );

          // Check if it's a reply and we should process it
          const shouldProcess = parentId === postId || fullPageTemplate.reply_to_replies;

          if (lengthValid && shouldProcess) {
            // Check for censored keywords (moderation)
            const censoredKeywords = fullPageTemplate.censored_keywords || [];
            const hasCensoredKeyword = censoredKeywords.some((keyword: string) => 
              messageLower.includes(keyword.toLowerCase())
            );

            if (hasCensoredKeyword && fullPageTemplate.moderation_action) {
              console.log('[WEBHOOK] Comment contains censored keyword, applying moderation');
              
              if (fullPageTemplate.moderation_action === 'hide' || fullPageTemplate.moderation_action === 'delete') {
                await fetch(`https://graph.facebook.com/v21.0/${commentId}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    is_hidden: true,
                    access_token: page.page_access_token,
                  }),
                });
                actionTaken = 'hidden';
              }
            }

            // Process reply based on reply_mode
            if (fullPageTemplate.reply_mode === 'generic') {
              replyText = fullPageTemplate.generic_message || '';
              actionTaken = 'replied';
              templateUsed = fullPageTemplate.id;
            } else if (fullPageTemplate.reply_mode === 'ai') {
              // AI-generated reply
              if (fullPageTemplate.ai_prompt) {
                try {
                  const { data: profile } = await supabaseClient
                    .from('profiles')
                    .select('preferred_ai_provider, openai_api_key, gemini_api_key, text_model, max_tokens')
                    .eq('id', page.user_id)
                    .single();

                  console.log('[AI CONFIG] Full page general - Fetched profile:', { 
                    hasProfile: !!profile, 
                    provider: profile?.preferred_ai_provider,
                    hasOpenAI: !!profile?.openai_api_key,
                    hasGemini: !!profile?.gemini_api_key
                  });

                  if (profile && (profile.openai_api_key || profile.gemini_api_key)) {
                    console.log('[WEBHOOK] Generating AI reply for full_page template with provider:', profile.preferred_ai_provider);
                    
                    const aiPrompt = fullPageTemplate.ai_prompt;
                    const userMessage = `Comment from ${commenterName}: "${message}"\n\nPlease generate an appropriate reply.`;
                    
                    let aiReply = '';
                    
                    if (profile.preferred_ai_provider === 'openai' && profile.openai_api_key) {
                      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${profile.openai_api_key}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          model: profile.text_model || 'gpt-4o-mini',
                          messages: [
                            { role: 'system', content: aiPrompt },
                            { role: 'user', content: userMessage }
                          ],
                          max_tokens: profile.max_tokens || 150,
                        }),
                      });
                      
                      if (openaiResponse.ok) {
                        const openaiData = await openaiResponse.json();
                        aiReply = openaiData.choices[0]?.message?.content || '';
                        console.log('[AI REPLY] Full page general - OpenAI reply generated, length:', aiReply.length);
                      } else {
                        const errorBody = await openaiResponse.text();
                        console.error('[AI REPLY] Full page general - OpenAI API error:', openaiResponse.status, errorBody);
                      }
                    } else if (profile.preferred_ai_provider === 'gemini' && profile.gemini_api_key) {
                      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${profile.text_model || 'gemini-pro'}:generateContent?key=${profile.gemini_api_key}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          contents: [{
                            parts: [{
                              text: `${aiPrompt}\n\n${userMessage}`
                            }]
                          }],
                          generationConfig: {
                            maxOutputTokens: profile.max_tokens || 150,
                          }
                        }),
                      });
                      
                      if (geminiResponse.ok) {
                        const geminiData = await geminiResponse.json();
                        aiReply = geminiData.candidates[0]?.content?.parts[0]?.text || '';
                        console.log('[AI REPLY] Full page general - Gemini reply generated, length:', aiReply.length);
                      } else {
                        const errorBody = await geminiResponse.text();
                        console.error('[AI REPLY] Full page general - Gemini API error:', geminiResponse.status, errorBody);
                      }
                    }
                    
                    if (aiReply) {
                      replyText = aiReply.trim();
                      actionTaken = 'replied';
                      templateUsed = fullPageTemplate.id;
                    } else {
                      console.log('[WEBHOOK] Full page general - Failed to generate AI reply');
                    }
                  } else {
                    console.log('[WEBHOOK] Full page general - No API key configured (provider:', profile?.preferred_ai_provider || 'none', ')');
                  }
                } catch (aiError) {
                  console.error('[WEBHOOK] Error generating AI reply for full_page:', aiError);
                }
              }
            } else if (fullPageTemplate.reply_mode === 'keyword_based') {
              // Check keyword filters
              if (fullPageTemplate.keyword_filters && Array.isArray(fullPageTemplate.keyword_filters) && fullPageTemplate.keyword_filters.length > 0) {
                for (const filter of fullPageTemplate.keyword_filters) {
                  if (!filter.keywords) continue;
                  
                  const filterKeywords = Array.isArray(filter.keywords) 
                    ? filter.keywords 
                    : filter.keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
                  const matchType = filter.matchType || 'contains';
                  let keywordMatched = false;

                  if (matchType === 'exact') {
                    keywordMatched = filterKeywords.some((keyword: string) => 
                      messageLower === keyword.toLowerCase()
                    );
                  } else {
                    keywordMatched = filterKeywords.some((keyword: string) => 
                      messageLower.includes(keyword.toLowerCase())
                    );
                  }

                  if (keywordMatched) {
                    replyText = filter.replyMessage || '';
                    actionTaken = 'replied';
                    templateUsed = fullPageTemplate.id;
                    break;
                  }
                }
                
                // If no filter matched and no_match_reply_message exists
                if (actionTaken === 'no_action' && fullPageTemplate.no_match_reply_message) {
                  replyText = fullPageTemplate.no_match_reply_message;
                  actionTaken = 'replied';
                  templateUsed = fullPageTemplate.id;
                }
              } else {
                // Fallback to old trigger_keywords structure
                const triggerKeywords = fullPageTemplate.trigger_keywords || [];
                let keywordMatched = false;

                if (fullPageTemplate.match_type === 'exact') {
                  keywordMatched = triggerKeywords.some((keyword: string) => 
                    messageLower === keyword.toLowerCase()
                  );
                } else {
                  keywordMatched = triggerKeywords.some((keyword: string) => 
                    messageLower.includes(keyword.toLowerCase())
                  );
                }

                if (keywordMatched) {
                  replyText = fullPageTemplate.keyword_reply_message || '';
                  actionTaken = 'replied';
                  templateUsed = fullPageTemplate.id;
                } else if (fullPageTemplate.no_match_reply_message) {
                  replyText = fullPageTemplate.no_match_reply_message;
                  actionTaken = 'replied';
                  templateUsed = fullPageTemplate.id;
                }
              }
            }
          }
        }
      }
    }

    // Priority 3: If no action taken yet, check general templates
    if (actionTaken === 'no_action') {
      for (const template of templates.filter((t: any) => t.template_type === 'general')) {
        // Check exclusion keywords
        const excludeKeywords = template.exclude_keywords || [];
        const hasExcludedKeyword = excludeKeywords.some((keyword: string) => 
          messageLower.includes(keyword.toLowerCase())
        );

        if (hasExcludedKeyword) {
          console.log('[WEBHOOK] Comment contains excluded keyword, skipping');
          continue;
        }

        // Check comment length
        if (template.min_comment_length && message.length < template.min_comment_length) {
          continue;
        }
        if (template.max_comment_length && message.length > template.max_comment_length) {
          continue;
        }

        // Check if it's a reply and we should process it
        if (parentId !== postId && !template.reply_to_replies) {
          continue;
        }

        if (template.reply_mode === 'generic') {
          replyText = template.generic_message || '';
          actionTaken = 'replied';
          templateUsed = template.id;
          break;
        } else if (template.reply_mode === 'keyword_based') {
          // Check if we have new keyword_filters structure (multiple filter sets)
          if (template.keyword_filters && Array.isArray(template.keyword_filters) && template.keyword_filters.length > 0) {
            console.log('[WEBHOOK] Using keyword_filters array with', template.keyword_filters.length, 'filter sets');
            
            for (const filter of template.keyword_filters) {
              if (!filter.keywords) continue;
              
              // Handle both array (new) and string (legacy) formats
              const filterKeywords = Array.isArray(filter.keywords) 
                ? filter.keywords 
                : filter.keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
              const matchType = filter.matchType || 'contains';
              let keywordMatched = false;

              if (matchType === 'exact') {
                keywordMatched = filterKeywords.some((keyword: string) => 
                  messageLower === keyword.toLowerCase()
                );
              } else { // contains
                keywordMatched = filterKeywords.some((keyword: string) => 
                  messageLower.includes(keyword.toLowerCase())
                );
              }

              if (keywordMatched) {
                console.log('[WEBHOOK] Matched filter set with keywords:', filter.keywords);
                replyText = filter.replyMessage || '';
                actionTaken = 'replied';
                templateUsed = template.id;
                break;
              }
            }
            
            // If no filter matched and no_match_reply_message exists
            if (actionTaken === 'no_action' && template.no_match_reply_message) {
              replyText = template.no_match_reply_message;
              actionTaken = 'replied';
              templateUsed = template.id;
            }
            
            if (actionTaken === 'replied') break;
          } else {
            // Fallback to old trigger_keywords structure for backward compatibility
            const triggerKeywords = template.trigger_keywords || [];
            let keywordMatched = false;

            if (template.match_type === 'exact') {
              keywordMatched = triggerKeywords.some((keyword: string) => 
                messageLower === keyword.toLowerCase()
              );
            } else { // contains
              keywordMatched = triggerKeywords.some((keyword: string) => 
                messageLower.includes(keyword.toLowerCase())
              );
            }

            if (keywordMatched) {
              replyText = template.keyword_reply_message || '';
              actionTaken = 'replied';
              templateUsed = template.id;
              break;
            } else if (template.no_match_reply_message) {
              replyText = template.no_match_reply_message;
              actionTaken = 'replied';
              templateUsed = template.id;
              break;
            }
          }
        }
      }
    }

    // Send reply if needed
    if (actionTaken === 'replied' && replyText) {
      // Replace template variables with actual values
      let processedReply = replyText;
      
      // Split name into first and last name
      let firstName = '';
      let lastName = '';
      if (commenterName) {
        const nameParts = commenterName.trim().split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }
      
      console.log('[WEBHOOK] Original reply text:', replyText);
      console.log('[WEBHOOK] Commenter PSID:', commenterPsid);
      console.log('[WEBHOOK] Commenter Name:', commenterName);
      
      // Replace @{user} with @[PSID] mention format
      if (processedReply.includes('@{user}') && commenterPsid) {
        processedReply = processedReply.replace(/@\{user\}/g, `@[${commenterPsid}]`);
        console.log('[WEBHOOK] Replaced @{user} with mention format');
      }
      
      // Replace {name} with commenter full name (backward compatibility)
      if (processedReply.includes('{name}')) {
        processedReply = processedReply.replace(/\{name\}/g, commenterName);
      }

      // Replace {first_name} with first name
      if (processedReply.includes('{first_name}') && firstName) {
        processedReply = processedReply.replace(/\{first_name\}/g, firstName);
      }

      // Replace {last_name} with last name
      if (processedReply.includes('{last_name}') && lastName) {
        processedReply = processedReply.replace(/\{last_name\}/g, lastName);
      }
      
      console.log('[WEBHOOK] Processed reply text:', processedReply);
      
      const replyResponse = await fetch(`https://graph.facebook.com/v21.0/${commentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: processedReply,
          access_token: page.page_access_token,
        }),
      });

      const replyResult = await replyResponse.json();
      console.log('[WEBHOOK] Comment reply result:', replyResult);
      
      if (replyResult.error) {
        console.error('[WEBHOOK] Error sending reply:', replyResult.error);
      } else {
        // Check if we should send a DM after the reply
        const template = templates.find((t: any) => t.id === templateUsed);
        if (template?.send_dm_after_reply && template.dm_message_text && commenterPsid) {
          console.log('[WEBHOOK] Comment-to-DM automation enabled, checking conditions...');
          
          // Check DM conditions
          const dmConditions = template.dm_conditions || { always: true };
          let shouldSendDM = false;
          
          if (dmConditions.always) {
            shouldSendDM = true;
          } else if (dmConditions.keywords && Array.isArray(dmConditions.keywords)) {
            const keywords = dmConditions.keywords;
            shouldSendDM = keywords.some((keyword: string) => 
              messageLower.includes(keyword.toLowerCase())
            );
            console.log('[WEBHOOK] DM keyword match:', shouldSendDM);
          } else if (dmConditions.min_comment_length) {
            shouldSendDM = message.length >= dmConditions.min_comment_length;
            console.log('[WEBHOOK] DM length check:', shouldSendDM, message.length, '>=', dmConditions.min_comment_length);
          }
          
          if (shouldSendDM) {
            console.log('[WEBHOOK] DM conditions met, scheduling DM...');
            
            // Process DM message variables
            let dmMessage = template.dm_message_text;
            if (dmMessage.includes('{first_name}') && firstName) {
              dmMessage = dmMessage.replace(/\{first_name\}/g, firstName);
            }
            if (dmMessage.includes('{last_name}') && lastName) {
              dmMessage = dmMessage.replace(/\{last_name\}/g, lastName);
            }
            if (dmMessage.includes('{name}')) {
              dmMessage = dmMessage.replace(/\{name\}/g, commenterName);
            }
            
            const delaySeconds = template.dm_delay_seconds || 0;
            console.log('[WEBHOOK] Sending DM after', delaySeconds, 'seconds delay');
            
            // Send DM (with delay if specified)
            setTimeout(async () => {
              try {
                const dmResponse = await fetch(
                  `https://graph.facebook.com/v21.0/me/messages?access_token=${page.page_access_token}`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      recipient: { id: commenterPsid },
                      message: { text: dmMessage },
                    }),
                  }
                );
                
                const dmResult = await dmResponse.json();
                console.log('[WEBHOOK] DM send result:', dmResult);
                
                if (dmResult.error) {
                  console.error('[WEBHOOK] Error sending DM:', dmResult.error);
                } else {
                  console.log('[WEBHOOK] Comment-to-DM automation completed successfully');
                }
              } catch (dmError) {
                console.error('[WEBHOOK] Exception sending DM:', dmError);
              }
            }, delaySeconds * 1000);
          } else {
            console.log('[WEBHOOK] DM conditions not met, skipping DM');
          }
        }
      }
    }

    // Log the action
    await supabaseClient
      .from('comment_replies')
      .insert({
        user_id: page.user_id,
        page_id: page.id,
        template_id: templateUsed,
        comment_id: commentId,
        post_id: postId,
        comment_text: message,
        reply_text: replyText,
        action_taken: actionTaken,
        commenter_psid: commenterPsid,
        commenter_name: commenterName,
      });

    console.log('[WEBHOOK] Comment processed successfully:', actionTaken);
  } catch (error) {
    console.error('[WEBHOOK] Error processing comment:', error);
  }
}
