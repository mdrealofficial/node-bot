import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { DHAKA_AREAS } from '@/lib/bangladeshAddressData';

interface Filters {
  delivery_location?: string;
  areas?: string[];
  min_orders?: number;
  max_orders?: number;
  min_spent?: number;
  max_spent?: number;
  date_from?: string;
  date_to?: string;
  tags?: string[];
}

interface CustomerFiltersProps {
  storeId: string;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export function CustomerFilters({ storeId, filters, onFiltersChange }: CustomerFiltersProps) {
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    loadAvailableTags();
  }, [storeId]);

  const loadAvailableTags = async () => {
    try {
      const { data, error } = await supabase
        .from('store_customers')
        .select('tags')
        .eq('store_id', storeId)
        .not('tags', 'is', null);

      if (error) throw error;

      const tags = new Set<string>();
      data?.forEach(customer => {
        customer.tags?.forEach(tag => tags.add(tag));
      });

      setAvailableTags(Array.from(tags).sort());
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const updateFilter = (key: keyof Filters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const allDhakaAreas = [...DHAKA_AREAS.dhaka_north, ...DHAKA_AREAS.dhaka_south];

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h4 className="font-medium">📍 Filter Recipients</h4>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Select
            value={filters.delivery_location || 'all'}
            onValueChange={(value) => updateFilter('delivery_location', value === 'all' ? undefined : value)}
          >
            <SelectTrigger id="location">
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              <SelectItem value="inside_dhaka">Inside Dhaka</SelectItem>
              <SelectItem value="outside_dhaka">Outside Dhaka</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Specific Area (Optional)</Label>
          <Select
            value={filters.areas?.[0] || 'all'}
            onValueChange={(value) => updateFilter('areas', value === 'all' ? undefined : [value])}
            disabled={filters.delivery_location !== 'inside_dhaka'}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Areas</SelectItem>
              {allDhakaAreas.map(area => (
                <SelectItem key={area} value={area}>{area}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <Label>🛒 Purchase History</Label>
        <div className="grid grid-cols-4 gap-2">
          <div className="space-y-1">
            <Label htmlFor="min-orders" className="text-xs">Min Orders</Label>
            <Input
              id="min-orders"
              type="number"
              placeholder="0"
              value={filters.min_orders || ''}
              onChange={(e) => updateFilter('min_orders', e.target.value ? parseInt(e.target.value) : undefined)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="max-orders" className="text-xs">Max Orders</Label>
            <Input
              id="max-orders"
              type="number"
              placeholder="Any"
              value={filters.max_orders || ''}
              onChange={(e) => updateFilter('max_orders', e.target.value ? parseInt(e.target.value) : undefined)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="min-spent" className="text-xs">Min Spent (৳)</Label>
            <Input
              id="min-spent"
              type="number"
              placeholder="0"
              value={filters.min_spent || ''}
              onChange={(e) => updateFilter('min_spent', e.target.value ? parseFloat(e.target.value) : undefined)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="max-spent" className="text-xs">Max Spent (৳)</Label>
            <Input
              id="max-spent"
              type="number"
              placeholder="Any"
              value={filters.max_spent || ''}
              onChange={(e) => updateFilter('max_spent', e.target.value ? parseFloat(e.target.value) : undefined)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Label>📅 Order Date Range</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="date-from" className="text-xs">From</Label>
            <Input
              id="date-from"
              type="date"
              value={filters.date_from || ''}
              onChange={(e) => updateFilter('date_from', e.target.value || undefined)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="date-to" className="text-xs">To</Label>
            <Input
              id="date-to"
              type="date"
              value={filters.date_to || ''}
              onChange={(e) => updateFilter('date_to', e.target.value || undefined)}
            />
          </div>
        </div>
      </div>

      {availableTags.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="tags">🏷️ Tags</Label>
          <Select
            value={filters.tags?.[0] || 'all'}
            onValueChange={(value) => updateFilter('tags', value === 'all' ? undefined : [value])}
          >
            <SelectTrigger id="tags">
              <SelectValue placeholder="Select tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {availableTags.map(tag => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}