import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Map, ExternalLink } from 'lucide-react';

export function MapSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_config')
        .select('google_maps_api_key')
        .single();

      if (error) throw error;

      if (data) {
        setGoogleMapsApiKey(data.google_maps_api_key || '');
      }
    } catch (error) {
      console.error('Error loading map settings:', error);
      toast.error('Failed to load map settings');
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
          google_maps_api_key: googleMapsApiKey || null,
        })
        .eq('id', (await supabase.from('admin_config').select('id').single()).data?.id);

      if (error) throw error;

      toast.success('Map settings saved successfully');
    } catch (error) {
      console.error('Error saving map settings:', error);
      toast.error('Failed to save map settings');
    } finally {
      setSaving(false);
    }
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
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Google Maps Configuration
          </CardTitle>
          <CardDescription>
            Configure Google Maps API key for delivery area selection in store settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted p-4">
            <h4 className="font-medium mb-2">How to get your Google Maps API Key:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console</a></li>
              <li>Create a new project or select an existing one</li>
              <li>Enable the following APIs:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>Maps JavaScript API</li>
                  <li>Geocoding API</li>
                  <li>Places API</li>
                </ul>
              </li>
              <li>Go to "Credentials" and create an API key</li>
              <li>Restrict the API key (recommended):
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>Application restrictions: HTTP referrers</li>
                  <li>Add your domain(s)</li>
                  <li>API restrictions: Select the enabled APIs above</li>
                </ul>
              </li>
              <li>Copy the API key and paste it below</li>
            </ol>
            <a 
              href="https://developers.google.com/maps/documentation/javascript/get-api-key" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-3"
            >
              View detailed documentation <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="space-y-2">
            <Label htmlFor="googleMapsApiKey">
              Google Maps API Key <span className="text-destructive">*</span>
            </Label>
            <Input
              id="googleMapsApiKey"
              type="password"
              placeholder="AIzaSyD..."
              value={googleMapsApiKey}
              onChange={(e) => setGoogleMapsApiKey(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              This API key will be used by stores to enable delivery area map selection
            </p>
          </div>

          <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 p-4">
            <p className="text-sm text-amber-900 dark:text-amber-200 font-medium mb-1">
              ⚠️ Security Notice
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Always restrict your API key to prevent unauthorized usage. Add your domain to the HTTP referrers list and enable only the required APIs.
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={!googleMapsApiKey || saving}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Map Settings'
            )}
          </Button>
        </CardContent>
      </Card>

      {googleMapsApiKey && (
        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
            <CardDescription>
              How the Google Maps API key is used in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <p>Stores can set up delivery zones using an interactive map</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <p>Customers' locations are verified against delivery zones</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <p>Real-time distance calculations for delivery area validation</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}