import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Copy, ExternalLink, CheckCircle2, AlertCircle, Wand2, Settings, Mail, Palette, BarChart3, FileText, Globe, CreditCard, Truck, Package, MessageSquare, MapPin, Power, ShoppingBag } from 'lucide-react';
import { DNSSetupWizard } from './DNSSetupWizard';
import { DeliveryAreaSettings } from './DeliveryAreaSettings';
import { BangladeshShippingSettings } from './BangladeshShippingSettings';
import { SMSGatewaySettings } from './SMSGatewaySettings';
import { WORLD_CURRENCIES } from '@/lib/currencies';

interface Store {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  favicon_url: string | null;
  description: string | null;
  is_active: boolean;
  custom_domain: string | null;
  custom_domain_verified: boolean;
  custom_domain_verified_at: string | null;
  facebook_pixel_id: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  street_address: string | null;
  postal_code: string | null;
  locale: string | null;
  rtl_enabled: boolean;
  google_analytics_id: string | null;
  currency: string | null;
  terms_of_service: string | null;
  refund_policy: string | null;
  products_per_row: number;
  mobile_featured_per_row: number;
  desktop_featured_per_row: number;
  mobile_products_per_row: number;
  desktop_products_per_row: number;
  category_view_type: string;
  show_decimals: boolean;
}

export function StoreSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [store, setStore] = useState<Store | null>(null);
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    is_active: true,
    custom_domain: '',
    facebook_pixel_id: '',
    email: '',
    phone: '',
    country: '',
    state: '',
    city: '',
    street_address: '',
    postal_code: '',
    locale: 'en',
    rtl_enabled: false,
    google_analytics_id: '',
    currency: 'BDT',
    terms_of_service: '',
    refund_policy: '',
    products_per_row: 2,
    mobile_featured_per_row: 2,
    desktop_featured_per_row: 5,
    mobile_products_per_row: 2,
    desktop_products_per_row: 4,
    category_view_type: 'icons',
    show_decimals: true,
    // Payment
    bkash_sandbox_mode: false,
    bkash_app_key: '',
    bkash_app_secret: '',
    bkash_app_username: '',
    bkash_app_password: '',
    // Courier
    steadfast_api_key: '',
    steadfast_secret_key: '',
    steadfast_enabled: false,
    pathao_client_id: '',
    pathao_client_secret: '',
    pathao_username: '',
    pathao_password: '',
    pathao_enabled: false,
    carrybee_api_key: '',
    carrybee_secret_key: '',
    carrybee_enabled: false,
    paperfly_merchant_id: '',
    paperfly_api_key: '',
    paperfly_enabled: false,
    redex_merchant_id: '',
    redex_api_key: '',
    redex_enabled: false,
    carousel_see_details_text: 'See Details',
    carousel_buy_now_text: 'Buy Now'
  });

  useEffect(() => {
    loadStore();
  }, [user]);

  const loadStore = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStore(data);
        setFormData({
          name: data.name,
          slug: data.slug,
          description: data.description || '',
          is_active: data.is_active,
          custom_domain: data.custom_domain || '',
          facebook_pixel_id: data.facebook_pixel_id || '',
          email: data.email || '',
          phone: data.phone || '',
          country: data.country || '',
          state: data.state || '',
          city: data.city || '',
          street_address: data.street_address || '',
          postal_code: data.postal_code || '',
          locale: data.locale || 'en',
          rtl_enabled: data.rtl_enabled || false,
          google_analytics_id: data.google_analytics_id || '',
          currency: data.currency || 'BDT',
          terms_of_service: data.terms_of_service || '',
          refund_policy: data.refund_policy || '',
          products_per_row: data.products_per_row || 2,
          mobile_featured_per_row: (data as any).mobile_featured_per_row || 2,
          desktop_featured_per_row: (data as any).desktop_featured_per_row || 5,
          mobile_products_per_row: (data as any).mobile_products_per_row || 2,
          desktop_products_per_row: (data as any).desktop_products_per_row || 4,
          category_view_type: (data as any).category_view_type || 'icons',
          show_decimals: (data as any).show_decimals !== false,
          bkash_sandbox_mode: (data as any).bkash_sandbox_mode || false,
          bkash_app_key: (data as any).bkash_app_key || '',
          bkash_app_secret: (data as any).bkash_app_secret || '',
          bkash_app_username: (data as any).bkash_app_username || '',
          bkash_app_password: (data as any).bkash_app_password || '',
          steadfast_api_key: (data as any).steadfast_api_key || '',
          steadfast_secret_key: (data as any).steadfast_secret_key || '',
          steadfast_enabled: (data as any).steadfast_enabled || false,
          pathao_client_id: (data as any).pathao_client_id || '',
          pathao_client_secret: (data as any).pathao_client_secret || '',
          pathao_username: (data as any).pathao_username || '',
          pathao_password: (data as any).pathao_password || '',
          pathao_enabled: (data as any).pathao_enabled || false,
          carrybee_api_key: (data as any).carrybee_api_key || '',
          carrybee_secret_key: (data as any).carrybee_secret_key || '',
          carrybee_enabled: (data as any).carrybee_enabled || false,
          paperfly_merchant_id: (data as any).paperfly_merchant_id || '',
          paperfly_api_key: (data as any).paperfly_api_key || '',
          paperfly_enabled: (data as any).paperfly_enabled || false,
          redex_merchant_id: (data as any).redex_merchant_id || '',
          redex_api_key: (data as any).redex_api_key || '',
          redex_enabled: (data as any).redex_enabled || false,
          carousel_see_details_text: (data as any).carousel_see_details_text || 'See Details',
          carousel_buy_now_text: (data as any).carousel_buy_now_text || 'Buy Now'
        });
      }
    } catch (error: any) {
      toast.error('Failed to load store settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const storeData = {
        user_id: user?.id,
        name: formData.name,
        slug: formData.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        description: formData.description,
        is_active: formData.is_active,
        custom_domain: formData.custom_domain || null,
        facebook_pixel_id: formData.facebook_pixel_id || null,
        email: formData.email || null,
        phone: formData.phone || null,
        country: formData.country || null,
        state: formData.state || null,
        city: formData.city || null,
        street_address: formData.street_address || null,
        postal_code: formData.postal_code || null,
        locale: formData.locale || 'en',
        rtl_enabled: formData.rtl_enabled,
        google_analytics_id: formData.google_analytics_id || null,
        currency: formData.currency || 'BDT',
        terms_of_service: formData.terms_of_service || null,
        refund_policy: formData.refund_policy || null,
        products_per_row: formData.products_per_row,
        mobile_featured_per_row: formData.mobile_featured_per_row,
        desktop_featured_per_row: formData.desktop_featured_per_row,
        mobile_products_per_row: formData.mobile_products_per_row,
        desktop_products_per_row: formData.desktop_products_per_row,
        category_view_type: formData.category_view_type,
        show_decimals: formData.show_decimals,
        bkash_sandbox_mode: formData.bkash_sandbox_mode,
        bkash_app_key: formData.bkash_app_key || null,
        bkash_app_secret: formData.bkash_app_secret || null,
        bkash_app_username: formData.bkash_app_username || null,
        bkash_app_password: formData.bkash_app_password || null,
        steadfast_api_key: formData.steadfast_api_key || null,
        steadfast_secret_key: formData.steadfast_secret_key || null,
        steadfast_enabled: formData.steadfast_enabled,
        pathao_client_id: formData.pathao_client_id || null,
        pathao_client_secret: formData.pathao_client_secret || null,
        pathao_username: formData.pathao_username || null,
        pathao_password: formData.pathao_password || null,
        pathao_enabled: formData.pathao_enabled,
        carrybee_api_key: formData.carrybee_api_key || null,
        carrybee_secret_key: formData.carrybee_secret_key || null,
        carrybee_enabled: formData.carrybee_enabled,
        paperfly_merchant_id: formData.paperfly_merchant_id || null,
        paperfly_api_key: formData.paperfly_api_key || null,
        paperfly_enabled: formData.paperfly_enabled,
        redex_merchant_id: formData.redex_merchant_id || null,
        redex_api_key: formData.redex_api_key || null,
        redex_enabled: formData.redex_enabled,
        carousel_see_details_text: formData.carousel_see_details_text || 'See Details',
        carousel_buy_now_text: formData.carousel_buy_now_text || 'Buy Now'
      };

      if (store) {
        const { error } = await supabase
          .from('stores')
          .update(storeData)
          .eq('id', store.id);

        if (error) throw error;
        toast.success('Store updated successfully');
      } else {
        const { data, error } = await supabase
          .from('stores')
          .insert([storeData])
          .select()
          .single();

        if (error) throw error;
        setStore(data);
        toast.success('Store created successfully');
      }

      loadStore();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save store');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !store) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('store-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('store-assets')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('stores')
        .update({ logo_url: publicUrl })
        .eq('id', store.id);

      if (updateError) throw updateError;

      toast.success('Logo uploaded successfully');
      loadStore();
    } catch (error: any) {
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !store) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/favicon-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('store-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('store-assets')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('stores')
        .update({ favicon_url: publicUrl })
        .eq('id', store.id);

      if (updateError) throw updateError;

      toast.success('Favicon uploaded successfully');
      loadStore();
    } catch (error: any) {
      toast.error('Failed to upload favicon');
    } finally {
      setUploading(false);
    }
  };

  const copyStoreUrl = () => {
    const url = `${window.location.origin}/store/${formData.slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Store URL copied to clipboard');
  };

  const verifyDomain = async () => {
    if (!store || !formData.custom_domain) {
      toast.error('Please save your custom domain first');
      return;
    }

    setVerifying(true);
    setDiagnostics(null);

    try {
      const { data, error } = await supabase.functions.invoke('verify-domain', {
        body: {
          storeId: store.id,
          domain: formData.custom_domain
        }
      });

      if (error) throw error;

      if (data.diagnostics) {
        setDiagnostics(data.diagnostics);
      }

      if (data.verified) {
        toast.success(data.message || 'Domain verified successfully!');
        loadStore();
      } else {
        toast.error(data.message || 'Domain verification failed. Check the diagnostics below.');
      }
    } catch (error: any) {
      console.error('Domain verification error:', error);
      toast.error('Failed to verify domain. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const storeUrl = `${window.location.origin}/store/${formData.slug}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Store Settings</CardTitle>
        <CardDescription>Configure your online store details</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Vertical Sidebar Navigation */}
              <div className="w-full md:w-56 shrink-0">
                <div className="sticky top-4 space-y-1 bg-muted/50 rounded-lg p-2">
                  <TabsList className="flex flex-col h-auto bg-transparent space-y-1 w-full">
                    <TabsTrigger value="basic" className="w-full justify-start px-3 py-2.5 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Settings className="mr-2 h-4 w-4" />
                      Basic Info
                    </TabsTrigger>
                    <TabsTrigger value="contact" className="w-full justify-start px-3 py-2.5 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Mail className="mr-2 h-4 w-4" />
                      Contact
                    </TabsTrigger>
                    <TabsTrigger value="display" className="w-full justify-start px-3 py-2.5 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Palette className="mr-2 h-4 w-4" />
                      Display
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="w-full justify-start px-3 py-2.5 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Analytics
                    </TabsTrigger>
                    <TabsTrigger value="policies" className="w-full justify-start px-3 py-2.5 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <FileText className="mr-2 h-4 w-4" />
                      Policies
                    </TabsTrigger>
                    <TabsTrigger value="domain" className="w-full justify-start px-3 py-2.5 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Globe className="mr-2 h-4 w-4" />
                      Domain
                    </TabsTrigger>
                    <TabsTrigger value="payment" className="w-full justify-start px-3 py-2.5 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Payment
                    </TabsTrigger>
                    <TabsTrigger value="courier" className="w-full justify-start px-3 py-2.5 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Truck className="mr-2 h-4 w-4" />
                      Courier
                    </TabsTrigger>
                    <TabsTrigger value="shipping" className="w-full justify-start px-3 py-2.5 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Package className="mr-2 h-4 w-4" />
                      Shipping BD
                    </TabsTrigger>
                    <TabsTrigger value="sms" className="w-full justify-start px-3 py-2.5 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      SMS Gateway
                    </TabsTrigger>
                    <TabsTrigger value="livechat" className="w-full justify-start px-3 py-2.5 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      Live Chat
                    </TabsTrigger>
                    <TabsTrigger value="delivery" className="w-full justify-start px-3 py-2.5 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <MapPin className="mr-2 h-4 w-4" />
                      Delivery Area
                    </TabsTrigger>
                    <TabsTrigger value="status" className="w-full justify-start px-3 py-2.5 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Power className="mr-2 h-4 w-4" />
                      Status
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>
              
              {/* Content Area */}
              <div className="flex-1 min-w-0">
              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-6 mt-0">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>Store Logo</Label>
                  <div className="flex items-center gap-4">
                    {store?.logo_url && (
                      <img
                        src={store.logo_url}
                        alt="Store logo"
                        className="h-16 w-16 rounded-lg object-cover border"
                      />
                    )}
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={!store || uploading}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Recommended: Square image, at least 200x200px
                      </p>
                    </div>
                  </div>
                </div>

                {/* Favicon Upload */}
                <div className="space-y-2">
                  <Label>Store Favicon</Label>
                  <div className="flex items-center gap-4">
                    {store?.favicon_url && (
                      <img
                        src={store.favicon_url}
                        alt="Store favicon"
                        className="h-8 w-8 rounded object-cover border"
                      />
                    )}
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/x-icon,image/png,image/svg+xml"
                        onChange={handleFaviconUpload}
                        disabled={!store || uploading}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Recommended: ICO, PNG, or SVG, 16x16 or 32x32px
                      </p>
                    </div>
                  </div>
                </div>

                {/* Store Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Store Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="My Awesome Store"
                    required
                  />
                </div>

                {/* Store Slug */}
                <div className="space-y-2">
                  <Label htmlFor="slug">Store URL Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={e => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="my-store"
                    required
                    pattern="[a-z0-9-]+"
                  />
                  <p className="text-xs text-muted-foreground">
                    Only lowercase letters, numbers, and hyphens allowed
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Tell customers about your store..."
                    rows={4}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="button" onClick={handleSubmit} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Basic Info
                  </Button>
                </div>
              </TabsContent>

              {/* Contact & Address Tab */}
              <TabsContent value="contact" className="space-y-6 mt-0">
                <h3 className="text-lg font-semibold">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="support@yourstore.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Mobile/Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1234567890"
                    />
                  </div>
                </div>

                <h3 className="text-lg font-semibold mt-6">Store Address</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="street_address">Street Address</Label>
                    <Input
                      id="street_address"
                      value={formData.street_address}
                      onChange={e => setFormData({ ...formData, street_address: e.target.value })}
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        placeholder="New York"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">State/Province</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={e => setFormData({ ...formData, state: e.target.value })}
                        placeholder="NY"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postal_code">Postal Code</Label>
                      <Input
                        id="postal_code"
                        value={formData.postal_code}
                        onChange={e => setFormData({ ...formData, postal_code: e.target.value })}
                        placeholder="10001"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={formData.country}
                        onChange={e => setFormData({ ...formData, country: e.target.value })}
                        placeholder="United States"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="button" onClick={handleSubmit} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Contact Info
                  </Button>
                </div>
              </TabsContent>

              {/* Display Tab */}
              <TabsContent value="display" className="space-y-6 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="locale">Language/Locale</Label>
                  <Input
                    id="locale"
                    value={formData.locale}
                    onChange={e => setFormData({ ...formData, locale: e.target.value })}
                    placeholder="en"
                  />
                  <p className="text-xs text-muted-foreground">
                    Language code (e.g., en, es, fr)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {WORLD_CURRENCIES.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.symbol} {currency.name} ({currency.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select your store's default currency
                  </p>
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="show_decimals">Show Decimal Places</Label>
                    <p className="text-xs text-muted-foreground">
                      Display prices with decimal places (e.g., $10.50 vs $11)
                    </p>
                  </div>
                  <Switch
                    id="show_decimals"
                    checked={formData.show_decimals}
                    onCheckedChange={(checked) => setFormData({ ...formData, show_decimals: checked })}
                  />
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium text-sm">Featured Products Carousel</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="mobile_featured_per_row">Mobile: Products Per Row</Label>
                    <Input
                      id="mobile_featured_per_row"
                      type="number"
                      min="1"
                      max="4"
                      value={formData.mobile_featured_per_row}
                      onChange={e => setFormData({ ...formData, mobile_featured_per_row: parseInt(e.target.value) || 2 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of featured products visible per row on mobile (1-4)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="desktop_featured_per_row">Desktop: Products Per Row</Label>
                    <Input
                      id="desktop_featured_per_row"
                      type="number"
                      min="1"
                      max="6"
                      value={formData.desktop_featured_per_row}
                      onChange={e => setFormData({ ...formData, desktop_featured_per_row: parseInt(e.target.value) || 5 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of featured products visible per row on desktop (1-6)
                    </p>
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium text-sm">General Products Grid</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="mobile_products_per_row">Mobile: Products Per Row</Label>
                    <Input
                      id="mobile_products_per_row"
                      type="number"
                      min="1"
                      max="4"
                      value={formData.mobile_products_per_row}
                      onChange={e => setFormData({ ...formData, mobile_products_per_row: parseInt(e.target.value) || 2 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of general products per row on mobile (1-4)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="desktop_products_per_row">Desktop: Products Per Row</Label>
                    <Input
                      id="desktop_products_per_row"
                      type="number"
                      min="1"
                      max="6"
                      value={formData.desktop_products_per_row}
                      onChange={e => setFormData({ ...formData, desktop_products_per_row: parseInt(e.target.value) || 4 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of general products per row on desktop (1-6)
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category_view_type">Category Display Style</Label>
                  <Select
                    value={formData.category_view_type}
                    onValueChange={(value) => setFormData({ ...formData, category_view_type: value })}
                  >
                    <SelectTrigger id="category_view_type">
                      <SelectValue placeholder="Select view style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="icons">Icons View</SelectItem>
                      <SelectItem value="cards">Cards View</SelectItem>
                      <SelectItem value="list">List View</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose how categories are displayed on your storefront
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Right-to-Left (RTL)</Label>
                    <p className="text-xs text-muted-foreground">
                      For languages like Arabic or Hebrew
                    </p>
                  </div>
                  <Switch
                    checked={formData.rtl_enabled}
                    onCheckedChange={checked => setFormData({ ...formData, rtl_enabled: checked })}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="button" onClick={handleSubmit} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Display Settings
                  </Button>
                </div>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-6 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="google_analytics_id">Google Analytics ID</Label>
                  <Input
                    id="google_analytics_id"
                    value={formData.google_analytics_id}
                    onChange={e => setFormData({ ...formData, google_analytics_id: e.target.value })}
                    placeholder="G-XXXXXXXXXX or UA-XXXXXXXXX-X"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enable Google Analytics tracking for your store
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facebook_pixel_id">Facebook Pixel ID</Label>
                  <Input
                    id="facebook_pixel_id"
                    value={formData.facebook_pixel_id}
                    onChange={e => setFormData({ ...formData, facebook_pixel_id: e.target.value })}
                    placeholder="XXXXXXXXXXXXXXXX"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enable Facebook Pixel tracking and conversion API for your store
                  </p>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="button" onClick={handleSubmit} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Analytics Settings
                  </Button>
                </div>
              </TabsContent>

              {/* Policies Tab */}
              <TabsContent value="policies" className="space-y-6 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="terms_of_service">Terms of Service</Label>
                  <Textarea
                    id="terms_of_service"
                    value={formData.terms_of_service}
                    onChange={e => setFormData({ ...formData, terms_of_service: e.target.value })}
                    placeholder="Enter your terms of service..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="refund_policy">Refund Policy</Label>
                  <Textarea
                    id="refund_policy"
                    value={formData.refund_policy}
                    onChange={e => setFormData({ ...formData, refund_policy: e.target.value })}
                    placeholder="Enter your refund policy..."
                    rows={4}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="button" onClick={handleSubmit} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Policies
                  </Button>
                </div>
              </TabsContent>

              {/* Custom Domain Tab */}
              <TabsContent value="domain" className="space-y-6 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="custom_domain">Custom Domain</Label>
                  <Input
                    id="custom_domain"
                    value={formData.custom_domain}
                    onChange={e => setFormData({ ...formData, custom_domain: e.target.value })}
                    placeholder="store.yourdomain.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use your own domain for your store. Make sure to configure DNS records.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={verifyDomain}
                    disabled={verifying || !formData.custom_domain}
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Domain'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setWizardOpen(true)}
                    disabled={!formData.custom_domain}
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    DNS Setup Wizard
                  </Button>
                </div>

                {diagnostics && (
                  <div className="mt-4">
                    <Alert variant={diagnostics.success ? 'default' : 'destructive'}>
                      <AlertTitle>
                        {diagnostics.success ? (
                          <>
                            <CheckCircle2 className="inline mr-2 h-5 w-5" />
                            Domain Verified
                          </>
                        ) : (
                          <>
                            <AlertCircle className="inline mr-2 h-5 w-5" />
                            Verification Failed
                          </>
                        )}
                      </AlertTitle>
                      <AlertDescription>
                        {diagnostics.message}
                        {diagnostics.records && (
                          <ul className="mt-2 list-disc list-inside text-sm">
                            {diagnostics.records.map((rec: any, idx: number) => (
                              <li key={idx}>
                                <strong>{rec.type}:</strong> {rec.value} - {rec.status}
                              </li>
                            ))}
                          </ul>
                        )}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <Button type="button" onClick={handleSubmit} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Domain Settings
                  </Button>
                </div>
              </TabsContent>

              {/* Payment Integration Tab */}
              <TabsContent value="payment" className="space-y-6 mt-0">
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
                      onCheckedChange={checked => setFormData({ ...formData, bkash_sandbox_mode: checked })}
                    />
                  </div>

                  {/* App Key */}
                  <div className="space-y-2">
                    <Label htmlFor="bkash_app_key">bKash App Key</Label>
                    <Input
                      id="bkash_app_key"
                      type="text"
                      value={formData.bkash_app_key}
                      onChange={e => setFormData({ ...formData, bkash_app_key: e.target.value })}
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
                      onChange={e => setFormData({ ...formData, bkash_app_secret: e.target.value })}
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
                      onChange={e => setFormData({ ...formData, bkash_app_username: e.target.value })}
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
                      onChange={e => setFormData({ ...formData, bkash_app_password: e.target.value })}
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

                  <div className="flex justify-end pt-4">
                    <Button type="button" onClick={handleSubmit} disabled={saving}>
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Payment Settings
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Courier Integration Tab */}
              <TabsContent value="courier" className="space-y-6 mt-0">
                <h3 className="text-lg font-semibold">Courier Integrations</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Enable and configure courier services for shipping. Toggle each service to enable/disable it.
                </p>

                {/* SteadFast */}
                <div className="space-y-4 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">SteadFast Courier</h4>
                      <p className="text-sm text-muted-foreground">Bangladesh courier service</p>
                    </div>
                    <Switch
                      checked={formData.steadfast_enabled}
                      onCheckedChange={checked => setFormData({ ...formData, steadfast_enabled: checked })}
                    />
                  </div>
                  {formData.steadfast_enabled && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="space-y-2">
                        <Label htmlFor="steadfast_api_key">API Key</Label>
                        <Input
                          id="steadfast_api_key"
                          value={formData.steadfast_api_key}
                          onChange={e => setFormData({ ...formData, steadfast_api_key: e.target.value })}
                          placeholder="Your SteadFast API Key"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="steadfast_secret_key">Secret Key</Label>
                        <Input
                          id="steadfast_secret_key"
                          type="password"
                          value={formData.steadfast_secret_key}
                          onChange={e => setFormData({ ...formData, steadfast_secret_key: e.target.value })}
                          placeholder="Your SteadFast Secret Key"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Pathao */}
                <div className="space-y-4 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Pathao Courier</h4>
                      <p className="text-sm text-muted-foreground">Bangladesh courier service</p>
                    </div>
                    <Switch
                      checked={formData.pathao_enabled}
                      onCheckedChange={checked => setFormData({ ...formData, pathao_enabled: checked })}
                    />
                  </div>
                  {formData.pathao_enabled && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="space-y-2">
                        <Label htmlFor="pathao_client_id">Client ID</Label>
                        <Input
                          id="pathao_client_id"
                          value={formData.pathao_client_id}
                          onChange={e => setFormData({ ...formData, pathao_client_id: e.target.value })}
                          placeholder="Your Pathao Client ID"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pathao_client_secret">Client Secret</Label>
                        <Input
                          id="pathao_client_secret"
                          type="password"
                          value={formData.pathao_client_secret}
                          onChange={e => setFormData({ ...formData, pathao_client_secret: e.target.value })}
                          placeholder="Your Pathao Client Secret"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pathao_username">Username</Label>
                        <Input
                          id="pathao_username"
                          value={formData.pathao_username}
                          onChange={e => setFormData({ ...formData, pathao_username: e.target.value })}
                          placeholder="Your Pathao Username"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pathao_password">Password</Label>
                        <Input
                          id="pathao_password"
                          type="password"
                          value={formData.pathao_password}
                          onChange={e => setFormData({ ...formData, pathao_password: e.target.value })}
                          placeholder="Your Pathao Password"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Carrybee */}
                <div className="space-y-4 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Carrybee Courier</h4>
                      <p className="text-sm text-muted-foreground">Bangladesh courier service</p>
                    </div>
                    <Switch
                      checked={formData.carrybee_enabled}
                      onCheckedChange={checked => setFormData({ ...formData, carrybee_enabled: checked })}
                    />
                  </div>
                  {formData.carrybee_enabled && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="space-y-2">
                        <Label htmlFor="carrybee_api_key">API Key</Label>
                        <Input
                          id="carrybee_api_key"
                          value={formData.carrybee_api_key}
                          onChange={e => setFormData({ ...formData, carrybee_api_key: e.target.value })}
                          placeholder="Your Carrybee API Key"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="carrybee_secret_key">Secret Key</Label>
                        <Input
                          id="carrybee_secret_key"
                          type="password"
                          value={formData.carrybee_secret_key}
                          onChange={e => setFormData({ ...formData, carrybee_secret_key: e.target.value })}
                          placeholder="Your Carrybee Secret Key"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Paperfly */}
                <div className="space-y-4 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Paperfly Courier</h4>
                      <p className="text-sm text-muted-foreground">Bangladesh courier service</p>
                    </div>
                    <Switch
                      checked={formData.paperfly_enabled}
                      onCheckedChange={checked => setFormData({ ...formData, paperfly_enabled: checked })}
                    />
                  </div>
                  {formData.paperfly_enabled && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="space-y-2">
                        <Label htmlFor="paperfly_merchant_id">Merchant ID</Label>
                        <Input
                          id="paperfly_merchant_id"
                          value={formData.paperfly_merchant_id}
                          onChange={e => setFormData({ ...formData, paperfly_merchant_id: e.target.value })}
                          placeholder="Your Paperfly Merchant ID"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="paperfly_api_key">API Key</Label>
                        <Input
                          id="paperfly_api_key"
                          type="password"
                          value={formData.paperfly_api_key}
                          onChange={e => setFormData({ ...formData, paperfly_api_key: e.target.value })}
                          placeholder="Your Paperfly API Key"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Redex */}
                <div className="space-y-4 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Redex Courier</h4>
                      <p className="text-sm text-muted-foreground">Bangladesh courier service</p>
                    </div>
                    <Switch
                      checked={formData.redex_enabled}
                      onCheckedChange={checked => setFormData({ ...formData, redex_enabled: checked })}
                    />
                  </div>
                  {formData.redex_enabled && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="space-y-2">
                        <Label htmlFor="redex_merchant_id">Merchant ID</Label>
                        <Input
                          id="redex_merchant_id"
                          value={formData.redex_merchant_id}
                          onChange={e => setFormData({ ...formData, redex_merchant_id: e.target.value })}
                          placeholder="Your Redex Merchant ID"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="redex_api_key">API Key</Label>
                        <Input
                          id="redex_api_key"
                          type="password"
                          value={formData.redex_api_key}
                          onChange={e => setFormData({ ...formData, redex_api_key: e.target.value })}
                          placeholder="Your Redex API Key"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="button" onClick={handleSubmit} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Courier Settings
                  </Button>
                </div>
              </TabsContent>

              {/* Bangladesh Shipping Tab */}
              <TabsContent value="shipping" className="mt-0">
                {store && (
                  <BangladeshShippingSettings
                    storeId={store.id}
                    currentSettings={{
                      shipping_area_mode: (store as any).shipping_area_mode || 'both',
                      default_shipping_inside_dhaka: (store as any).default_shipping_inside_dhaka || 60,
                      default_shipping_outside_dhaka: (store as any).default_shipping_outside_dhaka || 120,
                      default_return_charge: (store as any).default_return_charge || 50,
                      shipping_calculation_method: (store as any).shipping_calculation_method || 'flat_rate',
                    }}
                    onUpdate={loadStore}
                  />
                )}
              </TabsContent>

              {/* SMS Gateway Tab */}
              <TabsContent value="sms" className="mt-0">
                {store && (
                  <SMSGatewaySettings
                    storeId={store.id}
                    onUpdate={loadStore}
                  />
                )}
              </TabsContent>

              {/* Live Chat Sales Panel Tab */}
              <TabsContent value="livechat" className="space-y-6 mt-0">
                <div className="space-y-4">
                  <div className="pb-4 border-b">
                    <h3 className="text-lg font-semibold">Carousel Button Text</h3>
                    <p className="text-sm text-muted-foreground">
                      Customize button labels for product carousels in Live Chat
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="carousel_see_details_text">"See Details" Button Text</Label>
                    <Input
                      id="carousel_see_details_text"
                      value={formData.carousel_see_details_text}
                      onChange={e => setFormData({ ...formData, carousel_see_details_text: e.target.value })}
                      placeholder="See Details"
                    />
                    <p className="text-xs text-muted-foreground">
                      Text shown on the button to view product details
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="carousel_buy_now_text">"Buy Now" Button Text</Label>
                    <Input
                      id="carousel_buy_now_text"
                      value={formData.carousel_buy_now_text}
                      onChange={e => setFormData({ ...formData, carousel_buy_now_text: e.target.value })}
                      placeholder="Buy Now"
                    />
                    <p className="text-xs text-muted-foreground">
                      Text shown on the button to purchase the product
                    </p>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="button" onClick={handleSubmit} disabled={saving}>
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Live Chat Settings
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Delivery Area Tab */}
              <TabsContent value="delivery" className="mt-0">
                <DeliveryAreaSettings />
              </TabsContent>

              {/* Status Tab */}
              <TabsContent value="status" className="space-y-6 mt-0">
                {/* Active Status */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Store Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Make your store visible to customers
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={checked => setFormData({ ...formData, is_active: checked })}
                  />
                </div>

                {/* Store URL */}
                {store && (
                  <div className="space-y-2">
                    <Label>Your Store URL</Label>
                    <div className="flex gap-2">
                      <Input value={storeUrl} readOnly className="font-mono text-sm" />
                      <Button type="button" variant="outline" size="icon" onClick={copyStoreUrl}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" size="icon" asChild>
                        <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <Button type="button" onClick={handleSubmit} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Status Settings
                  </Button>
                </div>
              </TabsContent>
            </div>
          </div>
          </Tabs>
        </form>

        {/* DNS Setup Wizard */}
        <DNSSetupWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          domain={formData.custom_domain}
          appDomain={window.location.hostname}
        />
      </CardContent>
    </Card>
  );
}
