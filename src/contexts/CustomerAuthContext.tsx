import { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface CustomerProfile {
  id: string;
  user_id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  is_guest: boolean;
  guest_session_id?: string;
}

interface CustomerAuthContextType {
  user: User | null;
  session: Session | null;
  customerProfile: CustomerProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  createGuestProfile: () => Promise<CustomerProfile | null>;
  updateProfile: (data: Partial<CustomerProfile>) => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          loadCustomerProfile(session.user.id);
        }, 0);
      } else {
        setCustomerProfile(null);
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        loadCustomerProfile(session.user.id);
      } else {
        // Check for guest profile in localStorage
        loadGuestProfile();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadCustomerProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setCustomerProfile(data);
    } catch (error) {
      console.error('Error loading customer profile:', error);
    }
  };

  const loadGuestProfile = async () => {
    const guestSessionId = localStorage.getItem('guest_session_id');
    if (guestSessionId) {
      try {
        const { data, error } = await supabase
          .from('customer_profiles')
          .select('*')
          .eq('guest_session_id', guestSessionId)
          .eq('is_guest', true)
          .maybeSingle();

        if (error) throw error;
        if (data) setCustomerProfile(data);
      } catch (error) {
        console.error('Error loading guest profile:', error);
      }
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        }
      }
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setCustomerProfile(null);
  };

  const createGuestProfile = async (): Promise<CustomerProfile | null> => {
    try {
      const guestSessionId = crypto.randomUUID();
      
      console.log('Creating guest profile with session ID:', guestSessionId);
      
      const { data, error } = await supabase
        .from('customer_profiles')
        .insert({
          is_guest: true,
          guest_session_id: guestSessionId,
        })
        .select()
        .single();

      if (error) {
        console.error('Guest profile creation error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log('Guest profile created successfully:', data);
      localStorage.setItem('guest_session_id', guestSessionId);
      setCustomerProfile(data);
      return data;
    } catch (error: any) {
      console.error('Failed to create guest profile:', error.message || error);
      return null;
    }
  };

  const updateProfile = async (data: Partial<CustomerProfile>) => {
    if (!customerProfile) return;

    try {
      const { error } = await supabase
        .from('customer_profiles')
        .update(data)
        .eq('id', customerProfile.id);

      if (error) throw error;
      
      setCustomerProfile({ ...customerProfile, ...data });
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        user,
        session,
        customerProfile,
        loading,
        signUp,
        signIn,
        signOut,
        createGuestProfile,
        updateProfile,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}
