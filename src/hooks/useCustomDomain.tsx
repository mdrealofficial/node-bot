import { useEffect, useState } from 'react';

interface CustomDomainInfo {
  isCustomDomain: boolean;
  domain: string | null;
  isLoading: boolean;
}

export function useCustomDomain(): CustomDomainInfo {
  const [info, setInfo] = useState<CustomDomainInfo>({
    isCustomDomain: false,
    domain: null,
    isLoading: true,
  });

  useEffect(() => {
    const currentDomain = window.location.hostname;
    
    // Check if we're on a main app domain (not a custom store domain)
    const isMainAppDomain = currentDomain.includes('lovableproject.com') || 
                           currentDomain.includes('lovable.app') ||
                           currentDomain === 'localhost' ||
                           currentDomain === '127.0.0.1' ||
                           currentDomain === 'smecube.app' ||
                           currentDomain.endsWith('.smecube.app');
    
    setInfo({
      isCustomDomain: !isMainAppDomain,
      domain: !isMainAppDomain ? currentDomain : null,
      isLoading: false,
    });
  }, []);

  return info;
}
