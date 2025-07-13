import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export interface UseAuthResult {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInAsAdmin: () => Promise<void>;
}

// Admin credentials for development
const ADMIN_EMAIL = 'info@bookinggpt.ca';
const ADMIN_PASSWORD = 'admin123';

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔐 Console debugging for authentication
  console.log('🔐 useAuth hook initialized', {
    devMode: import.meta.env.VITE_DEV_MODE,
    timestamp: new Date().toISOString()
  });

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      console.log('🔐 Starting sign in process...', { email, timestamp: new Date().toISOString() });
      setLoading(true);
      setError(null);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('🚨 Sign in error:', signInError);
        throw signInError;
      }

      if (data.user) {
        console.log('✅ Sign in successful:', { 
          userId: data.user.id, 
          email: data.user.email,
          timestamp: new Date().toISOString()
        });
        
        const authUser: User = {
          id: data.user.id,
          email: data.user.email || email,
          user_metadata: data.user.user_metadata
        };
        
        setUser(authUser);
        setError(null);
      }
    } catch (err: any) {
      console.error('🚨 Sign in failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      console.log('🔐 Starting sign up process...', { email, timestamp: new Date().toISOString() });
      setLoading(true);
      setError(null);

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        console.error('🚨 Sign up error:', signUpError);
        throw signUpError;
      }

      if (data.user) {
        console.log('✅ Sign up successful:', { 
          userId: data.user.id, 
          email: data.user.email,
          needsConfirmation: !data.user.email_confirmed_at,
          timestamp: new Date().toISOString()
        });
        
        if (data.user.email_confirmed_at) {
          const authUser: User = {
            id: data.user.id,
            email: data.user.email || email,
            user_metadata: data.user.user_metadata
          };
          setUser(authUser);
        }
        setError(null);
      }
    } catch (err: any) {
      console.error('🚨 Sign up failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signInAsAdmin = useCallback(async () => {
    try {
      console.log('🔐 Starting admin auto-login...', { timestamp: new Date().toISOString() });
      setLoading(true);
      setError(null);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      });

      if (signInError) {
        console.error('🚨 Admin sign in error:', signInError);
        throw signInError;
      }

      if (data.user) {
        console.log('✅ Admin sign in successful:', { 
          userId: data.user.id, 
          email: data.user.email,
          timestamp: new Date().toISOString()
        });
        
        const authUser: User = {
          id: data.user.id,
          email: data.user.email || ADMIN_EMAIL,
          user_metadata: data.user.user_metadata
        };
        
        setUser(authUser);
        setError(null);
      }
    } catch (err: any) {
      console.error('🚨 Admin sign in failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      console.log('🔐 Starting sign out process...', { timestamp: new Date().toISOString() });
      setLoading(true);

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('🚨 Sign out error:', error);
        throw error;
      }

      console.log('✅ Sign out successful', { timestamp: new Date().toISOString() });
      setUser(null);
      setError(null);
    } catch (err: any) {
      console.error('🚨 Sign out failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const initializeAuth = useCallback(async () => {
    try {
      console.log('🔐 Initializing authentication...', { 
        devMode: import.meta.env.VITE_DEV_MODE,
        timestamp: new Date().toISOString()
      });
      
      setLoading(true);
      setError(null);

      // Check for existing session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn('⚠️ Session check error:', sessionError);
      }

      if (session?.user) {
        console.log('✅ Found existing session:', { 
          userId: session.user.id, 
          email: session.user.email,
          timestamp: new Date().toISOString()
        });
        
        const authUser: User = {
          id: session.user.id,
          email: session.user.email || '',
          user_metadata: session.user.user_metadata
        };
        
        setUser(authUser);
        setLoading(false);
        return;
      }

      // Development mode: auto-login as admin
      if (import.meta.env.VITE_DEV_MODE === 'true') {
        console.log('🔧 Development mode enabled - attempting admin auto-login...', {
          adminEmail: ADMIN_EMAIL,
          timestamp: new Date().toISOString()
        });
        
        try {
          await signInAsAdmin();
          return;
        } catch (adminError) {
          console.warn('⚠️ Admin auto-login failed, continuing without auth:', adminError);
        }
      }

      // No session found and not in dev mode
      console.log('📱 No existing session found', { timestamp: new Date().toISOString() });
      setUser(null);
      
    } catch (err: any) {
      console.error('🚨 Auth initialization error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [signInAsAdmin]);

  // Initialize auth on mount
  useEffect(() => {
    console.log('🎣 useAuth useEffect triggered - initializing auth...', {
      timestamp: new Date().toISOString()
    });
    initializeAuth();
  }, [initializeAuth]);

  // Listen for auth changes
  useEffect(() => {
    console.log('🎣 Setting up auth state listener...', { timestamp: new Date().toISOString() });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', { 
          event, 
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email,
          timestamp: new Date().toISOString()
        });

        if (session?.user) {
          const authUser: User = {
            id: session.user.id,
            email: session.user.email || '',
            user_metadata: session.user.user_metadata
          };
          setUser(authUser);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      console.log('🧹 Cleaning up auth state listener...', { timestamp: new Date().toISOString() });
      subscription.unsubscribe();
    };
  }, []);

  // Debug current state
  console.log('🔐 useAuth current state:', {
    hasUser: !!user,
    userId: user?.id,
    email: user?.email,
    loading,
    error,
    timestamp: new Date().toISOString()
  });

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    signInAsAdmin,
  };
}

// Helper function to ensure user is authenticated (for use in other hooks)
export async function ensureAuthenticatedUser(): Promise<User> {
  console.log('🔐 ensureAuthenticatedUser called...', { timestamp: new Date().toISOString() });
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('🚨 Error getting user:', error);
      throw error;
    }

    if (!user) {
      console.warn('⚠️ No authenticated user found');
      throw new Error('No authenticated user');
    }

    console.log('✅ Authenticated user found:', { 
      userId: user.id, 
      email: user.email,
      timestamp: new Date().toISOString()
    });

    return {
      id: user.id,
      email: user.email || '',
      user_metadata: user.user_metadata
    };
  } catch (err) {
    console.error('🚨 ensureAuthenticatedUser failed:', err);
    throw err;
  }
}