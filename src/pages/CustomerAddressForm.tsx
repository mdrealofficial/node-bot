import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MapPin, CheckCircle } from 'lucide-react';
import { BangladeshAddressForm } from '@/components/user/store/BangladeshAddressForm';

interface Address {
  delivery_location?: 'inside_dhaka' | 'outside_dhaka';
  city_corporation?: string;
  area?: string;
  sub_area?: string;
  district?: string;
  upazila?: string;
  street_address?: string;
}

export default function CustomerAddressForm() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const conversationId = searchParams.get('conv');
  const platform = searchParams.get('platform') as 'facebook' | 'instagram' | 'whatsapp' | null;
  const platformId = searchParams.get('pid');
  const storeSlug = searchParams.get('store');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('');
  const [addressData, setAddressData] = useState<Address>({});

  useEffect(() => {
    loadStoreAndCustomer();
  }, []);

  const loadStoreAndCustomer = async () => {
    try {
      if (!storeSlug) {
        toast({ title: 'Invalid link', variant: 'destructive' });
        return;
      }

      // Load store
      const { data: store } = await supabase
        .from('stores')
        .select('id, name, user_id')
        .eq('slug', storeSlug)
        .single();

      if (!store) {
        toast({ title: 'Store not found', variant: 'destructive' });
        return;
      }

      setStoreId(store.id);
      setStoreName(store.name);

      // Try to get existing customer info by platform ID
      if (platform && platformId) {
        let customerQuery = supabase
          .from('store_customers')
          .select('id, full_name, phone')
          .eq('store_id', store.id);

        if (platform === 'facebook') {
          customerQuery = customerQuery.eq('facebook_psid', platformId);
        } else if (platform === 'instagram') {
          customerQuery = customerQuery.eq('instagram_id', platformId);
        } else if (platform === 'whatsapp') {
          customerQuery = customerQuery.eq('whatsapp_phone', platformId);
        }

        const { data: existingCustomer } = await customerQuery.maybeSingle();
        
        if (existingCustomer) {
          setCustomerName(existingCustomer.full_name || '');
          setCustomerPhone(existingCustomer.phone || '');
        }
      }

      // If no existing customer, try to get name from conversation
      if (!customerName && conversationId && platform) {
        let query;
        if (platform === 'facebook') {
          query = supabase
            .from('conversations')
            .select('subscriber_id, subscribers(subscriber_name, subscriber_psid)')
            .eq('id', conversationId)
            .single();
        } else if (platform === 'instagram') {
          query = supabase
            .from('instagram_conversations')
            .select('subscriber_id, instagram_subscribers(subscriber_name, subscriber_instagram_id)')
            .eq('id', conversationId)
            .single();
        }

        if (query) {
          const { data } = await query;
          if (data) {
            const subscriber = (data as any).subscribers || (data as any).instagram_subscribers;
            if (subscriber?.subscriber_name) {
              setCustomerName(subscriber.subscriber_name);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading:', error);
      toast({ title: 'Error loading form', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      toast({ title: 'Please enter your name', variant: 'destructive' });
      return;
    }

    if (!customerPhone.trim()) {
      toast({ title: 'Please enter your phone number', variant: 'destructive' });
      return;
    }

    if (!addressData.delivery_location || !addressData.street_address) {
      toast({ title: 'Please complete the address form', variant: 'destructive' });
      return;
    }

    if (!storeId || !platform || !platformId) {
      toast({ title: 'Invalid form parameters', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      // Use the database function to find or create customer
      const platformParams: any = {
        p_store_id: storeId,
        p_full_name: customerName,
        p_phone: customerPhone
      };

      // Set the correct platform ID parameter
      if (platform === 'facebook') {
        platformParams.p_facebook_psid = platformId;
      } else if (platform === 'instagram') {
        platformParams.p_instagram_id = platformId;
      } else if (platform === 'whatsapp') {
        platformParams.p_whatsapp_phone = platformId;
      }

      const { data: customerId, error: customerError } = await supabase
        .rpc('find_or_create_store_customer', platformParams);

      if (customerError) {
        console.error('Error finding/creating customer:', customerError);
        throw new Error('Failed to save customer information');
      }

      if (!customerId) {
        throw new Error('Failed to create customer record');
      }

      // Check if this exact address already exists
      const { data: existingAddr } = await supabase
        .from('store_customer_addresses')
        .select('id')
        .eq('customer_id', customerId)
        .eq('store_id', storeId)
        .eq('delivery_location', addressData.delivery_location)
        .eq('street_address', addressData.street_address)
        .maybeSingle();

      if (!existingAddr) {
        // Save new address with receiver info
        const { error: addrError } = await supabase
          .from('store_customer_addresses')
          .insert({
            customer_id: customerId,
            store_id: storeId,
            label: addressData.delivery_location === 'inside_dhaka' ? 'Dhaka Address' : 'Outside Dhaka',
            is_default: true,
            delivery_location: addressData.delivery_location,
            city_corporation: addressData.city_corporation,
            area: addressData.area,
            sub_area: addressData.sub_area,
            district: addressData.district,
            upazila: addressData.upazila,
            street_address: addressData.street_address,
            receiver_name: customerName,
            receiver_phone: customerPhone
          });

        if (addrError) {
          console.error('Error saving address:', addrError);
          throw new Error('Failed to save address');
        }
      }

      // Send confirmation message to customer and notification to seller
      if (conversationId) {
        try {
          await supabase.functions.invoke('send-address-confirmation', {
            body: {
              conversationId,
              conversationType: platform,
              customerPlatformId: platformId,
              storeId,
              customerName,
              customerPhone,
              addressData
            }
          });
        } catch (confirmError) {
          console.error('Error sending confirmation:', confirmError);
          // Don't fail the whole process if confirmation fails
        }
      }

      setSubmitted(true);
      toast({ title: 'Address saved successfully!' });
    } catch (error: any) {
      console.error('Error saving address:', error);
      toast({ 
        title: 'Error saving address', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle>Address Saved!</CardTitle>
            <CardDescription>
              Your delivery address has been saved successfully. You can now close this window.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => window.close()}>
              Close Window
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-6 w-6 text-primary" />
            <CardTitle>Enter Delivery Address</CardTitle>
          </div>
          <CardDescription>
            {storeName} needs your delivery address to complete your order
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Receiver Name *</Label>
              <Input
                id="name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter receiver name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <BangladeshAddressForm
              value={addressData}
              onChange={setAddressData}
              allowedAreas="both"
              enableSubArea={true}
            />
          </div>

          <Button 
            className="w-full" 
            size="lg"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Address'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}