import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Search, X, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';

interface AttributeValue {
  value: string;
  price_modifier: number;
}

interface Attribute {
  id: string;
  store_id: string;
  name: string;
  values: string[];
  value_prices?: Record<string, number>; // Maps value to price modifier
  multi_select: boolean;
  optional: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AttributeFormData {
  name: string;
  values: AttributeValue[];
  multi_select: boolean;
  optional: boolean;
  is_active: boolean;
}

export function ProductAttributes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [valueInput, setValueInput] = useState('');
  const [priceModifierInput, setPriceModifierInput] = useState('0');

  const [formData, setFormData] = useState<AttributeFormData>({
    name: '',
    values: [],
    multi_select: false,
    optional: false,
    is_active: true,
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

  // Fetch attributes
  const { data: attributes = [], isLoading } = useQuery({
    queryKey: ['product-attributes', store?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_attributes')
        .select('*')
        .eq('store_id', store?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as Attribute[];
    },
    enabled: !!store?.id,
  });

  const createAttribute = useMutation({
    mutationFn: async (attributeData: any) => {
      // Convert AttributeValue[] to separate arrays for values and price modifiers
      const values = attributeData.values.map((v: AttributeValue) => v.value);
      const value_prices = attributeData.values.reduce((acc: Record<string, number>, v: AttributeValue) => {
        if (v.price_modifier !== 0) {
          acc[v.value] = v.price_modifier;
        }
        return acc;
      }, {});

      const { data, error } = await supabase
        .from('product_attributes')
        .insert([{ 
          ...attributeData, 
          values,
          value_prices: Object.keys(value_prices).length > 0 ? value_prices : null,
          store_id: store?.id 
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-attributes'] });
      toast.success('Attribute created successfully');
      resetForm();
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create attribute');
    },
  });

  const updateAttribute = useMutation({
    mutationFn: async ({ id, ...attributeData }: any) => {
      // Convert AttributeValue[] to separate arrays for values and price modifiers
      const values = attributeData.values.map((v: AttributeValue) => v.value);
      const value_prices = attributeData.values.reduce((acc: Record<string, number>, v: AttributeValue) => {
        if (v.price_modifier !== 0) {
          acc[v.value] = v.price_modifier;
        }
        return acc;
      }, {});

      const { data, error } = await supabase
        .from('product_attributes')
        .update({
          ...attributeData,
          values,
          value_prices: Object.keys(value_prices).length > 0 ? value_prices : null,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-attributes'] });
      toast.success('Attribute updated successfully');
      resetForm();
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update attribute');
    },
  });

  const deleteAttribute = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_attributes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-attributes'] });
      toast.success('Attribute deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete attribute');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      values: [],
      multi_select: false,
      optional: false,
      is_active: true,
    });
    setValueInput('');
    setPriceModifierInput('0');
    setEditingAttribute(null);
  };

  const handleAdd = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleEdit = (attribute: Attribute) => {
    setEditingAttribute(attribute);
    // Convert from database format to form format
    const values: AttributeValue[] = (attribute.values || []).map(v => ({
      value: v,
      price_modifier: attribute.value_prices?.[v] || 0
    }));
    
    setFormData({
      name: attribute.name,
      values,
      multi_select: attribute.multi_select,
      optional: attribute.optional,
      is_active: attribute.is_active,
    });
    setIsOpen(true);
  };

  const handleAddValue = () => {
    if (!valueInput.trim()) return;
    
    const priceModifier = parseFloat(priceModifierInput) || 0;
    const newValueEntries: AttributeValue[] = valueInput
      .split(',')
      .map(v => v.trim())
      .filter(v => v)
      .map(v => ({ value: v, price_modifier: priceModifier }));
    
    // Check for duplicates
    const existingValues = formData.values.map(v => v.value);
    const uniqueNewValues = newValueEntries.filter(nv => !existingValues.includes(nv.value));
    
    setFormData({ ...formData, values: [...formData.values, ...uniqueNewValues] });
    setValueInput('');
    setPriceModifierInput('0');
  };

  const handleRemoveValue = (valueToRemove: string) => {
    setFormData({
      ...formData,
      values: formData.values.filter(v => v.value !== valueToRemove),
    });
  };

  const handleUpdateValuePrice = (value: string, newPrice: string) => {
    const price = parseFloat(newPrice) || 0;
    setFormData({
      ...formData,
      values: formData.values.map(v => 
        v.value === value ? { ...v, price_modifier: price } : v
      ),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter an attribute name');
      return;
    }

    if (formData.values.length === 0) {
      toast.error('Please add at least one value');
      return;
    }

    const attributeData = {
      name: formData.name.trim(),
      values: formData.values, // Now includes price modifiers
      multi_select: formData.multi_select,
      optional: formData.optional,
      is_active: formData.is_active,
    };

    if (editingAttribute) {
      updateAttribute.mutate({ id: editingAttribute.id, ...attributeData });
    } else {
      createAttribute.mutate(attributeData);
    }
  };

  const filteredAttributes = attributes.filter(attr =>
    attr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (attr.values || []).some(v => v.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Attributes</h2>
          <p className="text-muted-foreground">
            Create reusable attributes like size, color, or version for your products
          </p>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingAttribute ? 'Edit Attribute' : 'Add Attribute'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Attribute name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Size, Color, Version"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="values">Attribute values *</Label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    id="values"
                    value={valueInput}
                    onChange={(e) => setValueInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddValue();
                      }
                    }}
                    placeholder="e.g., Small, Medium, Large (comma separated)"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={priceModifierInput}
                    onChange={(e) => setPriceModifierInput(e.target.value)}
                    placeholder="Price"
                    className="w-28"
                  />
                  <Button type="button" onClick={handleAddValue} variant="secondary">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter value name(s) and optional price modifier (e.g., +$5 for large size)
                </p>
                {formData.values.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Added Values</Label>
                    <div className="border rounded-lg divide-y">
                      {formData.values.map((attrValue) => (
                        <div key={attrValue.value} className="flex items-center gap-2 p-3 hover:bg-muted/50">
                          <span className="flex-1 font-medium">{attrValue.value}</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={attrValue.price_modifier}
                            onChange={(e) => handleUpdateValuePrice(attrValue.value, e.target.value)}
                            className="w-28"
                            placeholder="$0.00"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveValue(attrValue.value)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="multi-select" className="cursor-pointer">Multi-select</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Allow customers to select multiple values</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Switch
                  id="multi-select"
                  checked={formData.multi_select}
                  onCheckedChange={(checked) => setFormData({ ...formData, multi_select: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="optional" className="cursor-pointer">Optional</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Make this attribute optional for products</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Switch
                  id="optional"
                  checked={formData.optional}
                  onCheckedChange={(checked) => setFormData({ ...formData, optional: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="active" className="cursor-pointer">Active</Label>
                <Switch
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button type="submit" disabled={createAttribute.isPending || updateAttribute.isPending}>
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Attribute</TableHead>
                <TableHead>Values</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead className="text-right">Updated at</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading attributes...
                  </TableCell>
                </TableRow>
              ) : filteredAttributes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No attributes found' : 'No attributes yet. Create your first attribute!'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAttributes.map((attribute, index) => (
                  <TableRow key={attribute.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">{attribute.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {attribute.values.map((value) => {
                          const priceModifier = attribute.value_prices?.[value] || 0;
                          return (
                            <Badge key={value} variant="outline" className="gap-1">
                              {value}
                              {priceModifier !== 0 && (
                                <span className="text-xs font-semibold text-primary">
                                  {priceModifier > 0 ? '+' : ''}${priceModifier.toFixed(2)}
                                </span>
                              )}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={attribute.is_active ? 'default' : 'secondary'}>
                        {attribute.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(attribute)}
                        >
                          <Edit2 className="h-4 w-4 text-warning" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAttribute.mutate(attribute.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {format(new Date(attribute.updated_at), 'do MMM yy HH:mm')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
