import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, Copy } from "lucide-react";

export default function WAHASettings() {
  const [wahaUrl, setWahaUrl] = useState("");
  const [wahaApiKey, setWahaApiKey] = useState("");
  const [wahaWebhookSecret, setWahaWebhookSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');

  useEffect(() => {
    fetchWAHAConfig();
  }, []);

  const fetchWAHAConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_config')
        .select('waha_url, waha_api_key, waha_webhook_secret')
        .single();

      if (error) throw error;
      if (data) {
        setWahaUrl(data.waha_url || "");
        setWahaApiKey(data.waha_api_key || "");
        setWahaWebhookSecret(data.waha_webhook_secret || "");
        
        // Test connection if config exists
        if (data.waha_url && data.waha_api_key) {
          testConnection(data.waha_url, data.waha_api_key, false);
        }
      }
    } catch (error: any) {
      console.error('Error fetching WAHA config:', error);
      toast.error('Failed to load WAHA configuration');
    }
  };

  const testConnection = async (url?: string, apiKey?: string, showToast = true) => {
    const testUrl = url || wahaUrl;
    const testApiKey = apiKey || wahaApiKey;

    if (!testUrl || !testApiKey) {
      if (showToast) toast.error('Please enter WAHA URL and API Key');
      return;
    }

    setTesting(true);
    try {
      const response = await fetch(`${testUrl}/api/sessions`, {
        headers: {
          'X-Api-Key': testApiKey,
        },
      });

      if (response.ok) {
        setConnectionStatus('connected');
        if (showToast) toast.success('WAHA connection successful!');
      } else {
        setConnectionStatus('disconnected');
        if (showToast) toast.error('WAHA connection failed. Check URL and API Key.');
      }
    } catch (error) {
      setConnectionStatus('disconnected');
      if (showToast) toast.error('Could not reach WAHA server');
    } finally {
      setTesting(false);
    }
  };

  const saveConfig = async () => {
    if (!wahaUrl || !wahaApiKey) {
      toast.error('WAHA URL and API Key are required');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('admin_config')
        .update({
          waha_url: wahaUrl,
          waha_api_key: wahaApiKey,
          waha_webhook_secret: wahaWebhookSecret || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', (await supabase.from('admin_config').select('id').single()).data?.id);

      if (error) throw error;

      toast.success('WAHA configuration saved successfully');
      // Test connection after save
      await testConnection();
    } catch (error: any) {
      console.error('Error saving WAHA config:', error);
      toast.error('Failed to save WAHA configuration');
    } finally {
      setLoading(false);
    }
  };

  const webhookUrl = `${window.location.origin}/api/whatsapp-waha-webhook`;

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>WAHA Configuration</CardTitle>
          <CardDescription>
            Configure your centralized WAHA (WhatsApp HTTP API) server for all users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="waha-url">WAHA Server URL</Label>
            <Input
              id="waha-url"
              placeholder="https://waha.yourserver.com"
              value={wahaUrl}
              onChange={(e) => setWahaUrl(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              The URL of your WAHA server deployment
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="waha-api-key">WAHA API Key</Label>
            <Input
              id="waha-api-key"
              type="password"
              placeholder="Your WAHA API Key"
              value={wahaApiKey}
              onChange={(e) => setWahaApiKey(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              API key for authenticating with your WAHA server
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="waha-webhook-secret">Webhook Secret (Optional)</Label>
            <Input
              id="waha-webhook-secret"
              type="password"
              placeholder="Optional webhook verification secret"
              value={wahaWebhookSecret}
              onChange={(e) => setWahaWebhookSecret(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Optional secret for verifying webhook requests from WAHA
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={saveConfig} disabled={loading || testing}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => testConnection()} 
              disabled={testing || loading}
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
          </div>

          {connectionStatus !== 'unknown' && (
            <div className={`flex items-center gap-2 p-3 rounded-md ${
              connectionStatus === 'connected' 
                ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400' 
                : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
            }`}>
              {connectionStatus === 'connected' ? (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">WAHA server is connected and responding</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">Cannot connect to WAHA server</span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook Configuration</CardTitle>
          <CardDescription>
            Configure this webhook URL in your WAHA server settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Add this URL to your WAHA server's webhook configuration to receive WhatsApp messages
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
