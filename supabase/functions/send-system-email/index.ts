import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
  isTest?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { to, subject, html, text, isTest } = await req.json() as EmailRequest;

    console.log('[SYSTEM-EMAIL] Sending email to:', to);

    // Get SMTP config from admin_config
    const { data: config, error: configError } = await supabase
      .from('admin_config')
      .select('*')
      .single();

    if (configError) {
      console.error('[SYSTEM-EMAIL] Config error:', configError);
      throw new Error('Failed to load SMTP configuration');
    }

    if (!config.system_smtp_enabled) {
      // Fallback to Resend if SMTP not configured
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (resendApiKey) {
        console.log('[SYSTEM-EMAIL] Using Resend fallback');
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'System <onboarding@resend.dev>',
            to: [to],
            subject,
            html,
            text,
          }),
        });

        const resendResult = await resendResponse.json();
        
        if (!resendResponse.ok) {
          throw new Error(resendResult.message || 'Failed to send via Resend');
        }

        return new Response(JSON.stringify({ success: true, provider: 'resend' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      throw new Error('No email provider configured. Enable SMTP or add RESEND_API_KEY.');
    }

    // Use nodemailer-compatible SMTP sending
    const smtpHost = config.system_smtp_host;
    const smtpPort = config.system_smtp_port || 587;
    const smtpSecure = config.system_smtp_secure;
    const smtpUsername = config.system_smtp_username;
    const smtpPassword = config.system_smtp_password;
    const fromEmail = config.system_smtp_from_email || smtpUsername;
    const fromName = config.system_smtp_from_name || 'System';

    if (!smtpHost || !smtpUsername || !smtpPassword) {
      throw new Error('SMTP configuration incomplete');
    }

    // For Deno, we'll use a simple SMTP implementation via fetch to a mail API
    // Or use the Resend API which is more reliable
    // Since direct SMTP from edge functions is complex, we'll use mail API approach
    
    // Try Resend first if available (it's more reliable for edge functions)
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      console.log('[SYSTEM-EMAIL] Using Resend with custom from address');
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [to],
          subject,
          html,
          text,
        }),
      });

      const resendResult = await resendResponse.json();
      
      if (!resendResponse.ok) {
        // If domain not verified, fallback to default
        if (resendResult.message?.includes('domain')) {
          const fallbackResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: `${fromName} <onboarding@resend.dev>`,
              to: [to],
              subject,
              html,
              text,
            }),
          });
          
          const fallbackResult = await fallbackResponse.json();
          if (!fallbackResponse.ok) {
            throw new Error(fallbackResult.message || 'Failed to send email');
          }
          
          return new Response(JSON.stringify({ success: true, provider: 'resend-fallback' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(resendResult.message || 'Failed to send via Resend');
      }

      return new Response(JSON.stringify({ success: true, provider: 'resend' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Email sending requires RESEND_API_KEY. Configure it in secrets.');

  } catch (error: any) {
    console.error('[SYSTEM-EMAIL] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});