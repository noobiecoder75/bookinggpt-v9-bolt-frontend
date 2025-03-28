import React, { useState } from 'react';
import { Globe, Database, CreditCard, MessageSquare } from 'lucide-react';

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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900">Integrations</h2>
        <button className="text-sm text-indigo-600 hover:text-indigo-900">
          View Integration Logs
        </button>
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