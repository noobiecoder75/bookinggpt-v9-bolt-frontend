import React, { useState, useEffect } from 'react';
import { Mail, Send, TestTube, Settings, AlertCircle, CheckCircle, Users, MessageCircle } from 'lucide-react';
import { useGoogleOAuth } from '../../hooks/useGoogleOAuth';
import { gmailApi, createWelcomeEmail, createQuoteEmail } from '../../lib/gmailApi';
import { EmailMessage } from '../../types/gmail';

export function GmailIntegrationTab() {
  const {
    isConnected,
    isLoading,
    error,
    gmailIntegration,
    connect,
    disconnect,
    checkConnection,
  } = useGoogleOAuth();

  const [testingConnection, setTestingConnection] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [emailStats, setEmailStats] = useState({
    totalSent: 0,
    lastSent: null as string | null,
    todaySent: 0,
  });

  useEffect(() => {
    // Only check connection once on mount
    checkConnection();
  }, []); // Empty dependency array to run only once

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const isWorking = await gmailApi.testConnection();
      if (isWorking) {
        alert('Gmail connection test successful! ✅');
      } else {
        alert('Gmail connection test failed. Please check your connection and try again.');
      }
    } catch (error) {
      alert('Gmail connection test failed: ' + (error as Error).message);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress) {
      alert('Please enter a test email address');
      return;
    }

    setSendingTestEmail(true);
    try {
      const testEmail: EmailMessage = {
        to: [testEmailAddress],
        subject: 'Test Email from BookingGPT Travel CRM',
        body: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Gmail Integration Test</h2>
                <p>This is a test email sent from your BookingGPT Travel CRM system.</p>
                <p>If you're receiving this email, your Gmail integration is working correctly!</p>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Integration Details:</strong></p>
                  <ul>
                    <li>Connected Email: ${gmailIntegration?.email}</li>
                    <li>Test Time: ${new Date().toLocaleString()}</li>
                    <li>System: BookingGPT Travel CRM</li>
                  </ul>
                </div>
                <p>Best regards,<br>Your Travel CRM System</p>
              </div>
            </body>
          </html>
        `,
      };

      const result = await gmailApi.sendEmail(testEmail);
      
      if (result.success) {
        alert('Test email sent successfully! ✅');
        setTestEmailAddress('');
      } else {
        alert('Failed to send test email: ' + result.error);
      }
    } catch (error) {
      alert('Error sending test email: ' + (error as Error).message);
    } finally {
      setSendingTestEmail(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-gray-600">Loading Gmail integration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Gmail Connection Status
            </h3>
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-green-600">Connected</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span className="text-sm font-medium text-red-600">Not Connected</span>
                </>
              )}
            </div>
          </div>

          {isConnected && gmailIntegration ? (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <Mail className="h-5 w-5 text-green-400" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-green-800">
                      Successfully connected to Gmail
                    </h4>
                    <div className="mt-2 text-sm text-green-700">
                      <p><strong>Email:</strong> {gmailIntegration.email}</p>
                      <p><strong>Connected:</strong> {new Date(gmailIntegration.created_at).toLocaleString()}</p>
                      <p><strong>Last Updated:</strong> {new Date(gmailIntegration.updated_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {testingConnection ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={disconnect}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                >
                  {isLoading ? 'Disconnecting...' : 'Disconnect Gmail'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-yellow-800">
                      Gmail not connected
                    </h4>
                    <p className="mt-1 text-sm text-yellow-700">
                      Connect your Gmail account to send emails on behalf of your agency and track email communication with clients.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => connect(false)}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {isLoading ? 'Connecting...' : 'Connect Gmail Account (Popup)'}
                </button>
                <button
                  onClick={() => connect(true)}
                  disabled={isLoading}
                  className="inline-flex items-center px-3 py-2 border border-indigo-300 text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Alternative: Use Redirect Method
                </button>
                <p className="text-xs text-gray-500">
                  If the popup method doesn't work due to browser security settings, try the redirect method.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-red-800">Connection Error</h4>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                  
                  {/* Specific error handling and suggestions */}
                  {error.includes('Cross-Origin-Opener-Policy') && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>Browser Security Issue:</strong> Your browser's security settings are blocking the popup authentication method. 
                        Please try the "Alternative: Use Redirect Method" button above, which works around this limitation.
                      </p>
                    </div>
                  )}
                  
                  {error.includes('Authorization code expired') && (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">
                        <strong>Quick Fix:</strong> The authorization process took too long. Please try connecting again and complete the process more quickly.
                      </p>
                    </div>
                  )}
                  
                  {error.includes('OAuth client configuration') && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">
                        <strong>Configuration Issue:</strong> There's a problem with the Google Cloud Console setup. Please check:
                        <br />• Client ID and Client Secret are correct
                        <br />• Redirect URI is properly configured: {window.location.origin}/oauth/gmail/callback
                        <br />• Gmail API is enabled in your Google Cloud project
                      </p>
                    </div>
                  )}
                  
                  {error.includes('refresh token is invalid') && (
                    <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
                      <p className="text-sm text-orange-800">
                        <strong>Re-authentication Required:</strong> Your Gmail connection has expired. Please disconnect and reconnect your Gmail account.
                      </p>
                    </div>
                  )}
                  
                  {error.includes('User not authenticated') && (
                    <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-md">
                      <p className="text-sm text-purple-800">
                        <strong>Session Issue:</strong> You need to be logged in to connect Gmail. Please refresh the page and try again.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Test Email Functionality */}
      {isConnected && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Test Email Functionality
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Send a test email to verify that your Gmail integration is working correctly.
            </p>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="test-email" className="block text-sm font-medium text-gray-700">
                  Test Email Address
                </label>
                <div className="mt-1">
                  <input
                    type="email"
                    id="test-email"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Enter email address to send test email"
                  />
                </div>
              </div>
              
              <button
                onClick={handleSendTestEmail}
                disabled={sendingTestEmail || !testEmailAddress}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendingTestEmail ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Templates Preview */}
      {isConnected && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Email Templates
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Preview of email templates that will be used for customer communication.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Users className="h-4 w-4 text-blue-500 mr-2" />
                  <h4 className="text-sm font-medium text-gray-900">Welcome Email</h4>
                </div>
                <p className="text-xs text-gray-600 mb-2">
                  Sent when a new customer is added to the system
                </p>
                <div className="bg-gray-50 p-2 rounded text-xs text-gray-700">
                  Subject: Welcome [Customer Name]! Your travel planning journey begins
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <MessageCircle className="h-4 w-4 text-green-500 mr-2" />
                  <h4 className="text-sm font-medium text-gray-900">Quote Email</h4>
                </div>
                <p className="text-xs text-gray-600 mb-2">
                  Sent when a new quote is ready for customer review
                </p>
                <div className="bg-gray-50 p-2 rounded text-xs text-gray-700">
                  Subject: Your Travel Quote is Ready - [Quote ID]
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OAuth Configuration Guide */}
      {!isConnected && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Setup Instructions
            </h3>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">
                  Before connecting Gmail, you'll need:
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Google Cloud Console project with Gmail API enabled</li>
                  <li>• OAuth 2.0 client credentials configured</li>
                  <li>• Environment variables set: VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_SECRET</li>
                  <li>• Authorized redirect URI: {window.location.origin}/oauth/gmail/callback</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-gray-800 mb-2">Required Gmail Scopes:</h4>
                <ul className="text-sm text-gray-600 space-y-1 font-mono">
                  <li>• gmail.send (Send emails on your behalf)</li>
                  <li>• userinfo.email (Get your email address)</li>
                  <li>• userinfo.profile (Get your profile info)</li>
                </ul>
                <p className="text-xs text-gray-500 mt-2">
                  Note: This app only needs to send emails, not read them. The minimal scope set improves security and reduces permission complexity.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}