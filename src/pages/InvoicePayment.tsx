import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, Package, MapPin, CreditCard, CheckCircle2 } from 'lucide-react';
import { formatPrice } from '@/lib/currencyUtils';

interface Invoice {
  id: string;
  store_id: string;
  customer_name: string;
  customer_phone: string;
  items: any;
  subtotal: number;
  shipping_charge: number;
  total_amount: number;
  payment_type: string;
  advance_amount: number;
  due_amount: number;
  status: string;
  paid_amount: number;
  shipping_address: any;
}

interface Store {
  name: string;
  currency: string;
  slug: string;
}

export default function InvoicePayment() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [store, setStore] = useState<Store | null>(null);

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const loadInvoice = async () => {
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('chat_invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (invoiceError) throw invoiceError;
      
      // Parse items if it's a JSON string
      const parsedInvoice = {
        ...invoiceData,
        items: typeof invoiceData.items === 'string' ? JSON.parse(invoiceData.items) : invoiceData.items
      };
      setInvoice(parsedInvoice as Invoice);

      // Load store info
      const { data: storeData } = await supabase
        .from('stores')
        .select('name, currency, slug')
        .eq('id', invoiceData.store_id)
        .single();

      if (storeData) {
        setStore(storeData);
      }
    } catch (error: any) {
      console.error('Error loading invoice:', error);
      toast({ title: 'Error loading invoice', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!invoice || !store) return;

    setProcessing(true);
    try {
      const amountToPay = invoice.payment_type === 'partial_payment' 
        ? invoice.advance_amount 
        : invoice.total_amount;

      const { data, error } = await supabase.functions.invoke('process-invoice-payment', {
        body: {
          invoiceId: invoice.id,
          amount: amountToPay,
          customerName: invoice.customer_name,
          customerPhone: invoice.customer_phone
        }
      });

      if (error) throw error;

      // Redirect to payment gateway
      if (data?.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast({ 
        title: 'Error', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!invoice || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Invoice Not Found</CardTitle>
            <CardDescription>This invoice does not exist or has been removed.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isPaid = invoice.status === 'paid' || invoice.status === 'completed';
  const isPartialPaid = invoice.status === 'partial_paid';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 p-4">
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle className="text-2xl">Invoice</CardTitle>
                  <CardDescription>{store.name}</CardDescription>
                </div>
              </div>
              {isPaid ? (
                <Badge className="bg-green-500 text-white">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Paid
                </Badge>
              ) : isPartialPaid ? (
                <Badge className="bg-orange-500 text-white">Partial Paid</Badge>
              ) : (
                <Badge variant="outline">Pending</Badge>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">{invoice.customer_name}</span>
            </div>
            {invoice.customer_phone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-medium">{invoice.customer_phone}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(Array.isArray(invoice.items) ? invoice.items : []).map((item: any, idx: number) => (
              <div key={idx} className="flex gap-3">
                {item.image_url && (
                  <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover rounded" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Qty: {item.quantity} × {formatPrice(item.price, store.currency)}
                  </p>
                </div>
                <div className="text-right font-semibold">
                  {formatPrice(item.price * item.quantity, store.currency)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Delivery Address */}
        {invoice.shipping_address && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {invoice.shipping_address.area || invoice.shipping_address.district}, 
                {invoice.shipping_address.street_address}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Payment Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(invoice.subtotal, store.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{formatPrice(invoice.shipping_charge, store.currency)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatPrice(invoice.total_amount, store.currency)}</span>
            </div>

            {invoice.payment_type === 'partial_payment' && (
              <>
                <Separator />
                <div className="flex justify-between text-primary">
                  <span>Advance Amount</span>
                  <span className="font-semibold">{formatPrice(invoice.advance_amount, store.currency)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Due on Delivery</span>
                  <span>{formatPrice(invoice.due_amount, store.currency)}</span>
                </div>
              </>
            )}

            {invoice.paid_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Paid</span>
                <span className="font-semibold">{formatPrice(invoice.paid_amount, store.currency)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Button */}
        {!isPaid && invoice.payment_type !== 'full_cod' && (
          <Button 
            className="w-full" 
            size="lg"
            onClick={handlePayment}
            disabled={processing}
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-5 w-5" />
                Pay {formatPrice(invoice.payment_type === 'partial_payment' ? invoice.advance_amount : invoice.total_amount, store.currency)}
              </>
            )}
          </Button>
        )}

        {invoice.payment_type === 'full_cod' && (
          <Card className="border-primary">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Payment will be collected on delivery: <strong>{formatPrice(invoice.total_amount, store.currency)}</strong>
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}