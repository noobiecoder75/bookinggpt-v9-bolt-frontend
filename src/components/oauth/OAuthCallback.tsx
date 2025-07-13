import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ArrowLeft, Settings, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GmailOAuthTokens } from '../../types/gmail';
import { ensureAuthenticatedUser } from '../../hooks/useAuth';

type OAuthState = 'loading' | 'success' | 'error' | 'processing';

export function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<OAuthState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  // OAuth configuration
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
  const REDIRECT_URI = `${window.location.origin}/oauth/gmail/callback`;

  // Extract OAuth parameters
  const code = searchParams.get('code');
  const oauthError = searchParams.get('error');
  const oauthState = searchParams.get('state');

  // Exchange authorization code for tokens
  const exchangeCodeForTokens = async (code: string) => {
    console.log('🔐 OAuth Callback: Exchanging authorization code for tokens...');
    
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
      const errorData = await response.json().catch(() => ({ error: 'unknown_error' }));
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

    // Save integration to Supabase
    const user = await ensureAuthenticatedUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: user.id,
        integration_type: 'gmail',
        email: userInfo.email,
        tokens,
        is_connected: true,
        last_sync: new Date().toISOString(),
      });

    if (error) {
      throw new Error(`Failed to save integration: ${error.message}`);
    }
  };

  useEffect(() => {
    const processOAuth = async () => {
      try {
        console.log('🔗 OAuth Callback: Processing OAuth response...', {
          hasCode: !!code,
          error: oauthError,
          state: oauthState
        });

        if (oauthError) {
          console.error('❌ OAuth Callback: OAuth error received:', oauthError);
          setError(getErrorMessage(oauthError));
          setState('error');
          return;
        }

        if (!code) {
          console.error('❌ OAuth Callback: No authorization code received');
          setError('No authorization code received from Google. Please try connecting again.');
          setState('error');
          return;
        }

        // Process the authorization code
        setState('processing');
        console.log('🔄 OAuth Callback: Exchanging code for tokens...');
        
        // Exchange code for tokens
        await exchangeCodeForTokens(code);
        
        console.log('✅ OAuth Callback: OAuth success!');
        setState('success');
        
        // Start countdown for auto-redirect
        startCountdown();
        
      } catch (err: any) {
        console.error('❌ OAuth Callback: Error processing OAuth:', err);
        setError(err.message || 'Failed to complete Gmail authorization');
        setState('error');
      }
    };

    processOAuth();
  }, [code, oauthError, oauthState, exchangeCodeForTokens]);

  const startCountdown = () => {
    let timeLeft = 5;
    setCountdown(timeLeft);
    
    const timer = setInterval(() => {
      timeLeft -= 1;
      setCountdown(timeLeft);
      
      if (timeLeft === 0) {
        clearInterval(timer);
        returnToSettings();
      }
    }, 1000);
  };

  const returnToSettings = () => {
    // Check if we have a return URL in sessionStorage
    const returnUrl = sessionStorage.getItem('oauth_return_url');
    if (returnUrl) {
      sessionStorage.removeItem('oauth_return_url');
      window.location.href = returnUrl;
    } else {
      navigate('/settings');
    }
  };

  const retryConnection = () => {
    navigate('/settings');
  };

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'access_denied':
        return 'Authorization was cancelled. Gmail access is required to send emails.';
      case 'invalid_request':
        return 'Invalid authorization request. Please try again.';
      case 'unauthorized_client':
        return 'Application not authorized. Please check the OAuth configuration.';
      case 'unsupported_response_type':
        return 'Unsupported response type. Please contact support.';
      case 'invalid_scope':
        return 'Invalid permissions requested. Please contact support.';
      case 'server_error':
        return 'Google server error. Please try again in a few moments.';
      case 'temporarily_unavailable':
        return 'Google services temporarily unavailable. Please try again later.';
      default:
        return `Authorization failed (${errorCode}). Please try again.`;
    }
  };

  const renderContent = () => {
    switch (state) {
      case 'loading':
        return (
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-indigo-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Processing Authorization...
            </h2>
            <p className="text-gray-600">
              Please wait while we complete your Gmail connection.
            </p>
          </div>
        );

      case 'processing':
        return (
          <div className="text-center">
            <div className="relative mb-4">
              <Loader2 className="h-12 w-12 text-indigo-600 mx-auto animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Settings className="h-6 w-6 text-indigo-800 animate-pulse" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connecting Gmail...
            </h2>
            <p className="text-gray-600">
              Exchanging authorization code for access tokens.
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Gmail Connected Successfully!
            </h2>
            <p className="text-gray-600 mb-6">
              You can now send emails directly from the communications dashboard.
            </p>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800">
                Redirecting to settings in {countdown} second{countdown !== 1 ? 's' : ''}...
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={returnToSettings}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Settings Now
              </button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connection Failed
            </h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">
                {error || 'An unexpected error occurred during authorization.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={retryConnection}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </button>
              <button
                onClick={returnToSettings}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Settings
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Handle popup window communication
  useEffect(() => {
    // If this is running in a popup window, send message to parent
    if (window.opener && window.opener !== window) {
      const sendMessage = (type: string, data: any = {}) => {
        try {
          window.opener.postMessage({
            type,
            ...data
          }, window.location.origin);
        } catch (err) {
          console.warn('Failed to send message to parent window:', err);
        }
      };

      if (state === 'success') {
        sendMessage('GMAIL_OAUTH_SUCCESS', { code, state: oauthState });
        // Close popup after a short delay
        setTimeout(() => {
          try {
            window.close();
          } catch (err) {
            console.warn('Could not close popup window:', err);
          }
        }, 2000);
      } else if (state === 'error') {
        sendMessage('GMAIL_OAUTH_ERROR', { error: error || 'Authorization failed' });
        // Close popup after a delay
        setTimeout(() => {
          try {
            window.close();
          } catch (err) {
            console.warn('Could not close popup window:', err);
          }
        }, 3000);
      }
    }
  }, [state, error, code, oauthState]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Gmail Authorization</h1>
            <p className="text-sm text-gray-600 mt-2">
              Completing your Gmail integration
            </p>
          </div>
          
          {renderContent()}
          
          {/* Footer information */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              This window will close automatically, or you can navigate back to settings manually.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}