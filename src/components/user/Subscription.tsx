import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Loader2, Tag, X, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PaymentGatewayDialog } from './PaymentGatewayDialog';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SubscriptionPlan {
  id: string;
  plan_name: string;
  monthly_price: number;
  replies_quota: number;
  max_connected_pages: number;
  max_instagram_accounts: number;
  max_flows: number;
  features: any;
  display_order: number;
  currency?: string;
}

interface UserSubscription {
  plan: string;
  replies_quota: number;
  replies_used: number;
  quota_reset_at: string;
  topup_credits_remaining: number;
  trial_expires_at: string | null;
}

interface TopupPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  display_order: number;
}

interface PaymentTransaction {
  id: string;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  plan_id: string | null;
  metadata: any;
}

interface CurrencyInfo {
  code: string;
  symbol: string;
}

interface AppliedCoupon {
  id: string;
  code: string;
  name: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  discountedPrice: number;
}

interface PaymentResult {
  status: 'success' | 'failed';
  message: string;
  planName?: string;
  quota?: number;
  amountPaid?: number;
  resetDate?: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  BDT: '৳',
  INR: '₹',
  PKR: '₨',
  AUD: '$',
  CAD: '$',
  SGD: '$',
  MYR: 'RM'
};

interface SubscriptionProps {
  showPlanSelectionPopup?: boolean;
  onPlanSelected?: () => void;
  forceSelection?: boolean;
}

const Subscription = ({ showPlanSelectionPopup = false, onPlanSelected, forceSelection = false }: SubscriptionProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentTransaction[]>([]);
  const [showGatewayDialog, setShowGatewayDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ id: string; name: string; price: number } | null>(null);
  const [currency, setCurrency] = useState<CurrencyInfo>({ code: 'USD', symbol: '$' });
  const [cancelling, setCancelling] = useState(false);
  const [topupPackages, setTopupPackages] = useState<TopupPackage[]>([]);
  const [selectedTopup, setSelectedTopup] = useState<TopupPackage | null>(null);
  const [showTopupDialog, setShowTopupDialog] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [topupCouponCode, setTopupCouponCode] = useState('');
  const [topupAppliedCoupon, setTopupAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [selectingFreePlan, setSelectingFreePlan] = useState(false);
  
  // Payment processing states
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);

  useEffect(() => {
    loadSubscriptionData();
  }, [user]);

  // Show plan dialog if user has no subscription and popup is requested
  useEffect(() => {
    if (!loading && !userSubscription && showPlanSelectionPopup) {
      setShowPlanDialog(true);
    }
  }, [loading, userSubscription, showPlanSelectionPopup]);

  // Handle payment callback from URL params
  useEffect(() => {
    const paymentStatus = searchParams.get('paymentStatus');
    const gateway = searchParams.get('gateway');
    const paymentID = searchParams.get('paymentID');
    const pp_id = searchParams.get('pp_id');

    if (paymentStatus === 'cancel') {
      setPaymentResult({
        status: 'failed',
        message: 'Payment was cancelled',
      });
      clearUrlParams();
      return;
    }

    if (paymentStatus === 'processing') {
      if (gateway === 'piprapay' && pp_id) {
        processPiprapayPayment(pp_id);
      } else if (gateway === 'bkash' && paymentID) {
        processBkashPayment(paymentID);
      } else if (pp_id) {
        processPiprapayPayment(pp_id);
      } else if (paymentID) {
        processBkashPayment(paymentID);
      }
    }
  }, [searchParams]);

  const clearUrlParams = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('paymentStatus');
    newParams.delete('gateway');
    newParams.delete('paymentID');
    newParams.delete('pp_id');
    newParams.delete('status');
    setSearchParams(newParams, { replace: true });
  };

  // Simplified: Server-side now handles subscription updates, transaction status, and notifications
  const processPiprapayPayment = async (pp_id: string) => {
    setPaymentProcessing(true);
    try {
      const { data: verifyResult, error: verifyError } = await supabase.functions.invoke(
        'piprapay-verify-payment',
        { body: { pp_id } }
      );

      if (verifyError) {
        throw new Error('Failed to verify payment');
      }

      if (verifyResult?.verified === true) {
        // Server already updated subscription and sent notifications
        setPaymentResult({
          status: 'success',
          message: 'Payment successful!',
          planName: verifyResult.plan_name,
          quota: verifyResult.replies_quota,
          amountPaid: verifyResult.amount,
          resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
        await loadSubscriptionData();
        onPlanSelected?.();
      } else {
        setPaymentResult({
          status: 'failed',
          message: verifyResult?.failure_reason || 'Payment not completed',
        });
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      setPaymentResult({
        status: 'failed',
        message: error.message || 'Failed to verify payment',
      });
    } finally {
      setPaymentProcessing(false);
      clearUrlParams();
    }
  };

  const processBkashPayment = async (paymentID: string) => {
    setPaymentProcessing(true);
    try {
      // Query payment status
      const { data: queryData, error: queryError } = await supabase.functions.invoke('bkash-subscription-payment', {
        body: { action: 'query_payment', paymentId: paymentID },
      });

      if (queryError) {
        // Log failure
        await supabase
          .from('payment_transactions')
          .update({
            status: 'failed',
            metadata: {
              failure_reason: queryError.message || 'Query failed',
              failed_at: new Date().toISOString()
            }
          })
          .eq('payment_id', paymentID);

        throw new Error(queryError.message || 'Failed to verify payment');
      }

      if (!queryData || queryData.statusCode !== '0000') {
        const failureReason = queryData?.statusMessage || 'Payment verification failed';
        
        // Log failure
        await supabase
          .from('payment_transactions')
          .update({
            status: 'failed',
            metadata: {
              failure_reason: failureReason,
              transaction_status: queryData?.transactionStatus,
              failed_at: new Date().toISOString()
            }
          })
          .eq('payment_id', paymentID);

        throw new Error(failureReason);
      }

      // Check if payment was cancelled
      if (queryData.transactionStatus === 'Cancelled') {
        await supabase
          .from('payment_transactions')
          .update({
            status: 'failed',
            metadata: {
              failure_reason: 'Payment was cancelled by user',
              transaction_status: 'Cancelled',
              failed_at: new Date().toISOString()
            }
          })
          .eq('payment_id', paymentID);

        setPaymentResult({
          status: 'failed',
          message: 'Payment was cancelled',
        });
        clearUrlParams();
        setPaymentProcessing(false);
        return;
      }

      // If already completed, show success
      if (queryData.transactionStatus === 'Completed') {
        await loadSubscriptionData();
        
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user?.id)
          .maybeSingle();

        const { data: transaction } = await supabase
          .from('payment_transactions')
          .select('amount, metadata')
          .eq('payment_id', paymentID)
          .maybeSingle();

        setPaymentResult({
          status: 'success',
          message: 'Payment successful!',
          planName: subscription?.plan,
          quota: subscription?.replies_quota,
          amountPaid: transaction?.amount || parseFloat(queryData.amount || '0'),
          resetDate: subscription?.quota_reset_at,
        });
        onPlanSelected?.();
        clearUrlParams();
        setPaymentProcessing(false);
        return;
      }

      // Execute payment
      const { data: executeData, error: executeError } = await supabase.functions.invoke('bkash-subscription-payment', {
        body: { action: 'execute_payment', paymentId: paymentID },
      });

      if (executeError || !executeData?.success) {
        const failureReason = executeData?.message || executeError?.message || 'Payment execution failed';
        
        // Log failure
        await supabase
          .from('payment_transactions')
          .update({
            status: 'failed',
            metadata: {
              failure_reason: failureReason,
              failed_at: new Date().toISOString()
            }
          })
          .eq('payment_id', paymentID);

        throw new Error(failureReason);
      }

      await loadSubscriptionData();
      
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      const { data: transaction } = await supabase
        .from('payment_transactions')
        .select('amount')
        .eq('payment_id', paymentID)
        .maybeSingle();

      setPaymentResult({
        status: 'success',
        message: 'Payment successful!',
        planName: subscription?.plan,
        quota: subscription?.replies_quota,
        amountPaid: transaction?.amount || 0,
        resetDate: subscription?.quota_reset_at,
      });
      onPlanSelected?.();
    } catch (error: any) {
      console.error('Payment error:', error);
      
      // Log failure if not already logged
      await supabase
        .from('payment_transactions')
        .update({
          status: 'failed',
          metadata: {
            failure_reason: error.message || 'Unknown error',
            failed_at: new Date().toISOString()
          }
        })
        .eq('payment_id', paymentID);

      setPaymentResult({
        status: 'failed',
        message: error.message || 'Payment processing failed',
      });
    } finally {
      setPaymentProcessing(false);
      clearUrlParams();
    }
  };

  const loadSubscriptionData = async () => {
    if (!user) return;

    try {
      // Fetch currency settings
      const { data: currencyData } = await supabase
        .from('admin_config')
        .select('default_currency')
        .single();

      // Always use BDT currency symbol
      setCurrency({
        code: 'BDT',
        symbol: '৳'
      });

      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (plansError) throw plansError;

      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('plan, replies_quota, replies_used, quota_reset_at, topup_credits_remaining, trial_expires_at')
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle to handle no subscription case

      // subError is only thrown for actual errors, not for no rows
      if (subError && subError.code !== 'PGRST116') throw subError;

      // Fetch top-up packages
      const { data: topupData, error: topupError } = await supabase
        .from('quota_topup_packages')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (topupError) {
        console.error('Error loading top-up packages:', topupError);
      }

      // Fetch payment history for subscription payments (including failed ones)
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('payment_transactions')
        .select('*')
        .or('plan_id.not.is.null,transaction_type.eq.subscription,transaction_type.eq.subscription_payment')
        .order('created_at', { ascending: false })
        .limit(20);

      if (transactionsError) {
        console.error('Error loading payment history:', transactionsError);
      }

      // Filter transactions for current user (user_id is stored in metadata)
      const userTransactions = (transactionsData || []).filter(
        (tx: any) => tx.metadata?.user_id === user.id
      ).slice(0, 10); // Limit to 10 after filtering

      setPlans(plansData || []);
      setUserSubscription(subData || null);
      setPaymentHistory(userTransactions);
      setTopupPackages(topupData || []);
    } catch (error) {
      console.error('Error loading subscription data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subscription information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFreePlan = async () => {
    if (!user) return;
    
    setSelectingFreePlan(true);
    try {
      // Find free plan details
      const freePlan = plans.find(p => p.plan_name === 'free');
      const repliesQuota = freePlan?.replies_quota || 100;
      
      // Create subscription with free plan
      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan: 'free',
          replies_quota: repliesQuota,
          replies_used: 0,
          quota_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          topup_credits_remaining: 0,
        });

      if (error) throw error;

      toast({
        title: 'Welcome!',
        description: 'You are now on the Free plan.',
      });

      setShowPlanDialog(false);
      onPlanSelected?.();
      await loadSubscriptionData();
    } catch (error: any) {
      console.error('Error selecting free plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to activate free plan. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSelectingFreePlan(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user || !userSubscription || userSubscription.plan === 'free' || userSubscription.plan === 'trial') return;

    if (!confirm('Are you sure you want to cancel your subscription? You will be downgraded to the Free plan.')) {
      return;
    }

    setCancelling(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ plan: 'free', trial_expires_at: null })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Subscription Cancelled',
        description: 'Your subscription has been cancelled and you have been moved to the Free plan.',
      });

      await loadSubscriptionData();
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel subscription. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
    }
  };

  const getFeaturesList = (plan: SubscriptionPlan): string[] => {
    const features: string[] = [
      `${plan.replies_quota.toLocaleString()} replies/month`,
      `${plan.max_connected_pages === 999 ? 'Unlimited' : plan.max_connected_pages} Facebook pages`,
      `${plan.max_instagram_accounts === 999 ? 'Unlimited' : plan.max_instagram_accounts} Instagram accounts`,
      `${plan.max_flows === 999 ? 'Unlimited' : plan.max_flows} chatbot flows`,
    ];

    const planFeatures = plan.features || {};
    if (planFeatures.advanced_analytics) features.push('Advanced analytics');
    if (planFeatures.priority_support) features.push('Priority support');
    if (planFeatures.custom_templates) features.push('Custom templates');
    if (planFeatures.api_access) features.push('API access');
    if (planFeatures.white_label) features.push('White-label option');
    if (planFeatures.ai_assistant) features.push('AI Assistant');

    return features;
  };

  const handleUpgradeClick = (planId: string, planName: string, price: number) => {
    setSelectedPlan({ id: planId, name: planName, price });
    setCouponCode('');
    setAppliedCoupon(null);
    setShowGatewayDialog(true);
  };

  const handleTopupClick = (pkg: TopupPackage) => {
    setSelectedTopup(pkg);
    setTopupCouponCode('');
    setTopupAppliedCoupon(null);
    setShowTopupDialog(true);
  };

  const validateCoupon = async (code: string, originalPrice: number, type: 'subscription' | 'topup'): Promise<AppliedCoupon | null> => {
    if (!code.trim()) return null;

    try {
      setCouponLoading(true);
      const { data: coupon, error } = await supabase
        .from('subscription_coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !coupon) {
        toast({
          title: 'Invalid Coupon',
          description: 'This coupon code is invalid or has expired.',
          variant: 'destructive',
        });
        return null;
      }

      // Check if coupon applies to this type
      if (coupon.applies_to !== 'both' && coupon.applies_to !== type) {
        toast({
          title: 'Invalid Coupon',
          description: `This coupon is only valid for ${coupon.applies_to === 'subscription' ? 'subscription plans' : 'top-up credits'}.`,
          variant: 'destructive',
        });
        return null;
      }

      // Check validity dates
      const now = new Date();
      if (coupon.valid_from && new Date(coupon.valid_from) > now) {
        toast({
          title: 'Coupon Not Yet Active',
          description: 'This coupon is not yet active.',
          variant: 'destructive',
        });
        return null;
      }

      if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        toast({
          title: 'Coupon Expired',
          description: 'This coupon has expired.',
          variant: 'destructive',
        });
        return null;
      }

      // Check usage limits
      if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
        toast({
          title: 'Coupon Limit Reached',
          description: 'This coupon has reached its maximum usage limit.',
          variant: 'destructive',
        });
        return null;
      }

      // Check minimum purchase
      if (coupon.min_purchase && originalPrice < coupon.min_purchase) {
        toast({
          title: 'Minimum Purchase Required',
          description: `This coupon requires a minimum purchase of ৳${coupon.min_purchase}.`,
          variant: 'destructive',
        });
        return null;
      }

      // Calculate discounted price
      let discountedPrice = originalPrice;
      if (coupon.discount_type === 'percentage') {
        discountedPrice = originalPrice - (originalPrice * coupon.discount_value / 100);
      } else {
        discountedPrice = originalPrice - coupon.discount_value;
      }
      discountedPrice = Math.max(0, discountedPrice);

      toast({
        title: 'Coupon Applied!',
        description: `You saved ৳${(originalPrice - discountedPrice).toFixed(0)}`,
      });

      return {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        discount_type: coupon.discount_type as 'percentage' | 'fixed_amount',
        discount_value: coupon.discount_value,
        discountedPrice,
      };
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to validate coupon. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setCouponLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!selectedPlan || !couponCode.trim()) return;
    const result = await validateCoupon(couponCode, selectedPlan.price, 'subscription');
    if (result) {
      setAppliedCoupon(result);
    }
  };

  const handleApplyTopupCoupon = async () => {
    if (!selectedTopup || !topupCouponCode.trim()) return;
    const result = await validateCoupon(topupCouponCode, selectedTopup.price, 'topup');
    if (result) {
      setTopupAppliedCoupon(result);
    }
  };

  const handleTopupGatewaySelect = async (gateway: 'piprapay' | 'bkash') => {
    if (!user || !selectedTopup) return;

    try {
      const currentUrl = window.location.pathname;
      const currentOrigin = window.location.origin;
      const finalPrice = topupAppliedCoupon ? topupAppliedCoupon.discountedPrice : selectedTopup.price;
      
      if (gateway === 'piprapay') {
        const { data, error } = await supabase.functions.invoke('piprapay-create-charge', {
          body: { 
            topupPackageId: selectedTopup.id, 
            userId: user.id, 
            returnUrl: currentUrl,
            callbackOrigin: currentOrigin,
            isTopup: true,
            couponId: topupAppliedCoupon?.id || null,
            amount: finalPrice
          },
        });

        if (error) throw error;

        if (data?.payment_url) {
          window.location.href = data.payment_url;
        } else {
          throw new Error('No payment URL received from Piprapay');
        }
      } else if (gateway === 'bkash') {
        const { data, error } = await supabase.functions.invoke('bkash-subscription-payment', {
          body: { 
            action: 'create_payment', 
            topupPackageId: selectedTopup.id, 
            userId: user.id, 
            returnUrl: currentUrl,
            callbackOrigin: currentOrigin,
            isTopup: true,
            couponId: topupAppliedCoupon?.id || null,
            amount: finalPrice
          },
        });

        if (error) throw error;

        if (data.bkashURL) {
          window.location.href = data.bkashURL;
        }
      }
    } catch (error: any) {
      console.error('Error creating charge:', error);
      
      let errorMessage = 'Failed to initiate payment. Please try again.';
      
      if (error?.message && error.message.includes('not configured')) {
        errorMessage = 'Payment gateway is not yet configured. Please contact support or try another payment method.';
      } else if (error?.message && error.message.includes('authentication failed')) {
        errorMessage = 'Payment gateway authentication failed. Please contact support.';
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setSelectedTopup(null);
      setTopupAppliedCoupon(null);
    }
  };

  const handleGatewaySelect = async (gateway: 'piprapay' | 'bkash') => {
    if (!user || !selectedPlan) return;

    try {
      const currentUrl = window.location.pathname;
      const currentOrigin = window.location.origin;
      const finalPrice = appliedCoupon ? appliedCoupon.discountedPrice : selectedPlan.price;
      
      if (gateway === 'piprapay') {
        const { data, error } = await supabase.functions.invoke('piprapay-create-charge', {
          body: { 
            planId: selectedPlan.id, 
            userId: user.id, 
            returnUrl: currentUrl,
            callbackOrigin: currentOrigin,
            couponId: appliedCoupon?.id || null,
            amount: finalPrice
          },
        });

        if (error) throw error;

        if (data?.payment_url) {
          window.location.href = data.payment_url;
        } else {
          throw new Error('No payment URL received from Piprapay');
        }
      } else if (gateway === 'bkash') {
        const { data, error } = await supabase.functions.invoke('bkash-subscription-payment', {
          body: { 
            action: 'create_payment', 
            planId: selectedPlan.id, 
            userId: user.id, 
            returnUrl: currentUrl,
            callbackOrigin: currentOrigin,
            couponId: appliedCoupon?.id || null,
            amount: finalPrice
          },
        });

        if (error) throw error;

        if (data.bkashURL) {
          window.location.href = data.bkashURL;
        }
      }
    } catch (error: any) {
      console.error('Error creating charge:', error);
      
      let errorMessage = 'Failed to initiate payment. Please try again.';
      
      // Check if it's a bKash configuration error
      if (error?.message && error.message.includes('not configured')) {
        errorMessage = 'bKash payment is not yet configured. Please contact support or try another payment method.';
      } else if (error?.message && error.message.includes('authentication failed')) {
        errorMessage = 'Payment gateway authentication failed. Please contact support.';
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setShowGatewayDialog(false);
      setAppliedCoupon(null);
    }
  };

  const formatResetDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Payment Processing/Result Dialog - renders on top of other content
  const PaymentStatusDialog = () => (
    <Dialog open={paymentProcessing || paymentResult !== null} onOpenChange={(open) => {
      if (!open && !paymentProcessing) {
        setPaymentResult(null);
      }
    }}>
      <DialogContent className="max-w-md">
        {paymentProcessing ? (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
            <DialogHeader className="text-center">
              <DialogTitle>Processing Payment</DialogTitle>
              <DialogDescription>Please wait while we verify your payment...</DialogDescription>
            </DialogHeader>
          </div>
        ) : paymentResult?.status === 'success' ? (
          <div className="flex flex-col items-center py-6">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <DialogHeader className="text-center mb-4">
              <DialogTitle>Payment Successful!</DialogTitle>
              <DialogDescription>{paymentResult.message}</DialogDescription>
            </DialogHeader>
            
            {paymentResult.planName && (
              <div className="w-full bg-muted p-4 rounded-lg space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-semibold capitalize">{paymentResult.planName}</span>
                </div>
                <Separator />
                {paymentResult.quota && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Monthly Quota</span>
                      <span className="font-semibold">{paymentResult.quota.toLocaleString()} messages</span>
                    </div>
                    <Separator />
                  </>
                )}
                {paymentResult.resetDate && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Active Until</span>
                      <span className="font-semibold text-green-600">
                        {new Date(paymentResult.resetDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <Separator />
                  </>
                )}
                {paymentResult.amountPaid !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="font-semibold text-lg">৳{paymentResult.amountPaid.toFixed(0)}</span>
                  </div>
                )}
              </div>
            )}
            
            <Button 
              className="w-full" 
              onClick={() => {
                setPaymentResult(null);
                loadSubscriptionData();
              }}
            >
              Continue
            </Button>
          </div>
        ) : paymentResult?.status === 'failed' ? (
          <div className="flex flex-col items-center py-6">
            <XCircle className="h-16 w-16 text-destructive mb-4" />
            <DialogHeader className="text-center mb-4">
              <DialogTitle>Payment Failed</DialogTitle>
              <DialogDescription>We couldn't process your payment</DialogDescription>
            </DialogHeader>
            
            {/* Detailed failure info */}
            <div className="w-full bg-destructive/10 border border-destructive/20 p-4 rounded-lg mb-4">
              <p className="text-sm text-center text-destructive font-medium">
                {paymentResult.message}
              </p>
            </div>
            
            <p className="text-sm text-muted-foreground text-center mb-6">
              Please check your payment details and try again, or choose a different payment method.
            </p>
            
            <div className="flex gap-3 w-full">
              <Button 
                className="flex-1" 
                variant="outline"
                onClick={() => setPaymentResult(null)}
              >
                Try Again
              </Button>
              <Button 
                className="flex-1"
                onClick={() => {
                  setPaymentResult(null);
                  setShowPlanDialog(true);
                }}
              >
                Choose Plan
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );

  const totalQuota = userSubscription 
    ? userSubscription.replies_quota + (userSubscription.topup_credits_remaining || 0)
    : 0;
  const usagePercentage = userSubscription && totalQuota > 0
    ? (userSubscription.replies_used / totalQuota) * 100
    : 0;
  const isQuotaLow = usagePercentage > 80;
  const isQuotaExhausted = userSubscription ? userSubscription.replies_used >= totalQuota : false;

  // Calculate trial days remaining
  const trialDaysRemaining = userSubscription?.trial_expires_at 
    ? Math.max(0, Math.ceil((new Date(userSubscription.trial_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const isTrialExpired = userSubscription?.plan === 'trial' && trialDaysRemaining <= 0;
  const isOnTrial = userSubscription?.plan === 'trial' && trialDaysRemaining > 0;

  // If no subscription exists, show plan selection UI
  if (!userSubscription) {
    return (
      <div className="space-y-6">
        <PaymentStatusDialog />
        {/* Plan Selection Popup Dialog - uncloseable when forceSelection is true */}
        <Dialog open={showPlanDialog} onOpenChange={(open) => {
          // Don't allow closing without selection if it's a required popup
          if (!open && (showPlanSelectionPopup || forceSelection)) return;
          setShowPlanDialog(open);
        }}>
          <DialogContent 
            className="max-w-4xl max-h-[90vh] overflow-y-auto" 
            onPointerDownOutside={(e) => {
              if (showPlanSelectionPopup || forceSelection) e.preventDefault();
            }}
            onEscapeKeyDown={(e) => {
              if (showPlanSelectionPopup || forceSelection) e.preventDefault();
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-2xl">Welcome! Choose Your Plan</DialogTitle>
              <DialogDescription>
                Select a plan to get started. You can always upgrade or change your plan later.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-4 py-4">
              {plans.filter(p => p.plan_name !== 'trial').map((plan) => {
                const isPopular = plan.plan_name === 'creator';
                const isFree = plan.plan_name === 'free';
                
                return (
                  <Card
                    key={plan.id}
                    className={cn(
                      "relative",
                      isPopular && "border-primary shadow-lg"
                    )}
                  >
                    {isPopular && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                        Most Popular
                      </Badge>
                    )}
                    <CardHeader className="pt-6">
                      <CardTitle className="capitalize">{plan.plan_name}</CardTitle>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">{currency.symbol}{plan.monthly_price}</span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                      <CardDescription>{plan.replies_quota.toLocaleString()} replies/month</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-2">
                        {getFeaturesList(plan).slice(0, 4).map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      {isFree ? (
                        <Button
                          className="w-full"
                          variant="secondary"
                          onClick={handleSelectFreePlan}
                          disabled={selectingFreePlan}
                        >
                          {selectingFreePlan ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Activating...
                            </>
                          ) : (
                            'Start Free'
                          )}
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          variant={isPopular ? 'default' : 'outline'}
                          onClick={() => handleUpgradeClick(plan.id, plan.plan_name, plan.monthly_price)}
                        >
                          Get {plan.plan_name}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Page content when dialog is closed */}
        <Card className="border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="py-8">
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <span className="text-3xl">🚀</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                Select a subscription plan to unlock all features and start automating your messaging.
              </p>
              <Button onClick={() => setShowPlanDialog(true)} size="lg">
                View Plans
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-4">
          {plans.filter(p => p.plan_name !== 'trial').map((plan) => {
            const isPopular = plan.plan_name === 'creator';
            const isFree = plan.plan_name === 'free';
            
            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative",
                  isPopular && "border-primary shadow-lg"
                )}
              >
                {isPopular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                    Popular
                  </Badge>
                )}
                <CardHeader className="pt-6">
                  <CardTitle className="capitalize">{plan.plan_name}</CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{currency.symbol}{plan.monthly_price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <CardDescription>{plan.replies_quota.toLocaleString()} replies/month</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {getFeaturesList(plan).map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {isFree ? (
                    <Button
                      className="w-full"
                      variant="secondary"
                      onClick={handleSelectFreePlan}
                      disabled={selectingFreePlan}
                    >
                      {selectingFreePlan ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Activating...
                        </>
                      ) : (
                        'Start Free'
                      )}
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={isPopular ? 'default' : 'outline'}
                      onClick={() => handleUpgradeClick(plan.id, plan.plan_name, plan.monthly_price)}
                    >
                      Get {plan.plan_name}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {selectedPlan && (
          <PaymentGatewayDialog
            open={showGatewayDialog}
            onOpenChange={setShowGatewayDialog}
            onSelectGateway={handleGatewaySelect}
            planName={selectedPlan.name}
            amount={selectedPlan.price}
            couponCode={couponCode}
            onCouponCodeChange={setCouponCode}
            onApplyCoupon={handleApplyCoupon}
            appliedCoupon={appliedCoupon}
            onRemoveCoupon={() => {
              setAppliedCoupon(null);
              setCouponCode('');
            }}
            couponLoading={couponLoading}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PaymentStatusDialog />
      {/* Trial Banner */}
      {isOnTrial && (
        <Card className="border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-lg">🎉</span>
                </div>
                <div>
                  <p className="font-semibold text-primary">You're on a 7-Day Free Trial!</p>
                  <p className="text-sm text-muted-foreground">
                    {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining • Upgrade to continue after trial ends
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="border-primary text-primary">
                Trial
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trial Expired Banner */}
      {isTrialExpired && (
        <Card className="border-destructive/50 bg-gradient-to-r from-destructive/10 to-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center">
                  <span className="text-lg">⚠️</span>
                </div>
                <div>
                  <p className="font-semibold text-destructive">Your Trial Has Expired</p>
                  <p className="text-sm text-muted-foreground">
                    Upgrade now to continue using all features
                  </p>
                </div>
              </div>
              <Badge variant="destructive">Expired</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Usage</CardTitle>
              <CardDescription>Your reply quota for this month</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
              onClick={() => setShowTopupDialog(true)}
              disabled={topupPackages.length === 0}
            >
              Buy More Credits
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Replies Used</span>
              <span className="text-sm text-muted-foreground">
                {userSubscription?.replies_used.toLocaleString() || 0} / {totalQuota.toLocaleString()}
              </span>
            </div>
            {userSubscription && userSubscription.topup_credits_remaining > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Base Quota</span>
                <span className="text-muted-foreground">{userSubscription.replies_quota.toLocaleString()}</span>
              </div>
            )}
            {userSubscription && userSubscription.topup_credits_remaining > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-primary">Top-up Credits</span>
                <span className="text-primary">+{userSubscription.topup_credits_remaining.toLocaleString()}</span>
              </div>
            )}
            <div className="w-full bg-secondary rounded-full h-2.5">
              <div
                className={cn(
                  "h-2.5 rounded-full transition-all",
                  usagePercentage > 90 ? "bg-destructive" : usagePercentage > 75 ? "bg-warning" : "bg-primary"
                )}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {userSubscription ? (
                <>
                  {Math.max(0, totalQuota - userSubscription.replies_used).toLocaleString()} replies remaining • 
                  Resets on {formatResetDate(userSubscription.quota_reset_at)}
                </>
              ) : (
                'No subscription data available'
              )}
            </p>
            {isQuotaExhausted && (
              <p className="text-xs text-destructive font-medium mt-2">
                ⚠️ You've exhausted your quota. Purchase a top-up to continue sending messages.
              </p>
            )}
            {!isQuotaExhausted && isQuotaLow && (
              <p className="text-xs text-warning font-medium mt-2">
                ⚠️ You're running low on messages. Consider purchasing a top-up or upgrading your plan.
              </p>
            )}
          </div>
        </CardContent>
      </Card>


      <div className="grid gap-6 md:grid-cols-4">
        {plans.filter(p => p.plan_name !== 'trial').map((plan) => {
          const isCurrentPlan = plan.plan_name === userSubscription?.plan || 
            (userSubscription?.plan === 'trial' && plan.plan_name === 'free');
          const isPopular = plan.plan_name === 'creator';
          
          return (
            <Card
              key={plan.id}
              className={isCurrentPlan ? 'border-primary shadow-lg' : ''}
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="capitalize">{plan.plan_name}</CardTitle>
                  {isCurrentPlan && <Badge>Current Plan</Badge>}
                  {isPopular && !isCurrentPlan && <Badge variant="secondary">Popular</Badge>}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{currency.symbol}{plan.monthly_price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <CardDescription>{plan.replies_quota.toLocaleString()} replies/month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {getFeaturesList(plan).map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                {plan.plan_name !== 'free' && (
                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? 'secondary' : 'default'}
                    disabled={isCurrentPlan}
                    onClick={() => handleUpgradeClick(plan.id, plan.plan_name, plan.monthly_price)}
                  >
                    {isCurrentPlan ? 'Current Plan' : 'Upgrade'}
                  </Button>
                )}
                {plan.plan_name === 'free' && (
                  <Button className="w-full" variant="secondary" disabled>
                    {userSubscription?.plan === 'trial' ? 'After Trial' : 'Current Plan'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {userSubscription && userSubscription.plan !== 'free' && userSubscription.plan !== 'trial' && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Cancel Subscription</CardTitle>
            <CardDescription>
              Cancel your subscription and downgrade to the Free plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              If you cancel your subscription, you will be immediately moved to the Free plan. 
              Your quota will be adjusted accordingly.
            </p>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={cancelling}
            >
              {cancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel Subscription'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Recent billing transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {paymentHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No payment history available yet
              </p>
            ) : (
              paymentHistory.map((transaction) => {
                const transactionDate = new Date(transaction.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
                
                const statusVariant = transaction.status === 'completed' || transaction.status === 'success' 
                  ? 'default' 
                  : transaction.status === 'pending' 
                  ? 'secondary' 
                  : 'destructive';
                
                return (
                  <div key={transaction.id} className={`p-3 border rounded ${transaction.status === 'failed' ? 'border-destructive/30 bg-destructive/5' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{transactionDate}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {transaction.metadata?.plan_name || transaction.metadata?.item_name || userSubscription?.plan || 'Plan'} 
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.payment_method}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{currency.symbol}{transaction.amount}</span>
                        <Badge variant={statusVariant} className="capitalize">
                          {transaction.status === 'completed' ? 'Paid' : transaction.status}
                        </Badge>
                      </div>
                    </div>
                    {transaction.status === 'failed' && transaction.metadata?.failure_reason && (
                      <p className="text-xs text-destructive mt-2 pt-2 border-t border-destructive/20">
                        Reason: {transaction.metadata.failure_reason}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {selectedPlan && (
        <PaymentGatewayDialog
          open={showGatewayDialog}
          onOpenChange={setShowGatewayDialog}
          onSelectGateway={handleGatewaySelect}
          planName={selectedPlan.name}
          amount={selectedPlan.price}
          couponCode={couponCode}
          onCouponCodeChange={setCouponCode}
          onApplyCoupon={handleApplyCoupon}
          appliedCoupon={appliedCoupon}
          onRemoveCoupon={() => {
            setAppliedCoupon(null);
            setCouponCode('');
          }}
          couponLoading={couponLoading}
        />
      )}

      <Dialog open={showTopupDialog && !selectedTopup} onOpenChange={setShowTopupDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Buy More Credits</DialogTitle>
            <DialogDescription>
              Purchase additional reply credits for this month. Unused credits expire at the end of your billing cycle.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {topupPackages.map((pkg) => (
              <Card key={pkg.id} className="border-muted hover:border-primary transition-colors cursor-pointer">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{pkg.name}</CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{currency.symbol}{pkg.price}</span>
                  </div>
                  <CardDescription className="text-primary font-medium">
                    +{pkg.credits.toLocaleString()} replies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => {
                      setSelectedTopup(pkg);
                      setShowTopupDialog(false);
                    }}
                  >
                    Select
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {selectedTopup && (
        <PaymentGatewayDialog
          open={!showTopupDialog && selectedTopup !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedTopup(null);
              setTopupAppliedCoupon(null);
              setTopupCouponCode('');
            }
          }}
          onSelectGateway={handleTopupGatewaySelect}
          planName={`${selectedTopup.name} - ${selectedTopup.credits.toLocaleString()} Credits`}
          amount={selectedTopup.price}
          couponCode={topupCouponCode}
          onCouponCodeChange={setTopupCouponCode}
          onApplyCoupon={handleApplyTopupCoupon}
          appliedCoupon={topupAppliedCoupon}
          onRemoveCoupon={() => {
            setTopupAppliedCoupon(null);
            setTopupCouponCode('');
          }}
          couponLoading={couponLoading}
        />
      )}
    </div>
  );
};

export default Subscription;
