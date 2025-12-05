import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BangladeshAddressForm } from './BangladeshAddressForm';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  onSuccess: () => void;
}

export function AddCustomerDialog({ open, onOpenChange, storeId, onSuccess }: AddCustomerDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    deliveryLocation: '',
    cityCorporation: '',
    area: '',
    subArea: '',
    district: '',
    upazila: '',
    streetAddress: '',
    tags: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.full_name.trim()) {
      toast.error('Please enter customer name');
      return;
    }

    if (!formData.phone.trim()) {
      toast.error('Please enter phone number');
      return;
    }

    // Phone validation (Bangladesh format)
    const phoneRegex = /^(\+?880|0)?1[3-9]\d{8}$/;
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      toast.error('Please enter a valid Bangladesh phone number');
      return;
    }

    setSaving(true);
    try {
      // Check for duplicate phone number in this store
      const { data: existingCustomer } = await supabase
        .from('store_customers')
        .select('id')
        .eq('store_id', storeId)
        .eq('phone', formData.phone)
        .maybeSingle();

      if (existingCustomer) {
        toast.error('A customer with this phone number already exists');
        setSaving(false);
        return;
      }

      // Insert new customer
      const { error } = await supabase.from('store_customers').insert([{
        store_id: storeId,
        full_name: formData.full_name,
        phone: formData.phone,
        email: formData.email || null,
        delivery_location: formData.deliveryLocation || null,
        city_corporation: formData.cityCorporation || null,
        area: formData.area || null,
        sub_area: formData.subArea || null,
        district: formData.district || null,
        upazila: formData.upazila || null,
        street_address: formData.streetAddress || null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        notes: formData.notes || null,
      }]);

      if (error) throw error;

      toast.success('Customer added successfully');
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        full_name: '',
        phone: '',
        email: '',
        deliveryLocation: '',
        cityCorporation: '',
        area: '',
        subArea: '',
        district: '',
        upazila: '',
        streetAddress: '',
        tags: '',
        notes: '',
      });
    } catch (error: any) {
      console.error('Error adding customer:', error);
      toast.error('Failed to add customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Customer
          </DialogTitle>
          <DialogDescription>
            Manually add a customer to your database
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">Basic Information</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name <span className="text-destructive">*</span></Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter customer name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number <span className="text-destructive">*</span></Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="01XXXXXXXXX"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="customer@example.com"
              />
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">Delivery Address</h3>
            <BangladeshAddressForm
              value={{
                delivery_location: formData.deliveryLocation as any,
                city_corporation: formData.cityCorporation,
                area: formData.area,
                sub_area: formData.subArea,
                district: formData.district,
                upazila: formData.upazila,
                street_address: formData.streetAddress,
              }}
              onChange={(value) => setFormData({ ...formData, 
                deliveryLocation: value.delivery_location,
                cityCorporation: value.city_corporation,
                area: value.area,
                subArea: value.sub_area,
                district: value.district,
                upazila: value.upazila,
                streetAddress: value.street_address,
              })}
            />
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">Additional Information</h3>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="VIP, Regular, Wholesale"
              />
              <p className="text-xs text-muted-foreground">Separate tags with commas for better organization</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Internal Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes about this customer..."
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Customer
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}