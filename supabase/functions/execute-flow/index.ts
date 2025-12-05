import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FlowNode {
  id: string;
  type: string;
  data: {
    label?: string;
    content?: string;
    imageUrl?: string;
    buttons?: Array<{ id: string; title: string; nextNode?: string }>;
    products?: string[];
    productSellingMethod?: 'direct_store' | 'details_store' | 'external_store';
    condition?: {
      field: string;
      operator: string;
      value: string;
      trueNode?: string;
      falseNode?: string;
    };
  };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let flowExecutionId: string | null = null;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { flowId, recipientPsid, pageAccessToken, conversationId, resumeFlowExecutionId, userResponse, startFromNodeId } = await req.json();

    // Handle flow resumption (when user responds to an input node)
    if (resumeFlowExecutionId && userResponse) {
      console.log(`Resuming flow execution ${resumeFlowExecutionId}`);
      const result = await resumeFlowWithInput(resumeFlowExecutionId, userResponse, supabase);
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: result.success ? 200 : 400 }
      );
    }

    if (!flowId || !recipientPsid || !pageAccessToken) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Executing flow ${flowId} for recipient ${recipientPsid}`);

    // Fetch flow data
    const { data: flow, error: flowError } = await supabase
      .from("chatbot_flows")
      .select("*")
      .eq("id", flowId)
      .single();

    if (flowError || !flow) {
      throw new Error("Flow not found");
    }

    // Create flow execution record
    const { data: execution, error: executionError } = await supabase
      .from("flow_executions")
      .insert({
        flow_id: flowId,
        user_id: flow.user_id,
        page_id: flow.page_id,
        subscriber_psid: recipientPsid,
        status: "running",
      })
      .select()
      .single();

    if (executionError || !execution) {
      console.error("Failed to create flow execution record:", executionError);
    } else {
      flowExecutionId = execution.id;
    }

    const flowData = flow.flow_data as { nodes: FlowNode[]; edges: FlowEdge[] };
    
    console.log(`Flow has ${flowData.nodes.length} nodes and ${flowData.edges.length} edges`);
    console.log('Nodes:', JSON.stringify(flowData.nodes.map(n => ({ id: n.id, type: n.type }))));
    console.log('Edges:', JSON.stringify(flowData.edges));
    
    // Find starting node - either specified node or start node
    let startingNode: FlowNode | undefined;
    
    if (startFromNodeId) {
      console.log(`Looking for specific starting node: ${startFromNodeId}`);
      startingNode = flowData.nodes.find(n => n.id === startFromNodeId);
      if (!startingNode) {
        throw new Error(`Specified start node ${startFromNodeId} not found in flow`);
      }
      console.log(`Found specified starting node: ${startingNode.id} (${startingNode.type})`);
    } else {
      // Find start node
      startingNode = flowData.nodes.find(n => n.type === "start" || n.id === "start");
      if (!startingNode) {
        throw new Error("No start node found in flow");
      }
      console.log(`Found start node: ${startingNode.id}`);
    }

    // Execute flow from starting node
    await executeNode(
      startingNode,
      flowData.nodes,
      flowData.edges,
      recipientPsid,
      pageAccessToken,
      supabase,
      conversationId,
      flowExecutionId || undefined
    );

    // Mark flow execution as completed
    if (flowExecutionId) {
      await supabase
        .from("flow_executions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", flowExecutionId);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Flow executed successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error executing flow:", error);
    
    // Mark flow execution as failed
    if (flowExecutionId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      await supabase
        .from("flow_executions")
        .update({ 
          status: "failed", 
          completed_at: new Date().toISOString(),
          error_message: error.message 
        })
        .eq("id", flowExecutionId);
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function executeNode(
  node: FlowNode,
  allNodes: FlowNode[],
  edges: FlowEdge[],
  recipientPsid: string,
  pageAccessToken: string,
  supabase: any,
  conversationId?: string,
  flowExecutionId?: string
) {
  console.log(`Executing node: ${node.id} (${node.type})`);

  // Skip start node, just move to next
  if (node.type === "start") {
    console.log(`Looking for next node after start node ${node.id}`);
    const nextNode = findNextNode(node.id, edges, allNodes);
    if (nextNode) {
      console.log(`Found next node: ${nextNode.id} (${nextNode.type})`);
      await executeNode(nextNode, allNodes, edges, recipientPsid, pageAccessToken, supabase, conversationId, flowExecutionId);
    } else {
      console.log('No next node found after start - flow ends here');
    }
    return;
  }

  const startTime = Date.now();
  let nodeStatus = "success";
  let errorMessage: string | null = null;

  try {
    // Handle different node types
    switch (node.type) {
      case "text":
        await sendTextMessage(node, recipientPsid, pageAccessToken, supabase, conversationId, flowExecutionId, edges, allNodes);
        break;
      case "image":
        await sendImageMessage(node, recipientPsid, pageAccessToken, supabase, conversationId);
        break;
      case "video":
        await sendVideoMessage(node, recipientPsid, pageAccessToken, supabase, conversationId);
        break;
      case "audio":
        await sendAudioMessage(node, recipientPsid, pageAccessToken, supabase, conversationId);
        break;
      case "file":
        await sendFileMessage(node, recipientPsid, pageAccessToken, supabase, conversationId);
        break;
      case "product":
        await sendProductMessage(node, recipientPsid, pageAccessToken, supabase, conversationId);
        break;
      case "input":
        // Input nodes pause flow execution and wait for user response
        await sendInputPrompt(node, recipientPsid, pageAccessToken, supabase, conversationId, flowExecutionId);
        // Mark flow as waiting for input and store next node info
        if (flowExecutionId) {
          const nextNode = findNextNode(node.id, edges, allNodes);
          await supabase
            .from("flow_executions")
            .update({
              status: "waiting_for_input",
              error_message: JSON.stringify({
                input_node_id: node.id,
                variable_name: (node.data as any).variableName || "user_input",
                next_node_id: nextNode?.id,
              }),
            })
            .eq("id", flowExecutionId);
        }
        // Pause execution - webhook will resume when user responds
        return;
      case "button":
        await sendButtonMessage(node, recipientPsid, pageAccessToken, supabase, conversationId, flowExecutionId);
        break;
      case "carousel":
        await sendCarouselMessage(node, recipientPsid, pageAccessToken, supabase, conversationId, flowExecutionId, edges, allNodes);
        break;
      case "sequence":
        // Sequence nodes just pass through to next node
        const nextFromSequence = findNextNode(node.id, edges, allNodes);
        if (nextFromSequence) {
          await executeNode(nextFromSequence, allNodes, edges, recipientPsid, pageAccessToken, supabase, conversationId, flowExecutionId);
        }
        return;
      case "condition":
        // Evaluate condition and branch accordingly
        console.log("Evaluating condition node:", node.id);
        const conditionResult = await evaluateCondition(node, flowExecutionId, supabase);
        console.log(`Condition result: ${conditionResult}`);
        
        // Find the edge based on condition result
        const conditionEdge = edges.find(
          e => e.source === node.id && (e as any).sourceHandle === (conditionResult ? "true" : "false")
        );
        
        if (conditionEdge) {
          const nextFromCondition = allNodes.find(n => n.id === conditionEdge.target);
          if (nextFromCondition) {
            await executeNode(nextFromCondition, allNodes, edges, recipientPsid, pageAccessToken, supabase, conversationId, flowExecutionId);
          }
        } else {
          console.log(`No edge found for condition result: ${conditionResult}`);
        }
        return;
      case "ai":
        // AI message processing with user's API keys
        await sendAIMessage(node, recipientPsid, pageAccessToken, supabase, conversationId, flowExecutionId);
        break;
    }
  } catch (error: any) {
    console.error(`Error executing node ${node.id}:`, error);
    nodeStatus = "error";
    errorMessage = error.message;
  }

  const executionTime = Date.now() - startTime;

  // Log node execution
  if (flowExecutionId) {
    await supabase.from("node_executions").insert({
      flow_execution_id: flowExecutionId,
      node_id: node.id,
      node_type: node.type,
      status: nodeStatus,
      execution_time_ms: executionTime,
      error_message: errorMessage,
    });
  }

  // If node execution failed, stop the flow
  if (nodeStatus === "error") {
    throw new Error(`Node ${node.id} execution failed: ${errorMessage}`);
  }

  // Handle delay for sequence nodes
  if (node.type === "sequence" && (node.data as any).delay) {
    const delayMs = parseInt((node.data as any).delay) || 0;
    if (delayMs > 0) {
      console.log(`Waiting ${delayMs}ms before next message`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  } else {
    // Default wait between messages
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Find and execute next node
  // For text nodes, only continue via "message" handle, not "buttons" handle
  const nextNode = node.type === 'text' 
    ? findNextNode(node.id, edges, allNodes, 'message')
    : findNextNode(node.id, edges, allNodes);
    
  if (nextNode) {
    await executeNode(nextNode, allNodes, edges, recipientPsid, pageAccessToken, supabase, conversationId, flowExecutionId);
  }
}

function findNextNode(
  currentNodeId: string, 
  edges: FlowEdge[], 
  nodes: FlowNode[], 
  sourceHandle?: string
): FlowNode | null {
  const edge = edges.find(e => {
    if (e.source !== currentNodeId) return false;
    // If sourceHandle is specified, filter by it
    if (sourceHandle) {
      return (e as any).sourceHandle === sourceHandle;
    }
    return true;
  });
  
  if (!edge) return null;
  
  return nodes.find(n => n.id === edge.target) || null;
}

async function evaluateCondition(
  node: FlowNode,
  flowExecutionId: string | undefined,
  supabase: any
): Promise<boolean> {
  const condition = node.data.condition;
  
  if (!condition || !condition.field || !condition.operator) {
    console.log("Invalid condition structure, defaulting to false");
    return false;
  }

  if (!flowExecutionId) {
    console.log("No flow execution ID, cannot evaluate condition");
    return false;
  }

  // Get all collected user inputs for this flow execution
  const { data: userInputs, error } = await supabase
    .from("flow_user_inputs")
    .select("*")
    .eq("flow_execution_id", flowExecutionId);

  if (error) {
    console.error("Error fetching user inputs:", error);
    return false;
  }

  // Find the value for the specified field/variable
  const input = userInputs?.find((i: any) => i.variable_name === condition.field);
  const actualValue = input?.user_response || "";

  // Evaluate based on operator
  const expectedValue = String(condition.value || "").toLowerCase();
  const actualValueLower = String(actualValue).toLowerCase();

  console.log(`Evaluating: "${actualValue}" ${condition.operator} "${condition.value}"`);

  switch (condition.operator) {
    case "equals":
      return actualValueLower === expectedValue;
    case "not_equals":
      return actualValueLower !== expectedValue;
    case "contains":
      return actualValueLower.includes(expectedValue);
    case "not_contains":
      return !actualValueLower.includes(expectedValue);
    case "starts_with":
      return actualValueLower.startsWith(expectedValue);
    case "ends_with":
      return actualValueLower.endsWith(expectedValue);
    case "greater_than":
      return parseFloat(actualValue) > parseFloat(condition.value);
    case "less_than":
      return parseFloat(actualValue) < parseFloat(condition.value);
    case "is_empty":
      return !actualValue || actualValue.trim() === "";
    case "is_not_empty":
      return actualValue && actualValue.trim() !== "";
    default:
      console.log(`Unknown operator: ${condition.operator}`);
      return false;
  }
}

async function interpolateVariables(
  text: string,
  flowExecutionId: string | undefined,
  supabase: any
): Promise<string> {
  if (!flowExecutionId || !text.includes("{{")) {
    return text;
  }

  // Get all collected user inputs for this flow execution
  const { data: userInputs, error } = await supabase
    .from("flow_user_inputs")
    .select("*")
    .eq("flow_execution_id", flowExecutionId);

  if (error || !userInputs) {
    console.error("Error fetching user inputs for interpolation:", error);
    return text;
  }

  // Replace all {{variable_name}} with actual values
  let interpolatedText = text;
  const variableRegex = /\{\{(\w+)\}\}/g;
  let match;

  while ((match = variableRegex.exec(text)) !== null) {
    const variableName = match[1];
    const input = userInputs.find((i: any) => i.variable_name === variableName);
    const value = input?.user_response || `{{${variableName}}}`;
    interpolatedText = interpolatedText.replace(new RegExp(`\\{\\{${variableName}\\}\\}`, "g"), value);
  }

  console.log(`Interpolated text: "${text}" -> "${interpolatedText}"`);
  return interpolatedText;
}

async function sendTextMessage(
  node: FlowNode,
  recipientPsid: string,
  pageAccessToken: string,
  supabase: any,
  conversationId?: string,
  flowExecutionId?: string,
  edges?: FlowEdge[],
  allNodes?: FlowNode[]
) {
  let messageText = node.data.content || node.data.label || "Hello!";
  
  // Interpolate variables in the message text
  messageText = await interpolateVariables(messageText, flowExecutionId, supabase);
  
  console.log(`Sending text message to ${recipientPsid}: ${messageText}`);
  
  // Find button nodes connected via the "buttons" handle
  const buttonNodes: FlowNode[] = [];
  if (edges && allNodes) {
    const buttonEdges = edges.filter(
      e => e.source === node.id && (e as any).sourceHandle === "buttons"
    );
    buttonEdges.forEach(edge => {
      const buttonNode = allNodes.find(n => n.id === edge.target && n.type === "button");
      if (buttonNode) {
        buttonNodes.push(buttonNode);
      }
    });
  }
  
  // Find quick reply nodes connected via the "quickReplies" handle
  const quickReplyNodes: FlowNode[] = [];
  if (edges && allNodes) {
    const quickReplyEdges = edges.filter(
      e => e.source === node.id && (e as any).sourceHandle === "quickReplies"
    );
    quickReplyEdges.forEach(edge => {
      const quickReplyNode = allNodes.find(n => n.id === edge.target && n.type === "quickReply");
      if (quickReplyNode) {
        quickReplyNodes.push(quickReplyNode);
      }
    });
  }
  
  console.log(`Found ${buttonNodes.length} button nodes and ${quickReplyNodes.length} quick reply nodes connected to text node`);
  
  // If we have button nodes, send as button template; otherwise send as text
  if (buttonNodes.length > 0) {
    // Convert button nodes to Facebook button format
    const buttons = buttonNodes.slice(0, 3).map((btnNode: any) => {
      const buttonData = btnNode.data;
      const actionType = buttonData.actionType || 'next_message';
      
      if (actionType === 'url') {
        return {
          type: "web_url",
          title: buttonData.buttonName || "Visit",
          url: buttonData.url || "https://example.com"
        };
      } else if (actionType === 'call') {
        return {
          type: "phone_number",
          title: buttonData.buttonName || "Call",
          payload: buttonData.phoneNumber || "+1234567890"
        };
      } else {
        // next_message or start_flow - use postback
        return {
          type: "postback",
          title: buttonData.buttonName || "Continue",
          payload: JSON.stringify({
            type: actionType,
            nodeId: btnNode.id,
            flowId: buttonData.flowId
          })
        };
      }
    });
    
    // Send as button template
    const messageData = {
      recipient: { id: recipientPsid },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: messageText,
            buttons
          }
        }
      }
    };
    
    const response = await fetch(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
      }
    );
    
    const result = await response.json();
    
    if (!response.ok || result.error) {
      console.error("Failed to send button message:", result.error);
      throw new Error(result.error?.message || "Failed to send message");
    }
    
    // Store message in database
    if (conversationId) {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_type: "bot",
        message_text: messageText,
        facebook_message_id: result.message_id,
        status: "delivered",
      });
    }
    
    console.log("Button template sent successfully");
    return;
  }
  
  // No buttons - send as regular text with quick replies
  const messageData: any = {
    recipient: { id: recipientPsid },
    message: { text: messageText },
  };

  // Add quick replies from connected quick reply nodes
  if (quickReplyNodes.length > 0) {
    messageData.message.quick_replies = quickReplyNodes.slice(0, 13).map((qrNode: any) => {
      const qrData = qrNode.data;
      const actionType = qrData.actionType || 'next_message';
      
      return {
        content_type: "text",
        title: qrData.replyText || "Quick Reply",
        payload: JSON.stringify({
          type: actionType,
          nodeId: qrNode.id,
          flowId: qrData.flowId
        })
      };
    });
    console.log(`Added ${messageData.message.quick_replies.length} quick replies to message`);
  }

  // Add quick reply buttons if present (legacy format - for backward compatibility)
  if (!quickReplyNodes.length && node.data.buttons && Array.isArray(node.data.buttons) && node.data.buttons.length > 0) {
    messageData.message.quick_replies = node.data.buttons.slice(0, 13).map((btn: any) => ({
      content_type: "text",
      title: btn.title || btn.label || "Button",
      payload: btn.id || btn.title,
    }));
  }

  const response = await fetch(
    `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messageData),
    }
  );

  const result = await response.json();
  
  if (!response.ok || result.error) {
    console.error("Failed to send text message:", result.error);
    throw new Error(result.error?.message || "Failed to send message");
  }

  // Store message in database
  if (conversationId) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "bot",
      message_text: messageText,
      facebook_message_id: result.message_id,
      status: "delivered",
    });
  }

  console.log("Text message sent successfully");
}

async function sendImageMessage(
  node: FlowNode,
  recipientPsid: string,
  pageAccessToken: string,
  supabase: any,
  conversationId?: string
) {
  if (!node.data.imageUrl) {
    console.log("No image URL provided, skipping");
    return;
  }

  console.log(`Sending image message to ${recipientPsid}: ${node.data.imageUrl}`);

  const messageData = {
    recipient: { id: recipientPsid },
    message: {
      attachment: {
        type: "image",
        payload: { url: node.data.imageUrl },
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

  const result = await response.json();
  
  if (!response.ok || result.error) {
    console.error("Failed to send image:", result.error);
    throw new Error(result.error?.message || "Failed to send image");
  }

  if (conversationId) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "bot",
      message_text: "",
      facebook_message_id: result.message_id,
      status: "delivered",
      attachment_url: node.data.imageUrl,
      attachment_type: "image",
    });
  }

  console.log("Image sent successfully");
}

async function sendVideoMessage(
  node: FlowNode,
  recipientPsid: string,
  pageAccessToken: string,
  supabase: any,
  conversationId?: string
) {
  const videoUrl = (node.data as any).videoUrl;
  
  if (!videoUrl) {
    console.log("No video URL provided, skipping");
    return;
  }

  console.log(`Sending video message to ${recipientPsid}: ${videoUrl}`);

  const messageData = {
    recipient: { id: recipientPsid },
    message: {
      attachment: {
        type: "video",
        payload: { url: videoUrl },
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

  const result = await response.json();
  
  if (!response.ok || result.error) {
    console.error("Failed to send video:", result.error);
    throw new Error(result.error?.message || "Failed to send video");
  }

  if (conversationId) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "bot",
      message_text: "",
      facebook_message_id: result.message_id,
      status: "delivered",
      attachment_url: videoUrl,
      attachment_type: "video",
    });
  }

  console.log("Video sent successfully");
}

async function sendAudioMessage(
  node: FlowNode,
  recipientPsid: string,
  pageAccessToken: string,
  supabase: any,
  conversationId?: string
) {
  const audioUrl = (node.data as any).audioUrl;
  
  if (!audioUrl) {
    console.log("No audio URL provided, skipping");
    return;
  }

  console.log(`Sending audio message to ${recipientPsid}: ${audioUrl}`);

  const messageData = {
    recipient: { id: recipientPsid },
    message: {
      attachment: {
        type: "audio",
        payload: { url: audioUrl },
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

  const result = await response.json();
  
  if (!response.ok || result.error) {
    console.error("Failed to send audio:", result.error);
    throw new Error(result.error?.message || "Failed to send audio");
  }

  if (conversationId) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "bot",
      message_text: "",
      facebook_message_id: result.message_id,
      status: "delivered",
      attachment_url: audioUrl,
      attachment_type: "audio",
    });
  }

  console.log("Audio sent successfully");
}

async function sendFileMessage(
  node: FlowNode,
  recipientPsid: string,
  pageAccessToken: string,
  supabase: any,
  conversationId?: string
) {
  const fileUrl = (node.data as any).fileUrl;
  
  if (!fileUrl) {
    console.log("No file URL provided, skipping");
    return;
  }

  console.log(`Sending file message to ${recipientPsid}: ${fileUrl}`);

  const messageData = {
    recipient: { id: recipientPsid },
    message: {
      attachment: {
        type: "file",
        payload: { url: fileUrl },
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

  const result = await response.json();
  
  if (!response.ok || result.error) {
    console.error("Failed to send file:", result.error);
    throw new Error(result.error?.message || "Failed to send file");
  }

  if (conversationId) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "bot",
      message_text: "",
      facebook_message_id: result.message_id,
      status: "delivered",
      attachment_url: fileUrl,
      attachment_type: "file",
    });
  }

  console.log("File sent successfully");
}

async function sendAIMessage(
  node: FlowNode,
  recipientPsid: string,
  pageAccessToken: string,
  supabase: any,
  conversationId?: string,
  flowExecutionId?: string
) {
  const prompt = (node.data as any).prompt;
  
  if (!prompt) {
    console.log("No AI prompt provided, skipping");
    return;
  }

  console.log(`Processing AI message for ${recipientPsid} with prompt: ${prompt.slice(0, 50)}...`);

  // Get user's AI configuration from flow execution
  let userId: string | null = null;
  if (flowExecutionId) {
    const { data: execution } = await supabase
      .from("flow_executions")
      .select("user_id")
      .eq("id", flowExecutionId)
      .single();
    userId = execution?.user_id;
  }

  // Fetch user's AI configuration
  let aiConfig: any = null;
  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("openai_api_key, gemini_api_key, preferred_ai_provider, preferred_ai_model")
      .eq("id", userId)
      .single();
    aiConfig = profile;
  }

  console.log(`AI Config for user ${userId}:`, {
    provider: aiConfig?.preferred_ai_provider || 'lovable',
    model: aiConfig?.preferred_ai_model || 'default',
    hasOpenAIKey: !!aiConfig?.openai_api_key,
    hasGeminiKey: !!aiConfig?.gemini_api_key,
  });

  let aiResponse: string;

  // Use user's configured AI provider or fallback to Lovable AI
  if (aiConfig?.preferred_ai_provider === 'openai' && aiConfig?.openai_api_key) {
    aiResponse = await callOpenAI(prompt, aiConfig.openai_api_key, aiConfig.preferred_ai_model);
  } else if (aiConfig?.preferred_ai_provider === 'gemini' && aiConfig?.gemini_api_key) {
    aiResponse = await callGemini(prompt, aiConfig.gemini_api_key, aiConfig.preferred_ai_model);
  } else {
    // Use Lovable AI as default
    aiResponse = await callLovableAI(prompt);
  }

  // Send the AI response
  const messageData = {
    recipient: { id: recipientPsid },
    message: { text: aiResponse },
  };

  const response = await fetch(
    `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messageData),
    }
  );

  const result = await response.json();
  
  if (!response.ok || result.error) {
    console.error("Failed to send AI message:", result.error);
    throw new Error(result.error?.message || "Failed to send AI message");
  }

  if (conversationId) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "bot",
      message_text: aiResponse,
      facebook_message_id: result.message_id,
      status: "delivered",
    });
  }

  console.log("AI message sent successfully");
}

async function callOpenAI(prompt: string, apiKey: string, model: string): Promise<string> {
  console.log(`Calling OpenAI with model: ${model}`);
  
  const isNewerModel = ['gpt-5-2025-08-07', 'gpt-5-mini-2025-08-07', 'gpt-5-nano-2025-08-07', 'gpt-4.1-2025-04-14', 'o3-2025-04-16', 'o4-mini-2025-04-16'].includes(model);
  
  const requestBody: any = {
    model: model || 'gpt-5-2025-08-07',
    messages: [{ role: 'user', content: prompt }],
  };

  // Newer models use max_completion_tokens instead of max_tokens and don't support temperature
  if (isNewerModel) {
    requestBody.max_completion_tokens = 1000;
  } else {
    requestBody.max_tokens = 1000;
    requestBody.temperature = 0.7;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI API error:', error);
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response from AI';
}

async function callGemini(prompt: string, apiKey: string, model: string): Promise<string> {
  console.log(`Calling Gemini with model: ${model}`);
  
  const modelName = model || 'gemini-2.5-flash';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Gemini API error:', error);
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI';
}

async function callLovableAI(prompt: string): Promise<string> {
  console.log('Calling Lovable AI (default)');
  
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.warn('LOVABLE_API_KEY not configured, returning fallback response');
    return 'AI is not configured. Please configure your AI settings in the dashboard.';
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Lovable AI error:', error);
    throw new Error(`Lovable AI error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response from AI';
}

async function sendProductMessage(
  node: FlowNode,
  recipientPsid: string,
  pageAccessToken: string,
  supabase: any,
  conversationId?: string
) {
  const productIds = (node.data as any).products;
  const sellingMethod = (node.data as any).productSellingMethod || 'direct_store';
  
  if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
    console.log("No products defined, skipping");
    return;
  }

  console.log(`Sending product message to ${recipientPsid} with ${productIds.length} product(s) using ${sellingMethod} method`);

  // Fetch full product details with store info and images
  const { data: products, error } = await supabase
    .from("products")
    .select(`
      id, name, price, image_url, description, landing_page_url,
      store_id,
      stores!inner(slug, custom_domain, custom_domain_verified),
      product_variations(id, name, price_modifier, stock_quantity),
      product_images(image_url, is_primary, display_order)
    `)
    .in("id", productIds);

  if (error || !products || products.length === 0) {
    console.error("Failed to fetch products:", error);
    throw new Error("Failed to load product details");
  }

  // Handle different selling methods
  if (sellingMethod === 'direct_store') {
    // Method 1: Simple card with "Order Now" button linking to store
    await sendDirectStoreMessage(products, recipientPsid, pageAccessToken, supabase, conversationId);
  } else if (sellingMethod === 'details_store') {
    // Method 2: Send images + detailed message with variations linking to store
    await sendDetailsStoreMessage(products, recipientPsid, pageAccessToken, supabase, conversationId);
  } else if (sellingMethod === 'external_store') {
    // Method 3: Send images + detailed message with variations linking to landing page
    await sendExternalStoreMessage(products, recipientPsid, pageAccessToken, supabase, conversationId);
  }

  console.log("Product message sent successfully");
}

async function sendDirectStoreMessage(
  products: any[],
  recipientPsid: string,
  pageAccessToken: string,
  supabase: any,
  conversationId?: string
) {
  // Format products for Facebook generic template with "Order Now" button
  const elements = products.slice(0, 10).map((product: any) => {
    const store = product.stores;
    const productUrl = store.custom_domain_verified && store.custom_domain
      ? `https://${store.custom_domain}/product/${product.id}`
      : `https://${store.slug}.lovable.app/product/${product.id}`;

    const element: any = {
      title: product.name || "Product",
    };

    if (product.image_url) {
      element.image_url = product.image_url;
    }

    if (product.price) {
      element.subtitle = `Price: $${product.price}`;
    }

    // Add "Order Now" button
    element.buttons = [{
      type: "web_url",
      url: productUrl,
      title: "Order Now",
    }];

    return element;
  });

  const messageData = {
    recipient: { id: recipientPsid },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements,
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

  const result = await response.json();
  
  if (!response.ok || result.error) {
    console.error("Failed to send product message:", result.error);
    throw new Error(result.error?.message || "Failed to send product message");
  }

  if (conversationId) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "bot",
      message_text: `Products: ${products.map((p: any) => p.name).join(', ')}`,
      facebook_message_id: result.message_id,
      status: "delivered",
    });
  }
}

async function sendDetailsStoreMessage(
  products: any[],
  recipientPsid: string,
  pageAccessToken: string,
  supabase: any,
  conversationId?: string
) {
  console.log(`Sending product carousel with "More Info" buttons to ${recipientPsid}`);

  // Send carousel with "More Info" buttons
  const elements = products.slice(0, 10).map((product: any) => {
    const element: any = {
      title: product.name || "Product",
    };

    if (product.image_url) {
      element.image_url = product.image_url;
    }

    if (product.price) {
      element.subtitle = `Price: $${product.price}`;
    }

    // Add "More Info" button with postback to trigger detailed view
    element.buttons = [{
      type: "postback",
      title: "More Info",
      payload: JSON.stringify({
        action: "product_details",
        product_id: product.id,
      }),
    }];

    return element;
  });

  const messageData = {
    recipient: { id: recipientPsid },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements,
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

  const result = await response.json();
  
  if (!response.ok || result.error) {
    console.error("Failed to send product carousel:", result.error);
    throw new Error(result.error?.message || "Failed to send product carousel");
  }

  if (conversationId) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "bot",
      message_text: `Products: ${products.map((p: any) => p.name).join(', ')}`,
      facebook_message_id: result.message_id,
      status: "delivered",
    });
  }

  console.log("Product carousel sent successfully");
}

// Helper function to send detailed product information
async function sendProductDetailsMessage(
  productId: string,
  recipientPsid: string,
  pageAccessToken: string,
  supabase: any,
  conversationId?: string
) {
  console.log(`Sending detailed product info for ${productId} to ${recipientPsid}`);

  // Fetch product with all related data
  const { data: product, error: productError } = await supabase
    .from("products")
    .select(`
      *,
      stores (slug, custom_domain, custom_domain_verified),
      product_images (image_url, display_order, is_primary),
      product_variations (name, price_modifier, stock_quantity)
    `)
    .eq("id", productId)
    .single();

  if (productError || !product) {
    console.error("Failed to fetch product:", productError);
    throw new Error("Product not found");
  }

  // 1. Send up to 3 images from product gallery
  const images = product.product_images?.sort((a: any, b: any) => 
    (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || 
    (a.display_order || 0) - (b.display_order || 0)
  ) || [];

  for (const img of images.slice(0, 3)) {
    await sendImageFromUrl(img.image_url, recipientPsid, pageAccessToken);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 2. Build detailed message
  let detailsText = "";

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
    recipient: { id: recipientPsid },
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

  const response = await fetch(
    `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buttonMessageData),
    }
  );

  const result = await response.json();
  
  if (!response.ok || result.error) {
    console.error("Failed to send product details:", result.error);
    throw new Error(result.error?.message || "Failed to send product details");
  }

  if (conversationId) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "bot",
      message_text: detailsText,
      facebook_message_id: result.message_id,
      status: "delivered",
    });
  }

  console.log("Product details sent successfully");
}

async function sendExternalStoreMessage(
  products: any[],
  recipientPsid: string,
  pageAccessToken: string,
  supabase: any,
  conversationId?: string
) {
  console.log(`Sending product carousel with "More Info" buttons for external store to ${recipientPsid}`);

  // Send carousel with "More Info" buttons
  const elements = products.slice(0, 10).map((product: any) => {
    const element: any = {
      title: product.name || "Product",
    };

    if (product.image_url) {
      element.image_url = product.image_url;
    }

    if (product.price) {
      element.subtitle = `Price: $${product.price}`;
    }

    // Add "More Info" button with postback to trigger detailed view (external store)
    element.buttons = [{
      type: "postback",
      title: "More Info",
      payload: JSON.stringify({
        action: "product_external_details",
        product_id: product.id,
      }),
    }];

    return element;
  });

  const messageData = {
    recipient: { id: recipientPsid },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements,
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

  const result = await response.json();
  
  if (!response.ok || result.error) {
    console.error("Failed to send product carousel:", result.error);
    throw new Error(result.error?.message || "Failed to send product carousel");
  }

  if (conversationId) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "bot",
      message_text: `Products: ${products.map((p: any) => p.name).join(', ')}`,
      facebook_message_id: result.message_id,
      status: "delivered",
    });
  }

  console.log("Product carousel sent successfully");
}

async function sendImageFromUrl(
  imageUrl: string,
  recipientPsid: string,
  pageAccessToken: string
) {
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
    const error = await response.json();
    console.error("Failed to send image:", error);
  }
}

async function sendInputPrompt(
  node: FlowNode,
  recipientPsid: string,
  pageAccessToken: string,
  supabase: any,
  conversationId?: string,
  flowExecutionId?: string
) {
  let promptText = (node.data as any).promptText || (node.data as any).content || "Please provide your response:";
  
  // Interpolate variables in the prompt text
  promptText = await interpolateVariables(promptText, flowExecutionId, supabase);
  
  console.log(`Sending input prompt to ${recipientPsid}: ${promptText}`);

  const messageData = {
    recipient: { id: recipientPsid },
    message: {
      text: promptText,
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

  const result = await response.json();
  
  if (!response.ok || result.error) {
    console.error("Failed to send input prompt:", result.error);
    throw new Error(result.error?.message || "Failed to send input prompt");
  }

  if (conversationId) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "bot",
      message_text: promptText,
      facebook_message_id: result.message_id,
      status: "delivered",
    });
  }

  console.log("Input prompt sent successfully");
}

async function sendButtonMessage(
  node: FlowNode,
  recipientPsid: string,
  pageAccessToken: string,
  supabase: any,
  conversationId?: string,
  flowExecutionId?: string
) {
  if (!node.data.buttons || !Array.isArray(node.data.buttons) || node.data.buttons.length === 0) {
    console.log("No buttons defined, skipping");
    return;
  }

  console.log(`Sending button message to ${recipientPsid} with ${node.data.buttons.length} buttons`);

  const buttons = node.data.buttons.slice(0, 3).map((btn: any) => ({
    type: "postback",
    title: btn.title || btn.label || "Button",
    payload: btn.id || btn.title,
  }));

  let buttonText = node.data.content || node.data.label || "Choose an option:";
  
  // Interpolate variables in the button text
  buttonText = await interpolateVariables(buttonText, flowExecutionId, supabase);

  const messageData = {
    recipient: { id: recipientPsid },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: buttonText,
          buttons,
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

  const result = await response.json();
  
  if (!response.ok || result.error) {
    console.error("Failed to send button message:", result.error);
    throw new Error(result.error?.message || "Failed to send button message");
  }

  if (conversationId) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "bot",
      message_text: node.data.content || node.data.label || "Choose an option:",
      facebook_message_id: result.message_id,
      status: "delivered",
    });
  }

  console.log("Button message sent successfully");
}

async function sendCarouselMessage(
  node: FlowNode,
  recipientPsid: string,
  pageAccessToken: string,
  supabase: any,
  conversationId?: string,
  flowExecutionId?: string,
  edges?: FlowEdge[],
  allNodes?: FlowNode[]
) {
  // First, send the carousel text message if it exists
  const carouselText = (node.data as any).carouselText;
  if (carouselText && carouselText.trim()) {
    console.log("Sending carousel text message");
    const textData = {
      recipient: { id: recipientPsid },
      message: {
        text: await interpolateVariables(carouselText, flowExecutionId, supabase),
      },
    };

    await fetch(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(textData),
      }
    );
  }

  // Find all carousel item nodes connected via the "items" handle
  if (!edges || !allNodes) {
    console.log("No edges or nodes provided, skipping carousel");
    return;
  }

  const carouselItemEdges = edges.filter(
    e => e.source === node.id && (e as any).sourceHandle === 'items'
  );

  if (carouselItemEdges.length === 0) {
    console.log("No carousel items connected, skipping");
    return;
  }

  // Get all connected carousel item nodes
  const carouselItemNodes = carouselItemEdges
    .map(edge => allNodes.find(n => n.id === edge.target))
    .filter(n => n && n.type === 'carouselItem');

  if (carouselItemNodes.length === 0) {
    console.log("No valid carousel item nodes found, skipping");
    return;
  }

  console.log(`Sending carousel message to ${recipientPsid} with ${carouselItemNodes.length} cards`);
  console.log('[CAROUSEL] All edges:', JSON.stringify(edges));
  console.log('[CAROUSEL] All nodes:', JSON.stringify(allNodes.map(n => ({ id: n.id, type: n.type }))));

  // Format cards for Facebook generic template from connected carousel item nodes
  const elements = await Promise.all(carouselItemNodes.slice(0, 10).map(async (itemNode: any) => {
    const itemData = itemNode.data;
    console.log(`[CAROUSEL] Processing item ${itemNode.id}`);
    
    const element: any = {
      title: await interpolateVariables(itemData.title || "Card", flowExecutionId, supabase),
    };

    if (itemData.imageUrl) {
      element.image_url = itemData.imageUrl;
    }

    if (itemData.subtitle) {
      element.subtitle = await interpolateVariables(itemData.subtitle, flowExecutionId, supabase);
    }

    // Find button connected to this carousel item
    console.log(`[CAROUSEL] Looking for button edge from ${itemNode.id} with sourceHandle 'button'`);
    const buttonEdge = edges.find(
      e => e.source === itemNode.id && (e as any).sourceHandle === 'button'
    );
    console.log('[CAROUSEL] Found button edge:', buttonEdge);
    
    if (buttonEdge) {
      console.log(`[CAROUSEL] Button edge found, looking for button node ${buttonEdge.target}`);
      const buttonNode = allNodes.find(n => n.id === buttonEdge.target);
      console.log('[CAROUSEL] Found button node:', buttonNode ? { id: buttonNode.id, type: buttonNode.type, data: buttonNode.data } : null);
      
      if (buttonNode && buttonNode.type === 'button') {
        const buttonData = buttonNode.data as any;
        const actionType = buttonData.actionType || 'next_message';
        
        console.log(`[CAROUSEL] Button found for item ${itemNode.id}:`, {
          buttonNodeId: buttonNode.id,
          actionType,
          buttonName: buttonData.buttonName,
          url: buttonData.url,
          phoneNumber: buttonData.phoneNumber,
          flowId: buttonData.flowId,
          allButtonData: buttonData
        });
        
        // Always try to create a button if we have a button name
        if (!buttonData.buttonName) {
          console.warn('[CAROUSEL] Button has no name, skipping');
        } else if (actionType === 'url') {
          if (buttonData.url) {
            element.buttons = [{
              type: "web_url",
              title: buttonData.buttonName,
              url: buttonData.url
            }];
            console.log('[CAROUSEL] Added URL button:', element.buttons[0]);
          } else {
            console.warn('[CAROUSEL] URL button missing url field');
          }
        } else if (actionType === 'call') {
          if (buttonData.phoneNumber) {
            element.buttons = [{
              type: "phone_number",
              title: buttonData.buttonName,
              payload: buttonData.phoneNumber
            }];
            console.log('[CAROUSEL] Added call button:', element.buttons[0]);
          } else {
            console.warn('[CAROUSEL] Call button missing phoneNumber field');
          }
        } else if (actionType === 'start_flow') {
          if (buttonData.flowId) {
            element.buttons = [{
              type: "postback",
              title: buttonData.buttonName,
              payload: JSON.stringify({
                type: 'start_flow',
                flowId: buttonData.flowId
              })
            }];
            console.log('[CAROUSEL] Added start_flow button:', element.buttons[0]);
          } else {
            console.warn('[CAROUSEL] Start flow button missing flowId field');
          }
        } else if (actionType === 'next_message') {
          // For next_message, find the connected next node and create a postback to continue the flow
          const nextEdge = edges.find((e: any) => e.source === buttonNode.id);
          if (nextEdge) {
            const nextNode = allNodes.find(n => n.id === nextEdge.target);
            if (nextNode) {
              element.buttons = [{
                type: "postback",
                title: buttonData.buttonName,
                payload: JSON.stringify({
                  type: 'next_message',
                  nodeId: nextNode.id
                })
              }];
              console.log('[CAROUSEL] Added next_message button:', element.buttons[0]);
            } else {
              console.warn('[CAROUSEL] next_message button has no valid next node');
            }
          } else {
            console.warn('[CAROUSEL] next_message button has no connected edge');
          }
        }
      } else {
        console.warn('[CAROUSEL] Button node not found or wrong type:', { 
          buttonNodeExists: !!buttonNode, 
          buttonNodeType: buttonNode?.type 
        });
      }
    } else {
      console.log(`[CAROUSEL] No button edge found for item ${itemNode.id}`);
    }

    return element;
  }));

  // Find quick reply nodes connected to the carousel
  const quickReplyEdges = edges.filter(
    e => e.source === node.id && (e as any).sourceHandle === 'quickReplies'
  );
  
  const quickReplyNodes = quickReplyEdges
    .map(edge => allNodes.find(n => n.id === edge.target))
    .filter(n => n && n.type === 'quickReply');
  
  console.log(`[CAROUSEL] Found ${quickReplyNodes.length} quick reply nodes`);

  const messageData: any = {
    recipient: { id: recipientPsid },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements,
        },
      },
    },
  };

  // Add quick replies if any are connected
  if (quickReplyNodes.length > 0) {
    messageData.message.quick_replies = await Promise.all(
      quickReplyNodes.slice(0, 13).map(async (qrNode: any) => {
        const qrData = qrNode.data;
        const actionType = qrData.actionType || 'next_message';
        
        console.log(`[CAROUSEL] Processing quick reply: ${qrData.replyText}, action: ${actionType}`);
        
        let payload: any = { type: actionType };
        
        if (actionType === 'start_flow' && qrData.flowId) {
          payload.flowId = qrData.flowId;
        } else if (actionType === 'next_message') {
          // Find the connected next node
          const nextEdge = edges.find((e: any) => e.source === qrNode.id);
          if (nextEdge) {
            const nextNode = allNodes.find(n => n.id === nextEdge.target);
            if (nextNode) {
              payload.nodeId = nextNode.id;
            }
          }
        }
        
        return {
          content_type: "text",
          title: await interpolateVariables(qrData.replyText || "Reply", flowExecutionId, supabase),
          payload: JSON.stringify(payload)
        };
      })
    );
    console.log('[CAROUSEL] Added quick replies:', messageData.message.quick_replies);
  }

  const response = await fetch(
    `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messageData),
    }
  );

  const result = await response.json();
  
  if (!response.ok || result.error) {
    console.error("Failed to send carousel message:", result.error);
    throw new Error(result.error?.message || "Failed to send carousel message");
  }

  if (conversationId) {
    const firstItemData = carouselItemNodes[0]?.data as any;
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "bot",
      message_text: `Carousel: ${firstItemData?.title || 'Multiple items'}`,
      facebook_message_id: result.message_id,
      status: "delivered",
    });
  }

  console.log("Carousel message sent successfully");
}

// Helper function to resume a paused flow with user input
export async function resumeFlowWithInput(
  flowExecutionId: string,
  userResponse: string,
  supabase: any
) {
  console.log(`Resuming flow execution ${flowExecutionId} with user input`);

  // Get the paused flow execution
  const { data: execution, error: executionError } = await supabase
    .from("flow_executions")
    .select("*")
    .eq("id", flowExecutionId)
    .eq("status", "waiting_for_input")
    .single();

  if (executionError || !execution) {
    console.error("Flow execution not found or not waiting for input:", executionError);
    return { success: false, error: "Flow not found or not waiting for input" };
  }

  // Parse the stored input context
  const inputContext = JSON.parse(execution.error_message || "{}");
  const { input_node_id, variable_name, next_node_id } = inputContext;

  // Store the user's input
  await supabase.from("flow_user_inputs").insert({
    flow_execution_id: flowExecutionId,
    input_node_id,
    variable_name,
    user_response: userResponse,
  });

  // Update flow status back to running
  await supabase
    .from("flow_executions")
    .update({ status: "running", error_message: null })
    .eq("id", flowExecutionId);

  // Get flow data to continue execution
  const { data: flow } = await supabase
    .from("chatbot_flows")
    .select("*")
    .eq("id", execution.flow_id)
    .single();

  if (!flow || !next_node_id) {
    // No next node, mark as completed
    await supabase
      .from("flow_executions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", flowExecutionId);
    return { success: true, message: "Flow completed" };
  }

  const flowData = flow.flow_data as { nodes: FlowNode[]; edges: FlowEdge[] };
  const nextNode = flowData.nodes.find((n) => n.id === next_node_id);

  if (!nextNode) {
    await supabase
      .from("flow_executions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", flowExecutionId);
    return { success: true, message: "Flow completed - no next node" };
  }

  // Get page access token
  const { data: page } = await supabase
    .from("facebook_pages")
    .select("page_access_token")
    .eq("id", execution.page_id)
    .single();

  if (!page) {
    throw new Error("Page not found");
  }

  // Continue flow execution from next node
  try {
    await executeNode(
      nextNode,
      flowData.nodes,
      flowData.edges,
      execution.subscriber_psid,
      page.page_access_token,
      supabase,
      undefined,
      flowExecutionId
    );

    return { success: true, message: "Flow resumed successfully" };
  } catch (error: any) {
    console.error("Error resuming flow:", error);
    await supabase
      .from("flow_executions")
      .update({
        status: "failed",
        error_message: error.message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", flowExecutionId);
    return { success: false, error: error.message };
  }
}
