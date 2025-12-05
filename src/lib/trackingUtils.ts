import apiClient from '@/lib/apiClient';

export interface TrackingUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  ip?: string;
  userAgent?: string;
  fbc?: string; // Facebook click ID
  fbp?: string; // Facebook browser ID
  userId?: string;
  sessionId?: string;
}

// Get Facebook cookies for better attribution
export const getFacebookCookies = (): { fbc?: string; fbp?: string } => {
  const cookies = document.cookie.split(';');
  let fbc, fbp;

  cookies.forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name === '_fbc') fbc = value;
    if (name === '_fbp') fbp = value;
  });

  return { fbc, fbp };
};

// Track server-side conversion
export const trackServerSideConversion = async (
  storeId: string,
  eventName: 'Purchase' | 'Refund' | 'InitiateCheckout' | 'AddToCart',
  orderId?: string,
  userData?: TrackingUserData
) => {
  try {
    const { fbc, fbp } = getFacebookCookies();
    
    const { data } = await apiClient.post('/tracking/conversion', {
      storeId,
      eventName,
      orderId,
      userData: {
        ...userData,
        fbc: userData?.fbc || fbc,
        fbp: userData?.fbp || fbp,
        userAgent: navigator.userAgent,
        sessionId: sessionStorage.getItem('session_id') || Date.now().toString(),
      },
    });

    console.log('Server-side tracking successful:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Failed to track server-side conversion:', error);
    return { success: false, error };
  }
};
