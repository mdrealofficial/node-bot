import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, CreditCard, Loader2, Tag, X, Check } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AppliedCoupon {
  id: string;
  code: string;
  name: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  discountedPrice: number;
}

interface PaymentGatewayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectGateway: (gateway: 'piprapay' | 'bkash') => Promise<void>;
  planName: string;
  amount: number;
  couponCode?: string;
  onCouponCodeChange?: (code: string) => void;
  onApplyCoupon?: () => void;
  appliedCoupon?: AppliedCoupon | null;
  onRemoveCoupon?: () => void;
  couponLoading?: boolean;
}

export function PaymentGatewayDialog({
  open,
  onOpenChange,
  onSelectGateway,
  planName,
  amount,
  couponCode = '',
  onCouponCodeChange,
  onApplyCoupon,
  appliedCoupon,
  onRemoveCoupon,
  couponLoading = false,
}: PaymentGatewayDialogProps) {
  const [processing, setProcessing] = useState<string | null>(null);

  const handleSelect = async (gateway: 'piprapay' | 'bkash') => {
    setProcessing(gateway);
    try {
      await onSelectGateway(gateway);
    } finally {
      setProcessing(null);
    }
  };

  const finalAmount = appliedCoupon ? appliedCoupon.discountedPrice : amount;
  const discount = appliedCoupon ? amount - appliedCoupon.discountedPrice : 0;
  const showCouponSection = onCouponCodeChange && onApplyCoupon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Payment Method</DialogTitle>
          <DialogDescription>
            Choose your preferred payment gateway for {planName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Price Summary */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>৳{amount}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-sm text-success">
                <span className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  Discount ({appliedCoupon.code})
                </span>
                <span>-৳{discount.toFixed(0)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-lg border-t pt-2">
              <span>Total</span>
              <span className={cn(appliedCoupon && "text-success")}>
                ৳{finalAmount.toFixed(0)}
              </span>
            </div>
          </div>

          {/* Coupon Input */}
          {showCouponSection && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Have a coupon code?</Label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-3 rounded-lg border bg-success/10 border-success/30">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium text-success">
                      {appliedCoupon.code} applied
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({appliedCoupon.discount_type === 'percentage' 
                        ? `${appliedCoupon.discount_value}% off` 
                        : `৳${appliedCoupon.discount_value} off`})
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    onClick={onRemoveCoupon}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => onCouponCodeChange?.(e.target.value.toUpperCase())}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={onApplyCoupon}
                    disabled={!couponCode.trim() || couponLoading}
                  >
                    {couponLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Apply'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Payment Gateways */}
          <div className="grid gap-3">
            <Card 
              className="cursor-pointer transition-all hover:border-primary"
              onClick={() => !processing && handleSelect('piprapay')}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Piprapay</h3>
                  <p className="text-xs text-muted-foreground">
                    Card, mobile banking & more
                  </p>
                </div>
                {processing === 'piprapay' && (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                )}
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer transition-all hover:border-primary"
              onClick={() => !processing && handleSelect('bkash')}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E2136E]/10">
                  <Wallet className="h-5 w-5 text-[#E2136E]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">bKash</h3>
                  <p className="text-xs text-muted-foreground">
                    bKash mobile wallet
                  </p>
                </div>
                {processing === 'bkash' && (
                  <Loader2 className="h-5 w-5 animate-spin text-[#E2136E]" />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}