import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, DollarSign, Copy, Wallet } from 'lucide-react';

export function PaymentSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [piprapayConfig, setPiprapayConfig] = useState({
    api_key: '',
    base_url: '',
  });
  const [bkashConfig, setBkashConfig] = useState({
    app_key: '',
    app_secret: '',
    username: '',
    password: '',
    sandbox_mode: true
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error} = await supabase
        .from('admin_config')
        .select('piprapay_base_url, piprapay_api_key, bkash_app_key, bkash_app_secret, bkash_app_username, bkash_app_password, bkash_sandbox_mode, google_maps_api_key, default_currency')
        .single();

      if (error) throw error;

      if (data) {
        setPiprapayConfig({
          base_url: data.piprapay_base_url || '',
          api_key: data.piprapay_api_key || ''
        });
        setBkashConfig({
          app_key: data.bkash_app_key || '',
          app_secret: data.bkash_app_secret || '',
          username: data.bkash_app_username || '',
          password: data.bkash_app_password || '',
          sandbox_mode: data.bkash_sandbox_mode ?? true
        });
        setGoogleMapsApiKey(data.google_maps_api_key || '');
        setDefaultCurrency(data.default_currency || 'USD');
      }
    } catch (error) {
      console.error('Error loading payment settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('admin_config')
        .update({
          piprapay_base_url: piprapayConfig.base_url || null,
          piprapay_api_key: piprapayConfig.api_key || null,
          bkash_app_key: bkashConfig.app_key || null,
          bkash_app_secret: bkashConfig.app_secret || null,
          bkash_app_username: bkashConfig.username || null,
          bkash_app_password: bkashConfig.password || null,
          bkash_sandbox_mode: bkashConfig.sandbox_mode,
          google_maps_api_key: googleMapsApiKey || null,
          default_currency: defaultCurrency,
        })
        .eq('id', (await supabase.from('admin_config').select('id').single()).data?.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Payment settings saved successfully',
      });
    } catch (error) {
      console.error('Error saving payment settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save payment settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Webhook URL copied to clipboard',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Currency Settings</CardTitle>
          <CardDescription>
            Set the default currency for subscription pricing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultCurrency">Default Currency</Label>
            <select
              id="defaultCurrency"
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="USD">USD ($) - US Dollar</option>
              <option value="EUR">EUR (€) - Euro</option>
              <option value="GBP">GBP (£) - British Pound</option>
              <option value="BDT">BDT (৳) - Bangladeshi Taka</option>
              <option value="INR">INR (₹) - Indian Rupee</option>
              <option value="PKR">PKR (₨) - Pakistani Rupee</option>
              <option value="AUD">AUD ($) - Australian Dollar</option>
              <option value="CAD">CAD ($) - Canadian Dollar</option>
              <option value="SGD">SGD ($) - Singapore Dollar</option>
              <option value="MYR">MYR (RM) - Malaysian Ringgit</option>
            </select>
            <p className="text-sm text-muted-foreground">
              This currency will be displayed for all subscription plans
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Currency Settings'
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Piprapay Configuration
          </CardTitle>
          <CardDescription>
            Configure your Piprapay self-hosted payment gateway
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="piprapayBaseUrl">
              Base URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="piprapayBaseUrl"
              type="url"
              placeholder="https://pay.smecube.com/api"
              value={piprapayConfig.base_url}
              onChange={(e) => setPiprapayConfig({ ...piprapayConfig, base_url: e.target.value })}
            />
            <p className="text-sm text-muted-foreground">
              Your Piprapay API base URL (e.g., https://pay.smecube.com/api)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="piprapayApiKey">
              API Key <span className="text-destructive">*</span>
            </Label>
            <Input
              id="piprapayApiKey"
              type="password"
              placeholder="Enter your Piprapay API key"
              value={piprapayConfig.api_key}
              onChange={(e) => setPiprapayConfig({ ...piprapayConfig, api_key: e.target.value })}
            />
            <p className="text-sm text-muted-foreground">
              Your Piprapay API key from dashboard → Developer → API Keys
            </p>
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <Label>Webhook URL</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/piprapay-webhook`}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/piprapay-webhook`)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure this URL in your Piprapay dashboard to receive payment notifications
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Piprapay Settings'
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-[#E2136E]" />
            bKash Configuration
          </CardTitle>
          <CardDescription>
            Configure bKash payment gateway for subscription payments. Required for users to pay via bKash.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-4">
            <p className="text-sm text-amber-900 dark:text-amber-200 font-medium mb-2">
              ⚠️ Required for Subscription Payments
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Users won't be able to select bKash as a payment option until these credentials are configured.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bkashAppKey">App Key <span className="text-destructive">*</span></Label>
            <Input
              id="bkashAppKey"
              type="text"
              placeholder="Enter bKash App Key"
              value={bkashConfig.app_key}
              onChange={(e) => setBkashConfig({ ...bkashConfig, app_key: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bkashAppSecret">App Secret <span className="text-destructive">*</span></Label>
            <Input
              id="bkashAppSecret"
              type="password"
              placeholder="Enter bKash App Secret"
              value={bkashConfig.app_secret}
              onChange={(e) => setBkashConfig({ ...bkashConfig, app_secret: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bkashUsername">Username <span className="text-destructive">*</span></Label>
            <Input
              id="bkashUsername"
              type="text"
              placeholder="Enter bKash Username"
              value={bkashConfig.username}
              onChange={(e) => setBkashConfig({ ...bkashConfig, username: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bkashPassword">Password <span className="text-destructive">*</span></Label>
            <Input
              id="bkashPassword"
              type="password"
              placeholder="Enter bKash Password"
              value={bkashConfig.password}
              onChange={(e) => setBkashConfig({ ...bkashConfig, password: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="bkashSandbox"
              checked={bkashConfig.sandbox_mode}
              onChange={(e) => setBkashConfig({ ...bkashConfig, sandbox_mode: e.target.checked })}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="bkashSandbox" className="cursor-pointer">
              Sandbox Mode (for testing)
            </Label>
          </div>

          <div className="rounded-lg bg-muted p-4 text-sm">
            <p className="font-medium mb-2">📝 How to get bKash credentials:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Visit <a href="https://developer.bka.sh" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">bKash Developer Portal</a></li>
              <li>Login or create a merchant account</li>
              <li>Go to API Management → Tokenized Checkout</li>
              <li>Copy your App Key, App Secret, Username, and Password</li>
              <li>For testing, use sandbox credentials and enable Sandbox Mode</li>
              <li>For production, use live credentials and disable Sandbox Mode</li>
            </ol>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save bKash Settings'
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google Maps API Configuration</CardTitle>
          <CardDescription>
            Used for delivery area selection in store settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="googleMapsApiKey">Google Maps API Key</Label>
            <Input
              id="googleMapsApiKey"
              type="password"
              placeholder="Enter Google Maps API key"
              value={googleMapsApiKey}
              onChange={(e) => setGoogleMapsApiKey(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Get your API key from Google Cloud Console with Maps JavaScript API enabled
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
