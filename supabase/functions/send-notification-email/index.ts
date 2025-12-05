import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  user_id: string;
  notification_type: 'flow_execution' | 'order' | 'new_subscriber';
  data: {
    flow_name?: string;
    order_id?: string;
    subscriber_name?: string;
    page_name?: string;
  };
}

async function sendSystemEmail(to: string, subject: string, html: string, text?: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Get admin SMTP config
  const { data: config, error: configError } = await supabase
    .from('admin_config')
    .select('*')
    .single();

  if (configError) {
    console.error('[NOTIFICATION] Config error:', configError);
    throw new Error('Email service not configured');
  }

  // Try using admin-configured SMTP via send-system-email function
  if (config.system_smtp_enabled) {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-system-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ to, subject, html, text }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to send email via system SMTP');
    }
    return result;
  }

  // Fallback to Resend if SMTP not configured
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (resendApiKey) {
    const { Resend } = await import("https://esm.sh/resend@4.0.0");
    const resend = new Resend(resendApiKey);
    
    const emailResponse = await resend.emails.send({
      from: `${config.system_smtp_from_name || 'System'} <onboarding@resend.dev>`,
      to: [to],
      subject,
      html,
      text,
    });
    
    return emailResponse;
  }

  throw new Error('No email provider configured. Enable System SMTP or add RESEND_API_KEY.');
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, notification_type, data }: NotificationRequest = await req.json();

    console.log('[NOTIFICATION] Request:', { user_id, notification_type, data });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      console.error('[NOTIFICATION] Error fetching profile:', profileError);
      throw new Error('User profile not found');
    }

    // Get user settings
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    if (settingsError) {
      console.error('[NOTIFICATION] Error fetching settings:', settingsError);
    }

    // Get branding config for email template
    const { data: config } = await supabase
      .from('admin_config')
      .select('system_smtp_from_name')
      .single();

    const brandName = config?.system_smtp_from_name || 'SmartReply';

    // Check if user wants this notification type
    let shouldSend = false;
    let subject = '';
    let html = '';

    if (notification_type === 'flow_execution' && settings?.flow_execution_alerts && settings?.email_notifications) {
      shouldSend = true;
      subject = `🤖 Flow Executed - ${brandName}`;
      html = `
        <h1>Flow Executed Successfully</h1>
        <p>Hi ${profile.full_name || 'there'},</p>
        <p>Your chatbot flow <strong>${data.flow_name}</strong> was just executed on ${data.page_name}.</p>
        <p>You can view the execution details in your dashboard.</p>
        <p>Best regards,<br>${brandName} Team</p>
      `;
    } else if (notification_type === 'order' && settings?.order_notifications && settings?.email_notifications) {
      shouldSend = true;
      subject = `🛍️ New Order Received - ${brandName}`;
      html = `
        <h1>New Order Received</h1>
        <p>Hi ${profile.full_name || 'there'},</p>
        <p>You have received a new order (ID: ${data.order_id}).</p>
        <p>Check your store dashboard to view order details and process it.</p>
        <p>Best regards,<br>${brandName} Team</p>
      `;
    } else if (notification_type === 'new_subscriber' && settings?.new_subscriber_alerts && settings?.email_notifications) {
      shouldSend = true;
      subject = `👋 New Subscriber - ${brandName}`;
      html = `
        <h1>New Subscriber</h1>
        <p>Hi ${profile.full_name || 'there'},</p>
        <p>${data.subscriber_name || 'Someone'} just subscribed to your page <strong>${data.page_name}</strong>!</p>
        <p>You can engage with them through your live chat.</p>
        <p>Best regards,<br>${brandName} Team</p>
      `;
    }

    if (!shouldSend) {
      console.log('[NOTIFICATION] User has disabled this notification type');
      return new Response(
        JSON.stringify({ message: 'Notification disabled by user' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email using admin-configured SMTP
    const emailResponse = await sendSystemEmail(profile.email, subject, html);
    console.log("[NOTIFICATION] Email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent' }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[NOTIFICATION] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
