import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const UpdateUserSchema = z.object({
  userId: z.string().uuid({ message: "Invalid user ID format" }),
  action: z.enum(['update', 'suspend', 'delete', 'update-profile', 'update-plan', 'update-credits', 'update-features', 'update-role']),
  email: z.string().email().max(255).optional(),
  password: z.string().min(6).max(72).optional(),
  suspended: z.boolean().optional(),
  // Profile fields
  phoneNumber: z.string().optional(),
  fullName: z.string().optional(),
  // Role field
  role: z.enum(['user', 'beta_user', 'test_user', 'staff', 'admin']).optional(),
  // Subscription fields
  plan: z.string().optional(),
  addRepliesQuota: z.number().optional(),
  addTopupCredits: z.number().optional(),
  resetUsage: z.boolean().optional(),
  // Feature fields
  sidebarSettings: z.object({
    sidebar_pages: z.boolean().optional(),
    sidebar_flow: z.boolean().optional(),
    sidebar_subscribers: z.boolean().optional(),
    sidebar_broadcast: z.boolean().optional(),
    sidebar_chat: z.boolean().optional(),
    sidebar_templates: z.boolean().optional(),
    sidebar_comment_replies: z.boolean().optional(),
    sidebar_store: z.boolean().optional(),
    sidebar_subscription: z.boolean().optional(),
    sidebar_analysis: z.boolean().optional(),
  }).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify the user is authenticated and is an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some(r => r.role === "admin") ?? false;
    
    if (!isAdmin) {
      throw new Error("Forbidden: Admin access required");
    }

    // Validate input
    const body = await req.json();
    const validationResult = UpdateUserSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: "Validation failed", 
          details: validationResult.error.errors 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { 
      userId, action, email, password, suspended,
      phoneNumber, fullName, plan, addRepliesQuota, addTopupCredits, resetUsage,
      sidebarSettings, role
    } = validationResult.data;

    console.log('Request received:', { userId, action });

    // Verify user exists first
    const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (getUserError || !existingUser) {
      console.error('User lookup error:', getUserError);
      throw new Error(`User not found: ${getUserError?.message || 'Unknown error'}`);
    }

    console.log('User found:', existingUser.user.email);

    let result: any = { success: true };

    // Handle different actions
    switch (action) {
      case 'delete': {
        console.log('Deleting user:', userId);
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (deleteError) {
          console.error('Delete error:', deleteError);
          throw deleteError;
        }
        result.message = "User deleted successfully";
        break;
      }

      case 'suspend': {
        console.log('Suspending/unsuspending user:', userId, 'suspended:', suspended);
        const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { 
            user_metadata: { 
              suspended: !suspended
            }
          }
        );

        if (updateError) {
          console.error('Suspend error:', updateError);
          throw updateError;
        }
        
        result.user = updatedUser;
        result.message = suspended ? "User unsuspended successfully" : "User suspended successfully";
        break;
      }

      case 'update': {
        console.log('Updating user:', userId);
        const updateData: any = {};
        if (email) updateData.email = email;
        if (password) updateData.password = password;

        if (Object.keys(updateData).length === 0) {
          throw new Error("No update data provided");
        }

        const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          updateData
        );

        if (updateError) {
          console.error('Update error:', updateError);
          throw updateError;
        }

        // If email was updated, also update in profiles
        if (email) {
          const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update({ email })
            .eq("id", userId);

          if (profileError) {
            console.error('Profile update error:', profileError);
            throw profileError;
          }
        }

        result.user = updatedUser;
        result.message = "User updated successfully";
        break;
      }

      case 'update-profile': {
        console.log('Updating profile:', userId);
        const profileUpdate: Record<string, any> = {};
        if (phoneNumber !== undefined) profileUpdate.phone_number = phoneNumber;
        if (fullName !== undefined) profileUpdate.full_name = fullName;

        if (Object.keys(profileUpdate).length === 0) {
          throw new Error("No profile data provided");
        }

        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update(profileUpdate)
          .eq("id", userId);

        if (profileError) {
          console.error('Profile update error:', profileError);
          throw profileError;
        }

        result.message = "Profile updated successfully";
        break;
      }

      case 'update-role': {
        console.log('Updating role:', userId, 'to', role);
        if (!role) {
          throw new Error("Role is required");
        }

        // Upsert the role (insert if not exists, update if exists)
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .upsert({
            user_id: userId,
            role: role,
          }, {
            onConflict: 'user_id,role'
          });

        if (roleError) {
          // If upsert fails, try delete + insert
          console.log('Upsert failed, trying delete + insert');
          
          // Delete existing role
          await supabaseAdmin
            .from("user_roles")
            .delete()
            .eq("user_id", userId);

          // Insert new role
          const { error: insertError } = await supabaseAdmin
            .from("user_roles")
            .insert({
              user_id: userId,
              role: role,
            });

          if (insertError) {
            console.error('Role insert error:', insertError);
            throw insertError;
          }
        }

        result.message = `Role updated to ${role}`;
        break;
      }

      case 'update-plan': {
        console.log('Updating plan:', userId, 'to', plan);
        if (!plan) {
          throw new Error("Plan is required");
        }

        // Get plan details from subscription_plans table
        const { data: planData, error: planError } = await supabaseAdmin
          .from("subscription_plans")
          .select("*")
          .eq("plan_name", plan)
          .single();

        if (planError && plan !== 'free' && plan !== 'trial') {
          console.error('Plan lookup error:', planError);
        }

        const repliesQuota = planData?.base_replies_quota || (plan === 'free' ? 50 : plan === 'trial' ? 100 : 500);

        const { error: subError } = await supabaseAdmin
          .from("subscriptions")
          .update({ 
            plan, 
            replies_quota: repliesQuota,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId);

        if (subError) {
          console.error('Subscription update error:', subError);
          throw subError;
        }

        result.message = `Plan updated to ${plan}`;
        break;
      }

      case 'update-credits': {
        console.log('Updating credits:', userId);
        
        // Get current subscription (use maybeSingle to handle missing record)
        const { data: currentSub, error: getSubError } = await supabaseAdmin
          .from("subscriptions")
          .select("replies_quota, replies_used, topup_credits_remaining")
          .eq("user_id", userId)
          .maybeSingle();

        if (getSubError) {
          console.error('Get subscription error:', getSubError);
          throw getSubError;
        }

        // If no subscription exists, create one
        if (!currentSub) {
          console.log('No subscription found, creating one for user:', userId);
          const newSub: Record<string, any> = {
            user_id: userId,
            plan: 'free',
            replies_quota: addRepliesQuota || 50,
            replies_used: 0,
            topup_credits_remaining: addTopupCredits || 0,
          };

          const { error: createSubError } = await supabaseAdmin
            .from("subscriptions")
            .insert(newSub);

          if (createSubError) {
            console.error('Create subscription error:', createSubError);
            throw createSubError;
          }

          result.message = "Subscription created and credits updated successfully";
          break;
        }

        const updateSub: Record<string, any> = { updated_at: new Date().toISOString() };

        if (addRepliesQuota && addRepliesQuota > 0) {
          updateSub.replies_quota = (currentSub.replies_quota || 0) + addRepliesQuota;
        }

        if (addTopupCredits && addTopupCredits > 0) {
          updateSub.topup_credits_remaining = (currentSub.topup_credits_remaining || 0) + addTopupCredits;
        }

        if (resetUsage) {
          updateSub.replies_used = 0;
        }

        const { error: subError } = await supabaseAdmin
          .from("subscriptions")
          .update(updateSub)
          .eq("user_id", userId);

        if (subError) {
          console.error('Credits update error:', subError);
          throw subError;
        }

        result.message = "Credits updated successfully";
        break;
      }

      case 'update-features': {
        console.log('Updating features:', userId);
        if (!sidebarSettings) {
          throw new Error("sidebarSettings is required");
        }

        const { error: settingsError } = await supabaseAdmin
          .from("user_settings")
          .update({ 
            ...sidebarSettings,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId);

        if (settingsError) {
          console.error('Settings update error:', settingsError);
          throw settingsError;
        }

        result.message = "Features updated successfully";
        break;
      }

      default:
        throw new Error("Invalid action");
    }

    console.log('Operation successful:', action);
    
    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in admin-update-user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: error.message === "Unauthorized" || error.message.includes("Forbidden") ? 403 : 400,
      }
    );
  }
});