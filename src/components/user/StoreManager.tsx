import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StoreSettings } from './store/StoreSettings';
import { ProductManager } from './store/ProductManager';
import { CategoryManager } from './store/CategoryManager';
import { OrderManager } from './store/OrderManager';
import { SalesAnalytics } from './store/SalesAnalytics';
import CouponManager from './store/CouponManager';
import { ProductAttributes } from './store/ProductAttributes';
import { TransactionHistory } from './store/TransactionHistory';
import { CustomerManagement } from './CustomerManagement';
import { StoreMarketing } from './store/StoreMarketing';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Store, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function StoreManager() {
  const { user } = useAuth();
  const [showCreateStore, setShowCreateStore] = useState(false);

  const { data: store, isLoading, refetch } = useQuery({
    queryKey: ['user-store', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no store exists, show create store option
  if (!store) {
    if (showCreateStore) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Create Your Store</h2>
              <p className="text-muted-foreground">Set up your online store to start selling</p>
            </div>
            <Button variant="outline" onClick={() => setShowCreateStore(false)}>
              Cancel
            </Button>
          </div>
          <StoreSettings />
        </div>
      );
    }

    return (
      <Card className="bg-card/60 border-border/50">
        <CardContent className="py-16 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Store className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl mb-2">No Store Found</CardTitle>
          <CardDescription className="mb-6 max-w-md mx-auto">
            Create your online store to start selling products, managing orders, and growing your business.
          </CardDescription>
          <Button onClick={() => setShowCreateStore(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Your Store
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Store Settings</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="attributes">Attributes</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <SalesAnalytics />
        </TabsContent>

        <TabsContent value="settings">
          <StoreSettings />
        </TabsContent>

        <TabsContent value="products">
          <ProductManager />
        </TabsContent>

        <TabsContent value="categories">
          <CategoryManager />
        </TabsContent>

        <TabsContent value="attributes">
          <ProductAttributes />
        </TabsContent>

        <TabsContent value="coupons">
          {store?.id && <CouponManager storeId={store.id} />}
        </TabsContent>

        <TabsContent value="orders">
          <OrderManager />
        </TabsContent>

        <TabsContent value="customers">
          <CustomerManagement />
        </TabsContent>

        <TabsContent value="marketing">
          {store?.id && <StoreMarketing storeId={store.id} />}
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
