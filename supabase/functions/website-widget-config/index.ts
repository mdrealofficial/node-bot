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
    const url = new URL(req.url);
    const widgetToken = url.searchParams.get('widget_token');
    const referer = req.headers.get('referer') || req.headers.get('origin');

    if (!widgetToken) {
      return new Response(
        JSON.stringify({ error: 'widget_token required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: widget, error } = await supabase
      .from('website_widgets')
      .select('*')
      .eq('widget_token', widgetToken)
      .eq('is_active', true)
      .single();

    if (error || !widget) {
      console.error('Widget not found:', error);
      return new Response(
        JSON.stringify({ error: 'Widget not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate domain whitelist if configured
    if (widget.domain_whitelist && widget.domain_whitelist.length > 0 && referer) {
      const refererHost = new URL(referer).hostname;
      const allowed = widget.domain_whitelist.some((domain: string) => {
        return refererHost === domain || refererHost.endsWith(`.${domain}`);
      });

      if (!allowed) {
        console.error('Domain not whitelisted:', refererHost);
        return new Response(
          JSON.stringify({ error: 'Domain not allowed' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Return public widget configuration
    const config = {
      widget_token: widget.widget_token,
      business_name: widget.business_name,
      primary_color: widget.primary_color,
      position: widget.position,
      welcome_message: widget.welcome_message,
      offline_message: widget.offline_message,
      avatar_url: widget.avatar_url,
      auto_response_enabled: widget.auto_response_enabled,
    };

    return new Response(
      JSON.stringify(config),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});