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
    videoUrl?: string;
    audioUrl?: string;
    fileUrl?: string;
    buttons?: Array<{ id: string; title: string; nextNode?: string }>;
    quickReplies?: Array<{ id: string; title: string; payload?: string }>;
    cards?: Array<{ title: string; subtitle?: string; imageUrl?: string; buttons?: Array<any> }>;
    carousel?: Array<{ id: string; imageUrl?: string; title?: string; subtitle?: string; buttons?: Array<any> }>;
    products?: string[];
    productSellingMethod?: 'direct_store' | 'details_store' | 'external_store';
    condition?: {
      field: string;
      operator: string;
      value: string;
      trueNode?: string;
      falseNode?: string;
    };
    inputType?: string;
    variableName?: string;
    delayDuration?: number;
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

    const { flowId, subscriberInstagramId, accessToken, conversationId, resumeFlowExecutionId, userResponse } = await req.json();

    // Handle flow resumption (when user responds to an input node)
    if (resumeFlowExecutionId && userResponse) {
      console.log(`Resuming Instagram flow execution ${resumeFlowExecutionId}`);
      const result = await resumeFlowWithInput(resumeFlowExecutionId, userResponse, supabase);
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: result.success ? 200 : 400 }
      );
    }

    if (!flowId || !subscriberInstagramId || !accessToken) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Executing Instagram flow ${flowId} for subscriber ${subscriberInstagramId}`);

    // Fetch flow data
    const { data: flow, error: flowError } = await supabase
      .from("instagram_chatbot_flows")
      .select("*")
      .eq("id", flowId)
      .single();

    if (flowError || !flow) {
      throw new Error("Flow not found");
    }

    // Create flow execution record
    const { data: execution, error: executionError } = await supabase
      .from("instagram_flow_executions")
      .insert({
        flow_id: flowId,
        user_id: flow.user_id,
        instagram_account_id: flow.instagram_account_id,
        subscriber_instagram_id: subscriberInstagramId,
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

    // Find start node
    const startingNode = flowData.nodes.find(n => n.type === "start" || n.id === "start");

    if (!startingNode) {
      throw new Error("No start node found in flow");
    }

    console.log(`Starting from node: ${startingNode.id}`);

    // Execute flow from start node
    const result = await executeNode(
      startingNode,
      flowData,
      subscriberInstagramId,
      accessToken,
      supabase,
      flowExecutionId,
      conversationId
    );

    // Update flow execution status
    if (flowExecutionId) {
      await supabase
        .from("instagram_flow_executions")
        .update({
          status: result.success ? "completed" : "failed",
          completed_at: new Date().toISOString(),
          error_message: result.error,
        })
        .eq("id", flowExecutionId);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error executing Instagram flow:", error);

    // Update flow execution status if we have an ID
    if (flowExecutionId) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        await supabase
          .from("instagram_flow_executions")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: error.message,
          })
          .eq("id", flowExecutionId);
      } catch (updateError) {
        console.error("Failed to update flow execution status:", updateError);
      }
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function executeNode(
  node: FlowNode,
  flowData: { nodes: FlowNode[]; edges: FlowEdge[] },
  recipientId: string,
  accessToken: string,
  supabase: any,
  flowExecutionId: string | null,
  conversationId?: string
): Promise<{ success: boolean; error?: string; waitingForInput?: boolean; inputNodeId?: string }> {
  const startTime = Date.now();
  console.log(`Executing node: ${node.id} (${node.type})`);

  try {
    // Record node execution
    if (flowExecutionId) {
      await supabase
        .from("instagram_node_executions")
        .insert({
          flow_execution_id: flowExecutionId,
          node_id: node.id,
          node_type: node.type,
          status: "running",
        });
    }

    let nextNodeId: string | undefined;

    // Handle different node types
    switch (node.type) {
      case "start":
        // Start node just passes to next node
        nextNodeId = findNextNode(node.id, flowData.edges);
        break;

      case "text":
        if (node.data.content) {
          await sendInstagramMessage(recipientId, node.data.content, accessToken);
        }
        nextNodeId = findNextNode(node.id, flowData.edges);
        break;

      case "image":
        if (node.data.imageUrl) {
          await sendInstagramMessage(recipientId, null, accessToken, {
            type: "image",
            payload: { url: node.data.imageUrl }
          });
        }
        nextNodeId = findNextNode(node.id, flowData.edges);
        break;

      case "video":
        if (node.data.videoUrl) {
          await sendInstagramMessage(recipientId, null, accessToken, {
            type: "video",
            payload: { url: node.data.videoUrl }
          });
        }
        nextNodeId = findNextNode(node.id, flowData.edges);
        break;

      case "button":
        if (node.data.content && node.data.buttons) {
          // Instagram doesn't support button templates in the same way as Facebook
          // Send the message text with numbered options
          let message = node.data.content + "\n\n";
          node.data.buttons.forEach((btn, idx) => {
            message += `${idx + 1}. ${btn.title}\n`;
          });
          await sendInstagramMessage(recipientId, message, accessToken);
        }
        // Don't auto-proceed - wait for user input
        return { success: true, waitingForInput: true, inputNodeId: node.id };

      case "input":
        // Send prompt and wait for user response
        if (node.data.content) {
          await sendInstagramMessage(recipientId, node.data.content, accessToken);
        }
        return { success: true, waitingForInput: true, inputNodeId: node.id };

      case "sequence":
        // Delay node - wait for specified duration
        if (node.data.delayDuration && node.data.delayDuration > 0) {
          await new Promise(resolve => setTimeout(resolve, (node.data.delayDuration || 0) * 1000));
        }
        nextNodeId = findNextNode(node.id, flowData.edges);
        break;

      case "condition":
        // Evaluate condition and branch
        const conditionMet = await evaluateCondition(node.data.condition, flowExecutionId, supabase);
        nextNodeId = conditionMet ? node.data.condition?.trueNode : node.data.condition?.falseNode;
        break;

      default:
        console.log(`Unknown node type: ${node.type}, skipping`);
        nextNodeId = findNextNode(node.id, flowData.edges);
    }

    // Record successful node execution
    if (flowExecutionId) {
      await supabase
        .from("instagram_node_executions")
        .update({
          status: "success",
          execution_time_ms: Date.now() - startTime,
        })
        .eq("flow_execution_id", flowExecutionId)
        .eq("node_id", node.id);
    }

    // Execute next node if exists
    if (nextNodeId) {
      const nextNode = flowData.nodes.find(n => n.id === nextNodeId);
      if (nextNode) {
        return await executeNode(nextNode, flowData, recipientId, accessToken, supabase, flowExecutionId, conversationId);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error(`Error executing node ${node.id}:`, error);

    // Record failed node execution
    if (flowExecutionId) {
      await supabase
        .from("instagram_node_executions")
        .update({
          status: "failed",
          error_message: error.message,
          execution_time_ms: Date.now() - startTime,
        })
        .eq("flow_execution_id", flowExecutionId)
        .eq("node_id", node.id);
    }

    return { success: false, error: error.message };
  }
}

async function resumeFlowWithInput(
  flowExecutionId: string,
  userResponse: string,
  supabase: any
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get flow execution
    const { data: execution, error: execError } = await supabase
      .from("instagram_flow_executions")
      .select("*, instagram_chatbot_flows(*), instagram_accounts(*)")
      .eq("id", flowExecutionId)
      .single();

    if (execError || !execution) {
      throw new Error("Flow execution not found");
    }

    // Find the last executed node
    const { data: lastNode } = await supabase
      .from("instagram_node_executions")
      .select("node_id, node_type")
      .eq("flow_execution_id", flowExecutionId)
      .order("executed_at", { ascending: false })
      .limit(1)
      .single();

    if (!lastNode) {
      throw new Error("No previous node execution found");
    }

    const flowData = execution.instagram_chatbot_flows.flow_data as { nodes: FlowNode[]; edges: FlowEdge[] };
    const currentNode = flowData.nodes.find(n => n.id === lastNode.node_id);

    if (!currentNode) {
      throw new Error("Current node not found in flow");
    }

    // Save user input
    if (currentNode.type === "input" && currentNode.data.variableName) {
      await supabase
        .from("instagram_flow_user_inputs")
        .insert({
          flow_execution_id: flowExecutionId,
          input_node_id: currentNode.id,
          variable_name: currentNode.data.variableName,
          user_response: userResponse,
        });
    }

    // Handle button responses
    if (currentNode.type === "button" && currentNode.data.buttons) {
      const buttonIndex = parseInt(userResponse) - 1;
      if (buttonIndex >= 0 && buttonIndex < currentNode.data.buttons.length) {
        const selectedButton = currentNode.data.buttons[buttonIndex];
        const nextNodeId = selectedButton.nextNode;

        if (nextNodeId) {
          const nextNode = flowData.nodes.find(n => n.id === nextNodeId);
          if (nextNode) {
            return await executeNode(
              nextNode,
              flowData,
              execution.subscriber_instagram_id,
              execution.instagram_accounts.access_token,
              supabase,
              flowExecutionId
            );
          }
        }
      }
    }

    // Continue to next node
    const nextNodeId = findNextNode(currentNode.id, flowData.edges);
    if (nextNodeId) {
      const nextNode = flowData.nodes.find(n => n.id === nextNodeId);
      if (nextNode) {
        return await executeNode(
          nextNode,
          flowData,
          execution.subscriber_instagram_id,
          execution.instagram_accounts.access_token,
          supabase,
          flowExecutionId
        );
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error resuming flow:", error);
    return { success: false, error: error.message };
  }
}

function findNextNode(currentNodeId: string, edges: FlowEdge[]): string | undefined {
  const edge = edges.find(e => e.source === currentNodeId);
  return edge?.target;
}

async function evaluateCondition(condition: any, flowExecutionId: string | null, supabase: any): Promise<boolean> {
  if (!condition || !flowExecutionId) return false;

  try {
    // Get user input for the specified field
    const { data: input } = await supabase
      .from("instagram_flow_user_inputs")
      .select("user_response")
      .eq("flow_execution_id", flowExecutionId)
      .eq("variable_name", condition.field)
      .single();

    if (!input) return false;

    const userValue = input.user_response.toLowerCase();
    const compareValue = condition.value.toLowerCase();

    switch (condition.operator) {
      case "equals":
        return userValue === compareValue;
      case "not_equals":
        return userValue !== compareValue;
      case "contains":
        return userValue.includes(compareValue);
      case "not_contains":
        return !userValue.includes(compareValue);
      case "starts_with":
        return userValue.startsWith(compareValue);
      case "ends_with":
        return userValue.endsWith(compareValue);
      default:
        return false;
    }
  } catch (error) {
    console.error("Error evaluating condition:", error);
    return false;
  }
}

async function sendInstagramMessage(
  recipientId: string,
  text: string | null,
  accessToken: string,
  attachment?: { type: string; payload: { url: string } }
): Promise<void> {
  const messagePayload: any = {
    recipient: { id: recipientId },
    message: {},
  };

  if (text) {
    messagePayload.message.text = text;
  }

  if (attachment) {
    messagePayload.message.attachment = attachment;
  }

  const response = await fetch(
    `https://graph.facebook.com/v21.0/me/messages?access_token=${accessToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messagePayload),
    }
  );

  const result = await response.json();

  if (!response.ok || result.error) {
    console.error("Instagram API error:", result.error);
    throw new Error(result.error?.message || "Failed to send message");
  }

  console.log("Instagram message sent successfully");
}
