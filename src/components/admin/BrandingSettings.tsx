import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ImageUpload } from '@/components/user/ImageUpload';
import { Loader2, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
  { value: 'BDT', label: 'BDT (৳)', symbol: '৳' },
  { value: 'INR', label: 'INR (₹)', symbol: '₹' },
  { value: 'PKR', label: 'PKR (₨)', symbol: '₨' },
  { value: 'AUD', label: 'AUD ($)', symbol: 'A$' },
  { value: 'CAD', label: 'CAD ($)', symbol: 'C$' },
  { value: 'SGD', label: 'SGD ($)', symbol: 'S$' },
  { value: 'MYR', label: 'MYR (RM)', symbol: 'RM' },
];

export function BrandingSettings() {
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appName, setAppName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  
  useEffect(() => {
    loadBrandingSettings();
  }, []);
  
  const loadBrandingSettings = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('admin_config').select('logo_url, favicon_url, app_name, default_currency').single();
      if (error) throw error;
      if (data) {
        setAppName(data.app_name || 'FB SmartReply');
        setLogoUrl(data.logo_url || '');
        setFaviconUrl(data.favicon_url || '');
        setDefaultCurrency(data.default_currency || 'USD');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load branding settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async () => {
    setSaving(true);
    try {
      const {
        error
      } = await supabase.from('admin_config').update({
        app_name: appName || 'FB SmartReply',
        logo_url: logoUrl || null,
        favicon_url: faviconUrl || null,
        default_currency: defaultCurrency,
        updated_at: new Date().toISOString()
      }).eq('id', (await supabase.from('admin_config').select('id').single()).data?.id);
      if (error) throw error;

      // Update favicon dynamically across the entire site
      if (faviconUrl) {
        // Remove all existing favicon links
        const existingLinks = document.querySelectorAll("link[rel*='icon']");
        existingLinks.forEach(link => link.remove());

        // Create new favicon link
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = faviconUrl;
        document.head.appendChild(link);

        // Force browser to reload favicon by adding timestamp
        link.href = faviconUrl + '?t=' + new Date().getTime();
      }

      // Update document title with app name
      document.title = appName || 'FB SmartReply';
      toast({
        title: "Success",
        description: "Branding settings saved successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save branding settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="space-y-6">
      <Card>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="appName">Application Name</Label>
              <p className="text-sm text-muted-foreground mb-2">
                This name will be used in email templates, SMS templates, and throughout the application
              </p>
              <Input id="appName" value={appName} onChange={e => setAppName(e.target.value)} placeholder="Enter application name" />
            </div>

            <div>
              <Label htmlFor="logo">Application Logo</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Upload or provide URL for the main application logo
              </p>
              <ImageUpload value={logoUrl} onChange={setLogoUrl} label="" placeholder="Enter logo URL or upload an image" />
            </div>

            <div>
              <Label htmlFor="favicon">Favicon</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Upload or provide URL for the favicon (recommended: 32x32 or 64x64 pixels)
              </p>
              <ImageUpload value={faviconUrl} onChange={setFaviconUrl} label="" placeholder="Enter favicon URL or upload an image" />
            </div>

            <div>
              <Label htmlFor="currency">Default Currency</Label>
              <p className="text-sm text-muted-foreground mb-2">
                This currency will be used across the entire admin panel for pricing and payments
              </p>
              <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </> : <>
                <Save className="mr-2 h-4 w-4" />
                Save Branding Settings
              </>}
          </Button>
        </CardContent>
      </Card>
    </div>;
}