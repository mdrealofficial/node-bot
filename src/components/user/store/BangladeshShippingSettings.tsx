import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';

interface BangladeshShippingSettingsProps {
  storeId: string;
  currentSettings: {
    shipping_area_mode: string;
    default_shipping_inside_dhaka: number;
    default_shipping_outside_dhaka: number;
    default_return_charge: number;
    shipping_calculation_method: string;
    enable_sub_area_selection?: boolean;
    address_request_instruction?: string;
    address_request_button_text?: string;
    address_confirmation_message?: string;
  };
  onUpdate: () => void;
}

export function BangladeshShippingSettings({
  storeId,
  currentSettings,
  onUpdate
}: BangladeshShippingSettingsProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    shipping_area_mode: currentSettings.shipping_area_mode || 'both',
    default_shipping_inside_dhaka: currentSettings.default_shipping_inside_dhaka?.toString() || '60',
    default_shipping_outside_dhaka: currentSettings.default_shipping_outside_dhaka?.toString() || '120',
    default_return_charge: currentSettings.default_return_charge?.toString() || '50',
    shipping_calculation_method: currentSettings.shipping_calculation_method || 'flat_rate',
    enable_sub_area_selection: currentSettings.enable_sub_area_selection !== false,
    address_request_instruction: currentSettings.address_request_instruction || 'Please enter your delivery address to complete your order.',
    address_request_button_text: currentSettings.address_request_button_text || 'Enter Shipping Address',
    address_confirmation_message: currentSettings.address_confirmation_message || 'Your delivery address has been saved!\n\n{address}\n\nThank you! Your seller will process your order soon.',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { error } = await supabase
        .from('stores')
        .update({
          shipping_area_mode: formData.shipping_area_mode,
          default_shipping_inside_dhaka: parseFloat(formData.default_shipping_inside_dhaka),
          default_shipping_outside_dhaka: parseFloat(formData.default_shipping_outside_dhaka),
          default_return_charge: parseFloat(formData.default_return_charge),
          shipping_calculation_method: formData.shipping_calculation_method,
          enable_sub_area_selection: formData.enable_sub_area_selection,
          address_request_instruction: formData.address_request_instruction,
          address_request_button_text: formData.address_request_button_text,
          address_confirmation_message: formData.address_confirmation_message,
        })
        .eq('id', storeId);

      if (error) throw error;

      toast.success('Shipping settings updated successfully');
      onUpdate();
    } catch (error: any) {
      toast.error('Failed to update shipping settings');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Bangladesh Shipping Configuration</CardTitle>
            <CardDescription>Configure shipping areas and default charges</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selling Area Selection */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Selling Areas</Label>
          <p className="text-sm text-muted-foreground">Where do you deliver your products?</p>
          <RadioGroup
            value={formData.shipping_area_mode}
            onValueChange={(value) => setFormData({ ...formData, shipping_area_mode: value })}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3 p-4 border-2 rounded-xl hover:bg-accent/50 transition-colors cursor-pointer">
              <RadioGroupItem value="inside_dhaka" id="inside_dhaka" />
              <Label htmlFor="inside_dhaka" className="flex-1 cursor-pointer font-medium">
                Inside Dhaka Only
                <span className="block text-sm text-muted-foreground font-normal">
                  Deliver only within Dhaka city
                </span>
              </Label>
            </div>
            
            <div className="flex items-center space-x-3 p-4 border-2 rounded-xl hover:bg-accent/50 transition-colors cursor-pointer">
              <RadioGroupItem value="outside_dhaka" id="outside_dhaka" />
              <Label htmlFor="outside_dhaka" className="flex-1 cursor-pointer font-medium">
                Outside Dhaka Only
                <span className="block text-sm text-muted-foreground font-normal">
                  Deliver only outside Dhaka city
                </span>
              </Label>
            </div>
            
            <div className="flex items-center space-x-3 p-4 border-2 rounded-xl hover:bg-accent/50 transition-colors cursor-pointer">
              <RadioGroupItem value="both" id="both" />
              <Label htmlFor="both" className="flex-1 cursor-pointer font-medium">
                Both (Inside & Outside Dhaka)
                <span className="block text-sm text-muted-foreground font-normal">
                  Deliver everywhere in Bangladesh
                </span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Default Shipping Charges */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-semibold">Default Shipping Charges</Label>
            <p className="text-sm text-muted-foreground mt-1">
              These will be used if product-specific charges are not set
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {(formData.shipping_area_mode === 'inside_dhaka' || formData.shipping_area_mode === 'both') && (
              <div className="space-y-2">
                <Label htmlFor="inside_dhaka_charge" className="flex items-center gap-2">
                  Inside Dhaka Charge
                  <span className="text-xs text-muted-foreground">(৳ BDT)</span>
                </Label>
                <Input
                  id="inside_dhaka_charge"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.default_shipping_inside_dhaka}
                  onChange={(e) => setFormData({ ...formData, default_shipping_inside_dhaka: e.target.value })}
                  placeholder="60"
                  className="text-lg font-semibold"
                />
              </div>
            )}

            {(formData.shipping_area_mode === 'outside_dhaka' || formData.shipping_area_mode === 'both') && (
              <div className="space-y-2">
                <Label htmlFor="outside_dhaka_charge" className="flex items-center gap-2">
                  Outside Dhaka Charge
                  <span className="text-xs text-muted-foreground">(৳ BDT)</span>
                </Label>
                <Input
                  id="outside_dhaka_charge"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.default_shipping_outside_dhaka}
                  onChange={(e) => setFormData({ ...formData, default_shipping_outside_dhaka: e.target.value })}
                  placeholder="120"
                  className="text-lg font-semibold"
                />
              </div>
            )}
          </div>
        </div>

        {/* Return Charge */}
        <div className="space-y-2">
          <Label htmlFor="return_charge" className="flex items-center gap-2">
            Default Return Charge
            <span className="text-xs text-muted-foreground">(৳ BDT)</span>
          </Label>
          <p className="text-sm text-muted-foreground">
            Charge for returns or exchanges
          </p>
          <Input
            id="return_charge"
            type="number"
            min="0"
            step="0.01"
            value={formData.default_return_charge}
            onChange={(e) => setFormData({ ...formData, default_return_charge: e.target.value })}
            placeholder="50"
            className="max-w-xs text-lg font-semibold"
          />
        </div>

        {/* Sub-Area Selection Toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label className="text-base font-semibold">Enable Sub-Area Selection</Label>
              <p className="text-sm text-muted-foreground">
                Allow customers to select specific sub-areas within Dhaka (e.g., Sector 1, Road 5)
              </p>
            </div>
            <Switch
              checked={formData.enable_sub_area_selection}
              onCheckedChange={(checked) => setFormData({ ...formData, enable_sub_area_selection: checked })}
            />
          </div>
        </div>

        {/* Shipping Calculation Method */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Shipping Calculation Method</Label>
          <p className="text-sm text-muted-foreground">How should shipping charges be calculated for multiple items?</p>
          <RadioGroup
            value={formData.shipping_calculation_method}
            onValueChange={(value) => setFormData({ ...formData, shipping_calculation_method: value })}
          >
            <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="flat_rate" id="flat_rate" />
              <div className="flex-1">
                <Label htmlFor="flat_rate" className="font-semibold cursor-pointer">
                  Flat Rate (Recommended)
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Single shipping charge regardless of items/quantity. Uses highest product shipping charge.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="per_product" id="per_product" />
              <div className="flex-1">
                <Label htmlFor="per_product" className="font-semibold cursor-pointer">
                  Per Unique Product
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Charge shipping for each different product. Multiple quantities of same item = 1x charge.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="per_item" id="per_item" />
              <div className="flex-1">
                <Label htmlFor="per_item" className="font-semibold cursor-pointer">
                  Per Item Quantity
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Charge shipping for every item in cart. 3x same product = 3x shipping charge.
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Live Chat Address Request Configuration */}
        <div className="space-y-4 pt-4 border-t">
          <div>
            <Label className="text-base font-semibold">Live Chat Address Request</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Configure the messages when requesting and confirming delivery address in Live Chat
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address_instruction">Request Instruction Text</Label>
            <p className="text-xs text-muted-foreground">
              Message shown to customer when requesting their delivery address
            </p>
            <Textarea
              id="address_instruction"
              value={formData.address_request_instruction}
              onChange={(e) => setFormData({ ...formData, address_request_instruction: e.target.value })}
              placeholder="Please enter your delivery address to complete your order."
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="button_text">Button Text</Label>
            <p className="text-xs text-muted-foreground">
              Text displayed on the address entry button
            </p>
            <Input
              id="button_text"
              value={formData.address_request_button_text}
              onChange={(e) => setFormData({ ...formData, address_request_button_text: e.target.value })}
              placeholder="Enter Shipping Address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmation_message">Confirmation Message</Label>
            <p className="text-xs text-muted-foreground">
              Message sent to customer after they submit their address. Use variables: {'{customer_name}'}, {'{phone}'}, {'{address}'}
            </p>
            <Textarea
              id="confirmation_message"
              value={formData.address_confirmation_message}
              onChange={(e) => setFormData({ ...formData, address_confirmation_message: e.target.value })}
              placeholder="Your delivery address has been saved!&#10;&#10;{address}&#10;&#10;Thank you! Your seller will process your order soon."
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} size="lg" className="w-full md:w-auto">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Shipping Settings'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
