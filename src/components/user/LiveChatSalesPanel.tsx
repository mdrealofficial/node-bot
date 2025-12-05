import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ShoppingCart, Package, History, Search, Plus, Minus, Trash2, ShoppingBag, MapPin, Send, Percent, Tag, ChevronRight, ChevronLeft, Users, Receipt, CheckCircle2, Clock, FileText, Store, Globe, Pencil, User, Phone, X } from 'lucide-react';
import { toast } from 'sonner';
import { BangladeshAddressForm } from './store/BangladeshAddressForm';
import { formatPrice } from '@/lib/currencyUtils';
interface Store {
  id: string;
  name: string;
  currency: string;
  slug: string;
  subdomain?: string;
  carousel_see_details_text?: string;
  carousel_buy_now_text?: string;
}
interface Product {
  id: string;
  name: string;
  price: number;
  images: string[] | null;
  allImages: string[];
  variations: string[];
  description?: string;
  landing_page_url?: string;
}
interface CartItem {
  product: Product;
  quantity: number;
  selectedVariation?: string;
}
interface Address {
  id: string;
  label?: string;
  delivery_location: string;
  city_corporation?: string;
  area?: string;
  sub_area?: string;
  district?: string;
  upazila?: string;
  street_address: string;
  receiver_name?: string;
  receiver_phone?: string;
}
interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  order_items: any[];
}
interface Invoice {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  items: any;
  payment_type: string;
  discount_amount?: number;
}
interface Coupon {
  id: string;
  code: string;
  name: string;
  discount_type: string;
  discount_value: number;
  minimum_purchase?: number | null;
  is_active: boolean;
}
interface CustomerStats {
  totalOrders: number;
  totalSpent: number;
}
interface CustomerData {
  id: string;
  full_name?: string;
  phone?: string;
}
interface LiveChatSalesPanelProps {
  userId: string;
  conversationId: string;
  conversationType: 'facebook' | 'instagram' | 'whatsapp';
  customerName: string;
  customerPhone?: string;
  customerPlatformId: string;
}
export default function LiveChatSalesPanel({
  userId,
  conversationId,
  conversationType,
  customerName,
  customerPhone,
  customerPlatformId
}: LiveChatSalesPanelProps) {
  // Mode and flow state
  const [mode, setMode] = useState<'quick' | 'pos' | 'history'>('quick');
  const [posStep, setPosStep] = useState<1 | 2 | 3>(1);

  // Product and store state
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);

  // Discount state
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [discountType, setDiscountType] = useState<'none' | 'coupon' | 'manual'>('none');
  const [manualDiscountType, setManualDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [manualDiscountValue, setManualDiscountValue] = useState(0);

  // Address state
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [manualAddress, setManualAddress] = useState<any>(null);
  const [sendingAddressRequest, setSendingAddressRequest] = useState(false);
  const [addressRequestStatus, setAddressRequestStatus] = useState<'none' | 'pending' | 'received'>('none');

  // Custom shipping state
  const [customShipping, setCustomShipping] = useState<number | null>(null);

  // Invoice state
  const [paymentType, setPaymentType] = useState<'full_cod' | 'partial' | 'full_online'>('full_cod');
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [sending, setSending] = useState(false);

  // History state
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customerStats, setCustomerStats] = useState<CustomerStats>({
    totalOrders: 0,
    totalSpent: 0
  });

  // Customer data state - using platform ID as primary identifier
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  
  useEffect(() => {
    loadStoreAndProducts();
  }, [userId]);

  // Reset all customer-specific data when conversation changes
  useEffect(() => {
    setCustomer(null);
    setSavedAddresses([]);
    setSelectedAddressId('');
    setOrders([]);
    setInvoices([]);
    setCustomerStats({ totalOrders: 0, totalSpent: 0 });
    setCart([]);
    setSelectedProducts([]);
    setAppliedCoupon(null);
    setDiscountType('none');
    setManualDiscountValue(0);
    setCustomShipping(null);
    setPosStep(1);
    setMode('quick');
    setAddressRequestStatus('none');
  }, [conversationId, customerPlatformId]);

  useEffect(() => {
    if (store && customerPlatformId) {
      loadCustomerByPlatformId();
    }
  }, [store, customerPlatformId, conversationType]);

  // When customer is loaded, load their addresses and history
  useEffect(() => {
    if (customer?.id && store?.id) {
      loadCustomerAddresses(customer.id);
      loadPurchaseHistory(customer.id);
      loadCustomerStats(customer.id);
    } else if (!customer && store?.id && customerPlatformId) {
      // Even without a customer record, try to load invoices by platform ID
      setSavedAddresses([]);
      setSelectedAddressId('');
      setOrders([]);
      loadInvoicesByPlatformId();
    }
  }, [customer?.id, store?.id, customerPlatformId]);

  // Update address status when addresses change
  useEffect(() => {
    if (savedAddresses.length > 0) {
      setAddressRequestStatus('received');
    }
  }, [savedAddresses]);

  // Realtime subscription for address updates
  useEffect(() => {
    if (!store?.id || !customer?.id) return;
    const channel = supa.channel(`addresses-${customer.id}-${conversationId}`).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'store_customer_addresses',
      filter: `customer_id=eq.${customer.id}`
    }, () => {
      loadCustomerAddresses(customer.id);
    }).subscribe();
    return () => {
      supa.removeChannel(channel);
    };
  }, [store?.id, customer?.id, conversationId]);

  // Realtime subscription for customer creation/updates (e.g., when customer places order from storefront)
  useEffect(() => {
    if (!store?.id || !customerPlatformId) return;
    const channel = supa.channel(`customer-${customerPlatformId}-${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'store_customers',
        filter: `store_id=eq.${store.id}`
      }, (payload: any) => {
        // Check if this update is for our platform ID
        const data = payload.new;
        if (data && (
          (conversationType === 'facebook' && data.facebook_psid === customerPlatformId) ||
          (conversationType === 'instagram' && data.instagram_id === customerPlatformId) ||
          (conversationType === 'whatsapp' && data.whatsapp_phone === customerPlatformId)
        )) {
          // Reload customer data
          loadCustomerByPlatformId();
        }
      })
      .subscribe();
    return () => {
      supa.removeChannel(channel);
    };
  }, [store?.id, customerPlatformId, conversationType, conversationId]);

  // Use a loosely-typed client to avoid deep generic instantiation issues
  const supa: any = supabase;

  // Load customer by platform ID (primary identification method)
  const loadCustomerByPlatformId = async () => {
    if (!store?.id || !customerPlatformId) return;
    try {
      // Determine the correct column based on conversation type
      let query = supa.from('store_customers').select('id, full_name, phone, total_orders, total_spent').eq('store_id', store.id);
      if (conversationType === 'facebook') {
        query = query.eq('facebook_psid', customerPlatformId);
      } else if (conversationType === 'instagram') {
        query = query.eq('instagram_id', customerPlatformId);
      } else if (conversationType === 'whatsapp') {
        query = query.eq('whatsapp_phone', customerPlatformId);
      }
      const {
        data: customerData
      } = await query.maybeSingle();
      if (customerData) {
        setCustomer({
          id: customerData.id,
          full_name: customerData.full_name,
          phone: customerData.phone
        });
        setCustomerStats({
          totalOrders: customerData.total_orders || 0,
          totalSpent: customerData.total_spent || 0
        });
      } else {
        // Customer doesn't exist yet - they'll be created when they submit address or place order
        setCustomer(null);
        setCustomerStats({
          totalOrders: 0,
          totalSpent: 0
        });
      }
    } catch (error) {
      console.error('Error loading customer by platform ID:', error);
    }
  };
  const loadStoreAndProducts = async () => {
    try {
      const {
        data: storeData
      } = await supa.from('stores').select('*').eq('user_id', userId).single();
      if (storeData) {
        setStore(storeData);
        const {
          data: productsData
        } = await supa.from('products').select('*').eq('store_id', storeData.id).eq('is_active', true).order('name');

        // Fetch variations and images for each product
        const productsWithDetails = await Promise.all((productsData || []).map(async (product: any) => {
          const {
            data: variationsData
          } = await supa.from('product_variations').select('*').eq('product_id', product.id);
          const variations = variationsData?.map((v: any) => v.name) || [];
          const {
            data: imagesData
          } = await supa.from('product_images').select('*').eq('product_id', product.id).order('display_order');
          const allImages = imagesData?.map((img: any) => img.url) || [];
          return {
            id: product.id,
            name: product.name,
            price: product.price,
            images: product.image_url ? [product.image_url] : null,
            allImages: allImages.length > 0 ? allImages : product.image_url ? [product.image_url] : [],
            variations,
            description: product.description || undefined,
            landing_page_url: product.landing_page_url || undefined
          };
        }));
        setProducts(productsWithDetails);

        // Load active coupons
        const {
          data: couponsData
        } = await supa.from('coupons').select('*').eq('store_id', storeData.id).eq('is_active', true).gte('valid_until', new Date().toISOString()).order('name');
        setCoupons(couponsData || []);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading store data:', error);
      setLoading(false);
    }
  };
  const loadCustomerStats = async (customerId: string) => {
    try {
      const {
        data: customerData
      } = await supabase.from('store_customers').select('total_orders, total_spent').eq('id', customerId).maybeSingle();
      if (customerData) {
        setCustomerStats({
          totalOrders: customerData.total_orders || 0,
          totalSpent: customerData.total_spent || 0
        });
      }
    } catch (error) {
      console.error('Error loading customer stats:', error);
    }
  };
  const loadCustomerAddresses = async (customerId: string) => {
    if (!store?.id) return;
    try {
      const {
        data: addresses
      } = await supabase.from('store_customer_addresses').select('*').eq('customer_id', customerId).eq('store_id', store.id).order('is_default', {
        ascending: false
      });
      if (addresses && addresses.length > 0) {
        setSavedAddresses(addresses.map(addr => ({
          id: addr.id,
          label: addr.label || 'Address',
          delivery_location: addr.delivery_location || '',
          city_corporation: addr.city_corporation,
          area: addr.area,
          sub_area: addr.sub_area,
          district: addr.district,
          upazila: addr.upazila,
          street_address: addr.street_address || '',
          receiver_name: addr.receiver_name,
          receiver_phone: addr.receiver_phone
        })));
        const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
        setSelectedAddressId(defaultAddr.id);
      } else {
        setSavedAddresses([]);
        setSelectedAddressId('');
      }
    } catch (error) {
      console.error('Error loading customer addresses:', error);
    }
  };
  const loadPurchaseHistory = async (customerId: string) => {
    if (!store?.id || !customerId) return;
    try {
      // First get customer phone for order lookup
      const { data: customerData } = await supabase
        .from('store_customers')
        .select('phone')
        .eq('id', customerId)
        .maybeSingle();
      
      // Load orders by customer phone (since orders use customer_profile_id from different table)
      // Also try to match by customer name for better identification
      let ordersQuery = supabase
        .from('orders')
        .select('id, created_at, total_amount, status, customer_phone, order_items(*)')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });
      
      if (customerData?.phone) {
        ordersQuery = ordersQuery.eq('customer_phone', customerData.phone);
      }
      
      const { data: ordersData } = await ordersQuery;
      setOrders((ordersData || []) as Order[]);
      
      // Load invoices filtered by conversation AND store
      // Also try to match by customer platform ID
      const { data: invoicesData } = await supabase
        .from('chat_invoices')
        .select('id, created_at, total_amount, status, items, payment_type, discount_amount')
        .eq('store_id', store.id)
        .or(`conversation_id.eq.${conversationId},customer_platform_id.eq.${customerPlatformId}`)
        .order('created_at', { ascending: false });
      
      setInvoices((invoicesData || []) as Invoice[]);
    } catch (error) {
      console.error('Error loading purchase history:', error);
    }
  };

  // Load invoices by platform ID for customers without a store record yet
  const loadInvoicesByPlatformId = async () => {
    if (!store?.id || !customerPlatformId) return;
    try {
      const { data: invoicesData } = await supabase
        .from('chat_invoices')
        .select('id, created_at, total_amount, status, items, payment_type, discount_amount')
        .eq('store_id', store.id)
        .or(`conversation_id.eq.${conversationId},customer_platform_id.eq.${customerPlatformId}`)
        .order('created_at', { ascending: false });
      
      setInvoices((invoicesData || []) as Invoice[]);
    } catch (error) {
      console.error('Error loading invoices by platform ID:', error);
    }
  };

  // Cart management
  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      updateQuantity(product.id, existing.quantity + 1);
    } else {
      setCart([...cart, {
        product,
        quantity: 1
      }]);
    }
  };
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(item => item.product.id === productId ? {
      ...item,
      quantity
    } : item));
  };
  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };
  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
    setDiscountType('none');
    setManualDiscountValue(0);
    setCustomShipping(null);
    setPosStep(1);
  };

  // Discount calculations
  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  };
  const calculateShipping = () => {
    if (!cart.length) return 0;
    if (customShipping !== null) return customShipping;
    const selectedAddr = savedAddresses.find(a => a.id === selectedAddressId) || manualAddress;
    const isInsideDhaka = selectedAddr?.delivery_location === 'inside_dhaka' || (selectedAddr as any)?.deliveryLocation === 'inside_dhaka';
    return isInsideDhaka ? 60 : 120;
  };
  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    if (discountType === 'coupon' && appliedCoupon) {
      if (appliedCoupon.discount_type === 'percentage') {
        return subtotal * appliedCoupon.discount_value / 100;
      } else if (appliedCoupon.discount_type === 'fixed') {
        return Math.min(appliedCoupon.discount_value, subtotal);
      } else if (appliedCoupon.discount_type === 'free_shipping') {
        return calculateShipping();
      }
    } else if (discountType === 'manual') {
      if (manualDiscountType === 'percentage') {
        return subtotal * manualDiscountValue / 100;
      } else {
        return Math.min(manualDiscountValue, subtotal);
      }
    }
    return 0;
  };
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const shipping = calculateShipping();
    const discount = calculateDiscount();
    if (discountType === 'coupon' && appliedCoupon?.discount_type === 'free_shipping') {
      return subtotal;
    }
    return Math.max(0, subtotal + shipping - discount);
  };
  const applyCouponCode = (coupon: Coupon) => {
    const subtotal = calculateSubtotal();
    if (coupon.minimum_purchase && subtotal < coupon.minimum_purchase) {
      toast.error(`Minimum purchase of ${formatPrice(coupon.minimum_purchase, store!.currency)} required`);
      return;
    }
    setAppliedCoupon(coupon);
    setDiscountType('coupon');
    toast.success(`Coupon "${coupon.code}" applied!`);
  };
  const applyManualDiscount = () => {
    if (manualDiscountValue <= 0) {
      toast.error('Please enter a valid discount amount');
      return;
    }
    setDiscountType('manual');
    setAppliedCoupon(null);
    toast.success('Manual discount applied');
  };
  const removeDiscount = () => {
    setDiscountType('none');
    setAppliedCoupon(null);
    setManualDiscountValue(0);
  };

  // Helper: Format variations text
  const formatVariationsText = (variations: string[]) => {
    if (!variations || variations.length === 0) return '';
    return `Available in: ${variations.join(', ')}`;
  };

  // Helper: Build carousel card for product
  const buildProductCarouselCard = (product: Product, linkType: 'internal' | 'external') => {
    const storeUrl = `${window.location.origin}/store/${store?.slug}`;
    const buyNowUrl = linkType === 'internal' ? `${storeUrl}/product/${product.id}` : product.landing_page_url || '';
    const subtitle = [store ? formatPrice(product.price, store.currency) : `$${product.price}`, formatVariationsText(product.variations)].filter(Boolean).join(' | ');
    return {
      title: product.name,
      subtitle: subtitle || ' ',
      image_url: product.allImages[0] || product.images?.[0] || '',
      buttons: [{
        type: 'postback',
        title: store?.carousel_see_details_text || 'See Details',
        payload: `PRODUCT_DETAILS_${product.id}_${linkType}`
      }, {
        type: 'web_url',
        title: store?.carousel_buy_now_text || 'Buy Now',
        url: buyNowUrl
      }]
    };
  };

  // Helper: Send message via edge function
  const sendMessageViaEdgeFunction = async (payload: {
    messageText?: string;
    attachmentUrl?: string;
    attachmentType?: string;
    productCards?: any[];
  }) => {
    if (conversationType === 'facebook') {
      const {
        data: convData
      } = await supabase.from('conversations').select('page_id').eq('id', conversationId).single();
      if (!convData?.page_id) throw new Error('Page not found');
      const {
        data: page
      } = await supabase.from('facebook_pages').select('page_access_token').eq('id', convData.page_id).single();
      if (!page?.page_access_token) throw new Error('Page access token not found');
      const {
        data: subscriber
      } = await supabase.from('conversations').select('subscribers(subscriber_psid)').eq('id', conversationId).single();
      const recipientPsid = (subscriber as any)?.subscribers?.subscriber_psid;
      if (!recipientPsid) throw new Error('Subscriber not found');
      await supabase.functions.invoke('send-message', {
        body: {
          pageAccessToken: page.page_access_token,
          recipientPsid,
          conversationId,
          ...payload
        }
      });
    } else if (conversationType === 'instagram') {
      const {
        data: convData
      } = await supabase.from('instagram_conversations').select('instagram_account_id, subscriber_id').eq('id', conversationId).single();
      if (!convData?.instagram_account_id) throw new Error('Instagram account not found');
      const {
        data: subscriber
      } = await supabase.from('instagram_subscribers').select('subscriber_instagram_id').eq('id', convData.subscriber_id).single();
      if (!subscriber?.subscriber_instagram_id) throw new Error('Subscriber not found');
      await supabase.functions.invoke('instagram-send-message', {
        body: {
          accountId: convData.instagram_account_id,
          recipientId: subscriber.subscriber_instagram_id,
          conversationId,
          ...payload
        }
      });
    }
  };

  // Request address from customer
  const requestAddressFromCustomer = async () => {
    if (!store?.id) return;
    setSendingAddressRequest(true);
    try {
      const {
        data: storeSettings
      } = await supabase.from('stores').select('address_request_instruction, address_request_button_text').eq('id', store.id).single();
      const instructionText = storeSettings?.address_request_instruction || 'Please provide your delivery address to complete your order.';
      const buttonText = storeSettings?.address_request_button_text || 'Enter Address';
      const baseUrl = window.location.origin;
      const addressFormUrl = `${baseUrl}/store/${store.slug}/address-form?conv=${conversationId}&platform=${conversationType}&pid=${customerPlatformId}&store=${store.slug}`;
      const messageText = `${instructionText}\n\n👇 Click below to enter your address:`;
      
      // Set status to pending
      setAddressRequestStatus('pending');
      if (conversationType === 'facebook') {
        const {
          data: convData
        } = await supabase.from('conversations').select('page_id').eq('id', conversationId).single();
        if (!convData?.page_id) throw new Error('Page not found');
        const {
          data: page
        } = await supabase.from('facebook_pages').select('page_access_token').eq('id', convData.page_id).single();
        if (!page?.page_access_token) throw new Error('Page access token not found');
        const {
          data: subscriber
        } = await supabase.from('conversations').select('subscribers(subscriber_psid)').eq('id', conversationId).single();
        const recipientPsid = (subscriber as any)?.subscribers?.subscriber_psid;
        if (!recipientPsid) throw new Error('Subscriber not found');

        // Send button template
        await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${page.page_access_token}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            recipient: {
              id: recipientPsid
            },
            message: {
              attachment: {
                type: 'template',
                payload: {
                  template_type: 'button',
                  text: messageText,
                  buttons: [{
                    type: 'web_url',
                    url: addressFormUrl,
                    title: buttonText,
                    webview_height_ratio: 'tall'
                  }]
                }
              }
            }
          })
        });

        // Save to messages table
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          message_text: `📍 ${messageText}\n[${buttonText}]`,
          sender_type: 'user',
          sent_at: new Date().toISOString()
        });
        await supabase.from('conversations').update({
          last_message_text: `📍 Address request sent`,
          last_message_at: new Date().toISOString()
        }).eq('id', conversationId);
      } else if (conversationType === 'instagram') {
        const {
          data: convData
        } = await supabase.from('instagram_conversations').select('instagram_account_id, subscriber_id').eq('id', conversationId).single();
        if (!convData?.instagram_account_id) throw new Error('Instagram account not found');
        const {
          data: account
        } = await supabase.from('instagram_accounts').select('access_token').eq('id', convData.instagram_account_id).single();
        if (!account?.access_token) throw new Error('Instagram access token not found');
        const {
          data: subscriber
        } = await supabase.from('instagram_subscribers').select('subscriber_instagram_id').eq('id', convData.subscriber_id).single();
        if (!subscriber?.subscriber_instagram_id) throw new Error('Subscriber not found');

        // Instagram doesn't support button templates, send as text with link
        const igMessageText = `${messageText}\n\n🔗 ${addressFormUrl}`;
        await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${account.access_token}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            recipient: {
              id: subscriber.subscriber_instagram_id
            },
            message: {
              text: igMessageText
            }
          })
        });
        await supabase.from('instagram_messages').insert({
          conversation_id: conversationId,
          message_text: igMessageText,
          sender_type: 'user',
          sent_at: new Date().toISOString()
        });
        await supabase.from('instagram_conversations').update({
          last_message_text: `📍 Address request sent`,
          last_message_at: new Date().toISOString()
        }).eq('id', conversationId);
      }
      toast.success('Address request sent to customer');
    } catch (error: any) {
      console.error('Error requesting address:', error);
      toast.error('Failed to send address request');
    } finally {
      setSendingAddressRequest(false);
    }
  };

  // Save address for customer
  const saveCustomerAddress = async (addressData: any, receiverName?: string, receiverPhone?: string) => {
    if (!store?.id) return;
    try {
      let customerId = customer?.id;

      // If customer doesn't exist, create them using the platform ID
      if (!customerId) {
        const customerInsertData: any = {
          store_id: store.id,
          full_name: receiverName || customerName
        };
        if (conversationType === 'facebook') {
          customerInsertData.facebook_psid = customerPlatformId;
        } else if (conversationType === 'instagram') {
          customerInsertData.instagram_id = customerPlatformId;
        } else if (conversationType === 'whatsapp') {
          customerInsertData.whatsapp_phone = customerPlatformId;
        }
        if (receiverPhone) {
          customerInsertData.phone = receiverPhone;
        }
        const {
          data: newCustomer,
          error
        } = await supabase.from('store_customers').insert(customerInsertData).select('id').single();
        if (error) throw error;
        customerId = newCustomer.id;
        setCustomer({
          id: customerId,
          full_name: receiverName || customerName,
          phone: receiverPhone
        });
      }

      // Save address
      const {
        error: addrError
      } = await supabase.from('store_customer_addresses').insert({
        customer_id: customerId,
        store_id: store.id,
        label: addressData.delivery_location === 'inside_dhaka' ? 'Dhaka Address' : 'Outside Dhaka',
        is_default: savedAddresses.length === 0,
        delivery_location: addressData.delivery_location || addressData.deliveryLocation,
        city_corporation: addressData.city_corporation || addressData.cityCorporation,
        area: addressData.area,
        sub_area: addressData.sub_area || addressData.subArea,
        district: addressData.district,
        upazila: addressData.upazila,
        street_address: addressData.street_address || addressData.streetAddress,
        receiver_name: receiverName,
        receiver_phone: receiverPhone
      });
      if (addrError) throw addrError;
      toast.success('Address saved');
      setShowAddressDialog(false);
      setEditingAddress(null);

      // Reload addresses
      if (customerId) {
        loadCustomerAddresses(customerId);
      }
    } catch (error: any) {
      console.error('Error saving address:', error);
      toast.error('Failed to save address');
    }
  };

  // Quick Send handlers
  const handleSendDetails = async (product: Product) => {
    setSending(true);
    try {
      // Send images first
      for (const imageUrl of product.allImages.slice(0, 4)) {
        await sendMessageViaEdgeFunction({
          attachmentUrl: imageUrl,
          attachmentType: 'image'
        });
      }

      // Send product details
      const detailsText = [`📦 *${product.name}*`, '', store ? `💰 Price: ${formatPrice(product.price, store.currency)}` : `💰 Price: $${product.price}`, product.variations.length > 0 ? `📝 Options: ${product.variations.join(', ')}` : '', product.description ? `\n📋 ${product.description}` : ''].filter(Boolean).join('\n');
      await sendMessageViaEdgeFunction({
        messageText: detailsText
      });
      toast.success('Product details sent');
    } catch (error: any) {
      console.error('Error sending details:', error);
      toast.error('Failed to send product details');
    } finally {
      setSending(false);
    }
  };
  const handleSendCarousel = async (products: Product[], linkType: 'internal' | 'external') => {
    if (products.length === 0) return;
    setSending(true);
    try {
      const cards = products.slice(0, 10).map(p => buildProductCarouselCard(p, linkType));
      await sendMessageViaEdgeFunction({
        productCards: cards
      });
      toast.success(`${products.length} product(s) sent as carousel`);
      setSelectedProducts([]);
    } catch (error: any) {
      console.error('Error sending carousel:', error);
      toast.error('Failed to send products');
    } finally {
      setSending(false);
    }
  };

  // Send invoice
  const sendInvoice = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    const selectedAddr = savedAddresses.find(a => a.id === selectedAddressId) || manualAddress;
    if (!selectedAddr) {
      toast.error('Please select or add a delivery address');
      return;
    }
    setSending(true);
    try {
      const subtotal = calculateSubtotal();
      const shipping = calculateShipping();
      const discount = calculateDiscount();
      const total = calculateTotal();
      const items = cart.map(item => ({
        product_id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        variation: item.selectedVariation,
        total: item.product.price * item.quantity
      }));

      // Create invoice
      const {
        data: invoice,
        error: invoiceError
      } = await supabase.from('chat_invoices').insert({
        store_id: store!.id,
        conversation_id: conversationId,
        conversation_type: conversationType,
        customer_name: selectedAddr.receiver_name || customerName,
        customer_phone: selectedAddr.receiver_phone || customer?.phone || customerPhone,
        customer_platform: conversationType,
        customer_platform_id: customerPlatformId,
        items,
        subtotal,
        shipping_charge: shipping,
        discount_amount: discount,
        total_amount: total,
        payment_type: paymentType,
        advance_amount: paymentType === 'partial' ? advanceAmount : null,
        due_amount: paymentType === 'partial' ? total - advanceAmount : paymentType === 'full_cod' ? total : 0,
        paid_amount: paymentType === 'full_online' ? 0 : 0,
        shipping_address: selectedAddr,
        status: 'pending'
      }).select('id').single();
      if (invoiceError) throw invoiceError;

      // Send invoice message to customer
      const invoiceUrl = `${window.location.origin}/invoice/${invoice.id}`;
      let invoiceMessage = `🧾 *Invoice*\n\n`;
      invoiceMessage += `📦 Items:\n`;
      items.forEach(item => {
        invoiceMessage += `• ${item.name} x${item.quantity} = ${formatPrice(item.total, store!.currency)}\n`;
      });
      invoiceMessage += `\n💰 Subtotal: ${formatPrice(subtotal, store!.currency)}`;
      invoiceMessage += `\n🚚 Shipping: ${formatPrice(shipping, store!.currency)}`;
      if (discount > 0) {
        invoiceMessage += `\n🎁 Discount: -${formatPrice(discount, store!.currency)}`;
      }
      invoiceMessage += `\n\n💵 *Total: ${formatPrice(total, store!.currency)}*`;
      if (paymentType === 'partial') {
        invoiceMessage += `\n\n⚡ Advance Required: ${formatPrice(advanceAmount, store!.currency)}`;
        invoiceMessage += `\n📍 COD: ${formatPrice(total - advanceAmount, store!.currency)}`;
      } else if (paymentType === 'full_online') {
        invoiceMessage += `\n\n💳 Full payment required online`;
      } else {
        invoiceMessage += `\n\n💵 Cash on Delivery`;
      }
      await sendMessageViaEdgeFunction({
        messageText: invoiceMessage
      });

      // If payment required, send payment link
      if (paymentType === 'partial' || paymentType === 'full_online') {
        await sendMessageViaEdgeFunction({
          messageText: `💳 Pay now: ${invoiceUrl}`
        });
      }
      toast.success('Invoice sent successfully');
      clearCart();
      setMode('history');
      loadPurchaseHistory(customer?.id || '');
    } catch (error: any) {
      console.error('Error sending invoice:', error);
      toast.error('Failed to send invoice');
    } finally {
      setSending(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Toggle product selection for multi-select
  const toggleProductSelection = (product: Product) => {
    if (selectedProducts.find(p => p.id === product.id)) {
      setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
    } else {
      setSelectedProducts([...selectedProducts, product]);
    }
  };
  if (loading) {
    return <div className="flex items-center justify-center h-48">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>;
  }
  if (!store) {
    return <Card className="p-4">
        <p className="text-sm text-muted-foreground text-center">No store found. Create a store first.</p>
      </Card>;
  }
  return <Card className="w-80 flex flex-col h-full border-l-0 rounded-l-none shadow-none">
      {/* Customer Context Header */}
      {/* Customer Context Header */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-3 py-2.5 border-b">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{customerName}</p>
            {customer?.phone && <p className="text-xs text-muted-foreground">{customer.phone}</p>}
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            className={`h-7 text-xs px-2 shrink-0 ${
              savedAddresses.length > 0 
                ? 'border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950' 
                : addressRequestStatus === 'pending'
                  ? 'border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950'
                  : 'border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950'
            }`}
            onClick={requestAddressFromCustomer} 
            disabled={sendingAddressRequest}
          >
            <MapPin className={`h-3 w-3 mr-1 ${
              savedAddresses.length > 0 
                ? 'text-green-500' 
                : addressRequestStatus === 'pending'
                  ? 'text-yellow-500'
                  : 'text-red-500'
            }`} /> 
            {savedAddresses.length > 0 ? 'Has Address' : addressRequestStatus === 'pending' ? 'Waiting...' : 'Get Address'}
          </Button>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <Package className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{customerStats.totalOrders}</span>
            <span className="text-muted-foreground">orders</span>
          </div>
          <div className="flex items-center gap-1">
            <Receipt className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{formatPrice(customerStats.totalSpent, store.currency)}</span>
            <span className="text-muted-foreground">spent</span>
          </div>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex border-b bg-muted/30">
        <button onClick={() => setMode('quick')} className={`flex-1 py-2 text-xs font-medium transition-all ${mode === 'quick' ? 'border-b-2 border-primary text-primary bg-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
          Quick Send
        </button>
        <button onClick={() => setMode('pos')} className={`flex-1 py-2 text-xs font-medium transition-all ${mode === 'pos' ? 'border-b-2 border-primary text-primary bg-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
          POS Sale
        </button>
        <button onClick={() => setMode('history')} className={`flex-1 py-2 text-xs font-medium transition-all ${mode === 'history' ? 'border-b-2 border-primary text-primary bg-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
          History
        </button>
      </div>

      {/* Content Area */}
      <div className={`flex-1 p-3 ${mode === 'pos' && posStep === 1 ? 'flex flex-col overflow-hidden' : 'overflow-y-auto space-y-3'}`}>
        {/* QUICK SEND MODE */}
        {mode === 'quick' && <>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search products..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-8 text-sm bg-muted/30 border-0 focus-visible:ring-1" />
            </div>

            {/* Selected Products Actions */}
            {selectedProducts.length > 0 && <div className="flex items-center gap-1.5 p-2 bg-primary/5 rounded-lg border border-primary/20">
                <Badge variant="secondary" className="text-xs px-1.5 py-0">{selectedProducts.length}</Badge>
                <span className="text-xs text-muted-foreground flex-1">selected</span>
                <Button size="sm" variant="default" className="h-7 text-xs px-2" onClick={() => handleSendCarousel(selectedProducts, 'internal')} disabled={sending}>
                  <Store className="h-3 w-3 mr-1" /> Internal
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => handleSendCarousel(selectedProducts, 'external')} disabled={sending}>
                  <Globe className="h-3 w-3 mr-1" /> External
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelectedProducts([])}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>}

            {/* Product List */}
            <div className="space-y-1.5">
              {filteredProducts.map(product => <div key={product.id} className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all ${selectedProducts.find(p => p.id === product.id) ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50 border border-transparent hover:border-border'}`} onClick={() => toggleProductSelection(product)}>
                  <img src={product.allImages[0] || product.images?.[0] || '/placeholder.svg'} alt={product.name} className="w-10 h-10 object-cover rounded-md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-tight">{product.name}</p>
                    <p className="text-xs text-primary font-semibold">{formatPrice(product.price, store.currency)}</p>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-60 hover:opacity-100" onClick={e => {
                    e.stopPropagation();
                    handleSendDetails(product);
                  }} disabled={sending}>
                          <FileText className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">Send Details</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>)}
            </div>
          </>}

        {/* POS MODE */}
        {mode === 'pos' && <>
            {/* Step Indicator */}
            <div className="flex items-center justify-between px-1">
              <div className={`flex items-center gap-1.5 ${posStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${posStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>1</div>
                <span className="text-xs font-medium">Cart</span>
              </div>
              <div className={`flex-1 h-px mx-2 ${posStep >= 2 ? 'bg-primary' : 'bg-border'}`} />
              <div className={`flex items-center gap-1.5 ${posStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${posStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>2</div>
                <span className="text-xs font-medium">Details</span>
              </div>
              <div className={`flex-1 h-px mx-2 ${posStep >= 3 ? 'bg-primary' : 'bg-border'}`} />
              <div className={`flex items-center gap-1.5 ${posStep >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${posStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>3</div>
                <span className="text-xs font-medium">Send</span>
              </div>
            </div>

            {/* Step 1: Products & Cart */}
            {posStep === 1 && <div className="flex flex-col h-full">
                {/* Search */}
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search products..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-9 text-sm bg-muted/30 border-0 focus-visible:ring-1" />
                </div>

                {/* Products List - Full Height Scrollable */}
                <div className={`flex-1 overflow-y-auto space-y-1.5 ${cart.length > 0 ? 'pb-2' : ''}`}>
                  {filteredProducts.map(product => <div key={product.id} className="flex items-center gap-2.5 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => addToCart(product)}>
                      <img src={product.allImages[0] || product.images?.[0] || '/placeholder.svg'} alt={product.name} className="w-10 h-10 object-cover rounded" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-primary font-semibold">{formatPrice(product.price, store.currency)}</p>
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </div>)}
                </div>

                {/* Sticky Bottom Cart */}
                {cart.length > 0 && <div className="border-t bg-background pt-2.5 mt-auto my-[20px]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">Cart</span>
                        <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">{cart.length}</Badge>
                      </div>
                      <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={clearCart}>
                        Clear
                      </Button>
                    </div>
                    {/* Cart Items - Max 4 visible, scrollable */}
                    <div className="max-h-[130px] overflow-y-auto space-y-1.5 mb-2">
                      {cart.map(item => <div key={item.product.id} className="flex items-center gap-2 bg-muted/30 rounded-md p-1.5">
                          <span className="text-xs flex-1 truncate">{item.product.name}</span>
                          <div className="flex items-center bg-background rounded">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-xs w-5 text-center font-medium">{item.quantity}</span>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="text-xs font-semibold w-14 text-right text-primary">
                            {formatPrice(item.product.price * item.quantity, store.currency)}
                          </span>
                        </div>)}
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-muted-foreground">Subtotal</span>
                      <span className="text-sm font-bold">{formatPrice(calculateSubtotal(), store.currency)}</span>
                    </div>
                    <Button className="w-full h-8 text-sm" onClick={() => setPosStep(2)}>
                      Continue <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>}
              </div>}

            {/* Step 2: Discount & Address */}
            {posStep === 2 && <div className="space-y-3">
                {/* Discount Section */}
                <div className="bg-muted/30 rounded-lg p-2.5 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-primary" />
                    <Label className="text-sm font-semibold">Discount</Label>
                  </div>
                  {discountType === 'none' ? <div className="flex gap-1.5">
                      <Select onValueChange={id => {
                const coupon = coupons.find(c => c.id === id);
                if (coupon) applyCouponCode(coupon);
              }}>
                        <SelectTrigger className="h-8 text-xs flex-1 bg-background">
                          <SelectValue placeholder="Select coupon..." />
                        </SelectTrigger>
                        <SelectContent>
                          {coupons.map(c => <SelectItem key={c.id} value={c.id} className="text-sm">{c.code} - {c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="h-8 text-xs px-2">
                            <Percent className="h-3 w-3 mr-1" /> Manual
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-xs">
                          <DialogHeader>
                            <DialogTitle className="text-sm">Manual Discount</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <Button size="sm" variant={manualDiscountType === 'percentage' ? 'default' : 'outline'} onClick={() => setManualDiscountType('percentage')} className="flex-1">
                                %
                              </Button>
                              <Button size="sm" variant={manualDiscountType === 'fixed' ? 'default' : 'outline'} onClick={() => setManualDiscountType('fixed')} className="flex-1">
                                Fixed
                              </Button>
                            </div>
                            <Input type="number" value={manualDiscountValue || ''} onChange={e => setManualDiscountValue(Number(e.target.value))} placeholder={manualDiscountType === 'percentage' ? 'Enter %' : 'Enter amount'} className="h-8" />
                            <Button className="w-full h-8" onClick={applyManualDiscount}>Apply</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div> : <div className="flex items-center justify-between bg-green-500/10 p-2 rounded-md">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-xs font-medium text-green-700 dark:text-green-400">
                          {discountType === 'coupon' && appliedCoupon ? `${appliedCoupon.code}: -${formatPrice(calculateDiscount(), store.currency)}` : `-${formatPrice(calculateDiscount(), store.currency)}`}
                        </span>
                      </div>
                      <Button size="sm" variant="ghost" className="h-6 text-xs px-1.5" onClick={removeDiscount}>
                        Remove
                      </Button>
                    </div>}
                </div>

                {/* Address Section */}
                <div className="bg-muted/30 rounded-lg p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <Label className="text-sm font-semibold">Delivery Address</Label>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={requestAddressFromCustomer} disabled={sendingAddressRequest}>
                        <Send className="h-3 w-3 mr-1" /> Request
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => {
                  setEditingAddress(null);
                  setShowAddressDialog(true);
                }}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {savedAddresses.length > 0 ? <Select value={selectedAddressId} onValueChange={setSelectedAddressId}>
                      <SelectTrigger className="h-auto min-h-[36px] text-sm bg-background py-1.5">
                        <SelectValue placeholder="Select address...">
                          {selectedAddressId && savedAddresses.find(a => a.id === selectedAddressId) && (() => {
                            const addr = savedAddresses.find(a => a.id === selectedAddressId)!;
                            return (
                              <div className="text-left">
                                <div className="font-medium text-sm">{addr.receiver_name || addr.label}</div>
                                <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {addr.delivery_location === 'inside_dhaka' ? 'Dhaka' : addr.district}
                                  {addr.area && ` • ${addr.area}`}
                                </div>
                              </div>
                            );
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-w-[300px]">
                        {savedAddresses.map(addr => <SelectItem key={addr.id} value={addr.id} className="py-2">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{addr.receiver_name || addr.label}</span>
                                {addr.receiver_phone && <span className="text-xs text-muted-foreground">({addr.receiver_phone})</span>}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {addr.delivery_location === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}
                                {addr.area && ` • ${addr.area}`}
                                {addr.sub_area && ` • ${addr.sub_area}`}
                                {addr.district && ` • ${addr.district}`}
                              </span>
                              {addr.street_address && <span className="text-xs text-muted-foreground/70 truncate max-w-[250px]">{addr.street_address}</span>}
                            </div>
                          </SelectItem>)}
                      </SelectContent>
                    </Select> : <p className="text-sm text-muted-foreground text-center py-2">
                      No saved addresses
                    </p>}

                  {/* Selected Address Display */}
                  {selectedAddressId && savedAddresses.find(a => a.id === selectedAddressId) && <div className="bg-background p-2 rounded-md text-xs space-y-1 border">
                      {(() => {
                const addr = savedAddresses.find(a => a.id === selectedAddressId)!;
                return <>
                            {addr.receiver_name && <div className="flex items-center gap-1.5">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">{addr.receiver_name}</span>
                              </div>}
                            {addr.receiver_phone && <div className="flex items-center gap-1.5">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span>{addr.receiver_phone}</span>
                              </div>}
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span>
                                {addr.delivery_location === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}
                                {addr.area && ` - ${addr.area}`}
                                {addr.district && ` - ${addr.district}`}
                              </span>
                            </div>
                            <p className="text-muted-foreground pl-4">{addr.street_address}</p>
                          </>;
              })()}
                    </div>}
                </div>

                {/* Custom Shipping */}
                <div className="bg-muted/30 rounded-lg p-2.5 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-primary" />
                    <Label className="text-sm font-semibold">Shipping</Label>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">৳</span>
                      <Input type="number" value={customShipping ?? calculateShipping()} onChange={e => setCustomShipping(Number(e.target.value))} className="h-8 text-sm pl-6 bg-background" />
                    </div>
                    {customShipping !== null && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCustomShipping(null)}>
                        Reset
                      </Button>}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1 h-8 text-sm" onClick={() => setPosStep(1)}>
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
                  </Button>
                  <Button className="flex-1 h-8 text-sm" onClick={() => setPosStep(3)}>
                    Continue <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>}

            {/* Step 3: Review & Send */}
            {posStep === 3 && <div className="space-y-3">
                {/* Order Summary */}
                <div className="bg-muted/30 rounded-lg p-2.5 space-y-2">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Receipt className="h-3.5 w-3.5 text-primary" />
                    <Label className="text-sm font-semibold">Order Summary</Label>
                  </div>
                  <div className="space-y-1.5">
                    {cart.map(item => <div key={item.product.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.product.name} x{item.quantity}</span>
                        <span className="font-medium">{formatPrice(item.product.price * item.quantity, store.currency)}</span>
                      </div>)}
                  </div>
                  <Separator className="my-2" />
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(calculateSubtotal(), store.currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>{formatPrice(calculateShipping(), store.currency)}</span>
                    </div>
                    {calculateDiscount() > 0 && <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span>-{formatPrice(calculateDiscount(), store.currency)}</span>
                      </div>}
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between">
                    <span className="text-base font-bold">Total</span>
                    <span className="text-lg font-bold text-primary">{formatPrice(calculateTotal(), store.currency)}</span>
                  </div>
                </div>

                {/* Payment Type */}
                <div className="bg-muted/30 rounded-lg p-2.5 space-y-2">
                  <Label className="text-sm font-semibold">Payment Type</Label>
                  <RadioGroup value={paymentType} onValueChange={v => setPaymentType(v as any)} className="space-y-1.5">
                    <div className="flex items-center space-x-2 bg-background rounded-md p-2.5 cursor-pointer hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="full_cod" id="full_cod" className="h-4 w-4" />
                      <Label htmlFor="full_cod" className="text-sm cursor-pointer flex-1">Full Cash on Delivery</Label>
                    </div>
                    <div className="flex items-center space-x-2 bg-background rounded-md p-2.5 cursor-pointer hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="partial" id="partial" className="h-4 w-4" />
                      <Label htmlFor="partial" className="text-sm cursor-pointer flex-1">Partial Payment</Label>
                    </div>
                    <div className="flex items-center space-x-2 bg-background rounded-md p-2.5 cursor-pointer hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="full_online" id="full_online" className="h-4 w-4" />
                      <Label htmlFor="full_online" className="text-sm cursor-pointer flex-1">Full Online Payment</Label>
                    </div>
                  </RadioGroup>

                  {paymentType === 'partial' && <div className="pt-2 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Advance Amount</Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">৳</span>
                        <Input type="number" value={advanceAmount || ''} onChange={e => setAdvanceAmount(Number(e.target.value))} className="h-8 text-sm pl-6 bg-background" placeholder="Enter advance" />
                      </div>
                      {advanceAmount > 0 && <p className="text-xs text-muted-foreground">
                          COD: <span className="font-medium text-foreground">{formatPrice(calculateTotal() - advanceAmount, store.currency)}</span>
                        </p>}
                    </div>}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1 h-8 text-sm" onClick={() => setPosStep(2)}>
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
                  </Button>
                  <Button className="flex-1 h-8 text-sm" onClick={sendInvoice} disabled={sending}>
                    {sending ? 'Sending...' : 'Send Invoice'}
                  </Button>
                </div>
              </div>}
          </>}

        {/* HISTORY MODE */}
        {mode === 'history' && <>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Package className="h-4 w-4 text-primary" />
                <Label className="text-sm font-semibold">Orders</Label>
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">{orders.length}</Badge>
              </div>
              {orders.length === 0 ? <div className="text-center py-4">
                  <Package className="h-6 w-6 mx-auto text-muted-foreground/30 mb-1" />
                  <p className="text-xs text-muted-foreground">No orders yet</p>
                </div> : <div className="space-y-1.5">
                  {orders.slice(0, 5).map(order => <div key={order.id} className="bg-muted/30 rounded-lg p-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono text-muted-foreground">#{order.id.slice(0, 8)}</span>
                        <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'} className="text-xs px-1.5 py-0 h-5">
                          {order.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</span>
                        <span className="text-sm font-semibold">{formatPrice(order.total_amount, store.currency)}</span>
                      </div>
                    </div>)}
                </div>}
            </div>

            <Separator className="my-2" />

            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Receipt className="h-4 w-4 text-primary" />
                <Label className="text-sm font-semibold">Invoices</Label>
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">{invoices.length}</Badge>
              </div>
              {invoices.length === 0 ? <div className="text-center py-4">
                  <Receipt className="h-6 w-6 mx-auto text-muted-foreground/30 mb-1" />
                  <p className="text-xs text-muted-foreground">No invoices yet</p>
                </div> : <div className="space-y-1.5">
                  {invoices.slice(0, 5).map(invoice => <div key={invoice.id} className="bg-muted/30 rounded-lg p-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono text-muted-foreground">#{invoice.id.slice(0, 8)}</span>
                        <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'} className="text-xs px-1.5 py-0 h-5">
                          {invoice.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-muted-foreground">{new Date(invoice.created_at).toLocaleDateString()}</span>
                        <span className="text-sm font-semibold">{formatPrice(invoice.total_amount, store.currency)}</span>
                      </div>
                    </div>)}
                </div>}
            </div>
          </>}
      </div>

      {/* Address Dialog */}
      <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle>
          </DialogHeader>
          <AddressForm initialData={editingAddress} customerName={customerName} onSave={(addressData, receiverName, receiverPhone) => {
          saveCustomerAddress(addressData, receiverName, receiverPhone);
        }} onCancel={() => {
          setShowAddressDialog(false);
          setEditingAddress(null);
        }} />
        </DialogContent>
      </Dialog>
    </Card>;
}

// Address Form Component
function AddressForm({
  initialData,
  customerName,
  onSave,
  onCancel
}: {
  initialData: Address | null;
  customerName: string;
  onSave: (addressData: any, receiverName?: string, receiverPhone?: string) => void;
  onCancel: () => void;
}) {
  const [receiverName, setReceiverName] = useState(initialData?.receiver_name || customerName || '');
  const [receiverPhone, setReceiverPhone] = useState(initialData?.receiver_phone || '');
  const [addressData, setAddressData] = useState<any>(initialData ? {
    delivery_location: initialData.delivery_location,
    city_corporation: initialData.city_corporation,
    area: initialData.area,
    sub_area: initialData.sub_area,
    district: initialData.district,
    upazila: initialData.upazila,
    street_address: initialData.street_address
  } : {});
  const handleSubmit = () => {
    if (!receiverName.trim()) {
      toast.error('Please enter receiver name');
      return;
    }
    if (!receiverPhone.trim()) {
      toast.error('Please enter receiver phone');
      return;
    }
    if (!addressData.delivery_location || !addressData.street_address) {
      toast.error('Please complete the address');
      return;
    }
    onSave(addressData, receiverName, receiverPhone);
  };
  return <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Receiver Name *</Label>
          <Input value={receiverName} onChange={e => setReceiverName(e.target.value)} placeholder="Enter name" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Receiver Phone *</Label>
          <Input value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)} placeholder="01XXXXXXXXX" className="h-8 text-sm" />
        </div>
      </div>

      <BangladeshAddressForm value={addressData} onChange={setAddressData} allowedAreas="both" enableSubArea={true} />

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleSubmit}>
          Save Address
        </Button>
      </div>
    </div>;
}