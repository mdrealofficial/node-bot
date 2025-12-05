import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { User, MapPin, Package, Plus, Edit, Trash2, LogOut, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPrice } from '@/lib/currencyUtils';

interface Address {
  id: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  postal_code?: string;
  country: string;
  is_default: boolean;
}

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  paid_amount: number;
  status: string;
  payment_method: string;
  stores: {
    name: string;
    currency: string;
  };
}

export default function CustomerProfile() {
  const navigate = useNavigate();
  const { customerProfile, updateProfile, signOut, loading: authLoading } = useCustomerAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [showAddressDialog, setShowAddressDialog] = useState(false);

  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    phone: '',
  });

  const [addressData, setAddressData] = useState<Partial<Address> & { address_line1: string; city: string; country: string }>({
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    is_default: false,
  });

  useEffect(() => {
    if (!authLoading && !customerProfile) {
      navigate('/customer-auth?return=/customer-profile');
      return;
    }

    if (customerProfile) {
      setProfileData({
        full_name: customerProfile.full_name || '',
        email: customerProfile.email || '',
        phone: customerProfile.phone || '',
      });
      loadData();
    }
  }, [customerProfile, authLoading, navigate]);

  const loadData = async () => {
    if (!customerProfile) return;

    setLoading(true);
    try {
      // Load addresses
      const { data: addressData, error: addressError } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_profile_id', customerProfile.id)
        .order('is_default', { ascending: false });

      if (addressError) throw addressError;
      setAddresses(addressData || []);

      // Load orders
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          total_amount,
          paid_amount,
          status,
          payment_method,
          stores (
            name,
            currency
          )
        `)
        .eq('customer_profile_id', customerProfile.id)
        .order('created_at', { ascending: false });

      if (orderError) throw orderError;
      setOrders(orderData as any || []);
    } catch (error: any) {
      toast.error('Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile(profileData);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAddress) {
        const { error } = await supabase
          .from('customer_addresses')
          .update(addressData)
          .eq('id', editingAddress.id);

        if (error) throw error;
        toast.success('Address updated');
      } else {
        const { error } = await supabase
          .from('customer_addresses')
          .insert({
            ...addressData,
            customer_profile_id: customerProfile?.id,
          });

        if (error) throw error;
        toast.success('Address added');
      }

      setShowAddressDialog(false);
      setEditingAddress(null);
      resetAddressForm();
      loadData();
    } catch (error) {
      toast.error('Failed to save address');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const { error } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Address deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete address');
    }
  };

  const resetAddressForm = () => {
    setAddressData({
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
      is_default: false,
    });
  };

  const openEditAddress = (address: Address) => {
    setEditingAddress(address);
    setAddressData({
      ...address,
      address_line2: address.address_line2 || '',
      state: address.state || '',
      postal_code: address.postal_code || '',
    });
    setShowAddressDialog(true);
  };

  const openNewAddress = () => {
    setEditingAddress(null);
    resetAddressForm();
    setShowAddressDialog(true);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Store
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">My Profile</CardTitle>
                <CardDescription>
                  {customerProfile?.is_guest ? 'Guest Account' : 'Manage your account information'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="addresses">Addresses</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      placeholder="your@email.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      placeholder="+1234567890"
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Update Profile
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="addresses">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Saved Addresses</h3>
                    <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
                      <DialogTrigger asChild>
                        <Button onClick={openNewAddress}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Address
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            {editingAddress ? 'Edit Address' : 'Add New Address'}
                          </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSaveAddress} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="address_line1">Address Line 1 *</Label>
                            <Input
                              id="address_line1"
                              value={addressData.address_line1}
                              onChange={(e) => setAddressData({ ...addressData, address_line1: e.target.value })}
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="address_line2">Address Line 2</Label>
                            <Input
                              id="address_line2"
                              value={addressData.address_line2}
                              onChange={(e) => setAddressData({ ...addressData, address_line2: e.target.value })}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="city">City *</Label>
                              <Input
                                id="city"
                                value={addressData.city}
                                onChange={(e) => setAddressData({ ...addressData, city: e.target.value })}
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="state">State</Label>
                              <Input
                                id="state"
                                value={addressData.state}
                                onChange={(e) => setAddressData({ ...addressData, state: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="postal_code">Postal Code</Label>
                              <Input
                                id="postal_code"
                                value={addressData.postal_code}
                                onChange={(e) => setAddressData({ ...addressData, postal_code: e.target.value })}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="country">Country *</Label>
                              <Input
                                id="country"
                                value={addressData.country}
                                onChange={(e) => setAddressData({ ...addressData, country: e.target.value })}
                                required
                              />
                            </div>
                          </div>

                          <Button type="submit" className="w-full">
                            Save Address
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {addresses.length === 0 ? (
                    <Card className="p-8 text-center">
                      <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">No saved addresses yet</p>
                      <Button onClick={openNewAddress}>Add Your First Address</Button>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {addresses.map((address) => (
                        <Card key={address.id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                {address.is_default && (
                                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="font-medium">{address.address_line1}</p>
                              {address.address_line2 && <p className="text-sm">{address.address_line2}</p>}
                              <p className="text-sm text-muted-foreground">
                                {address.city}, {address.state} {address.postal_code}
                              </p>
                              <p className="text-sm text-muted-foreground">{address.country}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditAddress(address)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAddress(address.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="orders">
                {orders.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">No orders yet</p>
                    <Button asChild>
                      <Link to="/">Start Shopping</Link>
                    </Button>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <Card key={order.id} className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            order.status === 'completed' ? 'bg-green-100 text-green-800' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <Separator className="my-3" />
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Amount</p>
                            <p className="font-bold">
                              {formatPrice(order.total_amount, order.stores.currency)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Payment</p>
                            <p className="text-sm font-medium">{order.payment_method}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
