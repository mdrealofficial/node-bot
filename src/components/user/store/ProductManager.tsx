import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, PackagePlus, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BulkProductImport } from './BulkProductImport';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ProductImageGallery } from './ProductImageGallery';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  product_type: 'digital' | 'physical' | 'both';
  image_url: string | null;
  is_active: boolean;
  stock_quantity: number;
  category_id: string | null;
  categories?: { name: string };
}

export function ProductManager() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [productTypeFilter, setProductTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [attributes, setAttributes] = useState<any[]>([]);
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<Record<string, {value: string, price_modifier: number, excluded?: boolean}[]>>({});
  const [defaultShipping, setDefaultShipping] = useState<any>({ inside: 60, outside: 120, return: 50 });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    product_type: 'physical' as 'digital' | 'physical' | 'both',
    stock_quantity: '0',
    category_id: '',
    is_active: true,
    requires_full_payment: false,
    allows_cod: false,
    minimum_payment_percentage: '0',
    landing_page_url: '',
    shipping_inside_dhaka: '',
    shipping_outside_dhaka: '',
    return_charge: '',
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      // Get store
      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!store) {
        setLoading(false);
        return;
      }

      setStoreId(store.id);

      // Load default shipping rates
      const { data: shippingSettings } = await supabase
        .from('stores')
        .select('default_shipping_inside_dhaka, default_shipping_outside_dhaka, default_return_charge')
        .eq('id', store.id)
        .single();

      if (shippingSettings) {
        setDefaultShipping({
          inside: shippingSettings.default_shipping_inside_dhaka || 60,
          outside: shippingSettings.default_shipping_outside_dhaka || 120,
          return: shippingSettings.default_return_charge || 50,
        });
      }

      // Load products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;
      setProducts(productsData || []);

      // Load categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('store_id', store.id);

      setCategories(categoriesData || []);

      // Load attributes
      const { data: attributesData } = await supabase
        .from('product_attributes')
        .select('*')
        .eq('store_id', store.id)
        .eq('is_active', true);

      setAttributes(attributesData || []);
    } catch (error: any) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storeId) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/products/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('store-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('store-assets')
        .getPublicUrl(fileName);

      setImagePreview(publicUrl);

      // If editing existing product, update immediately
      if (editingProduct) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ image_url: publicUrl })
          .eq('id', editingProduct.id);

        if (updateError) throw updateError;
        toast.success('Product image updated');
        loadData();
      } else {
        toast.success('Image uploaded - save product to apply');
      }
    } catch (error: any) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!editingProduct) {
      setImagePreview(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({ image_url: null })
        .eq('id', editingProduct.id);

      if (error) throw error;
      
      setImagePreview(null);
      toast.success('Image removed');
      loadData();
    } catch (error: any) {
      toast.error('Failed to remove image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;

    setSaving(true);
    try {
      const productData = {
        store_id: storeId,
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        product_type: formData.product_type,
        stock_quantity: parseInt(formData.stock_quantity),
        category_id: formData.category_id === '' ? null : formData.category_id,
        is_active: formData.is_active,
        image_url: imagePreview,
        requires_full_payment: formData.requires_full_payment,
        allows_cod: formData.allows_cod,
        minimum_payment_percentage: parseInt(formData.minimum_payment_percentage),
        landing_page_url: formData.landing_page_url || null,
        shipping_inside_dhaka: formData.shipping_inside_dhaka ? parseFloat(formData.shipping_inside_dhaka) : null,
        shipping_outside_dhaka: formData.shipping_outside_dhaka ? parseFloat(formData.shipping_outside_dhaka) : null,
        return_charge: formData.return_charge ? parseFloat(formData.return_charge) : null,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;

        // Delete existing attribute values
        await supabase
          .from('product_attribute_values')
          .delete()
          .eq('product_id', editingProduct.id);

        // Insert new attribute values
        if (Object.keys(selectedAttributeValues).length > 0) {
          const attributeValueInserts = [];
          for (const [attributeId, values] of Object.entries(selectedAttributeValues)) {
            for (const attrVal of values) {
              // Only insert non-excluded values
              if (!attrVal.excluded) {
                attributeValueInserts.push({
                  product_id: editingProduct.id,
                  attribute_id: attributeId,
                  attribute_value: attrVal.value,
                  price_modifier: attrVal.price_modifier || 0,
                });
              }
            }
          }
          if (attributeValueInserts.length > 0) {
            await supabase.from('product_attribute_values').insert(attributeValueInserts);
          }
        }

        toast.success('Product updated successfully');
      } else {
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert([productData])
          .select()
          .single();

        if (error) throw error;

        // Insert attribute values
        if (Object.keys(selectedAttributeValues).length > 0) {
          const attributeValueInserts = [];
          for (const [attributeId, values] of Object.entries(selectedAttributeValues)) {
            for (const attrVal of values) {
              // Only insert non-excluded values
              if (!attrVal.excluded) {
                attributeValueInserts.push({
                  product_id: newProduct.id,
                  attribute_id: attributeId,
                  attribute_value: attrVal.value,
                  price_modifier: attrVal.price_modifier || 0,
                });
              }
            }
          }
          if (attributeValueInserts.length > 0) {
            await supabase.from('product_attribute_values').insert(attributeValueInserts);
          }
        }

        toast.success('Product created successfully');
      }

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Product deleted successfully');
      loadData();
    } catch (error: any) {
      toast.error('Failed to delete product');
    }
  };

  const handleBulkActivate = async (activate: boolean) => {
    if (selectedProducts.size === 0) return;
    
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: activate })
        .in('id', Array.from(selectedProducts));

      if (error) throw error;

      setProducts(products.map(p => 
        selectedProducts.has(p.id) ? { ...p, is_active: activate } : p
      ));
      setSelectedProducts(new Set());
      toast.success(`${selectedProducts.size} product(s) ${activate ? 'activated' : 'deactivated'}`);
    } catch (error: any) {
      toast.error('Failed to update products');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedProducts.size} product(s)?`)) return;

    try {
      const productsToDelete = products.filter(p => selectedProducts.has(p.id));
      
      for (const product of productsToDelete) {
        if (product.image_url) {
          const urlParts = product.image_url.split('/');
          const fileName = urlParts.slice(-3).join('/');
          await supabase.storage.from('store-assets').remove([fileName]);
        }
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', Array.from(selectedProducts));

      if (error) throw error;

      setProducts(products.filter(p => !selectedProducts.has(p.id)));
      setSelectedProducts(new Set());
      toast.success(`${productsToDelete.length} product(s) deleted`);
    } catch (error: any) {
      toast.error('Failed to delete products');
    }
  };

  const toggleSelectAll = (filteredProducts: Product[]) => {
    const allSelected = filteredProducts.every(p => selectedProducts.has(p.id));
    if (allSelected) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const toggleSelectProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const openEditDialog = async (product: Product) => {
    setEditingProduct(product);
    setImagePreview(product.image_url);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      product_type: product.product_type,
      stock_quantity: product.stock_quantity.toString(),
      category_id: product.category_id || '',
      is_active: product.is_active,
      requires_full_payment: (product as any).requires_full_payment || false,
      allows_cod: (product as any).allows_cod || false,
      minimum_payment_percentage: ((product as any).minimum_payment_percentage || 0).toString(),
      landing_page_url: (product as any).landing_page_url || '',
      shipping_inside_dhaka: (product as any).shipping_inside_dhaka?.toString() || '',
      shipping_outside_dhaka: (product as any).shipping_outside_dhaka?.toString() || '',
      return_charge: (product as any).return_charge?.toString() || '',
    });

    // Load product attribute values
    const { data: attrValues } = await supabase
      .from('product_attribute_values')
      .select('*')
      .eq('product_id', product.id);

    if (attrValues) {
      const grouped: Record<string, {value: string, price_modifier: number, excluded?: boolean}[]> = {};
      
      // Get attribute IDs that have values for this product
      const productAttrIds = [...new Set(attrValues.map(av => av.attribute_id))];
      
      // For each attribute that has values, include ALL possible values from the attribute definition
      productAttrIds.forEach((attrId: string) => {
        const attr = attributes.find(a => a.id === attrId);
        if (attr) {
          grouped[attrId] = attr.values.map((v: string) => {
            const existingValue = attrValues.find(av => 
              av.attribute_id === attrId && av.attribute_value === v
            );
            return {
              value: v,
              price_modifier: existingValue ? (existingValue.price_modifier || 0) : 0,
              excluded: !existingValue // Mark as excluded if not in database
            };
          });
        }
      });
      
      setSelectedAttributeValues(grouped);
    }

    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setImagePreview(null);
    setSelectedAttributeValues({});
    setFormData({
      name: '',
      description: '',
      price: '',
      product_type: 'physical',
      stock_quantity: '0',
      category_id: '',
      is_active: true,
      requires_full_payment: false,
      allows_cod: false,
      minimum_payment_percentage: '0',
      landing_page_url: '',
      shipping_inside_dhaka: '',
      shipping_outside_dhaka: '',
      return_charge: '',
    });
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
        <CardHeader>
          <CardTitle>No Store Found</CardTitle>
          <CardDescription>Please create a store in the Store Settings tab first</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Products</h3>
          <p className="text-sm text-muted-foreground">Manage your store products</p>
        </div>
        <div className="flex gap-2">
          <BulkProductImport 
            storeId={storeId} 
            categories={categories}
            onImportComplete={loadData}
          />
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
              <DialogDescription>Fill in the product details</DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Product Details</TabsTrigger>
                <TabsTrigger value="images" disabled={!editingProduct}>Image Gallery</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Image Upload */}
                  <div className="space-y-2">
                    <Label>Primary Product Image</Label>
                    <div className="space-y-3">
                      {imagePreview && (
                        <div className="relative w-full aspect-square max-w-xs rounded-lg overflow-hidden border">
                          <img src={imagePreview} alt="Product preview" className="w-full h-full object-cover" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={handleRemoveImage}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                      <div>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploading}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {uploading ? 'Uploading...' : 'Recommended: Square image, at least 500x500px'}
                        </p>
                      </div>
                    </div>
                  </div>

              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Quantity *</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Product Type *</Label>
                  <Select
                    value={formData.product_type}
                    onValueChange={(value: any) => setFormData({ ...formData, product_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="physical">Physical</SelectItem>
                      <SelectItem value="digital">Digital</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category_id || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Category</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">Make product visible to customers</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              {/* Payment Options */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-semibold">Payment Options</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Full Payment</Label>
                    <p className="text-xs text-muted-foreground">Customer must pay full amount upfront</p>
                  </div>
                  <Switch
                    checked={formData.requires_full_payment}
                    onCheckedChange={(checked) => {
                      setFormData({ 
                        ...formData, 
                        requires_full_payment: checked,
                        minimum_payment_percentage: checked ? '100' : formData.minimum_payment_percentage
                      });
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Cash on Delivery (COD)</Label>
                    <p className="text-xs text-muted-foreground">Customer can pay when receiving the product</p>
                  </div>
                  <Switch
                    checked={formData.allows_cod}
                    onCheckedChange={(checked) => setFormData({ ...formData, allows_cod: checked })}
                  />
                </div>

                {!formData.requires_full_payment && (
                  <div className="space-y-2">
                    <Label htmlFor="min-payment">Minimum Payment Percentage</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="min-payment"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.minimum_payment_percentage}
                        onChange={(e) => setFormData({ ...formData, minimum_payment_percentage: e.target.value })}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Minimum: ${((parseFloat(formData.price) || 0) * (parseInt(formData.minimum_payment_percentage) || 0) / 100).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="landing_page_url">Product Landing Page URL (Optional)</Label>
                <Input
                  id="landing_page_url"
                  type="url"
                  placeholder="https://example.com/product-page"
                  value={formData.landing_page_url}
                  onChange={(e) => setFormData({ ...formData, landing_page_url: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Add a custom landing page URL for this product
                </p>
              </div>

              {/* Shipping Settings */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-semibold">Bangladesh Shipping (Optional)</h4>
                <p className="text-sm text-muted-foreground">
                  Leave empty to use store default charges, which can be updated from store shipping settings.
                </p>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shipping_inside_dhaka">Inside Dhaka (৳)</Label>
                    <Input
                      id="shipping_inside_dhaka"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={`Uses default: ৳${defaultShipping.inside}`}
                      value={(formData as any).shipping_inside_dhaka || ''}
                      onChange={(e) => setFormData({ ...formData, shipping_inside_dhaka: e.target.value } as any)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shipping_outside_dhaka">Outside Dhaka (৳)</Label>
                    <Input
                      id="shipping_outside_dhaka"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={`Uses default: ৳${defaultShipping.outside}`}
                      value={(formData as any).shipping_outside_dhaka || ''}
                      onChange={(e) => setFormData({ ...formData, shipping_outside_dhaka: e.target.value } as any)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="return_charge">Return Charge (৳)</Label>
                    <Input
                      id="return_charge"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={`Uses default: ৳${defaultShipping.return}`}
                      value={(formData as any).return_charge || ''}
                      onChange={(e) => setFormData({ ...formData, return_charge: e.target.value } as any)}
                    />
                  </div>
                </div>
              </div>

              {/* Attributes Section */}
              {attributes.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-semibold">Product Attributes</h4>
                  <p className="text-sm text-muted-foreground">
                    Select attribute values and set price variations
                  </p>
                  
                  {attributes.map((attribute) => {
                    const isSelected = selectedAttributeValues[attribute.id];
                    const defaultPrices = attribute.value_prices || {};
                    
                    return (
                      <div key={attribute.id} className="space-y-3 p-4 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={!!isSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                // Initialize with default values and prices from attribute
                                setSelectedAttributeValues({
                                  ...selectedAttributeValues,
                                  [attribute.id]: attribute.values.map(v => ({
                                    value: v,
                                    price_modifier: defaultPrices[v] || 0
                                  }))
                                });
                              } else {
                                const { [attribute.id]: removed, ...rest } = selectedAttributeValues;
                                setSelectedAttributeValues(rest);
                              }
                            }}
                          />
                          <Label className="font-medium cursor-pointer">{attribute.name}</Label>
                          {attribute.multi_select && (
                            <Badge variant="outline" className="text-xs">Multi-select</Badge>
                          )}
                        </div>

                        {isSelected && (
                          <div className="space-y-2 pl-6">
                            <Label className="text-sm text-muted-foreground">Price Variations & Availability</Label>
                            <div className="border rounded-md divide-y">
                              {selectedAttributeValues[attribute.id].map((attrVal, idx) => (
                                <div key={attrVal.value} className="flex items-center gap-3 p-3">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      checked={!attrVal.excluded}
                                      onCheckedChange={(checked) => {
                                        const newValues = [...selectedAttributeValues[attribute.id]];
                                        newValues[idx].excluded = !checked;
                                        setSelectedAttributeValues({
                                          ...selectedAttributeValues,
                                          [attribute.id]: newValues
                                        });
                                      }}
                                    />
                                    <span className={`flex-1 font-medium ${attrVal.excluded ? 'text-muted-foreground line-through' : ''}`}>
                                      {attrVal.value}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Select
                                      disabled={attrVal.excluded}
                                      value={attrVal.price_modifier >= 0 ? 'increment' : 'decrement'}
                                      onValueChange={(type) => {
                                        const newValues = [...selectedAttributeValues[attribute.id]];
                                        const currentAbs = Math.abs(newValues[idx].price_modifier);
                                        newValues[idx].price_modifier = type === 'increment' ? currentAbs : -currentAbs;
                                        setSelectedAttributeValues({
                                          ...selectedAttributeValues,
                                          [attribute.id]: newValues
                                        });
                                      }}
                                    >
                                      <SelectTrigger className="w-32">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="increment">Increment (+)</SelectItem>
                                        <SelectItem value="decrement">Decrement (-)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      disabled={attrVal.excluded}
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={Math.abs(attrVal.price_modifier)}
                                      onChange={(e) => {
                                        const value = parseFloat(e.target.value) || 0;
                                        const newValues = [...selectedAttributeValues[attribute.id]];
                                        newValues[idx].price_modifier = attrVal.price_modifier >= 0 ? value : -value;
                                        setSelectedAttributeValues({
                                          ...selectedAttributeValues,
                                          [attribute.id]: newValues
                                        });
                                      }}
                                      className="w-28"
                                      placeholder="0.00"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Uncheck variants to exclude them from this product
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingProduct ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="images">
            <ProductImageGallery
              productId={editingProduct?.id || null}
              attributes={attributes}
              onImagesChange={() => {
                // Reload product data if needed
                loadData();
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {selectedProducts.size > 0 && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  {selectedProducts.size} product(s) selected
                </span>
                <div className="flex gap-2 ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkActivate(true)}
                  >
                    Activate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkActivate(false)}
                  >
                    Deactivate
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
            
            <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="digital">Digital</SelectItem>
                <SelectItem value="physical">Physical</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>
        </CardContent>
      </Card>

      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PackagePlus className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No products yet. Add your first product!</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={(() => {
                      const filteredProducts = products.filter((product) => {
                        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.description?.toLowerCase().includes(searchTerm.toLowerCase());
                        const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'active' && product.is_active) ||
                          (statusFilter === 'inactive' && !product.is_active);
                        const matchesCategory = categoryFilter === 'all' || product.category_id === categoryFilter;
                        const matchesType = productTypeFilter === 'all' || product.product_type === productTypeFilter;
                        
                        return matchesSearch && matchesStatus && matchesCategory && matchesType;
                      });
                      return filteredProducts.length > 0 && filteredProducts.every(p => selectedProducts.has(p.id));
                    })()}
                    onCheckedChange={() => {
                      const filteredProducts = products.filter((product) => {
                        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.description?.toLowerCase().includes(searchTerm.toLowerCase());
                        const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'active' && product.is_active) ||
                          (statusFilter === 'inactive' && !product.is_active);
                        const matchesCategory = categoryFilter === 'all' || product.category_id === categoryFilter;
                        const matchesType = productTypeFilter === 'all' || product.product_type === productTypeFilter;
                        
                        return matchesSearch && matchesStatus && matchesCategory && matchesType;
                      });
                      toggleSelectAll(filteredProducts);
                    }}
                  />
                </TableHead>
                <TableHead className="w-20">Image</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const filteredProducts = products.filter((product) => {
                  const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    product.description?.toLowerCase().includes(searchTerm.toLowerCase());
                  const matchesStatus = statusFilter === 'all' || 
                    (statusFilter === 'active' && product.is_active) ||
                    (statusFilter === 'inactive' && !product.is_active);
                  const matchesCategory = categoryFilter === 'all' || product.category_id === categoryFilter;
                  const matchesType = productTypeFilter === 'all' || product.product_type === productTypeFilter;
                  
                  return matchesSearch && matchesStatus && matchesCategory && matchesType;
                });

                const totalPages = Math.ceil(filteredProducts.length / pageSize);
                const startIndex = (currentPage - 1) * pageSize;
                const endIndex = startIndex + pageSize;
                const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

                return paginatedProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedProducts.has(product.id)}
                      onCheckedChange={() => toggleSelectProduct(product.id)}
                    />
                  </TableCell>
                  <TableCell>
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                        <PackagePlus className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{product.name}</span>
                      <span className="text-sm text-muted-foreground line-clamp-1">
                        {product.description || 'No description'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.is_active ? 'default' : 'secondary'}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.product_type}</Badge>
                  </TableCell>
                  <TableCell>
                    {product.categories && (
                      <Badge variant="outline">{product.categories.name}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${product.price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {product.stock_quantity}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(product)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ));
              })()}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select value={pageSize.toString()} onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-6">
              <span className="text-sm text-muted-foreground">
                {(() => {
                  const filteredProducts = products.filter((product) => {
                    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      product.description?.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesStatus = statusFilter === 'all' || 
                      (statusFilter === 'active' && product.is_active) ||
                      (statusFilter === 'inactive' && !product.is_active);
                    const matchesCategory = categoryFilter === 'all' || product.category_id === categoryFilter;
                    const matchesType = productTypeFilter === 'all' || product.product_type === productTypeFilter;
                    
                    return matchesSearch && matchesStatus && matchesCategory && matchesType;
                  });
                  const startIndex = (currentPage - 1) * pageSize + 1;
                  const endIndex = Math.min(currentPage * pageSize, filteredProducts.length);
                  return `${startIndex}-${endIndex} of ${filteredProducts.length}`;
                })()}
              </span>
              
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <span className="sr-only">First page</span>
                  ⟪
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <span className="sr-only">Previous page</span>
                  ‹
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={(() => {
                    const filteredProducts = products.filter((product) => {
                      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        product.description?.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesStatus = statusFilter === 'all' || 
                        (statusFilter === 'active' && product.is_active) ||
                        (statusFilter === 'inactive' && !product.is_active);
                      const matchesCategory = categoryFilter === 'all' || product.category_id === categoryFilter;
                      const matchesType = productTypeFilter === 'all' || product.product_type === productTypeFilter;
                      
                      return matchesSearch && matchesStatus && matchesCategory && matchesType;
                    });
                    const totalPages = Math.ceil(filteredProducts.length / pageSize);
                    return currentPage >= totalPages;
                  })()}
                >
                  <span className="sr-only">Next page</span>
                  ›
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const filteredProducts = products.filter((product) => {
                      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        product.description?.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesStatus = statusFilter === 'all' || 
                        (statusFilter === 'active' && product.is_active) ||
                        (statusFilter === 'inactive' && !product.is_active);
                      const matchesCategory = categoryFilter === 'all' || product.category_id === categoryFilter;
                      const matchesType = productTypeFilter === 'all' || product.product_type === productTypeFilter;
                      
                      return matchesSearch && matchesStatus && matchesCategory && matchesType;
                    });
                    const totalPages = Math.ceil(filteredProducts.length / pageSize);
                    setCurrentPage(totalPages);
                  }}
                  disabled={(() => {
                    const filteredProducts = products.filter((product) => {
                      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        product.description?.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesStatus = statusFilter === 'all' || 
                        (statusFilter === 'active' && product.is_active) ||
                        (statusFilter === 'inactive' && !product.is_active);
                      const matchesCategory = categoryFilter === 'all' || product.category_id === categoryFilter;
                      const matchesType = productTypeFilter === 'all' || product.product_type === productTypeFilter;
                      
                      return matchesSearch && matchesStatus && matchesCategory && matchesType;
                    });
                    const totalPages = Math.ceil(filteredProducts.length / pageSize);
                    return currentPage >= totalPages;
                  })()}
                >
                  <span className="sr-only">Last page</span>
                  ⟫
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
