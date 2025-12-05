import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface CouponManagerProps {
  storeId: string;
}

interface Coupon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed' | 'bogo' | 'tiered' | 'free_shipping';
  discount_value: number;
  applies_to: 'all' | 'specific_products' | 'categories';
  product_ids: string[];
  category_ids: string[];
  minimum_purchase: number;
  max_uses: number | null;
  uses_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  bogo_buy_quantity: number | null;
  bogo_get_quantity: number | null;
  bogo_get_discount_percentage: number | null;
  discount_tiers: Array<{ min_amount: number; discount_value: number; discount_type: 'percentage' | 'fixed' }>;
}

interface TierFormData {
  min_amount: string;
  discount_value: string;
  discount_type: 'percentage' | 'fixed';
}

export default function CouponManager({ storeId }: CouponManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    description: string;
    discount_type: 'percentage' | 'fixed' | 'bogo' | 'tiered' | 'free_shipping';
    discount_value: string;
    applies_to: 'all' | 'specific_products' | 'categories';
    product_ids: string[];
    category_ids: string[];
    minimum_purchase: string;
    max_uses: string;
    valid_from: string;
    valid_until: string;
    is_active: boolean;
    bogo_buy_quantity: string;
    bogo_get_quantity: string;
    bogo_get_discount_percentage: string;
    discount_tiers: TierFormData[];
  }>({
    code: '',
    name: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed' | 'bogo' | 'tiered' | 'free_shipping',
    discount_value: '',
    applies_to: 'all' as 'all' | 'specific_products' | 'categories',
    product_ids: [] as string[],
    category_ids: [] as string[],
    minimum_purchase: '',
    max_uses: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    is_active: true,
    bogo_buy_quantity: '',
    bogo_get_quantity: '',
    bogo_get_discount_percentage: '100',
    discount_tiers: [] as TierFormData[],
  });

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['coupons', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(coupon => ({
        ...coupon,
        discount_tiers: (Array.isArray(coupon.discount_tiers) ? coupon.discount_tiers : []) as Array<{ min_amount: number; discount_value: number; discount_type: 'percentage' | 'fixed' }>
      })) as Coupon[];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('store_id', storeId)
        .eq('is_active', true);

      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('store_id', storeId);

      if (error) throw error;
      return data;
    },
  });

  const createCoupon = useMutation({
    mutationFn: async (couponData: any) => {
      const { data, error } = await supabase.from('coupons').insert([couponData]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons', storeId] });
      toast.success('Coupon created successfully');
      resetForm();
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create coupon');
    },
  });

  const updateCoupon = useMutation({
    mutationFn: async ({ id, ...couponData }: any) => {
      const { data, error } = await supabase.from('coupons').update(couponData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons', storeId] });
      toast.success('Coupon updated successfully');
      resetForm();
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update coupon');
    },
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons', storeId] });
      toast.success('Coupon deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete coupon');
    },
  });

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      applies_to: 'all',
      product_ids: [],
      category_ids: [],
      minimum_purchase: '',
      max_uses: '',
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
      is_active: true,
      bogo_buy_quantity: '',
      bogo_get_quantity: '',
      bogo_get_discount_percentage: '100',
      discount_tiers: [],
    });
    setEditingCoupon(null);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value.toString(),
      applies_to: coupon.applies_to,
      product_ids: coupon.product_ids || [],
      category_ids: coupon.category_ids || [],
      minimum_purchase: coupon.minimum_purchase?.toString() || '',
      max_uses: coupon.max_uses?.toString() || '',
      valid_from: coupon.valid_from.split('T')[0],
      valid_until: coupon.valid_until ? coupon.valid_until.split('T')[0] : '',
      is_active: coupon.is_active,
      bogo_buy_quantity: coupon.bogo_buy_quantity?.toString() || '',
      bogo_get_quantity: coupon.bogo_get_quantity?.toString() || '',
      bogo_get_discount_percentage: coupon.bogo_get_discount_percentage?.toString() || '100',
      discount_tiers: (coupon.discount_tiers || []).map(tier => ({
        min_amount: tier.min_amount.toString(),
        discount_value: tier.discount_value.toString(),
        discount_type: tier.discount_type,
      })),
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const couponData: any = {
      store_id: storeId,
      code: formData.code.toUpperCase(),
      name: formData.name,
      description: formData.description || null,
      discount_type: formData.discount_type,
      discount_value: formData.discount_type !== 'tiered' ? parseFloat(formData.discount_value) : 0,
      applies_to: formData.applies_to,
      product_ids: formData.applies_to === 'specific_products' ? formData.product_ids : [],
      category_ids: formData.applies_to === 'categories' ? formData.category_ids : [],
      minimum_purchase: formData.minimum_purchase ? parseFloat(formData.minimum_purchase) : 0,
      max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
      valid_from: new Date(formData.valid_from).toISOString(),
      valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
      is_active: formData.is_active,
    };

    // Add BOGO fields
    if (formData.discount_type === 'bogo') {
      couponData.bogo_buy_quantity = formData.bogo_buy_quantity ? parseInt(formData.bogo_buy_quantity) : null;
      couponData.bogo_get_quantity = formData.bogo_get_quantity ? parseInt(formData.bogo_get_quantity) : null;
      couponData.bogo_get_discount_percentage = formData.bogo_get_discount_percentage ? parseInt(formData.bogo_get_discount_percentage) : 100;
    } else {
      couponData.bogo_buy_quantity = null;
      couponData.bogo_get_quantity = null;
      couponData.bogo_get_discount_percentage = null;
    }

    // Add tiered discount fields
    if (formData.discount_type === 'tiered') {
      couponData.discount_tiers = formData.discount_tiers.map(tier => ({
        min_amount: parseFloat(tier.min_amount),
        discount_value: parseFloat(tier.discount_value),
        discount_type: tier.discount_type,
      }));
    } else {
      couponData.discount_tiers = [];
    }

    if (editingCoupon) {
      updateCoupon.mutate({ id: editingCoupon.id, ...couponData });
    } else {
      createCoupon.mutate(couponData);
    }
  };

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Coupon code copied to clipboard');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Discount Coupons</h2>
          <p className="text-muted-foreground">Create and manage promotional discount codes</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Coupon Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="SUMMER2024"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Summer Sale"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Get 20% off on all summer items"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount_type">Discount Type *</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(value: any) => setFormData({ ...formData, discount_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                      <SelectItem value="bogo">Buy One Get One (BOGO)</SelectItem>
                      <SelectItem value="tiered">Tiered Discount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(formData.discount_type === 'percentage' || formData.discount_type === 'fixed') && (
                  <div className="space-y-2">
                    <Label htmlFor="discount_value">Discount Value *</Label>
                    <Input
                      id="discount_value"
                      type="number"
                      step="0.01"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                      placeholder={formData.discount_type === 'percentage' ? '20' : '10'}
                      required
                    />
                  </div>
                )}
              </div>

              {/* BOGO Configuration */}
              {formData.discount_type === 'bogo' && (
                <div className="space-y-4 p-4 border rounded-md bg-accent/10">
                  <h4 className="font-semibold">BOGO Configuration</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bogo_buy">Buy Quantity *</Label>
                      <Input
                        id="bogo_buy"
                        type="number"
                        min="1"
                        value={formData.bogo_buy_quantity}
                        onChange={(e) => setFormData({ ...formData, bogo_buy_quantity: e.target.value })}
                        placeholder="2"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bogo_get">Get Quantity *</Label>
                      <Input
                        id="bogo_get"
                        type="number"
                        min="1"
                        value={formData.bogo_get_quantity}
                        onChange={(e) => setFormData({ ...formData, bogo_get_quantity: e.target.value })}
                        placeholder="1"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bogo_discount">Discount % *</Label>
                      <Input
                        id="bogo_discount"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.bogo_get_discount_percentage}
                        onChange={(e) => setFormData({ ...formData, bogo_get_discount_percentage: e.target.value })}
                        placeholder="100"
                        required
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Example: Buy 2 items, get 1 item at 100% off (free) or 50% off
                  </p>
                </div>
              )}

              {/* Tiered Discount Configuration */}
              {formData.discount_type === 'tiered' && (
                <div className="space-y-4 p-4 border rounded-md bg-accent/10">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold">Tiered Discount Configuration</h4>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setFormData({
                        ...formData,
                        discount_tiers: [...formData.discount_tiers, { min_amount: '', discount_value: '', discount_type: 'percentage' }]
                      })}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Tier
                    </Button>
                  </div>
                  {formData.discount_tiers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Add tiers to offer different discounts based on purchase amount
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {formData.discount_tiers.map((tier, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-4 space-y-2">
                            <Label htmlFor={`tier_min_${index}`}>Min. Purchase ($)</Label>
                            <Input
                              id={`tier_min_${index}`}
                              type="number"
                              step="0.01"
                              value={tier.min_amount}
                              onChange={(e) => {
                                const newTiers = [...formData.discount_tiers];
                                newTiers[index].min_amount = e.target.value;
                                setFormData({ ...formData, discount_tiers: newTiers });
                              }}
                              placeholder="50"
                              required
                            />
                          </div>
                          <div className="col-span-3 space-y-2">
                            <Label htmlFor={`tier_value_${index}`}>Discount</Label>
                            <Input
                              id={`tier_value_${index}`}
                              type="number"
                              step="0.01"
                              value={tier.discount_value}
                              onChange={(e) => {
                                const newTiers = [...formData.discount_tiers];
                                newTiers[index].discount_value = e.target.value;
                                setFormData({ ...formData, discount_tiers: newTiers });
                              }}
                              placeholder="10"
                              required
                            />
                          </div>
                          <div className="col-span-4 space-y-2">
                            <Label htmlFor={`tier_type_${index}`}>Type</Label>
                            <Select
                              value={tier.discount_type}
                              onValueChange={(value: any) => {
                                const newTiers = [...formData.discount_tiers];
                                newTiers[index].discount_type = value;
                                setFormData({ ...formData, discount_tiers: newTiers });
                              }}
                            >
                              <SelectTrigger id={`tier_type_${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percentage">%</SelectItem>
                                <SelectItem value="fixed">$</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const newTiers = formData.discount_tiers.filter((_, i) => i !== index);
                                setFormData({ ...formData, discount_tiers: newTiers });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Tiers apply the best discount automatically based on cart total
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="applies_to">Applies To *</Label>
                <Select
                  value={formData.applies_to}
                  onValueChange={(value: any) => setFormData({ ...formData, applies_to: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products (Site-wide)</SelectItem>
                    <SelectItem value="specific_products">Specific Products</SelectItem>
                    <SelectItem value="categories">Specific Categories</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.applies_to === 'specific_products' && (
                <div className="space-y-2">
                  <Label>Select Products</Label>
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                    {products.map((product) => (
                      <div key={product.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`product-${product.id}`}
                          checked={formData.product_ids.includes(product.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({ ...formData, product_ids: [...formData.product_ids, product.id] });
                            } else {
                              setFormData({ ...formData, product_ids: formData.product_ids.filter(id => id !== product.id) });
                            }
                          }}
                        />
                        <label htmlFor={`product-${product.id}`} className="text-sm cursor-pointer">{product.name}</label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formData.applies_to === 'categories' && (
                <div className="space-y-2">
                  <Label>Select Categories</Label>
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`category-${category.id}`}
                          checked={formData.category_ids.includes(category.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({ ...formData, category_ids: [...formData.category_ids, category.id] });
                            } else {
                              setFormData({ ...formData, category_ids: formData.category_ids.filter(id => id !== category.id) });
                            }
                          }}
                        />
                        <label htmlFor={`category-${category.id}`} className="text-sm cursor-pointer">{category.name}</label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minimum_purchase">Minimum Purchase ($)</Label>
                  <Input
                    id="minimum_purchase"
                    type="number"
                    step="0.01"
                    value={formData.minimum_purchase}
                    onChange={(e) => setFormData({ ...formData, minimum_purchase: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_uses">Max Uses (optional)</Label>
                  <Input
                    id="max_uses"
                    type="number"
                    value={formData.max_uses}
                    onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valid_from">Valid From *</Label>
                  <Input
                    id="valid_from"
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valid_until">Valid Until (optional)</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })}
                />
                <label htmlFor="is_active" className="text-sm cursor-pointer">Active</label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCoupon.isPending || updateCoupon.isPending}>
                  {editingCoupon ? 'Update' : 'Create'} Coupon
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Loading coupons...
            </CardContent>
          </Card>
        ) : coupons.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No coupons created yet. Create your first promotional coupon!
            </CardContent>
          </Card>
        ) : (
          coupons.map((coupon) => (
            <Card key={coupon.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="flex items-center gap-2">
                        {coupon.name}
                        {!coupon.is_active && <Badge variant="secondary">Inactive</Badge>}
                      </CardTitle>
                    </div>
                    <CardDescription>{coupon.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => copyCouponCode(coupon.code)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(coupon)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteCoupon.mutate(coupon.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-semibold mb-1">Code</div>
                    <Badge variant="outline" className="font-mono">{coupon.code}</Badge>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">Discount</div>
                    <div>
                      {coupon.discount_type === 'percentage' && `${coupon.discount_value}%`}
                      {coupon.discount_type === 'fixed' && `$${coupon.discount_value}`}
                      {coupon.discount_type === 'bogo' && `Buy ${coupon.bogo_buy_quantity}, Get ${coupon.bogo_get_quantity} at ${coupon.bogo_get_discount_percentage}% off`}
                      {coupon.discount_type === 'tiered' && `${coupon.discount_tiers.length} tier${coupon.discount_tiers.length > 1 ? 's' : ''}`}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">Type</div>
                    <Badge variant="secondary" className="capitalize">
                      {coupon.discount_type === 'bogo' ? 'BOGO' : coupon.discount_type}
                    </Badge>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">Usage</div>
                    <div>
                      {coupon.uses_count} / {coupon.max_uses || '∞'}
                    </div>
                  </div>
                  
                  {coupon.discount_type === 'tiered' && coupon.discount_tiers.length > 0 && (
                    <div className="col-span-2 md:col-span-4">
                      <div className="font-semibold mb-2">Discount Tiers</div>
                      <div className="space-y-1">
                        {coupon.discount_tiers
                          .sort((a, b) => a.min_amount - b.min_amount)
                          .map((tier, idx) => (
                            <div key={idx} className="text-sm bg-accent/20 p-2 rounded">
                              Spend ${tier.min_amount}+ → Get {tier.discount_type === 'percentage' ? `${tier.discount_value}%` : `$${tier.discount_value}`} off
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <div className="font-semibold mb-1">Applies To</div>
                    <div className="capitalize">{coupon.applies_to.replace('_', ' ')}</div>
                  </div>
                  
                  {coupon.minimum_purchase > 0 && (
                    <div>
                      <div className="font-semibold mb-1">Min. Purchase</div>
                      <div>${coupon.minimum_purchase}</div>
                    </div>
                  )}
                  <div>
                    <div className="font-semibold mb-1">Valid Period</div>
                    <div>
                      {new Date(coupon.valid_from).toLocaleDateString()} - {coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString() : 'No expiry'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
