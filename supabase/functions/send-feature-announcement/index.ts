import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnnouncementRequest {
  announcementId: string;
}

interface AnnouncementData {
  id: string;
  title: string;
  message: string;
  target_roles: string[];
  feature_id: string | null;
  features: {
    name: string;
    description: string | null;
  } | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin access
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!userRole) {
      throw new Error("Admin access required");
    }

    const { announcementId }: AnnouncementRequest = await req.json();

    // Get announcement details
    const { data: announcementData, error: announcementError } = await supabase
      .from("feature_announcements")
      .select(`
        id,
        title,
        message,
        target_roles,
        feature_id,
        features:feature_id (
          name,
          description
        )
      `)
      .eq("id", announcementId)
      .single();

    if (announcementError || !announcementData) {
      throw new Error("Announcement not found");
    }

    const announcement = announcementData as unknown as AnnouncementData;

    // Get all users with matching roles and their profiles
    const { data: users, error: usersError } = await supabase
      .from("user_roles")
      .select(`
        user_id,
        profiles!inner (
          email,
          full_name
        )
      `)
      .in("role", announcement.target_roles);

    if (usersError) {
      throw new Error("Failed to fetch users");
    }

    console.log(`Sending announcement to ${users?.length || 0} users`);

    // Send emails to all users
    const emailPromises = users?.map(async (userRole: any) => {
      try {
        const email = userRole.profiles.email;
        const fullName = userRole.profiles.full_name || "User";

        await resend.emails.send({
          from: "Features <onboarding@resend.dev>",
          to: [email],
          subject: `🎉 New Feature: ${announcement.title}`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
                  .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
                  .feature-name { color: #667eea; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 10px; }
                  h1 { margin: 0 0 10px 0; font-size: 28px; }
                  h2 { color: #333; font-size: 20px; margin-top: 0; }
                  .message { background: #f7f9fc; padding: 20px; border-radius: 8px; margin: 20px 0; }
                  .cta { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
                  .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>🎉 New Feature Available!</h1>
                  </div>
                  <div class="content">
                    <p>Hi ${fullName},</p>
                    ${announcement.features ? `
                      <div class="feature-name">${announcement.features.name}</div>
                      ${announcement.features.description ? `<p style="color: #666;">${announcement.features.description}</p>` : ''}
                    ` : ''}
                    <h2>${announcement.title}</h2>
                    <div class="message">
                      ${announcement.message.replace(/\n/g, '<br>')}
                    </div>
                    <a href="${Deno.env.get("SITE_URL") || supabaseUrl}/dashboard" class="cta">Check it out now!</a>
                  </div>
                  <div class="footer">
                    <p>You're receiving this email because we've added a feature that might interest you.</p>
                  </div>
                </div>
              </body>
            </html>
          `,
        });

        console.log(`Email sent to ${email}`);
      } catch (error) {
        console.error(`Failed to send email to ${userRole.profiles.email}:`, error);
      }
    }) || [];

    await Promise.all(emailPromises);

    // Mark announcement as sent
    await supabase
      .from("feature_announcements")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", announcementId);

    console.log("Announcement sent successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Announcement sent to ${users?.length || 0} users` 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-feature-announcement function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
