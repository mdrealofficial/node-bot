import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BrandingSettings {
  logoUrl: string | null;
  faviconUrl: string | null;
  isLoading: boolean;
}

export function useBranding(): BrandingSettings {
  const [settings, setSettings] = useState<BrandingSettings>({
    logoUrl: null,
    faviconUrl: null,
    isLoading: true,
  });

  useEffect(() => {
    const loadBrandingSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_config')
          .select('logo_url, favicon_url')
          .single();

        if (error) throw error;

        if (data) {
          setSettings({
            logoUrl: data.logo_url,
            faviconUrl: data.favicon_url,
            isLoading: false,
          });

          // Update favicon dynamically on app load
          if (data.favicon_url) {
            // Remove all existing favicon links
            const existingLinks = document.querySelectorAll("link[rel*='icon']");
            existingLinks.forEach(link => link.remove());
            
            // Create new favicon link
            const link = document.createElement('link');
            link.rel = 'icon';
            link.href = data.favicon_url + '?t=' + new Date().getTime();
            document.head.appendChild(link);
          }
        } else {
          setSettings({ logoUrl: null, faviconUrl: null, isLoading: false });
        }
      } catch (error) {
        console.error('Error loading branding settings:', error);
        setSettings({ logoUrl: null, faviconUrl: null, isLoading: false });
      }
    };

    loadBrandingSettings();
  }, []);

  return settings;
}
