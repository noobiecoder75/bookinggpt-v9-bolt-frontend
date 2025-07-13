import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { handlePortRedirect } from '../utils/portRedirect';

export function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle port redirect first
        if (handlePortRedirect()) {
          console.log('🔀 Port redirect handled, stopping callback processing');
          return;
        }

        console.log('🔄 Processing OAuth callback...', {
          url: window.location.href,
          hash: window.location.hash,
          search: window.location.search,
          port: window.location.port,
          timestamp: new Date().toISOString()
        });

        // Check if we're in a popup window
        const isPopup = window.opener && window.opener !== window;
        
        if (isPopup) {
          console.log('📱 Detected popup window for OAuth callback');
          
          // Handle OAuth callback in popup
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('🚨 Auth callback error in popup:', error);
            // Send error message to parent window
            window.opener.postMessage({ 
              type: 'oauth_error', 
              error: error.message 
            }, window.location.origin);
            window.close();
            return;
          }

          if (data.session) {
            console.log('✅ OAuth authentication successful in popup:', {
              userId: data.session.user.id,
              email: data.session.user.email,
              provider: data.session.user.app_metadata?.provider
            });
            
            // Send success message to parent window
            window.opener.postMessage({ 
              type: 'oauth_success', 
              session: data.session 
            }, window.location.origin);
            
            setStatus('success');
            
            // Close popup after short delay
            setTimeout(() => {
              window.close();
            }, 1500);
            return;
          }
        }

        // Handle direct navigation (non-popup) OAuth callback
        let authResult;
        
        // First try to get session from hash fragments
        if (window.location.hash) {
          console.log('🔍 Attempting to exchange hash for session...');
          authResult = await supabase.auth.getSession();
        } else {
          // Fallback to regular session check
          authResult = await supabase.auth.getSession();
        }

        const { data, error } = authResult;
        
        if (error) {
          console.error('🚨 Auth callback error:', error);
          setStatus('error');
          setTimeout(() => navigate('/?error=auth_failed'), 2000);
          return;
        }

        if (data.session) {
          console.log('✅ OAuth authentication successful:', {
            userId: data.session.user.id,
            email: data.session.user.email,
            provider: data.session.user.app_metadata?.provider
          });
          
          setStatus('success');
          
          // Redirect to dashboard after short delay
          setTimeout(() => navigate('/'), 1500);
        } else {
          console.warn('⚠️ No session found in auth callback');
          setStatus('error');
          setTimeout(() => navigate('/'), 2000);
        }
      } catch (error) {
        console.error('🚨 Unexpected error in auth callback:', error);
        setStatus('error');
        setTimeout(() => navigate('/?error=unexpected_error'), 2000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white shadow-xl rounded-2xl p-8">
          {status === 'processing' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">Completing sign in...</h2>
              <p className="text-gray-600">Please wait while we verify your authentication.</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">Sign in successful!</h2>
              <p className="text-gray-600">Redirecting you to the dashboard...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">Authentication failed</h2>
              <p className="text-gray-600">Redirecting you back to the login page...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}