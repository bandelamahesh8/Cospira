import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ data?: any; error: any; needsVerification: boolean }>;
  signIn: (email: string, password: string) => Promise<{ data?: any; error: any }>;
  signInWithGoogle: () => Promise<{ data?: any; error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { display_name?: string; gender?: string; photo_url?: string }) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<{ error: any }>;
  requestOTP: (email: string, purpose: 'forgot_login' | 'change_password') => Promise<{ success: boolean; message?: string; error?: string }>;
  verifyOTP: (email: string, otp: string, purpose: 'forgot_login' | 'change_password') => Promise<{ success: boolean; resetToken?: string; error?: string }>;
  resetPassword: (resetToken: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for test user in dev mode
    if (import.meta.env.DEV) {
      const testUser = localStorage.getItem('cospira-test-user');
      if (testUser) {
        try {
            const user = JSON.parse(testUser);
            setUser(user);
            setSession({
            user,
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
            expires_in: 3600,
            token_type: 'bearer',
            } as Session);
            setLoading(false);
            return;
        } catch (e) {
            console.error("Test user parse error", e);
        }
      }
    }

    // Get initial session
    let mounted = true;
    
    const initSession = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (mounted) {
                setSession(session);
                setUser(session?.user ?? null);
            }
        } catch (err) {
            console.error("Auth init error:", err);
        } finally {
            if (mounted) setLoading(false);
        }
    };

    initSession();

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
      }
    });

    return () => {
        mounted = false;
        subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/auth`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: displayName || email.split('@')[0],
          },
        },
      });

      if (error) {
        toast({
          title: 'Signup Error',
          description: error.message,
          variant: 'destructive',
        });
        return { error, needsVerification: false };
      }

      // Check if email confirmation is required
      const needsVerification = data.user && !data.session;

      if (needsVerification) {
        return { data, error: null, needsVerification: true };
      } else {
        toast({
          title: 'Success!',
          description: "Account created successfully. You're now logged in.",
        });
        return { data, error: null, needsVerification: false };
      }
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
      return { error, needsVerification: false };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: 'Login Error',
          description: error.message,
          variant: 'destructive',
        });
        return { error };
      }

      toast({
        title: 'Welcome back!',
        description: "You've successfully logged in.",
      });

      return { data, error: null };
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      // Redirect to /auth after OAuth, not /dashboard
      // This allows the Auth page to detect login and navigate with replace: true
      const redirectUrl = `${window.location.origin}/auth`;
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        toast({
          title: 'Google Sign In Error',
          description: error.message,
          variant: 'destructive',
        });
        return { error };
      }

      return { data, error: null };
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
      return { error };
    }
  };


  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.warn('Supabase signOut error (likely already invalid session):', error.message);
      }

      toast({
        title: 'Signed Out',
        description: "You've been successfully signed out.",
      });

      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key);
        }
      });

      setUser(null);
      setSession(null);
      window.location.href = '/';
    } catch (error: unknown) {
      console.error('SignOut Exception:', error);
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key);
        }
      });

      setUser(null);
      setSession(null);
      window.location.href = '/';
    }
  };

  const updateProfile = async (updates: {
    display_name?: string;
    gender?: string;
    photo_url?: string;
  }) => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: updates,
      });

      if (error) {
        toast({
          title: 'Update Error',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully.',
      });
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const resendVerificationEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        toast({
          title: 'Resend Error',
          description: error.message,
          variant: 'destructive',
        });
        return { error };
      }

      toast({
        title: 'Email Sent',
        description: 'Verification email has been resent successfully.',
      });

      return { error: null };
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  const requestOTP = async (email: string, purpose: 'forgot_login' | 'change_password') => {
    try {
      const response = await fetch(`${import.meta.env.VITE_WS_URL || 'http://localhost:3001'}/api/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send OTP');
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

  const verifyOTP = async (email: string, otp: string, purpose: 'forgot_login' | 'change_password') => {
    try {
      const response = await fetch(`${import.meta.env.VITE_WS_URL || 'http://localhost:3001'}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, purpose }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Verification failed');
      return { success: true, resetToken: data.resetToken };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

  const resetPassword = async (resetToken: string, newPassword: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_WS_URL || 'http://localhost:3001'}/api/auth/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Reset failed');
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_WS_URL || 'http://localhost:3001'}/api/auth/password/change`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Change failed');
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      updateProfile,
      resendVerificationEmail,
      requestOTP,
      verifyOTP,
      resetPassword,
      changePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
