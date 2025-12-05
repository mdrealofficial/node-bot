import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2, AlertCircle, MapPin, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { trackServerSideConversion } from '@/lib/trackingUtils';
import { BangladeshAddressForm } from '@/components/user/store/BangladeshAddressForm';
import { MobileBottomNav } from '@/components/user/store/MobileBottomNav';
import { formatPrice } from '@/lib/currencyUtils';

interface SavedAddress {
  id: string;
  label: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  delivery_location: string | null;
  city_corporation: string | null;
  area: string | null;
  sub_area: string | null;
  district: string | null;
  upazila: string | null;
  street_address: string | null;
  is_default: boolean | null;
}

export default function Checkout() {
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart, storeSlug, couponCode, discountAmount, deliveryLocation, setDeliveryLocation, shippingCharge, setShippingCharge, isFreeShipping } = useCart();
  const { customerProfile, createGuestProfile } = useCustomerAuth();
  const [loading, setLoading] = useState(false);
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeShippingSettings, setStoreShippingSettings] = useState<any>(null);
  const [paymentType, setPaymentType] = useState<'full' | 'partial' | 'cod'>('full');
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'cod'>('bkash');
  const [productPaymentSettings, setProductPaymentSettings] = useState<any[]>([]);
  const [bkashEnabled, setBkashEnabled] = useState(false);
  const [storeCurrency, setStoreCurrency] = useState('BDT');
  const [customerUser, setCustomerUser] = useState<any>(null);

  // Customer identification
  const [identifiedCustomer, setIdentifiedCustomer] = useState<any>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [addressesLoaded, setAddressesLoaded] = useState(false);
  const [addressTab, setAddressTab] = useState<'existing' | 'new'>('existing');

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    shipping_address: {} as any,
    partial_amount: '',
  });
  const [subscriberInfo, setSubscriberInfo] = useState<any>(null);

  useEffect(() => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      navigate('/cart');
      return;
    }

    loadStoreId();
    loadProductSettings();
    loadSubscriberInfo();
    
    // Disable pinch zoom and horizontal scroll on mobile
    const viewport = document.querySelector("meta[name=viewport]");
    if (viewport) {
      viewport.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no");
    }
    
    return () => {
      if (viewport) {
        viewport.setAttribute("content", "width=device-width, initial-scale=1.0");
      }
    };
  }, [items, storeSlug]);

  // Load customer from platform IDs when storeId is available
  useEffect(() => {
    if (storeId && subscriberInfo) {
      loadCustomerByPlatformId();
    } else if (storeId && !subscriberInfo) {
      // No subscriber info - show form directly
      setAddressesLoaded(true);
      setAddressTab('new');
    }
  }, [storeId, subscriberInfo]);

  // Load addresses when customer is identified
  useEffect(() => {
    if (identifiedCustomer?.id && storeId) {
      loadCustomerAddresses(identifiedCustomer.id);
    }
  }, [identifiedCustomer, storeId]);

  // Track InitiateCheckout event when user arrives at checkout
  useEffect(() => {
    if (storeId && items.length > 0) {
      const trackCheckout = async () => {
        try {
          await trackServerSideConversion(
            storeId,
            'InitiateCheckout',
            undefined,
            {
              email: formData.customer_email || undefined,
              phone: formData.customer_phone || undefined,
            }
          );
        } catch (error) {
          console.error('Failed to track checkout initiation:', error);
        }
      };
      trackCheckout();
    }
  }, [storeId, items]);

  const loadSubscriberInfo = () => {
    const storedInfo = localStorage.getItem('subscriber_info');
    if (storedInfo) {
      try {
        const info = JSON.parse(storedInfo);
        console.log('Loaded subscriber info:', info);
        
        // Map from generic 'id' + 'platform' to platform-specific fields
        let facebookPsid = info.facebook_psid || info.psid || null;
        let instagramId = info.instagram_id || null;
        let whatsappPhone = info.whatsapp_phone || null;
        let webVisitorId = info.web_visitor_id || null;
        
        // If we have id + platform format, map appropriately
        if (info.id && info.platform) {
          if (info.platform === 'facebook') {
            facebookPsid = info.id;
          } else if (info.platform === 'instagram') {
            instagramId = info.id;
          } else if (info.platform === 'whatsapp') {
            whatsappPhone = info.id;
          } else if (info.platform === 'website') {
            webVisitorId = info.id;
          }
        }
        
        const normalizedInfo = {
          ...info,
          facebook_psid: facebookPsid,
          instagram_id: instagramId,
          whatsapp_phone: whatsappPhone,
          web_visitor_id: webVisitorId,
        };
        console.log('Normalized subscriber info:', normalizedInfo);
        setSubscriberInfo(normalizedInfo);
        
        // Pre-fill form with subscriber data
        setFormData(prev => ({
          ...prev,
          customer_name: info.name || prev.customer_name,
        }));
      } catch (error) {
        console.error('Failed to parse subscriber info');
      }
    }
  };

  const loadCustomerByPlatformId = async () => {
    if (!storeId || !subscriberInfo) return;

    console.log('Looking up customer for store:', storeId, 'with subscriberInfo:', subscriberInfo);

    try {
      let query = supabase
        .from('store_customers')
        .select('*')
        .eq('store_id', storeId);

      // Try to find customer by platform ID
      if (subscriberInfo.facebook_psid) {
        console.log('Searching by facebook_psid:', subscriberInfo.facebook_psid);
        query = query.eq('facebook_psid', subscriberInfo.facebook_psid);
      } else if (subscriberInfo.instagram_id) {
        console.log('Searching by instagram_id:', subscriberInfo.instagram_id);
        query = query.eq('instagram_id', subscriberInfo.instagram_id);
      } else if (subscriberInfo.whatsapp_phone) {
        console.log('Searching by whatsapp_phone:', subscriberInfo.whatsapp_phone);
        query = query.eq('whatsapp_phone', subscriberInfo.whatsapp_phone);
      } else if (subscriberInfo.web_visitor_id) {
        console.log('Searching by web_visitor_id:', subscriberInfo.web_visitor_id);
        query = query.eq('web_visitor_id', subscriberInfo.web_visitor_id);
      } else {
        // No platform ID available, mark as loaded
        console.log('No platform ID available in subscriberInfo');
        setAddressesLoaded(true);
        setAddressTab('new');
        return;
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('Error loading customer by platform ID:', error);
        setAddressesLoaded(true);
        setAddressTab('new');
        return;
      }

      console.log('Customer lookup result:', data);

      if (data) {
        setIdentifiedCustomer(data);
        // Pre-fill form with customer data
        setFormData(prev => ({
          ...prev,
          customer_name: data.full_name || prev.customer_name,
          customer_phone: data.phone || prev.customer_phone,
          customer_email: data.email || prev.customer_email,
        }));
      } else {
        // Customer not found - set to new address mode
        console.log('Customer not found, setting to new address mode');
        setAddressesLoaded(true);
        setAddressTab('new');
      }
    } catch (error) {
      console.error('Error loading customer:', error);
      setAddressesLoaded(true);
      setAddressTab('new');
    }
  };

  const loadCustomerAddresses = async (customerId: string) => {
    try {
      console.log('Loading addresses for customer:', customerId, 'store:', storeId);
      setAddressesLoaded(false);
      const { data, error } = await supabase
        .from('store_customer_addresses')
        .select('*')
        .eq('customer_id', customerId)
        .eq('store_id', storeId)
        .order('is_default', { ascending: false });

      if (error) {
        console.error('Error loading addresses:', error);
        setAddressesLoaded(true);
        return;
      }

      console.log('Loaded addresses:', data);
      const addresses = data || [];
      setSavedAddresses(addresses);
      setAddressesLoaded(true);

      // Auto-select default address or first address
      if (addresses.length > 0) {
        const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
        setSelectedAddressId(defaultAddr.id);
        applySelectedAddress(defaultAddr);
        setAddressTab('existing');
      } else {
        setAddressTab('new');
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
      setAddressesLoaded(true);
    }
  };

  const applySelectedAddress = (address: SavedAddress) => {
    if (!address) return;
    
    const deliveryLoc = address.delivery_location as 'inside_dhaka' | 'outside_dhaka';
    if (deliveryLoc) {
      setDeliveryLocation(deliveryLoc);
    }
    setFormData(prev => ({
      ...prev,
      customer_name: address.receiver_name || prev.customer_name,
      customer_phone: address.receiver_phone || prev.customer_phone,
      shipping_address: {
        delivery_location: deliveryLoc || '',
        city_corporation: address.city_corporation || '',
        area: address.area || '',
        sub_area: address.sub_area || '',
        district: address.district || '',
        upazila: address.upazila || '',
        street_address: address.street_address || '',
      },
    }));
    
    // Recalculate shipping
    if (productPaymentSettings.length > 0) {
      setTimeout(() => calculateShipping(productPaymentSettings), 100);
    }
  };

  const handleAddressSelect = (addressId: string) => {
    setSelectedAddressId(addressId);
    const address = savedAddresses.find(a => a.id === addressId);
    if (address) {
      applySelectedAddress(address);
    }
  };

  const formatAddressDisplay = (address: SavedAddress) => {
    const parts: string[] = [];
    if (address.receiver_name) parts.push(address.receiver_name);
    if (address.receiver_phone) parts.push(address.receiver_phone);
    
    const locationParts: string[] = [];
    if (address.street_address) locationParts.push(address.street_address);
    if (address.sub_area) locationParts.push(address.sub_area);
    if (address.area) locationParts.push(address.area);
    if (address.district) locationParts.push(address.district);
    if (address.upazila) locationParts.push(address.upazila);
    
    return {
      name: address.receiver_name || 'No Name',
      phone: address.receiver_phone || '',
      location: locationParts.join(', ') || 'No address details',
      zone: address.delivery_location === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka',
      label: address.label || (address.is_default ? 'Default' : ''),
    };
  };

  const loadStoreId = async () => {
    if (!storeSlug) return;

    try {
      setStoreLoading(true);
      const { data } = await supabase
        .from('stores')
        .select('id, bkash_app_key, bkash_app_secret, bkash_app_username, bkash_app_password, currency, shipping_area_mode, default_shipping_inside_dhaka, default_shipping_outside_dhaka, default_return_charge, shipping_calculation_method, enable_sub_area_selection')
        .eq('slug', storeSlug)
        .maybeSingle();

      if (data) {
        setStoreId(data.id);
        const isBkashConfigured = !!(data.bkash_app_key && data.bkash_app_secret && 
                                      data.bkash_app_username && data.bkash_app_password);
        setBkashEnabled(isBkashConfigured);
        setStoreCurrency(data.currency || 'USD');
        setStoreShippingSettings({
          shipping_area_mode: data.shipping_area_mode || 'both',
          default_shipping_inside_dhaka: data.default_shipping_inside_dhaka || 60,
          default_shipping_outside_dhaka: data.default_shipping_outside_dhaka || 120,
          default_return_charge: data.default_return_charge || 50,
          shipping_calculation_method: data.shipping_calculation_method || 'flat_rate',
          enable_sub_area_selection: data.enable_sub_area_selection,
        });
      }
    } catch (error) {
      console.error('Failed to load store ID');
    } finally {
      setStoreLoading(false);
    }

    // Check customer auth
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setCustomerUser(session.user);
    }
  };

  const loadProductSettings = async () => {
    try {
      const productIds = items.map(item => item.productId);
      const { data, error } = await supabase
        .from('products')
        .select('id, requires_full_payment, allows_cod, minimum_payment_percentage, shipping_inside_dhaka, shipping_outside_dhaka')
        .in('id', productIds);

      if (error) throw error;
      setProductPaymentSettings(data || []);
      
      // Calculate initial shipping if delivery location is already set
      if (deliveryLocation && storeShippingSettings) {
        calculateShipping(data || []);
      }
    } catch (error) {
      console.error('Failed to load product settings');
    }
  };

  const calculateShipping = (products: any[]) => {
    if (!deliveryLocation || !storeShippingSettings) return;
    
    const method = storeShippingSettings.shipping_calculation_method || 'flat_rate';
    
    const getProductShipping = (product: any) => {
      return deliveryLocation === 'inside_dhaka'
        ? product?.shipping_inside_dhaka ?? storeShippingSettings.default_shipping_inside_dhaka
        : product?.shipping_outside_dhaka ?? storeShippingSettings.default_shipping_outside_dhaka;
    };

    let totalShipping = 0;

    switch (method) {
      case 'flat_rate':
        totalShipping = Math.max(...items.map(item => {
          const product = products.find(p => p.id === item.productId);
          return getProductShipping(product);
        }));
        break;

      case 'per_product':
        totalShipping = items.reduce((total, item) => {
          const product = products.find(p => p.id === item.productId);
          return total + getProductShipping(product);
        }, 0);
        break;

      case 'per_item':
        totalShipping = items.reduce((total, item) => {
          const product = products.find(p => p.id === item.productId);
          return total + (getProductShipping(product) * item.quantity);
        }, 0);
        break;
    }
    
    setShippingCharge(isFreeShipping ? 0 : totalShipping);
  };

  const totalAmount = getTotalPrice();
  const subtotal = totalAmount;
  const finalTotal = totalAmount - discountAmount + shippingCharge;
  
  const allRequireFullPayment = productPaymentSettings.every(p => p.requires_full_payment);
  const anyAllowsCOD = productPaymentSettings.some(p => p.allows_cod);
  const maxMinimumPercentage = Math.max(...productPaymentSettings.map(p => p.minimum_payment_percentage || 0), 0);
  const minimumPaymentAmount = (finalTotal * maxMinimumPercentage) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!storeId) {
      toast.error('Store information is missing');
      return;
    }

    // Validate address based on whether we have saved addresses or not
    const hasExistingAddrs = savedAddresses.length > 0;
    
    if (hasExistingAddrs && addressTab === 'existing') {
      if (!selectedAddressId) {
        toast.error('Please select a delivery address');
        return;
      }
    } else {
      // Either addressTab is 'new' OR no existing addresses (form shown directly)
      if (!formData.shipping_address.delivery_location) {
        toast.error('Please fill in the delivery address');
        return;
      }
    }

    setLoading(true);
    try {
      let profileId = customerProfile?.id;
      
      if (!profileId) {
        const guestProfile = await createGuestProfile();
        if (!guestProfile) {
          toast.error('Failed to create customer profile. Please contact support.');
          setLoading(false);
          return;
        }
        profileId = guestProfile.id;
      }
      
      const { error: updateError } = await supabase
        .from('customer_profiles')
        .update({
          full_name: formData.customer_name,
          email: formData.customer_email || null,
          phone: formData.customer_phone || null,
        })
        .eq('id', profileId);

      if (updateError) {
        throw new Error('Failed to update customer information');
      }

      let paidAmount = 0;
      let orderStatus: 'pending' | 'paid' | 'partially_paid' = 'pending';
      let paymentMethodValue = paymentMethod;

      if (paymentType === 'cod') {
        paidAmount = 0;
        orderStatus = 'pending';
        paymentMethodValue = 'cod';
      } else if (paymentType === 'full') {
        paidAmount = paymentMethod === 'bkash' ? 0 : finalTotal;
        orderStatus = paymentMethod === 'bkash' ? 'pending' : 'paid';
      } else {
        paidAmount = paymentMethod === 'bkash' ? 0 : parseFloat(formData.partial_amount);
        orderStatus = paymentMethod === 'bkash' ? 'pending' : 'partially_paid';
      }

      if (paymentType === 'partial') {
        const partialAmount = parseFloat(formData.partial_amount);
        if (partialAmount < minimumPaymentAmount) {
          toast.error(`Minimum payment required: ${formatPrice(minimumPaymentAmount, storeCurrency)}`);
          setLoading(false);
          return;
        }
        if (partialAmount > finalTotal) {
          toast.error('Payment amount cannot exceed total');
          setLoading(false);
          return;
        }
      }

      const orderItems = items.map(item => ({
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));

      const { data: orderResponse, error: createOrderError } = await supabase.functions.invoke('store-create-order', {
        body: {
          storeId,
          profileId,
          customer: {
            name: formData.customer_name,
            phone: formData.customer_phone,
            email: formData.customer_email || null,
          },
          shippingAddress: formData.shipping_address,
          shippingCharge,
          finalTotal,
          discountAmount,
          couponCode: couponCode || null,
          status: orderStatus,
          paymentMethod: paymentMethodValue,
          paidAmount,
          items: orderItems,
          // Pass platform IDs for customer identification
          facebookPsid: subscriberInfo?.facebook_psid || subscriberInfo?.psid || null,
          instagramId: subscriberInfo?.instagram_id || null,
          whatsappPhone: subscriberInfo?.whatsapp_phone || null,
          webVisitorId: subscriberInfo?.web_visitor_id || null,
          // Save new address if user filled one
          saveNewAddress: addressTab === 'new' || !hasExistingAddresses,
        },
      });

      if (createOrderError || !orderResponse?.success || !orderResponse.orderId) {
        throw new Error(orderResponse?.error || 'Failed to create order');
      }

      const orderId = orderResponse.orderId;

      if (paymentMethod === 'bkash' && paymentType !== 'cod') {
        try {
          const { data: paymentData, error: paymentError } = await supabase.functions.invoke('bkash-payment', {
            body: {
              action: 'create_payment',
              storeId,
              orderId,
            },
          });

          if (paymentError || !paymentData?.success) {
            throw new Error(paymentData?.error || 'Failed to initiate bKash payment');
          }

          if (paymentData.bkashURL) {
            window.location.href = paymentData.bkashURL;
            return;
          }
        } catch (paymentError) {
          console.error('bKash payment error:', paymentError);
          toast.error('Failed to initiate payment. Please try again.');
          setLoading(false);
          return;
        }
      }

      // Track server-side conversion for Purchase
      try {
        await trackServerSideConversion(
          storeId,
          'Purchase',
          orderId,
          {
            email: formData.customer_email,
            phone: formData.customer_phone,
            firstName: formData.customer_name.split(' ')[0],
            lastName: formData.customer_name.split(' ').slice(1).join(' '),
          }
        );
      } catch (trackingError) {
        console.error('Failed to track purchase conversion:', trackingError);
      }

      const message = paymentType === 'cod' 
        ? 'Order placed! Pay on delivery.' 
        : 'Order placed successfully!';
      
      toast.success(message);
      clearCart();
      navigate(`/store/${storeSlug}`);
    } catch (error: any) {
      console.error('Checkout error:', error);
      const errorMessage = error?.message || 'Failed to process order';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const hasExistingAddresses = savedAddresses.length > 0;

  return (
    <div className="min-h-screen bg-muted/30 py-6 md:py-8 store-page">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/cart">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Cart
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <Card className="shadow-md">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-8 bg-primary rounded-full"></div>
                  <div>
                    <CardTitle className="text-2xl">Checkout</CardTitle>
                    <CardDescription className="text-sm">Complete your purchase securely</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-lg font-semibold">1. Contact Details</h3>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium">Full Name *</Label>
                        <div className="relative">
                          {subscriberInfo?.profile_pic && (
                            <img 
                              src={subscriberInfo.profile_pic} 
                              alt="Profile" 
                              className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                            />
                          )}
                          <Input
                            id="name"
                            value={formData.customer_name}
                            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                            placeholder="John Doe"
                            className={`h-11 ${subscriberInfo?.profile_pic ? 'pl-14' : ''}`}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium">Phone Number *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.customer_phone}
                          onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                          placeholder="+880 1XXX-XXXXXX"
                          className="h-11"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* Delivery Address Section */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-lg font-semibold">2. Delivery Address</h3>
                    </div>

                    {!addressesLoaded && subscriberInfo ? (
                      // Loading state while checking for customer addresses
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-muted-foreground">Loading saved addresses...</span>
                      </div>
                    ) : hasExistingAddresses ? (
                      <Tabs value={addressTab} onValueChange={(v) => setAddressTab(v as 'existing' | 'new')} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                          <TabsTrigger value="existing" className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Saved Address
                          </TabsTrigger>
                          <TabsTrigger value="new" className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            New Address
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="existing" className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Select Delivery Address</Label>
                            <Select value={selectedAddressId} onValueChange={handleAddressSelect}>
                              <SelectTrigger className="w-full h-auto min-h-[60px] py-3">
                                <SelectValue placeholder="Choose an address">
                                  {selectedAddressId && (() => {
                                    const addr = savedAddresses.find(a => a.id === selectedAddressId);
                                    if (!addr) return 'Choose an address';
                                    const display = formatAddressDisplay(addr);
                                    return (
                                      <div className="flex flex-col items-start text-left">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{display.name}</span>
                                          {display.phone && <span className="text-muted-foreground">• {display.phone}</span>}
                                        </div>
                                        <span className="text-xs text-muted-foreground truncate max-w-full">{display.location}</span>
                                        <span className="text-xs font-medium text-primary">{display.zone}</span>
                                      </div>
                                    );
                                  })()}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {savedAddresses.map((address) => {
                                  const display = formatAddressDisplay(address);
                                  return (
                                    <SelectItem key={address.id} value={address.id} className="py-3">
                                      <div className="flex flex-col items-start">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{display.name}</span>
                                          {display.phone && <span className="text-muted-foreground text-xs">• {display.phone}</span>}
                                          {display.label && (
                                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{display.label}</span>
                                          )}
                                        </div>
                                        <span className="text-xs text-muted-foreground">{display.location}</span>
                                        <span className="text-xs font-medium text-primary">{display.zone}</span>
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>

                          {selectedAddressId && (
                            <div className="p-4 bg-muted/50 rounded-lg border">
                              {(() => {
                                const addr = savedAddresses.find(a => a.id === selectedAddressId);
                                if (!addr) return null;
                                const display = formatAddressDisplay(addr);
                                return (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold">{display.name}</span>
                                      <span className="text-sm bg-primary text-primary-foreground px-2 py-1 rounded">{display.zone}</span>
                                    </div>
                                    {display.phone && <p className="text-sm text-muted-foreground">{display.phone}</p>}
                                    <p className="text-sm">{display.location}</p>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="new" className="space-y-4">
                          <BangladeshAddressForm
                            value={formData.shipping_address}
                            onChange={(addressData) => {
                              setFormData({ ...formData, shipping_address: addressData });
                              if (addressData.delivery_location && storeShippingSettings) {
                                setDeliveryLocation(addressData.delivery_location);
                                calculateShipping(productPaymentSettings);
                              }
                            }}
                            allowedAreas={storeShippingSettings?.shipping_area_mode || 'both'}
                          />
                        </TabsContent>
                      </Tabs>
                    ) : (
                      // No existing addresses - show form directly without tabs
                      <BangladeshAddressForm
                        value={formData.shipping_address}
                        onChange={(addressData) => {
                          setFormData({ ...formData, shipping_address: addressData });
                          if (addressData.delivery_location && storeShippingSettings) {
                            setDeliveryLocation(addressData.delivery_location);
                            calculateShipping(productPaymentSettings);
                          }
                        }}
                        allowedAreas={storeShippingSettings?.shipping_area_mode || 'both'}
                      />
                    )}
                  </div>

                  <Separator className="my-6" />
                  
                  <div className="space-y-5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">3. Payment Method</h3>
                    </div>
                    
                    {allRequireFullPayment && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Full payment required for all items in your cart.
                        </AlertDescription>
                      </Alert>
                    )}

                    {!allRequireFullPayment && maxMinimumPercentage > 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Minimum payment: {formatPrice(minimumPaymentAmount, storeCurrency)} ({maxMinimumPercentage}% of total)
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <RadioGroup value={paymentType} onValueChange={(value: any) => setPaymentType(value)} className="space-y-3">
                      {!allRequireFullPayment && (
                        <>
                          <div className="flex items-center space-x-3 p-4 border-2 rounded-xl hover:bg-accent/50 hover:border-primary transition-all cursor-pointer">
                            <RadioGroupItem value="full" id="full" className="mt-1" />
                            <Label htmlFor="full" className="flex-1 cursor-pointer">
                              <div className="font-semibold text-base">Full Payment</div>
                              <div className="text-sm text-muted-foreground mt-0.5">Pay the complete amount now</div>
                            </Label>
                            <div className="font-bold text-lg text-primary">{formatPrice(finalTotal, storeCurrency)}</div>
                          </div>

                          {maxMinimumPercentage > 0 && (
                            <div className="flex items-center space-x-3 p-4 border-2 rounded-xl hover:bg-accent/50 hover:border-primary transition-all cursor-pointer">
                              <RadioGroupItem value="partial" id="partial" className="mt-1" />
                              <Label htmlFor="partial" className="flex-1 cursor-pointer">
                                <div className="font-semibold text-base">Partial Payment</div>
                                <div className="text-sm text-muted-foreground mt-0.5">
                                  Pay minimum {maxMinimumPercentage}% ({formatPrice(minimumPaymentAmount, storeCurrency)})
                                </div>
                              </Label>
                            </div>
                          )}
                        </>
                      )}

                      {allRequireFullPayment && (
                        <div className="flex items-center space-x-2 p-4 border rounded-lg bg-accent">
                          <RadioGroupItem value="full" id="full" disabled />
                          <Label htmlFor="full" className="flex-1">
                            <div className="font-medium">Full Payment Required</div>
                            <div className="text-sm text-muted-foreground">
                              Products in your cart require full payment
                            </div>
                          </Label>
                          <div className="font-bold">{formatPrice(finalTotal, storeCurrency)}</div>
                        </div>
                      )}

                      {anyAllowsCOD && (
                        <div className="flex items-center space-x-3 p-4 border-2 rounded-xl hover:bg-accent/50 hover:border-primary transition-all cursor-pointer">
                          <RadioGroupItem value="cod" id="cod" className="mt-1" />
                          <Label htmlFor="cod" className="flex-1 cursor-pointer">
                            <div className="font-semibold text-base">Cash on Delivery</div>
                            <div className="text-sm text-muted-foreground mt-0.5">Pay when you receive your order</div>
                          </Label>
                        </div>
                      )}
                    </RadioGroup>

                    {paymentType === 'partial' && (
                      <div className="space-y-2 pl-6">
                        <Label htmlFor="partial-amount">Payment Amount *</Label>
                        <Input
                          id="partial-amount"
                          type="number"
                          min={minimumPaymentAmount}
                          max={finalTotal}
                          step="0.01"
                          value={formData.partial_amount}
                          onChange={(e) => setFormData({ ...formData, partial_amount: e.target.value })}
                          placeholder={`Minimum: ${formatPrice(minimumPaymentAmount, storeCurrency)}`}
                          required
                        />
                      </div>
                    )}

                    {paymentType !== 'cod' && (
                      <>
                        <Separator className="my-4" />
                        <div>
                          <Label className="text-base font-semibold mb-3 block">Select Payment Gateway</Label>
                          <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)} className="space-y-3">
                            {bkashEnabled && (
                              <div className="flex items-center space-x-3 p-4 border-2 rounded-xl hover:bg-accent/50 hover:border-primary transition-all cursor-pointer">
                                <RadioGroupItem value="bkash" id="bkash" className="mt-1" />
                                <Label htmlFor="bkash" className="flex-1 cursor-pointer">
                                  <div className="font-semibold text-base">bKash</div>
                                  <div className="text-sm text-muted-foreground mt-0.5">Secure payment via bKash mobile wallet</div>
                                </Label>
                              </div>
                            )}
                            {!bkashEnabled && (
                              <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  No payment gateway available. Please contact the store owner.
                                </AlertDescription>
                              </Alert>
                            )}
                          </RadioGroup>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="pt-6">
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-semibold" 
                      size="lg" 
                      disabled={loading || (!bkashEnabled && paymentType !== 'cod')}
                    >
                      {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                      {paymentType === 'cod' ? 'Place Order' : 'Proceed to Payment'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="shadow-md sticky top-6">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.productId} className="flex justify-between text-sm">
                      <span>{item.productName} x {item.quantity}</span>
                      <span>{formatPrice(item.price * item.quantity, storeCurrency)}</span>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal, storeCurrency)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-{formatPrice(discountAmount, storeCurrency)}</span>
                    </div>
                  )}
                  {(shippingCharge > 0 || isFreeShipping) && (
                    <div className="flex justify-between text-sm">
                      <span>Shipping ({deliveryLocation === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'})</span>
                      <span>{isFreeShipping ? 'FREE' : formatPrice(shippingCharge, storeCurrency)}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatPrice(finalTotal, storeCurrency)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        storeSlug={storeSlug || ''}
        onHomeClick={() => navigate(`/store/${storeSlug}`)}
      />
    </div>
  );
}
