import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '@/services/api';
import { toast } from '@/hooks/use-toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated on mount
    const token = localStorage.getItem('accessToken');
    if (token) {
      loadUserProfile();
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadUserProfile = async () => {
    try {
      const userData = await authService.getMe();
      
      setUser({
        id: userData.id,
        name: userData.profile?.fullName || userData.email.split('@')[0],
        email: userData.email,
        role: userData.roles.some(r => r.role === 'admin') ? 'admin' : 'user',
        avatar: userData.profile?.avatarUrl,
      });
    } catch (error) {
      console.error('Failed to load user profile:', error);
      // Clear tokens if profile fetch fails
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    try {
      const data = await authService.register({ email, password, name: fullName });
      
      // Store tokens
      localStorage.setItem('accessToken', data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.tokens.refreshToken);
      
      // Set user
      setUser({
        id: data.user.id,
        name: fullName,
        email: data.user.email,
        role: 'user',
      });

      toast({
        title: 'Account created!',
        description: 'Welcome to the platform',
      });
    } catch (error: any) {
      toast({
        title: 'Signup failed',
        description: error.response?.data?.message || 'Failed to create account',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await authService.login({ email, password });
      
      // Store tokens
      localStorage.setItem('accessToken', data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.tokens.refreshToken);
      
      // Load full profile
      await loadUserProfile();

      toast({
        title: 'Welcome back!',
        description: 'Successfully logged in',
      });
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.response?.data?.message || 'Invalid credentials',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      
      toast({
        title: 'Logged out',
        description: 'See you soon!',
      });
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await authService.forgotPassword({ email });
      
      toast({
        title: 'Check your email',
        description: 'Password reset instructions have been sent',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to send reset email',
        description: error.response?.data?.message || 'Please try again',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updatePassword = async (oldPassword: string, newPassword: string) => {
    try {
      await authService.updatePassword({ oldPassword, newPassword });
      
      toast({
        title: 'Password updated',
        description: 'Your password has been changed successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to update password',
        description: error.response?.data?.message || 'Please try again',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    login,
    signup,
    logout,
    resetPassword,
    updatePassword,
    isLoading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
