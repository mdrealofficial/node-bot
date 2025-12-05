import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to send subscription notifications
async function sendSubscriptionNotifications(
  supabase: any,
  userId: string,
  planName: string,
  repliesQuota: number,
  amountPaid: number
) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name, phone_number')
      .eq('id', userId)
      .single();

    const { data: config } = await supabase
      .from('admin_config')
      .select('system_smtp_from_name, system_smtp_enabled, system_sms_enabled, app_name')
      .single();

    const brandName = config?.app_name || config?.system_smtp_from_name || 'SmartReply';
    const resetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const formattedDate = resetDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Send Email
    if (config?.system_smtp_enabled && profile?.email) {
      console.log('Sending subscription email to:', profile.email);
      await supabase.functions.invoke('send-system-email', {
        body: {
          to: profile.email,
          subject: `✅ Subscription Activated - ${brandName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #10b981;">Subscription Confirmed!</h1>
              <p>Hi ${profile.full_name || 'there'},</p>
              <p>Your subscription has been successfully activated.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background: #f3f4f6;">
                  <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Plan</strong></td>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">${planName}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Monthly Quota</strong></td>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">${repliesQuota} replies</td>
                </tr>
                <tr style="background: #f3f4f6;">
                  <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Amount Paid</strong></td>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">৳${amountPaid}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Next Reset</strong></td>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">${formattedDate}</td>
                </tr>
              </table>
              <p>Thank you for subscribing!</p>
              <p>Best regards,<br>${brandName} Team</p>
            </div>
          `,
        }
      });
    }

    // Send SMS
    if (config?.system_sms_enabled && profile?.phone_number) {
      console.log('Sending subscription SMS to:', profile.phone_number);
      await supabase.functions.invoke('send-system-sms', {
        body: {
          phone: profile.phone_number,
          message: `${brandName}: Your ${planName} subscription is active! Quota: ${repliesQuota} replies. Amount: ৳${amountPaid}. Resets: ${formattedDate}`,
        }
      });
    }

    console.log('Subscription notifications sent successfully');
  } catch (error) {
    console.error('Error sending subscription notifications:', error);
    // Don't throw - notifications are not critical
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { pp_id } = await req.json();

    if (!pp_id) {
      throw new Error('Missing pp_id parameter');
    }

    console.log('Verifying Piprapay payment:', pp_id);

    // Get Piprapay config
    const { data: config, error: configError } = await supabase
      .from('admin_config')
      .select('piprapay_base_url, piprapay_api_key')
      .single();

    if (configError || !config?.piprapay_base_url || !config?.piprapay_api_key) {
      throw new Error('Piprapay not configured');
    }

    // Get our stored transaction to get plan_id, user_id, and metadata
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('charge_id', pp_id)
      .maybeSingle();

    if (transactionError) {
      console.error('Error fetching transaction:', transactionError);
    }

    if (!transaction) {
      console.error('Transaction not found for pp_id:', pp_id);
      throw new Error('Transaction not found');
    }

    console.log('Found transaction:', {
      id: transaction.id,
      user_id: transaction.user_id,
      plan_id: transaction.plan_id,
      transaction_type: transaction.transaction_type,
      status: transaction.status,
    });

    // Call Piprapay Verify Payment API
    console.log('Calling Piprapay verify API:', `${config.piprapay_base_url}/verify-payments`);
    
    const verifyResponse = await fetch(`${config.piprapay_base_url}/verify-payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'mh-piprapay-api-key': config.piprapay_api_key,
      },
      body: JSON.stringify({ pp_id }),
    });

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.text();
      console.error('Piprapay verification error:', {
        status: verifyResponse.status,
        body: errorData,
      });
      throw new Error(`Payment verification failed: ${errorData.substring(0, 200)}`);
    }

    const verifyData = await verifyResponse.json();
    console.log('Piprapay verification response:', verifyData);

    // Check if payment is successful
    const isSuccessful = verifyData.status === 'completed' || 
                        verifyData.payment_status === 'completed' ||
                        verifyData.success === true;

    const userId = transaction.user_id || transaction.metadata?.user_id;
    const planId = transaction.plan_id || transaction.metadata?.plan_id;

    let planName = transaction.metadata?.plan_name || '';
    let repliesQuota = transaction.metadata?.replies_quota || 0;

    if (isSuccessful) {
      console.log('Payment verified as successful. Processing subscription update...');

      if (userId && planId && transaction.transaction_type === 'subscription_payment') {
        // Get plan details
        const { data: plan, error: planError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', planId)
          .single();

        if (planError || !plan) {
          console.error('Plan not found:', planError);
        } else {
          planName = plan.plan_name;
          repliesQuota = plan.replies_quota;

          // Check if subscription exists for this user
          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

          const subscriptionData = {
            plan: plan.plan_name,
            replies_quota: plan.replies_quota,
            replies_used: 0,
            quota_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          };

          if (existingSub) {
            // UPDATE existing subscription
            console.log('Updating existing subscription for user:', userId);
            const { error: updateError } = await supabase
              .from('subscriptions')
              .update(subscriptionData)
              .eq('user_id', userId);

            if (updateError) {
              console.error('Error updating subscription:', updateError);
            } else {
              console.log('Subscription updated successfully');
            }
          } else {
            // INSERT new subscription
            console.log('Creating new subscription for user:', userId);
            const { error: insertError } = await supabase
              .from('subscriptions')
              .insert([{
                user_id: userId,
                ...subscriptionData,
                topup_credits_remaining: 0,
              }]);

            if (insertError) {
              console.error('Error inserting subscription:', insertError);
            } else {
              console.log('Subscription created successfully');
            }
          }

          // Send notifications
          await sendSubscriptionNotifications(
            supabase,
            userId,
            plan.plan_name,
            plan.replies_quota,
            transaction.amount
          );
        }
      } else if (userId && transaction.transaction_type === 'topup_purchase') {
        // Handle topup credit purchase
        const credits = transaction.metadata?.credits || 0;
        const { data: currentSub } = await supabase
          .from('subscriptions')
          .select('topup_credits_remaining')
          .eq('user_id', userId)
          .single();

        if (currentSub) {
          await supabase
            .from('subscriptions')
            .update({
              topup_credits_remaining: (currentSub.topup_credits_remaining || 0) + credits,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
          console.log('Topup credits added:', credits);
        }
      }

      // Update transaction to success (not 'completed' - CHECK constraint)
      const { error: updateTxError } = await supabase
        .from('payment_transactions')
        .update({
          status: 'success',
          metadata: {
            ...transaction.metadata,
            completed_at: new Date().toISOString(),
            piprapay_response: verifyData
          }
        })
        .eq('charge_id', pp_id);

      if (updateTxError) {
        console.error('Error updating transaction status:', updateTxError);
      } else {
        console.log('Transaction marked as completed');
      }
    } else {
      // Update transaction to failed
      console.log('Payment not successful. Marking as failed.');
      
      const { error: updateTxError } = await supabase
        .from('payment_transactions')
        .update({
          status: 'failed',
          metadata: {
            ...transaction.metadata,
            failure_reason: verifyData.message || verifyData.status || 'Payment not completed',
            failed_at: new Date().toISOString(),
            piprapay_response: verifyData
          }
        })
        .eq('charge_id', pp_id);

      if (updateTxError) {
        console.error('Error updating transaction status:', updateTxError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified: isSuccessful,
        data: verifyData,
        plan_name: planName,
        replies_quota: repliesQuota,
        amount: transaction.amount,
        failure_reason: !isSuccessful ? (verifyData.message || 'Payment not completed') : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
