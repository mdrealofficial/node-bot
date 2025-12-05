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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { flowId, subscriberPhone, accountId, userId, triggerMessage } = await req.json();

    // Get flow data
    const { data: flow, error: flowError } = await supabaseClient
      .from('whatsapp_chatbot_flows')
      .select('*')
      .eq('id', flowId)
      .single();

    if (flowError || !flow) {
      throw new Error('Flow not found');
    }

    // Get WhatsApp account
    const { data: account } = await supabaseClient
      .from('whatsapp_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (!account) {
      throw new Error('WhatsApp account not found');
    }

    // Create flow execution record
    const { data: execution } = await supabaseClient
      .from('whatsapp_flow_executions')
      .insert({
        user_id: userId,
        flow_id: flowId,
        whatsapp_account_id: accountId,
        subscriber_phone: subscriberPhone,
        status: 'running',
      })
      .select()
      .single();

    // Execute flow nodes
    const flowData = flow.flow_data;
    const nodes = flowData.nodes || [];
    const edges = flowData.edges || [];

    // Find start node
    const startNode = nodes.find((n: any) => n.type === 'start');
    if (!startNode) {
      throw new Error('No start node found in flow');
    }

    // Execute nodes sequentially
    let currentNodeId = startNode.id;
    const executedNodes = new Set();

    while (currentNodeId && !executedNodes.has(currentNodeId)) {
      executedNodes.add(currentNodeId);
      
      const currentNode = nodes.find((n: any) => n.id === currentNodeId);
      if (!currentNode) break;

      console.log(`Executing node: ${currentNode.type}`);

      // Execute based on node type
      if (currentNode.type === 'text') {
        const messageText = currentNode.data?.text || '';
        
        // Send text message
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-send-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            phoneNumberId: account.phone_number_id,
            to: subscriberPhone,
            message: messageText,
            messageType: 'text',
          }),
        });
      } else if (currentNode.type === 'image') {
        const imageUrl = currentNode.data?.imageUrl || '';
        
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-send-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            phoneNumberId: account.phone_number_id,
            to: subscriberPhone,
            messageType: 'image',
            mediaUrl: imageUrl,
          }),
        });
      }

      // Find next node
      const nextEdge = edges.find((e: any) => e.source === currentNodeId);
      currentNodeId = nextEdge?.target || null;

      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Update execution status
    await supabaseClient
      .from('whatsapp_flow_executions')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', execution.id);

    return new Response(
      JSON.stringify({ success: true, executionId: execution.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error executing WhatsApp flow:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});