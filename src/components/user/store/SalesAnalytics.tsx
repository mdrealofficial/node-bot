import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, DollarSign, ShoppingCart, Package, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/currencyUtils';

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  totalProductsSold: number;
  averageOrderValue: number;
}

interface TopProduct {
  product_id: string;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
}

export function SalesAnalytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeCurrency, setStoreCurrency] = useState<string>('BDT');
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalRevenue: 0,
    totalOrders: 0,
    totalProductsSold: 0,
    averageOrderValue: 0,
  });
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [user]);

  const loadAnalytics = async () => {
    try {
      // Get store
      const { data: store } = await supabase
        .from('stores')
        .select('id, currency')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!store) {
        setLoading(false);
        return;
      }

      setStoreId(store.id);
      setStoreCurrency(store.currency || 'BDT');

      // Get orders data
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_amount, paid_amount, status')
        .eq('store_id', store.id);

      if (ordersError) {
        // If we don't have permission to read orders (RLS), treat as no data instead of breaking the UI
        if ((ordersError as any).code === '42501') {
          console.warn('SalesAnalytics: permission denied for orders, showing empty analytics');
        } else {
          throw ordersError;
        }
      }

      const safeOrders = orders || [];

      // Calculate analytics
      const totalRevenue = safeOrders.reduce((sum: number, order: any) => sum + (order.paid_amount ?? 0), 0);
      const totalOrders = safeOrders.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Get order items for products sold
      let orderItems: any[] = [];
      if (orders && orders.length > 0) {
        const { data, error: itemsError } = await supabase
          .from('order_items')
          .select(`
            quantity,
            product_id,
            total_price,
            products (name)
          `)
          .in('order_id', orders.map(o => o.id));

        if (itemsError) {
          if ((itemsError as any).code === '42501') {
            console.warn('SalesAnalytics: permission denied for order_items, using empty list');
          } else {
            throw itemsError;
          }
        }
        orderItems = data || [];
      }

      const totalProductsSold = orderItems.reduce((sum: number, item: any) => sum + (item.quantity ?? 0), 0);

      // Calculate top products
      const productMap = new Map<string, TopProduct>();
      orderItems.forEach((item: any) => {
        const existing = productMap.get(item.product_id);
        if (existing) {
          existing.total_quantity += item.quantity ?? 0;
          existing.total_revenue += Number(item.total_price ?? 0);
        } else {
          productMap.set(item.product_id, {
            product_id: item.product_id,
            product_name: item.products?.name || 'Unknown',
            total_quantity: item.quantity ?? 0,
            total_revenue: Number(item.total_price ?? 0),
          });
        }
      });

      const topProductsList = Array.from(productMap.values())
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, 5);

      setAnalytics({
        totalRevenue,
        totalOrders,
        totalProductsSold,
        averageOrderValue,
      });
      setTopProducts(topProductsList);
    } catch (error: any) {
      toast.error('Failed to load analytics');
      console.error(error);
    } finally {
      setLoading(false);
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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Sales Analytics</h3>
        <p className="text-sm text-muted-foreground">Overview of your store performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(analytics.totalRevenue, storeCurrency)}</div>
            <p className="text-xs text-muted-foreground">From all orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalOrders}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalProductsSold}</div>
            <p className="text-xs text-muted-foreground">Total units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(analytics.averageOrderValue, storeCurrency)}</div>
            <p className="text-xs text-muted-foreground">Per order</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>Top Selling Products</CardTitle>
          <CardDescription>Your best performing products by quantity sold</CardDescription>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No sales data yet</p>
          ) : (
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.product_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{product.product_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.total_quantity} units sold
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatPrice(product.total_revenue, storeCurrency)}</p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
