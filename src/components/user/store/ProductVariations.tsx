import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

interface Variation {
  id: string;
  product_id: string;
  name: string;
  price_modifier: number;
  sku: string | null;
  stock_quantity: number | null;
}

interface VariationFormData {
  name: string;
  price_modifier: string;
  sku: string;
  stock_quantity: string;
}

export function ProductVariations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingVariation, setEditingVariation] = useState<Variation | null>(null);

  const [formData, setFormData] = useState<VariationFormData>({
    name: '',
    price_modifier: '0',
    sku: '',
    stock_quantity: '',
  });

  // Fetch store
  const { data: store } = useQuery({
    queryKey: ['user-store', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch products
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products', store?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, image_url')
        .eq('store_id', store?.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!store?.id,
  });

  // Fetch variations
  const { data: variations = [], isLoading: loadingVariations } = useQuery({
    queryKey: ['product-variations', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      
      const productIds = products.map(p => p.id);
      if (productIds.length === 0) return [];

      const { data, error } = await supabase
        .from('product_variations')
        .select('*')
        .in('product_id', productIds)
        .order('name');

      if (error) throw error;
      return data as Variation[];
    },
    enabled: !!store?.id && products.length > 0,
  });

  const createVariation = useMutation({
    mutationFn: async (variationData: any) => {
      const { data, error } = await supabase
        .from('product_variations')
        .insert([variationData])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variations'] });
      toast.success('Variation created successfully');
      resetForm();
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create variation');
    },
  });

  const updateVariation = useMutation({
    mutationFn: async ({ id, ...variationData }: any) => {
      const { data, error } = await supabase
        .from('product_variations')
        .update(variationData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variations'] });
      toast.success('Variation updated successfully');
      resetForm();
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update variation');
    },
  });

  const deleteVariation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_variations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variations'] });
      toast.success('Variation deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete variation');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      price_modifier: '0',
      sku: '',
      stock_quantity: '',
    });
    setEditingVariation(null);
    setSelectedProduct(null);
  };

  const handleAdd = (product: Product) => {
    setSelectedProduct(product);
    setEditingVariation(null);
    resetForm();
    setIsOpen(true);
  };

  const handleEdit = (variation: Variation, product: Product) => {
    setSelectedProduct(product);
    setEditingVariation(variation);
    setFormData({
      name: variation.name,
      price_modifier: variation.price_modifier.toString(),
      sku: variation.sku || '',
      stock_quantity: variation.stock_quantity?.toString() || '',
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }

    const variationData = {
      product_id: selectedProduct.id,
      name: formData.name,
      price_modifier: parseFloat(formData.price_modifier),
      sku: formData.sku || null,
      stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : null,
    };

    if (editingVariation) {
      updateVariation.mutate({ id: editingVariation.id, ...variationData });
    } else {
      createVariation.mutate(variationData);
    }
  };

  const getProductVariations = (productId: string) => {
    return variations.filter(v => v.product_id === productId);
  };

  const calculateFinalPrice = (basePrice: number | null | undefined, modifier: number | null | undefined) => {
    const base = basePrice || 0;
    const mod = modifier || 0;
    return base + mod;
  };

  if (loadingProducts) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading products...
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
          <p className="text-muted-foreground mb-4">
            Create products first before adding variations
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Product Variations</h2>
        <p className="text-muted-foreground">
          Add size, color, or other variations for your products with price adjustments
        </p>
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVariation ? 'Edit Variation' : 'Add Variation'}
              {selectedProduct && (
                <span className="block text-sm font-normal text-muted-foreground mt-1">
                  for {selectedProduct.name}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Variation Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Large, Red, XL"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_modifier">
                Price Adjustment ($) *
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  Use + for increase, - for decrease
                </span>
              </Label>
              <Input
                id="price_modifier"
                type="number"
                step="0.01"
                value={formData.price_modifier}
                onChange={(e) => setFormData({ ...formData, price_modifier: e.target.value })}
                placeholder="0.00"
                required
              />
              {selectedProduct && (
                <p className="text-sm text-muted-foreground">
                  Base price: ${selectedProduct.price.toFixed(2)} → 
                  Final price: ${calculateFinalPrice(selectedProduct.price, parseFloat(formData.price_modifier) || 0).toFixed(2)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU (optional)</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g., PROD-001-LRG"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Stock Quantity (optional)</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                placeholder="Leave empty for unlimited"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createVariation.isPending || updateVariation.isPending}>
                {editingVariation ? 'Update' : 'Create'} Variation
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Accordion type="multiple" className="space-y-4">
        {products.map((product) => {
          const productVariations = getProductVariations(product.id);
          return (
            <AccordionItem key={product.id} value={product.id} className="border rounded-lg">
              <Card>
                <AccordionTrigger className="hover:no-underline px-6">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-4">
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div className="text-left">
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Base price: ${product.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {productVariations.length} variation{productVariations.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-4">
                    <div className="flex justify-end mb-4">
                      <Button size="sm" onClick={() => handleAdd(product)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Variation
                      </Button>
                    </div>

                    {productVariations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No variations yet. Add your first variation for this product.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {productVariations.map((variation) => {
                          const priceModifier = variation.price_modifier ?? 0;
                          const finalPrice = calculateFinalPrice(product.price, priceModifier);
                          const priceChange = priceModifier >= 0 ? '+' : '';
                          
                          return (
                            <Card key={variation.id}>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                      <h4 className="font-semibold">{variation.name}</h4>
                                      <Badge variant={priceModifier >= 0 ? 'default' : 'secondary'}>
                                        {priceChange}${priceModifier.toFixed(2)}
                                      </Badge>
                                    </div>
                                    <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">Final Price:</span>
                                        <p className="font-semibold">${finalPrice.toFixed(2)}</p>
                                      </div>
                                      {variation.sku && (
                                        <div>
                                          <span className="text-muted-foreground">SKU:</span>
                                          <p className="font-mono text-xs">{variation.sku}</p>
                                        </div>
                                      )}
                                      {variation.stock_quantity !== null && (
                                        <div>
                                          <span className="text-muted-foreground">Stock:</span>
                                          <p>{variation.stock_quantity} units</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEdit(variation, product)}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteVariation.mutate(variation.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
