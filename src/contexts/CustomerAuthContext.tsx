import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { customerService } from '@/services/api';
import { toast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  storeId: string;
}

interface CustomerAuthContextType {
  customer: Customer | null;
  login: (phone: string, otp: string) => Promise<void>;
  sendOTP: (phone: string, storeId: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export const CustomerAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if customer is already authenticated on mount
    const token = localStorage.getItem('customerAccessToken');
    if (token) {
      loadCustomerProfile();
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadCustomerProfile = async () => {
    try {
      // Load customer profile using customer token
      const customerData = await customerService.getProfile();
      
      setCustomer({
        id: customerData.id,
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        storeId: customerData.storeId,
      });
    } catch (error) {
      console.error('Failed to load customer profile:', error);
      // Clear tokens if profile fetch fails
      localStorage.removeItem('customerAccessToken');
      localStorage.removeItem('customerRefreshToken');
      setCustomer(null);
    } finally {
      setIsLoading(false);
    }
  };

  const sendOTP = async (phone: string, storeId: string) => {
    try {
      await customerService.sendOTP({ phone, storeId });
      
      toast({
        title: 'OTP sent',
        description: 'Please check your phone for the verification code',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to send OTP',
        description: error.response?.data?.message || 'Please try again',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const login = async (phone: string, otp: string) => {
    setIsLoading(true);
    try {
      const data = await customerService.verifyOTP({ phone, otp });
      
      // Store customer tokens
      localStorage.setItem('customerAccessToken', data.tokens.accessToken);
      localStorage.setItem('customerRefreshToken', data.tokens.refreshToken);
      
      // Load full profile
      await loadCustomerProfile();

      toast({
        title: 'Welcome!',
        description: 'Successfully logged in',
      });
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.response?.data?.message || 'Invalid OTP',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('customerAccessToken');
    localStorage.removeItem('customerRefreshToken');
    setCustomer(null);
    
    toast({
      title: 'Logged out',
      description: 'See you soon!',
    });
  };

  const value: CustomerAuthContextType = {
    customer,
    login,
    sendOTP,
    logout,
    isLoading,
    isAuthenticated: !!customer,
  };

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
};

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};
