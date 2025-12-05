import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TemplatedEmailRequest {
  to: string;
  template_key: string;
  variables: Record<string, string>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { to, template_key, variables } = await req.json() as TemplatedEmailRequest;

    console.log(`[TEMPLATED-EMAIL] Sending template "${template_key}" to:`, to);

    // Fetch the template
    const { data: template, error: templateError } = await supabase
      .from('system_email_templates')
      .select('*')
      .eq('template_key', template_key)
      .single();

    if (templateError || !template) {
      console.error('[TEMPLATED-EMAIL] Template not found:', template_key);
      throw new Error(`Template "${template_key}" not found`);
    }

    // Check if template is active
    if (!template.is_active) {
      console.log(`[TEMPLATED-EMAIL] Template "${template_key}" is disabled, skipping email`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          skipped: true, 
          message: 'Template is disabled' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get app config for app_name
    const { data: config } = await supabase
      .from('admin_config')
      .select('app_name, app_domain')
      .single();

    // Build variables with defaults
    const allVariables: Record<string, string> = {
      app_name: config?.app_name || 'Our App',
      dashboard_url: `${config?.app_domain || 'https://app.example.com'}/dashboard`,
      support_url: `${config?.app_domain || 'https://app.example.com'}/support`,
      current_year: new Date().getFullYear().toString(),
      ...variables,
    };

    // Replace variables in subject and content
    let subject = template.subject;
    let htmlContent = template.html_content;
    let textContent = template.text_content || '';

    for (const [key, value] of Object.entries(allVariables)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      subject = subject.replace(regex, value);
      htmlContent = htmlContent.replace(regex, value);
      textContent = textContent.replace(regex, value);
    }

    console.log(`[TEMPLATED-EMAIL] Subject after replacement:`, subject);

    // Send email using the system email function
    const { data: emailResult, error: emailError } = await supabase.functions.invoke(
      'send-system-email',
      {
        body: {
          to,
          subject,
          html: htmlContent,
          text: textContent,
        },
      }
    );

    if (emailError) {
      console.error('[TEMPLATED-EMAIL] Send error:', emailError);
      throw emailError;
    }

    console.log(`[TEMPLATED-EMAIL] Email sent successfully to:`, to);

    return new Response(
      JSON.stringify({ 
        success: true, 
        template_key,
        to 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[TEMPLATED-EMAIL] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
