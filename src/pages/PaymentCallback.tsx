import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

type OrderDetails = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string | null;
  total_amount: number;
  paid_amount: number | null;
  payment_method: string | null;
  created_at: string;
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    product_id: string;
    products: {
      name: string;
      image_url: string | null;
    };
  }[];
};

type SubscriptionDetails = {
  plan: string;
  replies_quota: number;
  replies_used: number;
  quota_reset_at: string;
  amount_paid: number;
};

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [message, setMessage] = useState('Processing your payment...');
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [paymentType, setPaymentType] = useState<'order' | 'subscription'>('order');

  useEffect(() => {
    const paymentID = searchParams.get('paymentID');
    const pp_id = searchParams.get('pp_id'); // Piprapay payment ID
    const status = searchParams.get('status');
    const typeParam = searchParams.get('type');
    const returnUrl = searchParams.get('returnUrl');

    // Detect payment type
    let detectedType: 'order' | 'subscription' = (typeParam as 'order' | 'subscription') || 'order';

    // If coming from Piprapay redirect, only pp_id is present. Treat as subscription payment.
    if (!typeParam && pp_id && !paymentID) {
      detectedType = 'subscription';
    }

    setPaymentType(detectedType);

    // Store returnUrl in state if provided
    if (returnUrl) {
      sessionStorage.setItem('paymentReturnUrl', decodeURIComponent(returnUrl));
    }

    // Handle Piprapay callback (uses pp_id)
    const paymentIdentifier = paymentID || pp_id;

    if (!paymentIdentifier) {
      setStatus('failed');
      setMessage('Payment information is missing');
      return;
    }

    if (status === 'cancel' || status === 'failure') {
      setStatus('failed');
      setMessage('Payment was cancelled or failed');
      return;
    }

    // Handle Piprapay subscription payment
    if (detectedType === 'subscription' && pp_id) {
      checkPiprapaySubscription(pp_id);
    } else if (detectedType === 'subscription') {
      executeSubscriptionPayment(paymentIdentifier);
    } else {
      executeOrderPayment(paymentIdentifier);
    }
  }, [searchParams]);

  const checkPiprapaySubscription = async (pp_id: string) => {
    try {
      // Verify payment with Piprapay
      const { data: verifyResult, error: verifyError } = await supabase.functions.invoke(
        'piprapay-verify-payment',
        {
          body: { pp_id },
        }
      );

      if (verifyError) {
        console.error('Piprapay verification error:', verifyError);
        setStatus('failed');
        setMessage('Failed to verify payment. Please contact support.');
        toast.error('Payment verification failed');
        return;
      }

      console.log('Piprapay verify result:', verifyResult);

      // If Piprapay confirms payment is successful, update our database and show success
      if (verifyResult?.verified === true) {
        const verifyData = verifyResult.data;
        
        // Create or update transaction in database
        const { data: existingTx } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('charge_id', pp_id)
          .maybeSingle();

        if (!existingTx) {
          // Create transaction record with required fields
          // Note: order_id and store_id are required but not applicable for subscriptions
          const dummyOrderId = '00000000-0000-0000-0000-000000000000';
          const dummyStoreId = '00000000-0000-0000-0000-000000000000';
          
          await supabase
            .from('payment_transactions')
            .insert({
              order_id: dummyOrderId,
              store_id: dummyStoreId,
              charge_id: pp_id,
              payment_id: verifyData.transaction_id,
              amount: parseFloat(verifyData.amount || verifyData.total || '0'),
              payment_method: 'piprapay',
              transaction_type: 'subscription_payment',
              status: 'completed',
              metadata: verifyData.metadata || {},
              plan_id: verifyData.metadata?.plan_id,
            });
        } else if (existingTx.status !== 'completed') {
          // Update existing transaction
          await supabase
            .from('payment_transactions')
            .update({
              status: 'completed',
              payment_id: verifyData.transaction_id,
              updated_at: new Date().toISOString(),
            })
            .eq('charge_id', pp_id);
        }

        // Update subscription
        const metadata = verifyData.metadata || existingTx?.metadata || {};
        const userId = metadata?.user_id;
        const planId = metadata?.plan_id || existingTx?.plan_id;

        if (userId && planId) {
          const { data: plan } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('id', planId)
            .maybeSingle();

          if (plan) {
            await supabase
              .from('subscriptions')
              .update({
                plan: plan.plan_name as 'free' | 'starter' | 'creator' | 'pro',
                replies_quota: plan.replies_quota,
                quota_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', userId);

            // Load subscription details for display
            const { data: subscription } = await supabase
              .from('subscriptions')
              .select('*')
              .eq('user_id', userId)
              .maybeSingle();

            if (subscription) {
              setSubscriptionDetails({
                plan: subscription.plan,
                replies_quota: subscription.replies_quota,
                replies_used: subscription.replies_used,
                quota_reset_at: subscription.quota_reset_at,
                amount_paid: parseFloat(verifyData.amount || verifyData.total || '0'),
              });
            }
          }
        }

        setStatus('success');
        setMessage('Subscription renewed successfully!');
        toast.success('Payment successful!');
      } else {
        // Payment not yet completed according to Piprapay
        setStatus('failed');
        setMessage('Payment not completed. Please try again or contact support.');
        toast.error('Payment not completed');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setStatus('failed');
      setMessage('Failed to verify payment status');
      toast.error('Payment verification failed');
    }
  };

  const loadSubscriptionDetails = async (transaction: any) => {
    const metadata = transaction.metadata as any;
    const userId = metadata?.user_id;
    
    if (userId) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (subscription) {
        setSubscriptionDetails({
          plan: subscription.plan,
          replies_quota: subscription.replies_quota,
          replies_used: subscription.replies_used,
          quota_reset_at: subscription.quota_reset_at,
          amount_paid: transaction.amount || 0,
        });
      }
    }
  };

  const executeSubscriptionPayment = async (paymentID: string) => {
    try {
      const { data: queryData, error: queryError } = await supabase.functions.invoke('bkash-subscription-payment', {
        body: {
          action: 'query_payment',
          paymentId: paymentID,
        },
      });

      if (queryError) {
        throw new Error(queryError.message || 'Failed to verify payment');
      }

      if (!queryData || queryData.statusCode !== '0000') {
        throw new Error(queryData?.statusMessage || 'Payment verification failed');
      }

      // If payment is already completed, show success
      if (queryData.transactionStatus === 'Completed') {
        // Fetch updated subscription details
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .single();

          // Get transaction to find amount
          const { data: transaction } = await supabase
            .from('payment_transactions')
            .select('amount')
            .eq('payment_id', paymentID)
            .single();

          if (subscription) {
            setSubscriptionDetails({
              plan: subscription.plan,
              replies_quota: subscription.replies_quota,
              replies_used: subscription.replies_used,
              quota_reset_at: subscription.quota_reset_at,
              amount_paid: transaction?.amount || parseFloat(queryData.amount || '0'),
            });
          }
        }
        setStatus('success');
        setMessage('Subscription renewed successfully!');
        toast.success('Payment successful!');
        return;
      }

      // Execute payment
      const { data: executeData, error: executeError } = await supabase.functions.invoke('bkash-subscription-payment', {
        body: {
          action: 'execute_payment',
          paymentId: paymentID,
        },
      });

      if (executeError) {
        throw new Error(executeError.message || 'Payment execution failed');
      }

      if (!executeData || !executeData.success) {
        throw new Error(executeData?.message || 'Payment execution failed');
      }

      // Fetch updated subscription details
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();

        // Get transaction to find amount
        const { data: transaction } = await supabase
          .from('payment_transactions')
          .select('amount')
          .eq('payment_id', paymentID)
          .single();

        if (subscription) {
          setSubscriptionDetails({
            plan: subscription.plan,
            replies_quota: subscription.replies_quota,
            replies_used: subscription.replies_used,
            quota_reset_at: subscription.quota_reset_at,
            amount_paid: transaction?.amount || 0,
          });
        }
      }

      setStatus('success');
      setMessage('Subscription renewed successfully!');
      toast.success('Payment successful!');
    } catch (error) {
      console.error('Payment error:', error);
      setStatus('failed');
      setMessage(error instanceof Error ? error.message : 'Payment processing failed');
      toast.error('Payment failed');
    }
  };

  const executeOrderPayment = async (paymentID: string) => {
    try {
      // Query payment status first to get order details
      const { data: queryData, error: queryError } = await supabase.functions.invoke('bkash-payment', {
        body: {
          action: 'query_payment',
          paymentId: paymentID,
        },
      });

      if (queryError) {
        throw new Error(queryError.message || 'Failed to verify payment');
      }

      if (!queryData || queryData.statusCode !== '0000') {
        throw new Error(queryData?.statusMessage || 'Payment verification failed');
      }

      // Extract orderId from payerReference
      const orderId = queryData.payerReference;
      if (!orderId) {
        throw new Error('Order information not found in payment');
      }

      // Get order with details to find storeId and display order summary
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            id,
            quantity,
            unit_price,
            total_price,
            product_id,
            products(name, image_url)
          )
        `)
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        throw new Error('Order not found');
      }

      setOrderDetails(order as OrderDetails);

      // If payment is already completed, show success
      if (queryData.transactionStatus === 'Completed') {
        setStatus('success');
        setMessage('Payment completed successfully!');
        toast.success('Payment successful!');
        return;
      }

      // Execute payment with orderId and storeId
      const { data: executeData, error: executeError } = await supabase.functions.invoke('bkash-payment', {
        body: {
          action: 'execute_payment',
          paymentId: paymentID,
          orderId: orderId,
          storeId: order.store_id,
        },
      });

      if (executeError) {
        throw new Error(executeError.message || 'Payment execution failed');
      }

      if (!executeData || !executeData.success) {
        throw new Error(executeData?.message || 'Payment execution failed');
      }

      setStatus('success');
      setMessage('Payment completed successfully!');
      toast.success('Payment successful!');
    } catch (error) {
      console.error('Payment execution error:', error);
      setStatus('failed');
      setMessage(error instanceof Error ? error.message : 'Payment processing failed');
      toast.error('Payment failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'processing' && <Loader2 className="h-16 w-16 text-primary animate-spin" />}
            {status === 'success' && <CheckCircle2 className="h-16 w-16 text-green-500" />}
            {status === 'failed' && <XCircle className="h-16 w-16 text-destructive" />}
          </div>
          <CardTitle className="text-2xl">
            {status === 'processing' && 'Processing Payment'}
            {status === 'success' && (paymentType === 'subscription' ? 'Subscription Renewed' : 'Payment Successful')}
            {status === 'failed' && 'Payment Failed'}
          </CardTitle>
          <CardDescription className="text-base">{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === 'success' && paymentType === 'subscription' && subscriptionDetails && (
            <>
              <div className="bg-muted p-6 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-semibold capitalize">{subscriptionDetails.plan}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Monthly Quota</span>
                  <span className="font-semibold">{subscriptionDetails.replies_quota.toLocaleString()} messages</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className="font-semibold">{(subscriptionDetails.replies_quota - subscriptionDetails.replies_used).toLocaleString()} messages</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subscription Active Until</span>
                  <span className="font-semibold text-green-600">
                    {new Date(subscriptionDetails.quota_reset_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-semibold text-lg">৳{subscriptionDetails.amount_paid.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={() => {
                    const returnUrl = sessionStorage.getItem('paymentReturnUrl') || '/settings';
                    sessionStorage.removeItem('paymentReturnUrl');
                    navigate(returnUrl);
                  }} 
                  className="flex-1"
                >
                  Return to Page
                </Button>
                <Button 
                  onClick={() => navigate('/dashboard')} 
                  variant="outline"
                  className="flex-1"
                >
                  Go to Dashboard
                </Button>
              </div>
            </>
          )}

          {status === 'success' && paymentType === 'order' && orderDetails && (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <h3 className="font-semibold">Order Summary</h3>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order ID:</span>
                    <span className="font-mono">{orderDetails.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer:</span>
                    <span>{orderDetails.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span>{orderDetails.customer_email}</span>
                  </div>
                  {orderDetails.customer_phone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span>{orderDetails.customer_phone}</span>
                    </div>
                  )}
                  {orderDetails.shipping_address && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Address:</span>
                      <span className="text-right max-w-[200px]">{orderDetails.shipping_address}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Order Items */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Items Ordered</h4>
                  {orderDetails.order_items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      {item.products.image_url && (
                        <img
                          src={item.products.image_url}
                          alt={item.products.name}
                          className="h-12 w-12 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{item.products.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Qty: {item.quantity} × ৳{item.unit_price.toFixed(2)}
                        </p>
                      </div>
                      <p className="text-sm font-medium">৳{item.total_price.toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Total */}
                <div className="flex justify-between text-base font-semibold">
                  <span>Total Paid</span>
                  <span>৳{(orderDetails.paid_amount || orderDetails.total_amount).toFixed(2)}</span>
                </div>
              </div>

              <Button onClick={() => navigate('/')} className="w-full">
                Continue Shopping
              </Button>
            </div>
          )}
          {status === 'success' && !orderDetails && !subscriptionDetails && (
            <Button onClick={() => navigate('/')} className="w-full">
              Continue Shopping
            </Button>
          )}
          {status === 'failed' && (
            <div className="space-y-2">
              <Button 
                onClick={() => {
                  const returnUrl = sessionStorage.getItem('paymentReturnUrl') || (paymentType === 'subscription' ? '/settings' : '/cart');
                  sessionStorage.removeItem('paymentReturnUrl');
                  navigate(returnUrl);
                }} 
                className="w-full"
              >
                {paymentType === 'subscription' ? 'Return to Subscription' : 'Return to Cart'}
              </Button>
              <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                Back to Home
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
