import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CourierShipmentRequest {
  orderId: string;
  courierService: 'steadfast' | 'pathao' | 'carrybee' | 'paperfly' | 'redex';
}

// SteadFast API Integration
async function createSteadFastShipment(order: any, store: any) {
  console.log('Creating SteadFast shipment for order:', order.id);
  
  const payload = {
    invoice: order.id,
    recipient_name: order.customer_name,
    recipient_phone: order.customer_phone,
    recipient_address: order.shipping_address,
    cod_amount: order.total_amount - (order.paid_amount || 0),
    note: `Order ${order.id}`,
  };

  const response = await fetch('https://portal.steadfast.com.bd/api/v1/create_order', {
    method: 'POST',
    headers: {
      'Api-Key': store.steadfast_api_key,
      'Secret-Key': store.steadfast_secret_key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  console.log('SteadFast response:', data);

  if (!response.ok) {
    throw new Error(data.message || 'Failed to create SteadFast shipment');
  }

  return {
    tracking_code: data.consignment?.tracking_code || data.tracking_code,
    consignment_id: data.consignment?.consignment_id || data.consignment_id,
    status: data.status,
  };
}

// Pathao API Integration
async function createPathaoShipment(order: any, store: any) {
  console.log('Creating Pathao shipment for order:', order.id);
  
  // First, get access token
  const authResponse = await fetch('https://api-hermes.pathao.com/aladdin/api/v1/issue-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: store.pathao_client_id,
      client_secret: store.pathao_client_secret,
      username: store.pathao_username,
      password: store.pathao_password,
      grant_type: 'password',
    }),
  });

  const authData = await authResponse.json();
  
  if (!authResponse.ok) {
    throw new Error(authData.message || 'Failed to authenticate with Pathao');
  }

  const accessToken = authData.access_token;

  // Create order
  const payload = {
    store_id: 1, // You may need to get this from store settings
    merchant_order_id: order.id,
    recipient_name: order.customer_name,
    recipient_phone: order.customer_phone,
    recipient_address: order.shipping_address,
    recipient_city: 1, // Dhaka - may need to be configurable
    recipient_zone: 1, // May need to be configurable
    recipient_area: 1, // May need to be configurable
    delivery_type: 48, // Normal delivery
    item_type: 2, // Parcel
    item_quantity: 1,
    item_weight: 0.5,
    amount_to_collect: order.total_amount - (order.paid_amount || 0),
    item_description: `Order ${order.id}`,
  };

  const response = await fetch('https://api-hermes.pathao.com/aladdin/api/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  console.log('Pathao response:', data);

  if (!response.ok) {
    throw new Error(data.message || 'Failed to create Pathao shipment');
  }

  return {
    tracking_code: data.data?.consignment_id || data.consignment_id,
    consignment_id: data.data?.order_id || data.order_id,
    status: 'pending',
  };
}

// CarryBee API Integration
async function createCarryBeeShipment(order: any, store: any) {
  console.log('Creating CarryBee shipment for order:', order.id);
  
  const payload = {
    merchant_order_id: order.id,
    recipient_name: order.customer_name,
    recipient_phone: order.customer_phone,
    recipient_address: order.shipping_address,
    cod_amount: order.total_amount - (order.paid_amount || 0),
    package_description: `Order ${order.id}`,
  };

  const response = await fetch('https://api.carrybee.com/api/v1/parcel/create', {
    method: 'POST',
    headers: {
      'Api-Key': store.carrybee_api_key,
      'Secret-Key': store.carrybee_secret_key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  console.log('CarryBee response:', data);

  if (!response.ok) {
    throw new Error(data.message || 'Failed to create CarryBee shipment');
  }

  return {
    tracking_code: data.tracking_code || data.data?.tracking_code,
    consignment_id: data.parcel_id || data.data?.parcel_id,
    status: data.status || 'pending',
  };
}

// Paperfly API Integration
async function createPaperflyShipment(order: any, store: any) {
  console.log('Creating Paperfly shipment for order:', order.id);
  
  const payload = {
    merchantId: store.paperfly_merchant_id,
    merchantOrderId: order.id,
    recipientName: order.customer_name,
    recipientPhone: order.customer_phone,
    recipientAddress: order.shipping_address,
    codAmount: order.total_amount - (order.paid_amount || 0),
    packageDescription: `Order ${order.id}`,
  };

  const response = await fetch('https://api.paperfly.com.bd/v1/create-order', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${store.paperfly_api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  console.log('Paperfly response:', data);

  if (!response.ok) {
    throw new Error(data.message || 'Failed to create Paperfly shipment');
  }

  return {
    tracking_code: data.trackingCode || data.data?.trackingCode,
    consignment_id: data.orderId || data.data?.orderId,
    status: data.status || 'pending',
  };
}

// Redex API Integration
async function createRedexShipment(order: any, store: any) {
  console.log('Creating Redex shipment for order:', order.id);
  
  const payload = {
    merchant_id: store.redex_merchant_id,
    order_id: order.id,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    customer_address: order.shipping_address,
    cod_amount: order.total_amount - (order.paid_amount || 0),
    product_details: `Order ${order.id}`,
  };

  const response = await fetch('https://redexbd.com/api/v1/parcel', {
    method: 'POST',
    headers: {
      'API-KEY': store.redex_api_key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  console.log('Redex response:', data);

  if (!response.ok) {
    throw new Error(data.message || 'Failed to create Redex shipment');
  }

  return {
    tracking_code: data.tracking_id || data.data?.tracking_id,
    consignment_id: data.parcel_id || data.data?.parcel_id,
    status: data.status || 'pending',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from JWT
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { orderId, courierService }: CourierShipmentRequest = await req.json();

    console.log('Creating shipment:', { orderId, courierService, userId: user.id });

    // Get order details
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('*, stores!inner(*)')
      .eq('id', orderId)
      .eq('stores.user_id', user.id)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found or access denied');
    }

    const store = order.stores;

    // Validate courier is enabled
    const courierEnabledKey = `${courierService}_enabled`;
    if (!store[courierEnabledKey]) {
      throw new Error(`${courierService} courier is not enabled. Please enable it in Store Settings.`);
    }

    // Validate required fields
    if (!order.customer_phone) {
      throw new Error('Customer phone number is required for courier shipment');
    }
    if (!order.shipping_address) {
      throw new Error('Shipping address is required for courier shipment');
    }

    let shipmentResult;

    // Create shipment based on courier service
    switch (courierService) {
      case 'steadfast':
        if (!store.steadfast_api_key || !store.steadfast_secret_key) {
          throw new Error('SteadFast API credentials not configured');
        }
        shipmentResult = await createSteadFastShipment(order, store);
        break;

      case 'pathao':
        if (!store.pathao_client_id || !store.pathao_client_secret) {
          throw new Error('Pathao API credentials not configured');
        }
        shipmentResult = await createPathaoShipment(order, store);
        break;

      case 'carrybee':
        if (!store.carrybee_api_key || !store.carrybee_secret_key) {
          throw new Error('CarryBee API credentials not configured');
        }
        shipmentResult = await createCarryBeeShipment(order, store);
        break;

      case 'paperfly':
        if (!store.paperfly_merchant_id || !store.paperfly_api_key) {
          throw new Error('Paperfly API credentials not configured');
        }
        shipmentResult = await createPaperflyShipment(order, store);
        break;

      case 'redex':
        if (!store.redex_merchant_id || !store.redex_api_key) {
          throw new Error('Redex API credentials not configured');
        }
        shipmentResult = await createRedexShipment(order, store);
        break;

      default:
        throw new Error('Invalid courier service');
    }

    // Update order with tracking information
    const { error: updateError } = await supabaseClient
      .from('orders')
      .update({
        courier_service: courierService,
        courier_tracking_code: shipmentResult.tracking_code,
        courier_consignment_id: shipmentResult.consignment_id,
        status: 'processing',
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Failed to update order:', updateError);
      throw new Error('Failed to update order with tracking information');
    }

    console.log('Shipment created successfully:', shipmentResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Shipment created successfully',
        ...shipmentResult,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating courier shipment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
