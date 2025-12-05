import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const {
      storeId,
      profileId,
      customer,
      shippingAddress,
      shippingCharge,
      finalTotal,
      discountAmount,
      couponCode,
      status,
      paymentMethod,
      paidAmount,
      items,
      // Platform identification (optional - for social media customers)
      facebookPsid,
      instagramId,
      whatsappPhone,
      webVisitorId,
      // Flag to save new address
      saveNewAddress,
    } = body;

    console.log('Creating order with platform IDs:', { facebookPsid, instagramId, whatsappPhone, webVisitorId });

    if (!storeId || !profileId || !customer?.name || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields for order creation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        store_id: storeId,
        customer_profile_id: profileId,
        customer_name: customer.name,
        customer_phone: customer.phone || null,
        customer_email: customer.email || null,
        shipping_address: shippingAddress ? JSON.stringify(shippingAddress) : null,
        shipping_charge: shippingCharge,
        total_amount: finalTotal,
        paid_amount: paidAmount,
        discount_amount: discountAmount,
        coupon_code: couponCode || null,
        status,
        payment_method: paymentMethod,
      })
      .select('id')
      .single();

    if (orderError || !order) {
      console.error('Order insert error:', orderError);
      return new Response(
        JSON.stringify({ error: orderError?.message || 'Failed to create order' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Insert order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

    if (itemsError) {
      console.error('Order items insert error:', itemsError);
      return new Response(
        JSON.stringify({ error: itemsError.message || 'Failed to create order items' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Update coupon usage if applicable
    if (couponCode && storeId) {
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('id, uses_count')
        .eq('store_id', storeId)
        .eq('code', couponCode)
        .single();

      if (!couponError && coupon) {
        await supabase
          .from('coupons')
          .update({ uses_count: (coupon.uses_count || 0) + 1 })
          .eq('id', coupon.id);
      }
    }

    // Find or create customer in store_customers table using platform ID or phone
    let storeCustomerId: string | null = null;
    
    if (storeId) {
      // Try to find existing customer by platform IDs first
      let existingCustomer = null;

      if (facebookPsid) {
        const { data } = await supabase
          .from('store_customers')
          .select('id, total_orders, total_spent')
          .eq('store_id', storeId)
          .eq('facebook_psid', facebookPsid)
          .maybeSingle();
        existingCustomer = data;
        console.log('Found customer by facebook_psid:', data?.id);
      }
      
      if (!existingCustomer && instagramId) {
        const { data } = await supabase
          .from('store_customers')
          .select('id, total_orders, total_spent')
          .eq('store_id', storeId)
          .eq('instagram_id', instagramId)
          .maybeSingle();
        existingCustomer = data;
        console.log('Found customer by instagram_id:', data?.id);
      }
      
      if (!existingCustomer && whatsappPhone) {
        const { data } = await supabase
          .from('store_customers')
          .select('id, total_orders, total_spent')
          .eq('store_id', storeId)
          .eq('whatsapp_phone', whatsappPhone)
          .maybeSingle();
        existingCustomer = data;
        console.log('Found customer by whatsapp_phone:', data?.id);
      }
      
      if (!existingCustomer && webVisitorId) {
        const { data } = await supabase
          .from('store_customers')
          .select('id, total_orders, total_spent')
          .eq('store_id', storeId)
          .eq('web_visitor_id', webVisitorId)
          .maybeSingle();
        existingCustomer = data;
        console.log('Found customer by web_visitor_id:', data?.id);
      }

      // Fallback to phone lookup
      if (!existingCustomer && customer.phone) {
        const { data } = await supabase
          .from('store_customers')
          .select('id, total_orders, total_spent')
          .eq('store_id', storeId)
          .eq('phone', customer.phone)
          .maybeSingle();
        existingCustomer = data;
        console.log('Found customer by phone:', data?.id);
      }

      if (existingCustomer) {
        storeCustomerId = existingCustomer.id;
        // Update existing customer
        await supabase
          .from('store_customers')
          .update({
            full_name: customer.name,
            phone: customer.phone || undefined,
            email: customer.email || undefined,
            total_orders: (existingCustomer.total_orders || 0) + 1,
            total_spent: (existingCustomer.total_spent || 0) + finalTotal,
          })
          .eq('id', existingCustomer.id);
        console.log('Updated existing customer:', existingCustomer.id);
      } else {
        // Create new customer
        const newCustomerData: any = {
          store_id: storeId,
          full_name: customer.name,
          phone: customer.phone || null,
          email: customer.email || null,
          total_orders: 1,
          total_spent: finalTotal,
        };
        
        if (facebookPsid) newCustomerData.facebook_psid = facebookPsid;
        if (instagramId) newCustomerData.instagram_id = instagramId;
        if (whatsappPhone) newCustomerData.whatsapp_phone = whatsappPhone;
        if (webVisitorId) newCustomerData.web_visitor_id = webVisitorId;

        const { data: newCustomer, error: createError } = await supabase
          .from('store_customers')
          .insert(newCustomerData)
          .select('id')
          .single();
        
        if (createError) {
          console.error('Error creating customer:', createError);
        } else {
          storeCustomerId = newCustomer?.id;
          console.log('Created new customer:', storeCustomerId);
        }
      }

      // Save new address if requested and we have a customer ID
      if (saveNewAddress && storeCustomerId && shippingAddress?.delivery_location) {
        // Check if this address already exists for the customer
        const addressLabel = shippingAddress.delivery_location === 'inside_dhaka' 
          ? 'Dhaka Address' 
          : 'Outside Dhaka';
        
        const addressData = {
          customer_id: storeCustomerId,
          store_id: storeId,
          label: addressLabel,
          receiver_name: customer.name,
          receiver_phone: customer.phone,
          delivery_location: shippingAddress.delivery_location,
          city_corporation: shippingAddress.city_corporation || null,
          area: shippingAddress.area || null,
          sub_area: shippingAddress.sub_area || null,
          district: shippingAddress.district || null,
          upazila: shippingAddress.upazila || null,
          street_address: shippingAddress.street_address || null,
          is_default: true,
        };

        // Set all other addresses as non-default first
        await supabase
          .from('store_customer_addresses')
          .update({ is_default: false })
          .eq('customer_id', storeCustomerId)
          .eq('store_id', storeId);

        // Insert new address
        const { error: addressError } = await supabase
          .from('store_customer_addresses')
          .insert(addressData);

        if (addressError) {
          console.error('Error saving address:', addressError);
        } else {
          console.log('Saved new address for customer:', storeCustomerId);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, orderId: order.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('store-create-order error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unexpected error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});