import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { GmailOAuthTokens, GmailIntegration } from '../types/gmail';
import { ensureAuthenticatedUser } from './useAuth';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = `${window.location.origin}/oauth/gmail/callback`;

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

export interface UseGoogleOAuthResult {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  gmailIntegration: GmailIntegration | null;
  connect: (useRedirect?: boolean) => Promise<void>;
  disconnect: () => Promise<void>;
  checkConnection: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

// Global flag to prevent multiple OAuth redirect processing
let isProcessingOAuthRedirect = false;

export function useGoogleOAuth(): UseGoogleOAuthResult {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gmailIntegration, setGmailIntegration] = useState<GmailIntegration | null>(null);
  const [hasCheckedConnection, setHasCheckedConnection] = useState(false);

  const exchangeCodeForTokens = useCallback(async (code: string) => {
    try {
      console.log('🔐 Gmail OAuth: Exchanging authorization code for tokens...');
      
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      console.log('🔐 Gmail OAuth: Token exchange response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'unknown_error' }));
        console.error('❌ Gmail OAuth: Token exchange failed:', { 
          status: response.status, 
          error: errorData 
        });
        
        // Handle specific OAuth error codes
        const errorCode = errorData.error || 'unknown_error';
        const errorDescription = errorData.error_description || 'Token exchange failed';
        
        switch (errorCode) {
          case 'invalid_grant':
            throw new Error('Authorization code expired or invalid. Please try connecting again.');
          case 'invalid_client':
            throw new Error('OAuth client configuration error. Please check your Google Cloud Console settings.');
          case 'redirect_uri_mismatch':
            throw new Error('Redirect URI mismatch. Please verify your OAuth configuration.');
          case 'invalid_request':
            throw new Error('Invalid OAuth request. Please try again.');
          case 'unauthorized_client':
            throw new Error('Client not authorized for this request. Please check your OAuth setup.');
          default:
            throw new Error(`OAuth error (${errorCode}): ${errorDescription}`);
        }
      }

      const tokens: GmailOAuthTokens = await response.json();
      tokens.expires_at = Date.now() / 1000 + tokens.expires_in;

      // Get user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        throw new Error('Failed to get user info');
      }

      const userInfo = await userInfoResponse.json();

      // Save integration to Supabase - use authenticated user
      console.log('👤 Gmail OAuth: Getting authenticated user...');
      const user = await ensureAuthenticatedUser();
      if (!user) throw new Error('User not authenticated');
      
      console.log('💾 Gmail OAuth: Saving integration to database...', { 
        userId: user.id, 
        email: userInfo.email 
      });

      const { data, error } = await supabase
        .from('user_integrations')
        .upsert({
          user_id: user.id,
          integration_type: 'gmail',
          email: userInfo.email,
          tokens,
          is_connected: true,
          last_sync: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,integration_type'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Gmail OAuth: Database save failed:', error);
        throw error;
      }
      
      console.log('✅ Gmail OAuth: Integration saved successfully!', { id: data.id });

      setGmailIntegration(data);
      setIsConnected(true);
      setError(null);

    } catch (err: any) {
      console.error('Error exchanging code for tokens:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle OAuth redirect on page load - only run once
  useEffect(() => {
    const handleOAuthRedirect = async () => {
      // Prevent multiple processing
      if (isProcessingOAuthRedirect) return;
      
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      
      // Only process if we have OAuth parameters
      if (!code && !error) return;
      
      // Set flag to prevent re-processing
      isProcessingOAuthRedirect = true;
      
      const returnUrl = sessionStorage.getItem('oauth_return_url');

      if (code) {
        try {
          setIsLoading(true);
          
          // Exchange code for tokens directly here to avoid dependency issues
          const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              code,
              client_id: GOOGLE_CLIENT_ID!,
              client_secret: GOOGLE_CLIENT_SECRET!,
              redirect_uri: REDIRECT_URI,
              grant_type: 'authorization_code',
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to exchange code for tokens');
          }

          const tokens: GmailOAuthTokens = await response.json();
          tokens.expires_at = Date.now() / 1000 + tokens.expires_in;

          // Get user info from Google
          const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
            },
          });

          if (!userInfoResponse.ok) {
            throw new Error('Failed to get user info');
          }

          const userInfo = await userInfoResponse.json();

          // Save integration to Supabase - use authenticated user
          const user = await ensureAuthenticatedUser();
          if (!user) throw new Error('User not authenticated');

          const { data, error: dbError } = await supabase
            .from('user_integrations')
            .upsert({
              user_id: user.id,
              integration_type: 'gmail',
              email: userInfo.email,
              tokens,
              is_connected: true,
              last_sync: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id,integration_type'
            })
            .select()
            .single();

          if (dbError) throw dbError;

          setGmailIntegration(data);
          setIsConnected(true);
          setError(null);
          
          // Clean up URL
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('code');
          newUrl.searchParams.delete('state');
          newUrl.searchParams.delete('scope');
          window.history.replaceState({}, '', newUrl.toString());
          
          // Return to original page if we have a return URL
          if (returnUrl) {
            sessionStorage.removeItem('oauth_return_url');
            setTimeout(() => {
              window.location.href = returnUrl;
            }, 100);
          } else {
            // Reset flag if not redirecting
            isProcessingOAuthRedirect = false;
          }
        } catch (err: any) {
          setError(err.message);
          console.error('OAuth exchange error:', err);
          isProcessingOAuthRedirect = false;
        } finally {
          setIsLoading(false);
        }
      } else if (error) {
        setError(`OAuth error: ${error}`);
        
        // Clean up URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('error');
        newUrl.searchParams.delete('error_description');
        window.history.replaceState({}, '', newUrl.toString());
        
        if (returnUrl) {
          sessionStorage.removeItem('oauth_return_url');
          window.location.href = returnUrl;
        } else {
          isProcessingOAuthRedirect = false;
        }
      }
    };

    handleOAuthRedirect();
  }, []); // Empty dependency array - only run once on mount

  const checkConnection = useCallback(async () => {
    // Prevent multiple connection checks
    if (hasCheckedConnection) return;
    setHasCheckedConnection(true);
    
    try {
      setError(null); // Clear any previous errors
      
      const user = await ensureAuthenticatedUser();
      
      if (!user) {
        setIsConnected(false);
        setGmailIntegration(null);
        return;
      }

      // Check if user has Gmail integration
      const { data, error } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('integration_type', 'gmail')
        .eq('is_connected', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking Gmail connection:', error);
        setError(error.message);
        setIsConnected(false);
        setGmailIntegration(null);
        return;
      }

      if (data) {
        setGmailIntegration(data);
        setIsConnected(true);
        
        // Check if token needs refresh - pass data directly to avoid dependency issues
        const now = Date.now() / 1000;
        if (data.tokens?.expires_at && data.tokens.expires_at < now + 300) { // Refresh if expires in 5 minutes
          try {
            await refreshTokenWithData(data);
          } catch (refreshError) {
            console.warn('Token refresh failed, will retry on next API call:', refreshError);
            // Don't fail the whole connection check just because refresh failed
          }
        }
      } else {
        setIsConnected(false);
        setGmailIntegration(null);
      }
    } catch (err: any) {
      console.error('Error in checkConnection:', err);
      setError(err.message);
      setIsConnected(false);
      setGmailIntegration(null);
    }
  }, [hasCheckedConnection]);

  const connect = useCallback(async (useRedirect = false) => {
    try {
      console.log('🔗 Gmail OAuth: Starting connection process...', { 
        useRedirect, 
        hasClientId: !!GOOGLE_CLIENT_ID,
        redirectUri: REDIRECT_URI,
        timestamp: new Date().toISOString()
      });
      
      setIsLoading(true);
      setError(null);

      if (!GOOGLE_CLIENT_ID) {
        console.error('❌ Gmail OAuth: Google Client ID not configured');
        throw new Error('Google Client ID not configured. Please add VITE_GOOGLE_CLIENT_ID to your environment variables.');
      }

      // Create OAuth URL
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', GMAIL_SCOPES.join(' '));
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', crypto.randomUUID());

      // Use redirect method if requested or if popup fails
      if (useRedirect) {
        console.log('🔗 Gmail OAuth: Using redirect method...', { authUrl: authUrl.toString() });
        // Store current page URL to return to after OAuth
        sessionStorage.setItem('oauth_return_url', window.location.href);
        window.location.href = authUrl.toString();
        return;
      }

      // Try popup method first
      console.log('🔗 Gmail OAuth: Attempting popup method...', { authUrl: authUrl.toString() });
      const popup = window.open(
        authUrl.toString(),
        'gmail-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        console.log('🔗 Gmail OAuth: Popup blocked, falling back to redirect method...');
        // Fallback to redirect method
        sessionStorage.setItem('oauth_return_url', window.location.href);
        window.location.href = authUrl.toString();
        return;
      }

      // Listen for OAuth callback
      const handleOAuthCallback = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        console.log('🔗 Gmail OAuth: Received message from popup...', { 
          type: event.data.type, 
          hasCode: !!event.data.code,
          error: event.data.error 
        });
        
        if (event.data.type === 'GMAIL_OAUTH_SUCCESS') {
          const { code } = event.data;
          console.log('✅ Gmail OAuth: Success! Received authorization code');
          popup.close();
          window.removeEventListener('message', handleOAuthCallback);
          
          await exchangeCodeForTokens(code);
        } else if (event.data.type === 'GMAIL_OAUTH_ERROR') {
          console.error('❌ Gmail OAuth: Error received from popup:', event.data.error);
          popup.close();
          window.removeEventListener('message', handleOAuthCallback);
          throw new Error(event.data.error || 'OAuth failed');
        }
      };

      window.addEventListener('message', handleOAuthCallback);

      // Note: We don't check popup.closed due to Cross-Origin-Opener-Policy restrictions
      // The postMessage communication will handle success/failure notifications

      // Add timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        window.removeEventListener('message', handleOAuthCallback);
        setIsLoading(false);
        setError('OAuth process timed out. Please try again.');
        try {
          popup.close();
        } catch (e) {
          console.debug('Could not close popup window:', e);
        }
      }, 60000); // 60 second timeout

      // Wrap callback to clean up timeout
      const originalCallback = handleOAuthCallback;
      const wrappedCallback = async (event: MessageEvent) => {
        clearTimeout(timeout);
        await originalCallback(event);
      };
      
      // Replace the event listener with wrapped version
      window.removeEventListener('message', handleOAuthCallback);
      window.addEventListener('message', wrappedCallback);

    } catch (err: any) {
      console.error('Error in connect:', err);
      setError(err.message);
      setIsLoading(false);
    }
  }, []);



  // Internal function to refresh tokens with specific integration data
  const refreshTokenWithData = async (integration: GmailIntegration, retryCount = 0): Promise<boolean> => {
    if (!integration?.tokens?.refresh_token) {
      throw new Error('No refresh token available');
    }

    const maxRetries = 3;
    const baseDelay = 1000; // 1 second
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      console.log(`🔄 Gmail OAuth: Refreshing token (attempt ${retryCount + 1}/${maxRetries + 1})...`);
      
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          refresh_token: integration.tokens.refresh_token,
          grant_type: 'refresh_token',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'unknown_error' }));
        const errorCode = errorData.error || 'unknown_error';
        
        console.error('❌ Gmail OAuth: Token refresh failed:', { 
          status: response.status, 
          error: errorData,
          attempt: retryCount + 1
        });
        
        // Handle specific error codes - some should not be retried
        switch (errorCode) {
          case 'invalid_grant':
            // Refresh token is revoked or expired - don't retry
            throw new Error('Gmail access token expired and refresh token is invalid. Please reconnect your Gmail account.');
          case 'invalid_client':
            // Client configuration error - don't retry
            throw new Error('OAuth client configuration error. Please check your Google Cloud Console settings.');
          default:
            // For other errors, check if we should retry
            if (retryCount < maxRetries) {
              const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
              console.log(`⏳ Gmail OAuth: Retrying token refresh in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              return refreshTokenWithData(integration, retryCount + 1);
            }
            throw new Error(`Failed to refresh token after ${maxRetries + 1} attempts: ${errorData.error_description || errorCode}`);
        }
      }

      const newTokens = await response.json();
      const updatedTokens: GmailOAuthTokens = {
        ...integration.tokens,
        access_token: newTokens.access_token,
        expires_in: newTokens.expires_in,
        expires_at: Date.now() / 1000 + newTokens.expires_in,
      };

      // Update tokens in database
      const { data, error } = await supabase
        .from('user_integrations')
        .update({
          tokens: updatedTokens,
          updated_at: new Date().toISOString(),
        })
        .eq('id', integration.id)
        .select()
        .single();

      if (error) throw error;

      setGmailIntegration(data);
      return true;

    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Error refreshing token:', err);
      throw err; // Re-throw so caller can handle
    }
  };

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      if (!gmailIntegration) {
        throw new Error('No Gmail integration available');
      }
      return await refreshTokenWithData(gmailIntegration);
    } catch (err: any) {
      console.error('Error refreshing token:', err);
      setError(err.message);
      return false;
    }
  }, [gmailIntegration]);

  const disconnect = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!gmailIntegration) return;

      // Revoke Google token
      if (gmailIntegration.tokens.access_token) {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${gmailIntegration.tokens.access_token}`, {
          method: 'POST',
        });
      }

      // Update database
      const { error } = await supabase
        .from('user_integrations')
        .update({
          is_connected: false,
          tokens: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gmailIntegration.id);

      if (error) throw error;

      setIsConnected(false);
      setGmailIntegration(null);

    } catch (err: any) {
      console.error('Error disconnecting Gmail:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [gmailIntegration]);

  return {
    isConnected,
    isLoading,
    error,
    gmailIntegration,
    connect,
    disconnect,
    checkConnection,
    refreshToken,
  };
}