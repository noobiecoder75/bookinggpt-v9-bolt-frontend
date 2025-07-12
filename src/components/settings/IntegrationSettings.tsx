import React, { useState, useEffect } from 'react';
import { Globe, Database, CreditCard, MessageSquare, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { useGoogleOAuth } from '../../hooks/useGoogleOAuth';
import { gmailApi } from '../../lib/gmailApi';
import { TravelProviderSettings } from './TravelProviderSettings';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'connected' | 'disconnected';
  lastSync?: string;
}

export function IntegrationSettings() {
  const [integrations] = useState<Integration[]>([
    {
      id: 'gds',
      name: 'Global Distribution System',
      description: 'Connect to major travel inventory providers',
      icon: <Globe className="h-8 w-8" />,
      status: 'connected',
      lastSync: '2025-02-15T10:30:00Z',
    },
    {
      id: 'crm',
      name: 'CRM System',
      description: 'Sync customer data with your CRM',
      icon: <Database className="h-8 w-8" />,
      status: 'disconnected',
    },
    {
      id: 'payment',
      name: 'Payment Gateway',
      description: 'Process payments securely',
      icon: <CreditCard className="h-8 w-8" />,
      status: 'connected',
      lastSync: '2025-02-15T11:45:00Z',
    },
    {
      id: 'chat',
      name: 'Customer Chat',
      description: 'Live chat integration for customer support',
      icon: <MessageSquare className="h-8 w-8" />,
      status: 'disconnected',
    },
  ]);

  const {
    isConnected: gmailConnected,
    isLoading: gmailLoading,
    error: gmailError,
    gmailIntegration,
    connect: connectGmail,
    disconnect: disconnectGmail,
    checkConnection: checkGmailConnection,
  } = useGoogleOAuth();

  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    checkGmailConnection();
  }, [checkGmailConnection]);

  const handleTestGmailConnection = async () => {
    setTestingConnection(true);
    try {
      const isWorking = await gmailApi.testConnection();
      if (isWorking) {
        alert('Gmail connection test successful!');
      } else {
        alert('Gmail connection test failed. Please check your connection.');
      }
    } catch (error) {
      alert('Gmail connection test failed: ' + (error as Error).message);
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900">Integrations</h2>
        <button className="text-sm text-indigo-600 hover:text-indigo-900">
          View Integration Logs
        </button>
      </div>

      {/* Travel API Providers Section */}
      <div className="mb-12">
        <TravelProviderSettings onConfigurationChange={() => {
          console.log('Travel provider configuration changed');
        }} />
      </div>

      {/* Gmail Integration - Special Card */}
      <div className="bg-white shadow sm:rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="p-2 bg-red-100 rounded-lg text-red-600">
                <Mail className="h-8 w-8" />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Gmail Integration</h3>
                <div className="flex items-center space-x-2">
                  {gmailConnected ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Connected
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-gray-400" />
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Not Connected
                      </span>
                    </>
                  )}
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Connect your Gmail account to send emails on behalf of your agency and track email communication with clients.
              </p>
              {gmailConnected && gmailIntegration && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-600">
                    <strong>Connected as:</strong> {gmailIntegration.email}
                  </p>
                  <p className="text-sm text-gray-500">
                    Last synced: {new Date(gmailIntegration.last_sync || gmailIntegration.updated_at).toLocaleString()}
                  </p>
                </div>
              )}
              {gmailError && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{gmailError}</p>
                </div>
              )}
              <div className="mt-4">
                {gmailConnected ? (
                  <div className="space-x-3">
                    <button
                      onClick={handleTestGmailConnection}
                      disabled={testingConnection}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      {testingConnection ? 'Testing...' : 'Test Connection'}
                    </button>
                    <button
                      onClick={disconnectGmail}
                      disabled={gmailLoading}
                      className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                    >
                      {gmailLoading ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={connectGmail}
                    disabled={gmailLoading}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    {gmailLoading ? 'Connecting...' : 'Connect Gmail'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className="bg-white shadow sm:rounded-lg overflow-hidden"
          >
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                    {integration.icon}
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">
                      {integration.name}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        integration.status === 'connected'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {integration.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {integration.description}
                  </p>
                  {integration.lastSync && (
                    <p className="mt-2 text-sm text-gray-500">
                      Last synced: {new Date(integration.lastSync).toLocaleString()}
                    </p>
                  )}
                  <div className="mt-4">
                    {integration.status === 'connected' ? (
                      <div className="space-x-3">
                        <button className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700">
                          Configure
                        </button>
                        <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50">
                          Test Connection
                        </button>
                        <button className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50">
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <button className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700">
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Webhook Configuration */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Webhook Configuration</h3>
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Webhook URL
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="https://your-domain.com/webhook"
                  />
                  <button className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 text-sm">
                    Test
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Secret Key
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="password"
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value="••••••••••••••••"
                    readOnly
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Events to Send
                </label>
                <div className="mt-2 space-y-2">
                  {['Booking Created', 'Payment Received', 'Quote Updated'].map((event) => (
                    <div key={event} className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        defaultChecked
                      />
                      <label className="ml-2 text-sm text-gray-700">
                        {event}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}