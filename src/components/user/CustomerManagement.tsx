import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, Search, User, Mail, Phone, MapPin, Calendar, ShoppingBag, Plus, Upload, Download } from 'lucide-react';
import { format } from 'date-fns';
import { BulkCustomerImport } from './store/BulkCustomerImport';
import { AddCustomerDialog } from './store/AddCustomerDialog';
import * as XLSX from 'xlsx';

interface Customer {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  delivery_location: string;
  city_corporation: string;
  area: string;
  sub_area: string;
  district: string;
  upazila: string;
  street_address: string;
  tags: string[];
  notes: string;
  created_at: string;
  order_count?: number;
  total_spent?: number;
}

export function CustomerManagement() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [storeId, setStoreId] = useState<string>('');

  useEffect(() => {
    loadStoreAndCustomers();
  }, []);

  const loadStoreAndCustomers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (store) {
        setStoreId(store.id);
        await loadCustomers(store.id);
      }
    } catch (error) {
      console.error('Error loading store:', error);
    }
  };


  const loadCustomers = async (storeIdParam?: string) => {
    const idToUse = storeIdParam || storeId;
    if (!idToUse) return;
    
    try {
      setLoading(true);

      // Get all store customers
      const { data: storeCustomers, error: customersError } = await supabase
        .from('store_customers')
        .select('*')
        .eq('store_id', idToUse)
        .order('created_at', { ascending: false });

      if (customersError) throw customersError;

      // Get order statistics for each customer by phone
      const { data: orderStats, error: orderError } = await supabase
        .from('orders')
        .select('customer_phone, total_amount')
        .eq('store_id', idToUse);

      if (orderError) throw orderError;

      // Aggregate order statistics by phone
      const statsMap = (orderStats || []).reduce((acc, order) => {
        if (!acc[order.customer_phone]) {
          acc[order.customer_phone] = { count: 0, total: 0 };
        }
        acc[order.customer_phone].count += 1;
        acc[order.customer_phone].total += order.total_amount;
        return acc;
      }, {} as Record<string, { count: number; total: number }>);

      // Combine data
      const customersWithStats = (storeCustomers || []).map(customer => ({
        ...customer,
        order_count: statsMap[customer.phone]?.count || 0,
        total_spent: statsMap[customer.phone]?.total || 0,
      }));

      setCustomers(customersWithStats);
    } catch (error: any) {
      console.error('Error loading customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };
  const loadCustomerOrders = async (phone: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          stores (
            name,
            currency
          )
        `)
        .eq('customer_phone', phone)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomerOrders(data || []);
    } catch (error: any) {
      console.error('Error loading orders:', error);
    }
  };

  const handleViewDetails = async (customer: Customer) => {
    setSelectedCustomer(customer);
    await loadCustomerOrders(customer.phone);
    setShowDetails(true);
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery)
  );

  const handleExport = () => {
    const exportData = filteredCustomers.map(customer => ({
      Name: customer.full_name,
      Email: customer.email || 'N/A',
      Phone: customer.phone,
      Location: customer.delivery_location || 'N/A',
      Tags: customer.tags?.join(', ') || 'N/A',
      'Order Count': customer.order_count || 0,
      'Total Spent': customer.total_spent || 0,
      'Joined Date': format(new Date(customer.created_at), 'yyyy-MM-dd'),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, `customers_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Customers exported successfully');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card className="border-border/50 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Management
              </CardTitle>
              <CardDescription>View and manage your store customers</CardDescription>
            </div>
            <Badge variant="outline" className="text-base px-4 py-1">
              {customers.length} Customers
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Actions Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-border/50"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowAddCustomer(true)} variant="default">
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
              <Button onClick={() => setShowImport(true)} variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button onClick={handleExport} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Customer Table */}
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No customers found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-primary/10">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {customer.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{customer.full_name || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">{customer.email || 'No email'}</p>
                            {customer.tags && customer.tags.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {customer.tags.slice(0, 2).map((tag, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs px-1.5 py-0">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {customer.phone || 'N/A'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {customer.delivery_location === 'inside_dhaka' && 'Inside Dhaka'}
                          {customer.delivery_location === 'outside_dhaka' && 'Outside Dhaka'}
                          {!customer.delivery_location && 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{customer.order_count || 0}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-primary">
                        ৳ {customer.total_spent?.toLocaleString() || 0}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(customer.created_at), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(customer)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Customer Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-primary/10">
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {selectedCustomer?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p>{selectedCustomer?.full_name || 'Customer Details'}</p>
                {selectedCustomer?.tags && selectedCustomer.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {selectedCustomer.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </DialogTitle>
            <DialogDescription>
              View customer information and order history
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Contact Information */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <p className="text-sm font-medium">{selectedCustomer?.email}</p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  Phone
                </Label>
                <p className="text-sm font-medium">{selectedCustomer?.phone || 'N/A'}</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Delivery Address
                </Label>
                <p className="text-sm font-medium">
                  {selectedCustomer?.street_address && (
                    <>
                      {selectedCustomer.street_address}
                      {selectedCustomer.sub_area && `, ${selectedCustomer.sub_area}`}
                      {selectedCustomer.area && `, ${selectedCustomer.area}`}
                      {selectedCustomer.city_corporation && `, ${selectedCustomer.city_corporation}`}
                      {selectedCustomer.upazila && `, ${selectedCustomer.upazila}`}
                      {selectedCustomer.district && `, ${selectedCustomer.district}`}
                    </>
                  )}
                  {!selectedCustomer?.street_address && 'Not provided'}
                </p>
              </div>

              {selectedCustomer?.notes && (
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="text-sm font-medium">{selectedCustomer.notes}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Customer Since
                </Label>
                <p className="text-sm font-medium">
                  {selectedCustomer?.created_at ? format(new Date(selectedCustomer.created_at), 'MMMM d, yyyy') : 'N/A'}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <ShoppingBag className="h-4 w-4" />
                  Total Orders
                </Label>
                <p className="text-sm font-medium">{selectedCustomer?.order_count || 0} orders</p>
              </div>
            </div>

            {/* Order History */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Order History
              </h3>
              <div className="space-y-2">
                {customerOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No orders yet</p>
                  </div>
                ) : (
                  customerOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30"
                    >
                      <div>
                        <p className="text-sm font-medium">Order #{order.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-primary">
                          {order.stores.currency} {order.total_amount.toLocaleString()}
                        </p>
                        <Badge variant="outline" className="text-xs capitalize">
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Customer Dialog */}
      {storeId && (
        <AddCustomerDialog
          storeId={storeId}
          open={showAddCustomer}
          onOpenChange={setShowAddCustomer}
          onSuccess={loadCustomers}
        />
      )}

      {/* Bulk Import Dialog */}
      {storeId && (
        <BulkCustomerImport
          storeId={storeId}
          open={showImport}
          onOpenChange={setShowImport}
          onImportComplete={loadCustomers}
        />
      )}
    </>
  );
}
