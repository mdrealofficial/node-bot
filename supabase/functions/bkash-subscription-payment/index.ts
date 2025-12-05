import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BKashConfig {
  app_key: string;
  app_secret: string;
  username: string;
  password: string;
  sandbox_mode: boolean;
}

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, planId, topupPackageId, userId, paymentId, returnUrl, callbackOrigin, isTopup } = await req.json();

    // Get admin bKash configuration
    const { data: adminConfig, error: configError } = await supabaseClient
      .from('admin_config')
      .select('id, bkash_app_key, bkash_app_secret, bkash_app_username, bkash_app_password, bkash_sandbox_mode, site_url, app_domain')
      .single();

    if (configError || !adminConfig) {
      console.error('Admin config not found or error:', configError);
      return new Response(
        JSON.stringify({ error: 'Admin configuration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!adminConfig.bkash_app_key || !adminConfig.bkash_app_secret || !adminConfig.bkash_app_username || !adminConfig.bkash_app_password) {
      console.error('bKash credentials not configured. Please configure in Admin > Payment Settings');
      return new Response(
        JSON.stringify({ 
          error: 'bKash payment gateway not configured', 
          message: 'Please configure bKash credentials in Admin > Payment Settings to enable subscription payments.',
          details: 'Missing required bKash credentials (App Key, App Secret, Username, or Password)'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config: BKashConfig = {
      app_key: adminConfig.bkash_app_key,
      app_secret: adminConfig.bkash_app_secret,
      username: adminConfig.bkash_app_username,
      password: adminConfig.bkash_app_password,
      sandbox_mode: adminConfig.bkash_sandbox_mode ?? true,
    };

    const baseUrl = config.sandbox_mode
      ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
      : 'https://tokenized.pay.bka.sh/v1.2.0-beta';

    // Determine frontend base URL for redirecting back after payment
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const rawFrontendBaseUrl = callbackOrigin || (adminConfig.site_url as string | null) || (adminConfig.app_domain as string | null) || supabaseUrl.replace('.supabase.co', '.lovable.app');
    const frontendBaseUrl = rawFrontendBaseUrl.replace(/\/+$/, '');

    console.log('Processing bKash subscription action:', action, 'Sandbox mode:', config.sandbox_mode, 'Frontend base URL:', frontendBaseUrl);

    // Get Grant Token
    const getGrantToken = async (): Promise<string> => {
      console.log('Requesting bKash grant token from:', `${baseUrl}/tokenized/checkout/token/grant`);
      
      const response = await fetch(`${baseUrl}/tokenized/checkout/token/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'username': config.username,
          'password': config.password,
        },
        body: JSON.stringify({
          app_key: config.app_key,
          app_secret: config.app_secret,
        }),
      });

      const data = await response.json();
      console.log('Grant token response status:', response.status);

      if (!response.ok || !data.id_token) {
        const errorMsg = data.statusMessage || data.errorMessage || 'Failed to get grant token';
        console.error('bKash authentication failed:', errorMsg);
        throw new Error(`bKash authentication failed: ${errorMsg}. Please verify your bKash credentials in Admin > Payment Settings.`);
      }

      return data.id_token;
    };

    switch (action) {
      case 'create_payment': {
        const token = await getGrantToken();

        let itemDetails: any;
        let transactionType: string;
        let itemId: string;

        if (isTopup) {
          // Get topup package details
          const { data: topup, error: topupError } = await supabaseClient
            .from('quota_topup_packages')
            .select('*')
            .eq('id', topupPackageId)
            .single();

          if (topupError || !topup) {
            throw new Error('Topup package not found');
          }

          itemDetails = {
            price: topup.price,
            name: topup.name,
            credits: topup.credits
          };
          transactionType = 'topup_purchase';
          itemId = topupPackageId;
        } else {
          // Get plan details
          const { data: plan, error: planError } = await supabaseClient
            .from('subscription_plans')
            .select('plan_name, monthly_price, replies_quota')
            .eq('id', planId)
            .single();

          if (planError || !plan) {
            throw new Error('Subscription plan not found');
          }

          itemDetails = {
            price: plan.monthly_price,
            name: plan.plan_name,
            replies_quota: plan.replies_quota
          };
          transactionType = 'subscription_payment';
          itemId = planId;
        }

        // Get user's store (if exists) - for store_id field
        const { data: storeData } = await supabaseClient
          .from('stores')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        // Get user details
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('full_name, email')
          .eq('id', userId)
          .single();

        // Redirect to subscription page for inline processing
        const callbackURL = `${frontendBaseUrl}/dashboard?tab=subscription&paymentStatus=processing&gateway=bkash`;
        
        const createPaymentResponse = await fetch(`${baseUrl}/tokenized/checkout/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
            'X-APP-Key': config.app_key,
          },
          body: JSON.stringify({
            mode: '0011',
            payerReference: userId,
            callbackURL,
            amount: itemDetails.price.toString(),
            currency: 'BDT',
            intent: 'sale',
            merchantInvoiceNumber: `${isTopup ? 'TOP' : 'SUB'}-${Date.now()}`,
          }),
        });

        const paymentData = await createPaymentResponse.json();
        console.log('Create payment response:', paymentData);

        if (!createPaymentResponse.ok || !paymentData.paymentID) {
          throw new Error(paymentData.statusMessage || 'Failed to create payment');
        }

        // Store payment transaction with user_id column set directly
        const transactionData: any = {
          payment_id: paymentData.paymentID,
          user_id: userId, // Set user_id column directly
          payment_method: 'bkash',
          amount: itemDetails.price,
          status: 'pending',
          transaction_type: isTopup ? 'topup_purchase' : 'subscription_payment',
          metadata: {
            user_id: userId,
            item_name: itemDetails.name,
            transaction_type: transactionType,
            ...(isTopup 
              ? { topup_package_id: topupPackageId, credits: itemDetails.credits } 
              : { plan_name: itemDetails.name, replies_quota: itemDetails.replies_quota }
            ),
          },
        };

        // Add plan_id for subscription transactions
        if (!isTopup) {
          transactionData.plan_id = planId;
        }

        // Only add store_id if user has a store
        if (storeData?.id) {
          transactionData.store_id = storeData.id;
        }

        const { error: insertError } = await supabaseClient
          .from('payment_transactions')
          .insert(transactionData);

        if (insertError) {
          console.error('Transaction insert error:', insertError);
          throw new Error(`Failed to create transaction record: ${insertError.message}`);
        }
        console.log('Transaction created successfully with user_id:', userId);

        return new Response(
          JSON.stringify({
            paymentId: paymentData.paymentID,
            bkashURL: paymentData.bkashURL,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'execute_payment': {
        const token = await getGrantToken();

        const executeResponse = await fetch(`${baseUrl}/tokenized/checkout/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
            'X-APP-Key': config.app_key,
          },
          body: JSON.stringify({
            paymentID: paymentId,
          }),
        });

        const executeData = await executeResponse.json();
        console.log('Execute payment response:', executeData);

        if (!executeResponse.ok || executeData.transactionStatus !== 'Completed') {
          // Update transaction as failed
          await supabaseClient
            .from('payment_transactions')
            .update({
              status: 'failed',
              metadata: {
                failure_reason: executeData.statusMessage || 'Payment execution failed',
                failed_at: new Date().toISOString()
              }
            })
            .eq('payment_id', paymentId);

          throw new Error(executeData.statusMessage || 'Payment execution failed');
        }

        // Get transaction to find plan or topup
        const { data: transaction, error: transactionError } = await supabaseClient
          .from('payment_transactions')
          .select('plan_id, transaction_type, metadata, user_id, amount')
          .eq('payment_id', paymentId)
          .single();

        if (transactionError || !transaction) {
          console.error('Transaction not found:', transactionError);
          throw new Error('Transaction not found');
        }

        const txUserId = transaction.user_id || transaction.metadata?.user_id;

        if (transaction.transaction_type === 'topup_purchase') {
          // Add topup credits to user's remaining credits
          const credits = transaction.metadata?.credits || 0;
          const { data: currentSub } = await supabaseClient
            .from('subscriptions')
            .select('topup_credits_remaining')
            .eq('user_id', txUserId)
            .single();

          await supabaseClient
            .from('subscriptions')
            .update({
              topup_credits_remaining: (currentSub?.topup_credits_remaining || 0) + credits,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', txUserId);
        } else if (transaction.plan_id) {
          // Get plan details for subscription
          const { data: plan } = await supabaseClient
            .from('subscription_plans')
            .select('plan_name, replies_quota')
            .eq('id', transaction.plan_id)
            .single();

          if (plan) {
            // Check if subscription exists for this user
            const { data: existingSub } = await supabaseClient
              .from('subscriptions')
              .select('id')
              .eq('user_id', txUserId)
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
              console.log('Updating existing subscription for user:', txUserId);
              await supabaseClient
                .from('subscriptions')
                .update(subscriptionData)
                .eq('user_id', txUserId);
            } else {
              // INSERT new subscription
              console.log('Creating new subscription for user:', txUserId);
              await supabaseClient
                .from('subscriptions')
                .insert([{
                  user_id: txUserId,
                  ...subscriptionData,
                  topup_credits_remaining: 0,
                }]);
            }

            // Send notifications
            await sendSubscriptionNotifications(
              supabaseClient,
              txUserId,
              plan.plan_name,
              plan.replies_quota,
              transaction.amount
            );
          }
        }

        // Update transaction status to success (not 'completed' - CHECK constraint)
        const { error: updateTxError } = await supabaseClient
          .from('payment_transactions')
          .update({
            status: 'success',
            charge_id: executeData.trxID,
            metadata: {
              ...transaction.metadata,
              completed_at: new Date().toISOString(),
              bkash_trx_id: executeData.trxID
            }
          })
          .eq('payment_id', paymentId);
        
        if (updateTxError) {
          console.error('Error updating transaction status to success:', updateTxError);
        } else {
          console.log('Transaction status updated to success for payment_id:', paymentId);
        }

        return new Response(
          JSON.stringify({
            success: true,
            transactionId: executeData.trxID,
            message: 'Payment completed successfully',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'query_payment': {
        const token = await getGrantToken();

        const queryResponse = await fetch(`${baseUrl}/tokenized/checkout/payment/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
            'X-APP-Key': config.app_key,
          },
          body: JSON.stringify({
            paymentID: paymentId,
          }),
        });

        const queryData = await queryResponse.json();
        console.log('Query payment response:', queryData);

        return new Response(
          JSON.stringify(queryData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('bKash subscription payment error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.toString(),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
