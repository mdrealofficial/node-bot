import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Package, RefreshCcw } from 'lucide-react';
import { trackServerSideConversion } from '@/lib/trackingUtils';
import { formatPrice } from '@/lib/currencyUtils';

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string | null;
  total_amount: number;
  paid_amount: number;
  status: string;
  created_at: string;
  payment_method: string | null;
  stripe_payment_id: string | null;
  courier_service: string | null;
  courier_tracking_code: string | null;
  courier_consignment_id: string | null;
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  paid: 'default',
  partially_paid: 'outline',
  processing: 'outline',
  shipped: 'default',
  completed: 'default',
  cancelled: 'destructive',
};

export function OrderManager() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [store, setStore] = useState<any>(null);
  const [refundLoading, setRefundLoading] = useState<string | null>(null);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [editAddressDialogOpen, setEditAddressDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState('');
  const [courierDialogOpen, setCourierDialogOpen] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState('steadfast');
  const [creatingShipment, setCreatingShipment] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [user]);

  const loadOrders = async () => {
    try {
      const { data: storeData } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!storeData) {
        setLoading(false);
        return;
      }

      setStoreId(storeData.id);
      setStore(storeData);

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', storeData.id)
        .order('created_at', { ascending: false });

      if (error) {
        if ((error as any).code === '42501') {
          console.warn('OrderManager: permission denied for orders, showing empty list');
        } else {
          throw error;
        }
      }
      setOrders(data || []);
    } catch (error: any) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: 'pending' | 'paid' | 'partially_paid' | 'processing' | 'shipped' | 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Track cancellation if status changed to cancelled
      if (newStatus === 'cancelled' && storeId) {
        try {
          const order = orders.find(o => o.id === orderId);
          await trackServerSideConversion(
            storeId,
            'Refund',
            orderId,
            {
              email: order?.customer_email,
              phone: order?.customer_phone || undefined,
            }
          );
        } catch (trackingError) {
          console.error('Failed to track cancellation:', trackingError);
        }
      }

      toast.success('Order status updated');
      loadOrders();
    } catch (error: any) {
      toast.error('Failed to update order status');
    }
  };

  const handleRefundClick = (order: Order) => {
    setSelectedOrder(order);
    setRefundAmount(order.paid_amount.toString());
    setRefundDialogOpen(true);
  };

  const processRefund = async () => {
    if (!selectedOrder || !storeId) return;

    const refundAmountNum = parseFloat(refundAmount);
    if (isNaN(refundAmountNum) || refundAmountNum <= 0 || refundAmountNum > selectedOrder.paid_amount) {
      toast.error('Invalid refund amount');
      return;
    }

    setRefundLoading(selectedOrder.id);
    try {
      const { data, error } = await supabase.functions.invoke('bkash-payment', {
        body: {
          action: 'refund_payment',
          storeId,
          orderId: selectedOrder.id,
          paymentId: selectedOrder.stripe_payment_id,
          amount: refundAmountNum,
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Refund failed');
      }

      const newPaidAmount = selectedOrder.paid_amount - refundAmountNum;
      const newStatus = newPaidAmount === 0 ? 'cancelled' : 
                       newPaidAmount < selectedOrder.total_amount ? 'partially_paid' : 'paid';

      await supabase
        .from('orders')
        .update({
          paid_amount: newPaidAmount,
          status: newStatus,
        })
        .eq('id', selectedOrder.id);

      // Record refund transaction
      await supabase
        .from('payment_transactions')
        .insert({
          order_id: selectedOrder.id,
          store_id: storeId,
          transaction_type: 'refund',
          amount: refundAmountNum,
          payment_method: selectedOrder.payment_method || 'bkash',
          payment_id: data.refundTrxId,
          status: 'success',
          metadata: {
            original_payment_id: selectedOrder.stripe_payment_id,
            transaction_status: data.transactionStatus,
          },
        });

      // Track server-side refund conversion
      try {
        await trackServerSideConversion(
          storeId,
          'Refund',
          selectedOrder.id,
          {
            email: selectedOrder.customer_email,
            phone: selectedOrder.customer_phone || undefined,
          }
        );
      } catch (trackingError) {
        console.error('Failed to track refund conversion:', trackingError);
      }

      toast.success(`Refund of ${formatPrice(refundAmountNum, store?.currency || 'BDT')} processed successfully`);
      setRefundDialogOpen(false);
      setSelectedOrder(null);
      setRefundAmount('');
      loadOrders();
    } catch (error: any) {
      console.error('Refund error:', error);
      toast.error(error.message || 'Failed to process refund');
    } finally {
      setRefundLoading(null);
    }
  };

  const handleEditAddress = (order: Order) => {
    setSelectedOrder(order);
    setEditingAddress(order.shipping_address || '');
    setEditAddressDialogOpen(true);
  };

  const saveAddress = async () => {
    if (!selectedOrder) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ shipping_address: editingAddress })
        .eq('id', selectedOrder.id);

      if (error) throw error;
      toast.success('Delivery address updated');
      setEditAddressDialogOpen(false);
      setSelectedOrder(null);
      loadOrders();
    } catch (error: any) {
      toast.error('Failed to update address');
    }
  };

  const handleCourierSelect = (order: Order) => {
    setSelectedOrder(order);
    setSelectedCourier(order.courier_service || 'steadfast');
    setCourierDialogOpen(true);
  };

  const assignCourier = async () => {
    if (!selectedOrder) return;

    setCreatingShipment(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-courier-shipment', {
        body: {
          orderId: selectedOrder.id,
          courierService: selectedCourier,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Shipment created! Tracking: ${data.tracking_code}`);
        setCourierDialogOpen(false);
        setSelectedOrder(null);
        loadOrders();
      } else {
        throw new Error(data.error || 'Failed to create shipment');
      }
    } catch (error: any) {
      console.error('Failed to create courier shipment:', error);
      toast.error(error.message || 'Failed to create courier shipment');
    } finally {
      setCreatingShipment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!storeId) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Please create a store in the Store Settings tab first</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Orders</h3>
        <p className="text-sm text-muted-foreground">Manage customer orders</p>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{order.customer_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{order.customer_email}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()} at{' '}
                    {new Date(order.created_at).toLocaleTimeString()}
                  </p>
                </div>
                <Badge variant={statusColors[order.status] || 'outline'}>
                  {order.status.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{order.customer_phone || 'N/A'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Shipping Address</p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium flex-1">{order.shipping_address || 'N/A'}</p>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditAddress(order)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>

                {order.courier_service && (
                  <div className="border-t pt-4 space-y-2">
                    <p className="text-sm font-medium">Courier Information</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Service: </span>
                        <Badge variant="outline" className="ml-2">
                          {order.courier_service === 'steadfast' && 'SteadFast'}
                          {order.courier_service === 'pathao' && 'Pathao'}
                          {order.courier_service === 'carrybee' && 'CarryBee'}
                          {order.courier_service === 'paperfly' && 'Paperfly'}
                          {order.courier_service === 'redex' && 'Redex'}
                          {!order.courier_service && 'N/A'}
                        </Badge>
                      </div>
                      {order.courier_tracking_code && (
                        <div>
                          <span className="text-muted-foreground">Tracking: </span>
                          <span className="font-mono">{order.courier_tracking_code}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center border-t pt-4">
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{formatPrice(order.total_amount, store?.currency || 'BDT')}</p>
                    {order.paid_amount > 0 && order.paid_amount < order.total_amount && (
                      <p className="text-sm text-muted-foreground">
                        Paid: {formatPrice(order.paid_amount, store?.currency || 'BDT')}
                      </p>
                    )}
                    {order.payment_method && (
                      <p className="text-xs text-muted-foreground">
                        Payment: {order.payment_method === 'bkash' ? 'bKash' : order.payment_method.toUpperCase()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCourierSelect(order)}
                    >
                      <Package className="mr-2 h-4 w-4" />
                      {order.courier_service ? 'Change' : 'Assign'} Courier
                    </Button>
                    <Select
                      value={order.status}
                      onValueChange={(value) => updateOrderStatus(order.id, value as any)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="partially_paid">Partially Paid</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {order.payment_method === 'bkash' && order.paid_amount > 0 && order.stripe_payment_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRefundClick(order)}
                    disabled={refundLoading === order.id}
                  >
                    {refundLoading === order.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Process Refund
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {orders.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No orders yet</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>
              Enter the amount to refund for this order. Maximum refundable amount: {formatPrice(selectedOrder?.paid_amount || 0, store?.currency || 'BDT')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="refund-amount">Refund Amount</Label>
              <Input
                id="refund-amount"
                type="number"
                min="0.01"
                max={selectedOrder?.paid_amount}
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="Enter refund amount"
              />
            </div>
            {selectedOrder && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Total:</span>
                  <span>{formatPrice(selectedOrder.total_amount, store?.currency || 'BDT')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <span>{formatPrice(selectedOrder.paid_amount, store?.currency || 'BDT')}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Refund Amount:</span>
                  <span>${parseFloat(refundAmount || '0').toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={processRefund} 
              disabled={!refundAmount || parseFloat(refundAmount) <= 0 || refundLoading !== null}
            >
              {refundLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Process Refund'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Address Dialog */}
      <Dialog open={editAddressDialogOpen} onOpenChange={setEditAddressDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Delivery Address</DialogTitle>
            <DialogDescription>
              Update the shipping address for this order
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="shipping-address">Shipping Address</Label>
              <Input
                id="shipping-address"
                value={editingAddress}
                onChange={(e) => setEditingAddress(e.target.value)}
                placeholder="Enter full shipping address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAddressDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveAddress}>
              Save Address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Courier Selection Dialog */}
      <Dialog open={courierDialogOpen} onOpenChange={setCourierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Courier Service</DialogTitle>
            <DialogDescription>
              Choose which courier service to use for this order
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="courier-service">Courier Service</Label>
              <Select value={selectedCourier} onValueChange={setSelectedCourier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {store?.steadfast_enabled && (
                    <SelectItem value="steadfast">SteadFast Courier</SelectItem>
                  )}
                  {store?.pathao_enabled && (
                    <SelectItem value="pathao">Pathao Courier</SelectItem>
                  )}
                  {store?.carrybee_enabled && (
                    <SelectItem value="carrybee">CarryBee Courier</SelectItem>
                  )}
                  {store?.paperfly_enabled && (
                    <SelectItem value="paperfly">Paperfly Courier</SelectItem>
                  )}
                  {store?.redex_enabled && (
                    <SelectItem value="redex">Redex Courier</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {!store?.steadfast_enabled && !store?.pathao_enabled && !store?.carrybee_enabled && 
               !store?.paperfly_enabled && !store?.redex_enabled && (
                <p className="text-sm text-muted-foreground">
                  No couriers enabled. Please enable courier services in Store Settings.
                </p>
              )}
            </div>
            {selectedOrder && (
              <div className="space-y-2 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Order Details</p>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer:</span>
                    <span>{selectedOrder.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{selectedOrder.customer_phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Address:</span>
                    <span className="text-right max-w-[200px]">{selectedOrder.shipping_address || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCourierDialogOpen(false)} disabled={creatingShipment}>
              Cancel
            </Button>
            <Button onClick={assignCourier} disabled={creatingShipment}>
              {creatingShipment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Shipment...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  Create Shipment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
