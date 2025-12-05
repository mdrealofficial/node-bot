import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ErrorLogRequest {
  error_type: string;
  error_code?: string;
  error_message: string;
  error_stack?: string;
  component?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user if authenticated
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const body: ErrorLogRequest = await req.json();
    
    // Validate required fields
    if (!body.error_type || !body.error_message) {
      return new Response(
        JSON.stringify({ error: "error_type and error_message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user agent
    const userAgent = req.headers.get("user-agent");

    // Insert error log
    const { data, error } = await supabase
      .from("system_error_logs")
      .insert({
        user_id: userId,
        error_type: body.error_type,
        error_code: body.error_code || null,
        error_message: body.error_message,
        error_stack: body.error_stack || null,
        component: body.component || null,
        severity: body.severity || 'error',
        metadata: body.metadata || {},
        user_agent: userAgent,
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting log:", error);
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in log-system-error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});