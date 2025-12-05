import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ShoppingBag, Trash2, Plus, Minus, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { MobileBottomNav } from '@/components/user/store/MobileBottomNav';
import { formatPrice } from '@/lib/currencyUtils';

export default function Cart() {
  const navigate = useNavigate();
  const cart = useCart();
  const { items, removeItem, updateQuantity, clearCart, getTotalPrice, storeSlug, couponCode, setCouponCode, discountAmount, setDiscountAmount, shippingCharge, isFreeShipping, setIsFreeShipping } = cart;
  const [couponInput, setCouponInput] = useState(couponCode || '');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [storeCurrency, setStoreCurrency] = useState('BDT');
  const [customerUser, setCustomerUser] = useState<any>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  useEffect(() => {
    loadStoreCurrency();
    checkCustomerAuth();
  }, [storeSlug]);

  const loadStoreCurrency = async () => {
    if (!storeSlug) return;
    try {
      const { data } = await supabase
        .from('stores')
        .select('currency')
        .eq('slug', storeSlug)
        .single();
      if (data?.currency) setStoreCurrency(data.currency);
    } catch (error) {
      console.error('Failed to load store currency');
    }
  };

  const checkCustomerAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setCustomerUser(session.user);
    }
  };

  const handleCheckout = () => {
    if (!storeSlug) {
      toast.error('Store information is missing');
      return;
    }
    
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    navigate(`/store/${storeSlug}/checkout`);
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    if (!storeSlug) {
      toast.error('Store information is missing');
      return;
    }

    setApplyingCoupon(true);

    try {
      // Get store ID from slug
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('id')
        .eq('slug', storeSlug)
        .single();

      if (storeError || !storeData) {
        toast.error('Store not found');
        return;
      }

      // Validate coupon
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('store_id', storeData.id)
        .eq('code', couponInput.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !coupon) {
        toast.error('Invalid or expired coupon code');
        return;
      }

      // Check validity dates
      const now = new Date();
      const validFrom = new Date(coupon.valid_from);
      const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

      if (now < validFrom) {
        toast.error('This coupon is not yet valid');
        return;
      }

      if (validUntil && now > validUntil) {
        toast.error('This coupon has expired');
        return;
      }

      // Check usage limit
      if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
        toast.error('This coupon has reached its usage limit');
        return;
      }

      // Check minimum purchase
      const subtotal = getTotalPrice();
      if (coupon.minimum_purchase && subtotal < coupon.minimum_purchase) {
        toast.error(`Minimum purchase of ${formatPrice(coupon.minimum_purchase, storeCurrency)} required`);
        return;
      }

      // Check if coupon applies to cart items
      if (coupon.applies_to === 'specific_products') {
        const hasValidProduct = items.some(item => coupon.product_ids.includes(item.productId));
        if (!hasValidProduct) {
          toast.error('This coupon does not apply to items in your cart');
          return;
        }
      } else if (coupon.applies_to === 'categories') {
        // Fetch product categories
        const productIds = items.map(item => item.productId);
        const { data: products } = await supabase
          .from('products')
          .select('id, category_id')
          .in('id', productIds);

        const hasValidCategory = products?.some(p => p.category_id && coupon.category_ids.includes(p.category_id));
        if (!hasValidCategory) {
          toast.error('This coupon does not apply to items in your cart');
          return;
        }
      }

      // Handle free shipping coupon
      if (coupon.discount_type === 'free_shipping') {
        setCouponCode(coupon.code);
        setDiscountAmount(0);
        setIsFreeShipping(true);
        toast.success('Free shipping coupon applied!');
        return;
      }

      // Calculate discount
      let discount = 0;
      let successMessage = '';
      
      if (coupon.discount_type === 'bogo') {
        // BOGO calculation
        const buyQty = coupon.bogo_buy_quantity || 1;
        const getQty = coupon.bogo_get_quantity || 1;
        const discountPct = (coupon.bogo_get_discount_percentage || 100) / 100;
        
        // Get eligible items
        let eligibleItems = items;
        if (coupon.applies_to === 'specific_products') {
          eligibleItems = items.filter(item => coupon.product_ids.includes(item.productId));
        } else if (coupon.applies_to === 'categories') {
          const productIds = items.map(item => item.productId);
          const { data: products } = await supabase
            .from('products')
            .select('id, category_id')
            .in('id', productIds);
          eligibleItems = items.filter(item => {
            const product = products?.find(p => p.id === item.productId);
            return product?.category_id && coupon.category_ids.includes(product.category_id);
          });
        }
        
        // Calculate total BOGO discount
        for (const item of eligibleItems) {
          const sets = Math.floor(item.quantity / (buyQty + getQty));
          const freeItems = sets * getQty;
          discount += freeItems * item.price * discountPct;
        }
      } else if (coupon.discount_type === 'tiered') {
        // Tiered discount calculation
        const tiers = (Array.isArray(coupon.discount_tiers) ? coupon.discount_tiers : []) as Array<{ min_amount: number; discount_value: number; discount_type: 'percentage' | 'fixed' }>;
        const sortedTiers = tiers.sort((a, b) => b.min_amount - a.min_amount);
        
        // Get applicable total
        let applicableTotal = subtotal;
        if (coupon.applies_to === 'specific_products') {
          applicableTotal = items
            .filter(item => coupon.product_ids.includes(item.productId))
            .reduce((sum, item) => sum + (item.price * item.quantity), 0);
        } else if (coupon.applies_to === 'categories') {
          const productIds = items.map(item => item.productId);
          const { data: products } = await supabase
            .from('products')
            .select('id, category_id')
            .in('id', productIds);
          applicableTotal = items
            .filter(item => {
              const product = products?.find(p => p.id === item.productId);
              return product?.category_id && coupon.category_ids.includes(product.category_id);
            })
            .reduce((sum, item) => sum + (item.price * item.quantity), 0);
        }
        
        // Find the best applicable tier
        const applicableTier = sortedTiers.find(tier => applicableTotal >= tier.min_amount);
        if (applicableTier) {
          discount = applicableTier.discount_type === 'percentage'
            ? (applicableTotal * applicableTier.discount_value) / 100
            : applicableTier.discount_value;
        }
      } else {
        // Standard percentage or fixed discount
        if (coupon.applies_to === 'all') {
          discount = coupon.discount_type === 'percentage'
            ? (subtotal * coupon.discount_value) / 100
            : coupon.discount_value;
        } else if (coupon.applies_to === 'specific_products') {
          const eligibleTotal = items
            .filter(item => coupon.product_ids.includes(item.productId))
            .reduce((sum, item) => sum + (item.price * item.quantity), 0);
          
          discount = coupon.discount_type === 'percentage'
            ? (eligibleTotal * coupon.discount_value) / 100
            : coupon.discount_value;
        } else if (coupon.applies_to === 'categories') {
          const productIds = items.map(item => item.productId);
          const { data: products } = await supabase
            .from('products')
            .select('id, category_id')
            .in('id', productIds);

          const eligibleTotal = items
            .filter(item => {
              const product = products?.find(p => p.id === item.productId);
              return product?.category_id && coupon.category_ids.includes(product.category_id);
            })
            .reduce((sum, item) => sum + (item.price * item.quantity), 0);
          
          discount = coupon.discount_type === 'percentage'
            ? (eligibleTotal * coupon.discount_value) / 100
            : coupon.discount_value;
        }
      }

      discount = Math.min(discount, subtotal); // Cap at subtotal

      setCouponCode(coupon.code);
      setDiscountAmount(discount);
      setIsFreeShipping(false);
      
      if (!successMessage) {
        successMessage = `Coupon applied! You saved ${formatPrice(discount, storeCurrency)}`;
      }
      toast.success(successMessage);
    } catch (error) {
      console.error('Error applying coupon:', error);
      toast.error('Failed to apply coupon');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode(null);
    setDiscountAmount(0);
    setIsFreeShipping(false);
    setCouponInput('');
    toast.success('Coupon removed');
  };

  const subtotal = getTotalPrice();
  const totalPrice = subtotal - discountAmount + shippingCharge;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {storeSlug && (
              <Button variant="ghost" asChild>
                <Link to={`/store/${storeSlug}`}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Store
                </Link>
              </Button>
            )}
            <h1 className="text-3xl font-bold">Shopping Cart</h1>
          </div>
          {items.length > 0 && (
            <Button variant="outline" onClick={clearCart}>
              Clear Cart
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
              <p className="text-muted-foreground mb-6">Add some products to get started</p>
              {storeSlug && (
                <Button asChild>
                  <Link to={`/store/${storeSlug}`}>Continue Shopping</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <Card key={item.productId}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {item.imageUrl && (
                        <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border">
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-lg truncate">{item.productName}</h3>
                            {item.attributes && (
                              <p className="text-sm text-muted-foreground">{item.attributes}</p>
                            )}
                            <p className="text-muted-foreground">{formatPrice(item.price, storeCurrency)} each</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.productId)}
                            className="flex-shrink-0"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min="1"
                              max={item.maxStock}
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
                              className="w-16 h-8 text-center"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              disabled={item.quantity >= item.maxStock}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">{formatPrice(item.price * item.quantity, storeCurrency)}</p>
                            {item.quantity >= item.maxStock && (
                              <p className="text-xs text-muted-foreground">Max stock reached</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Cart Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Coupon Input */}
                  <div className="space-y-2">
                    <Label htmlFor="coupon">Have a coupon?</Label>
                    {couponCode ? (
                      <div className="flex items-center gap-2 p-3 bg-accent rounded-md">
                        <Tag className="h-4 w-4 text-accent-foreground" />
                        <span className="font-mono text-sm flex-1">{couponCode}</span>
                        <Button variant="ghost" size="sm" onClick={handleRemoveCoupon}>
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          id="coupon"
                          placeholder="Enter code"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                        />
                        <Button onClick={handleApplyCoupon} disabled={applyingCoupon}>
                          {applyingCoupon ? 'Applying...' : 'Apply'}
                        </Button>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(subtotal, storeCurrency)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span>-{formatPrice(discountAmount, storeCurrency)}</span>
                      </div>
                    )}
                    {shippingCharge > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Shipping</span>
                        <span>{isFreeShipping ? 'FREE' : formatPrice(shippingCharge, storeCurrency)}</span>
                      </div>
                    )}
                    {shippingCharge === 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Shipping</span>
                        <span>Calculated at checkout</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>{formatPrice(totalPrice, storeCurrency)}</span>
                    </div>
                  </div>

                  <Button className="w-full" size="lg" onClick={handleCheckout}>
                    Proceed to Checkout
                  </Button>

                  {storeSlug && (
                    <Button variant="outline" className="w-full" asChild>
                      <Link to={`/store/${storeSlug}`}>Continue Shopping</Link>
                    </Button>
                  )}

                  <div className="pt-4 text-xs text-muted-foreground">
                    <p>• Secure checkout</p>
                    <p>• Free returns within 30 days</p>
                    <p>• Customer support available 24/7</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        storeSlug={storeSlug || ''}
        onHomeClick={() => navigate(`/store/${storeSlug}`)}
      />
    </div>
  );
}
