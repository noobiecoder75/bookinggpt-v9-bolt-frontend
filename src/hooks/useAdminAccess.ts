import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AdminAccessResult {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  user: any | null;
}

export function useAdminAccess(): AdminAccessResult {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn('Session error:', sessionError);
      }

      if (!session?.user) {
        console.log('No session or user found');
        setIsAdmin(false);
        setUser(null);
        setLoading(false);
        return;
      }

      const currentUser = session.user;
      setUser(currentUser);

      // Check if user has admin role in user_metadata
      const userRole = currentUser.user_metadata?.role;
      console.log('User metadata:', currentUser.user_metadata);
      console.log('User role:', userRole);
      
      // Check if this is the admin email (fallback for development)
      const isAdminEmail = currentUser.email === 'info@bookinggpt.ca';
      const isUserAdmin = userRole === 'admin' || isAdminEmail;

      console.log('Admin check:', { userRole, isAdminEmail, isUserAdmin });
      setIsAdmin(isUserAdmin);

      // If user is admin email but doesn't have admin role, update metadata
      if (isAdminEmail && userRole !== 'admin') {
        console.log('Updating admin user metadata...');
        try {
          await supabase.auth.updateUser({
            data: { role: 'admin' }
          });
          console.log('Admin role updated successfully');
        } catch (updateError) {
          console.warn('Failed to update admin role:', updateError);
        }
      }
      
    } catch (err) {
      console.error('Error checking admin access:', err);
      setError(err instanceof Error ? err.message : 'Failed to check admin access');
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    isAdmin,
    loading,
    error,
    user
  };
}