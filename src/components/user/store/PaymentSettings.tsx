import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

interface Store {
  id: string;
  bkash_sandbox_mode: boolean;
  bkash_app_key: string | null;
  bkash_app_secret: string | null;
  bkash_app_username: string | null;
  bkash_app_password: string | null;
}

export function PaymentSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [store, setStore] = useState<Store | null>(null);

  const [formData, setFormData] = useState({
    bkash_sandbox_mode: false,
    bkash_app_key: '',
    bkash_app_secret: '',
    bkash_app_username: '',
    bkash_app_password: '',
  });

  useEffect(() => {
    loadStore();
  }, [user]);

  const loadStore = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, bkash_sandbox_mode, bkash_app_key, bkash_app_secret, bkash_app_username, bkash_app_password')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStore(data);
        setFormData({
          bkash_sandbox_mode: data.bkash_sandbox_mode || false,
          bkash_app_key: data.bkash_app_key || '',
          bkash_app_secret: data.bkash_app_secret || '',
          bkash_app_username: data.bkash_app_username || '',
          bkash_app_password: data.bkash_app_password || '',
        });
      }
    } catch (error: any) {
      toast.error('Failed to load payment settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!store) {
      toast.error('Please create a store first in Store Settings');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('stores')
        .update({
          bkash_sandbox_mode: formData.bkash_sandbox_mode,
          bkash_app_key: formData.bkash_app_key || null,
          bkash_app_secret: formData.bkash_app_secret || null,
          bkash_app_username: formData.bkash_app_username || null,
          bkash_app_password: formData.bkash_app_password || null,
        })
        .eq('id', store.id);

      if (error) throw error;
      
      toast.success('Payment settings saved successfully');
      loadStore();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save payment settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!store) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Integration</CardTitle>
          <CardDescription>Configure payment gateway for your store</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Please create a store first in Store Settings before configuring payment integration.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Integration</CardTitle>
        <CardDescription>Configure bKash payment gateway for your store</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* bKash Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b">
              <div>
                <h3 className="text-lg font-semibold">bKash Payment Gateway</h3>
                <p className="text-sm text-muted-foreground">
                  Configure your bKash merchant account credentials
                </p>
              </div>
            </div>

            {/* Sandbox Mode */}
            <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="bkash_sandbox_mode" className="text-base cursor-pointer">
                  bKash Sandbox Mode
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable sandbox mode for testing. Disable for production transactions.
                </p>
              </div>
              <Switch
                id="bkash_sandbox_mode"
                checked={formData.bkash_sandbox_mode}
                onCheckedChange={(checked) => setFormData({ ...formData, bkash_sandbox_mode: checked })}
              />
            </div>

            {/* App Key */}
            <div className="space-y-2">
              <Label htmlFor="bkash_app_key">bKash App Key</Label>
              <Input
                id="bkash_app_key"
                type="text"
                value={formData.bkash_app_key}
                onChange={(e) => setFormData({ ...formData, bkash_app_key: e.target.value })}
                placeholder="Enter your bKash app key"
              />
            </div>

            {/* App Secret */}
            <div className="space-y-2">
              <Label htmlFor="bkash_app_secret">bKash App Secret</Label>
              <Input
                id="bkash_app_secret"
                type="password"
                value={formData.bkash_app_secret}
                onChange={(e) => setFormData({ ...formData, bkash_app_secret: e.target.value })}
                placeholder="Enter your bKash app secret"
              />
            </div>

            {/* App Username */}
            <div className="space-y-2">
              <Label htmlFor="bkash_app_username">bKash App Username</Label>
              <Input
                id="bkash_app_username"
                type="text"
                value={formData.bkash_app_username}
                onChange={(e) => setFormData({ ...formData, bkash_app_username: e.target.value })}
                placeholder="Enter your bKash app username"
              />
            </div>

            {/* App Password */}
            <div className="space-y-2">
              <Label htmlFor="bkash_app_password">bKash App Password</Label>
              <Input
                id="bkash_app_password"
                type="password"
                value={formData.bkash_app_password}
                onChange={(e) => setFormData({ ...formData, bkash_app_password: e.target.value })}
                placeholder="Enter your bKash app password"
              />
            </div>

            <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">How to get bKash credentials:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Visit the bKash Merchant Portal</li>
                <li>Navigate to Settings → API Credentials</li>
                <li>Generate or copy your App Key, Secret, Username, and Password</li>
                <li>Enable sandbox mode for testing before going live</li>
              </ol>
            </div>
          </div>

          {/* Submit Button */}
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Payment Settings
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
