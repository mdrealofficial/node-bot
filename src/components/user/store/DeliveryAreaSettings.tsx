import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, MapPin } from 'lucide-react';
import { GoogleMap, Circle, Polygon, Marker, useLoadScript } from '@react-google-maps/api';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { X } from 'lucide-react';

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia', 'Austria', 'Bangladesh', 'Belgium', 
  'Brazil', 'Canada', 'China', 'Denmark', 'Egypt', 'France', 'Germany', 'India', 'Indonesia', 
  'Iran', 'Iraq', 'Italy', 'Japan', 'Mexico', 'Netherlands', 'Nigeria', 'Pakistan', 'Philippines', 
  'Poland', 'Russia', 'Saudi Arabia', 'South Africa', 'South Korea', 'Spain', 'Sweden', 'Switzerland',
  'Thailand', 'Turkey', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Vietnam'
];

interface DeliverySettings {
  delivery_area_type: 'none' | 'country' | 'map';
  delivery_countries: string[];
  delivery_zone_coordinates: { lat: number; lng: number } | null;
  delivery_zone_radius: number;
  delivery_zone_method: 'radius' | 'manual';
  delivery_zone_polygon: { lat: number; lng: number }[] | null;
  require_location: boolean;
}

export function DeliveryAreaSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [settings, setSettings] = useState<DeliverySettings>({
    delivery_area_type: 'none',
    delivery_countries: [],
    delivery_zone_coordinates: null,
    delivery_zone_radius: 5,
    delivery_zone_method: 'radius',
    delivery_zone_polygon: null,
    require_location: false
  });
  const [mapCenter, setMapCenter] = useState({ lat: 23.8103, lng: 90.4125 });
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: apiKey || '',
  });

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Load Google Maps API key from admin config
      const { data: adminConfig } = await supabase
        .from('admin_config')
        .select('google_maps_api_key')
        .single();
      
      if (adminConfig?.google_maps_api_key) {
        setApiKey(adminConfig.google_maps_api_key);
      }

      // Load store settings
      const { data: store } = await supabase
        .from('stores')
        .select('delivery_area_type, delivery_countries, delivery_zone_coordinates, delivery_zone_radius, delivery_zone_method, delivery_zone_polygon, require_location')
        .eq('user_id', user?.id)
        .single();

      if (store) {
        setSettings({
          delivery_area_type: (store.delivery_area_type as 'none' | 'country' | 'map') || 'none',
          delivery_countries: store.delivery_countries || [],
          delivery_zone_coordinates: store.delivery_zone_coordinates as any,
          delivery_zone_radius: store.delivery_zone_radius || 5,
          delivery_zone_method: (store.delivery_zone_method as 'radius' | 'manual') || 'radius',
          delivery_zone_polygon: store.delivery_zone_polygon as any,
          require_location: store.require_location || false
        });
        setSelectedCountries(store.delivery_countries || []);
        
        if (store.delivery_zone_coordinates) {
          setMapCenter(store.delivery_zone_coordinates as any);
        }
      }
    } catch (error: any) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const updateData = {
        delivery_area_type: settings.delivery_area_type,
        delivery_countries: settings.delivery_area_type === 'country' ? selectedCountries : [],
        delivery_zone_coordinates: settings.delivery_area_type === 'map' ? settings.delivery_zone_coordinates : null,
        delivery_zone_radius: settings.delivery_area_type === 'map' && settings.delivery_zone_method === 'radius' ? settings.delivery_zone_radius : null,
        delivery_zone_method: settings.delivery_area_type === 'map' ? settings.delivery_zone_method : null,
        delivery_zone_polygon: settings.delivery_area_type === 'map' && settings.delivery_zone_method === 'manual' ? settings.delivery_zone_polygon : null,
        require_location: settings.delivery_area_type === 'map'
      };

      const { error } = await supabase
        .from('stores')
        .update(updateData)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('Delivery area settings saved');
    } catch (error: any) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newCenter = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      };
      setMapCenter(newCenter);
      setSettings(prev => ({ ...prev, delivery_zone_coordinates: newCenter }));
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Delivery Area Setup</h3>
        
        <div className="space-y-4">
          <div>
            <Label>Delivery Area Type</Label>
            <Select
              value={settings.delivery_area_type}
              onValueChange={(value: 'none' | 'country' | 'map') => setSettings(prev => ({ ...prev, delivery_area_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Restrictions</SelectItem>
                <SelectItem value="country">By Country</SelectItem>
                <SelectItem value="map">By Map Zone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {settings.delivery_area_type === 'country' && (
            <div>
              <Label>Select Countries</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 max-h-64 overflow-y-auto border rounded-md p-3">
                {COUNTRIES.map(country => (
                  <label key={country} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedCountries.includes(country)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCountries(prev => [...prev, country]);
                        } else {
                          setSelectedCountries(prev => prev.filter(c => c !== country));
                        }
                      }}
                      className="rounded"
                    />
                    {country}
                  </label>
                ))}
              </div>
            </div>
          )}

          {settings.delivery_area_type === 'map' && (
            <div className="space-y-4">
              {!apiKey && (
                <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    Google Maps API key not configured. Please ask your administrator to add it in admin settings.
                  </p>
                </div>
              )}

              {apiKey && isLoaded && (
                <>
                  <div>
                    <Label>Zone Selection Method</Label>
                    <RadioGroup
                      value={settings.delivery_zone_method}
                      onValueChange={(value: 'radius' | 'manual') => 
                        setSettings(prev => ({ 
                          ...prev, 
                          delivery_zone_method: value,
                          delivery_zone_polygon: value === 'radius' ? null : prev.delivery_zone_polygon
                        }))
                      }
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="radius" id="radius" />
                        <Label htmlFor="radius" className="font-normal cursor-pointer">Radius (Circle)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="manual" id="manual" />
                        <Label htmlFor="manual" className="font-normal cursor-pointer">Manual Area (Polygon)</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {settings.delivery_zone_method === 'radius' && (
                    <div>
                      <Label>Delivery Radius (km)</Label>
                      <Input
                        type="number"
                        value={settings.delivery_zone_radius}
                        onChange={(e) => setSettings(prev => ({ ...prev, delivery_zone_radius: parseFloat(e.target.value) }))}
                        min="0.5"
                        step="0.5"
                      />
                    </div>
                  )}

                  <div>
                    <Label>
                      {settings.delivery_zone_method === 'radius' 
                        ? 'Click on map to set delivery center' 
                        : 'Click on map to add points to delivery area'}
                    </Label>
                    {settings.delivery_zone_method === 'manual' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Click on the map to add points. Drag points to move them. Click the X button on a marker to delete it.
                      </p>
                    )}
                    <div className="mt-2 rounded-md overflow-hidden border">
                      <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '400px' }}
                        center={mapCenter}
                        zoom={12}
                        onClick={(e) => {
                          if (e.latLng) {
                            if (settings.delivery_zone_method === 'radius') {
                              handleMapClick(e);
                            } else {
                              const newPoint = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                              setSettings(prev => ({
                                ...prev,
                                delivery_zone_polygon: [...(prev.delivery_zone_polygon || []), newPoint]
                              }));
                            }
                          }
                        }}
                      >
                        {settings.delivery_zone_method === 'radius' && settings.delivery_zone_coordinates && (
                          <Circle
                            center={settings.delivery_zone_coordinates}
                            radius={settings.delivery_zone_radius * 1000}
                            options={{
                              fillColor: 'hsl(var(--primary))',
                              fillOpacity: 0.2,
                              strokeColor: 'hsl(var(--primary))',
                              strokeOpacity: 0.8,
                              strokeWeight: 2,
                            }}
                          />
                        )}
                        {settings.delivery_zone_method === 'manual' && settings.delivery_zone_polygon && settings.delivery_zone_polygon.length > 0 && (
                          <>
                            <Polygon
                              paths={settings.delivery_zone_polygon}
                              options={{
                                fillColor: 'hsl(var(--primary))',
                                fillOpacity: 0.2,
                                strokeColor: 'hsl(var(--primary))',
                                strokeOpacity: 0.8,
                                strokeWeight: 2,
                              }}
                            />
                            {settings.delivery_zone_polygon.map((point, index) => (
                              <Marker
                                key={index}
                                position={point}
                                draggable={true}
                                onDragEnd={(e) => {
                                  if (e.latLng) {
                                    const newPolygon = [...settings.delivery_zone_polygon!];
                                    newPolygon[index] = {
                                      lat: e.latLng.lat(),
                                      lng: e.latLng.lng()
                                    };
                                    setSettings(prev => ({
                                      ...prev,
                                      delivery_zone_polygon: newPolygon
                                    }));
                                  }
                                }}
                                label={{
                                  text: `${index + 1}`,
                                  color: 'white',
                                  fontSize: '12px',
                                  fontWeight: 'bold'
                                }}
                                icon={{
                                  path: google.maps.SymbolPath.CIRCLE,
                                  scale: 10,
                                  fillColor: '#4F46E5',
                                  fillOpacity: 1,
                                  strokeColor: 'white',
                                  strokeWeight: 2,
                                }}
                              />
                            ))}
                          </>
                        )}
                      </GoogleMap>
                    </div>
                  </div>

                  {settings.delivery_zone_method === 'radius' && settings.delivery_zone_coordinates && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>
                        Center: {settings.delivery_zone_coordinates.lat.toFixed(4)}, {settings.delivery_zone_coordinates.lng.toFixed(4)}
                      </span>
                    </div>
                  )}

                  {settings.delivery_zone_method === 'manual' && settings.delivery_zone_polygon && settings.delivery_zone_polygon.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Polygon Points ({settings.delivery_zone_polygon.length})
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSettings(prev => ({ ...prev, delivery_zone_polygon: null }))}
                        >
                          Clear All
                        </Button>
                      </div>
                      <div className="max-h-48 overflow-y-auto border rounded-md">
                        <div className="divide-y">
                          {settings.delivery_zone_polygon.map((point, index) => (
                            <div key={index} className="flex items-center justify-between p-3 hover:bg-muted/50">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                  {index + 1}
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newPolygon = settings.delivery_zone_polygon!.filter((_, i) => i !== index);
                                  setSettings(prev => ({
                                    ...prev,
                                    delivery_zone_polygon: newPolygon.length > 0 ? newPolygon : null
                                  }));
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </Card>
    </div>
  );
}