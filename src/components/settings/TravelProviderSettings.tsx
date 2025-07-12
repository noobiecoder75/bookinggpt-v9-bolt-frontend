import React, { useState, useEffect } from 'react';
import { 
  Plane, 
  Building, 
  MapPin, 
  CheckCircle, 
  AlertCircle, 
  Settings, 
  Plus,
  Trash2,
  Eye,
  EyeOff,
  TestTube
} from 'lucide-react';
import { providerFactory } from '../../lib/providers/ProviderFactory';
import { getProviderDefinitionsByType, getProviderDefinition } from '../../lib/providers/providerRegistry';
import { TravelProviderConfig } from '../../types/travelConfig';

interface TravelProviderSettingsProps {
  onConfigurationChange?: () => void;
}

export function TravelProviderSettings({ onConfigurationChange }: TravelProviderSettingsProps) {
  const [hotelConfigs, setHotelConfigs] = useState<TravelProviderConfig[]>([]);
  const [flightConfigs, setFlightConfigs] = useState<TravelProviderConfig[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<TravelProviderConfig | null>(null);
  const [selectedType, setSelectedType] = useState<'hotel' | 'flight' | 'activity'>('hotel');
  const [testingProviders, setTestingProviders] = useState<Set<string>>(new Set());
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      // Load from localStorage for now (will integrate with Supabase later)
      const stored = localStorage.getItem('travel_provider_configs');
      if (stored) {
        const configs = JSON.parse(stored);
        setHotelConfigs(configs.filter((c: TravelProviderConfig) => c.type === 'hotel'));
        setFlightConfigs(configs.filter((c: TravelProviderConfig) => c.type === 'flight'));
      }
    } catch (error) {
      console.error('Failed to load travel provider configurations:', error);
    }
  };

  const saveConfigurations = async (allConfigs: TravelProviderConfig[]) => {
    try {
      localStorage.setItem('travel_provider_configs', JSON.stringify(allConfigs));
      
      // Update provider factory
      allConfigs.forEach(config => {
        providerFactory.setProviderConfig(config.name, {
          name: config.name,
          enabled: config.enabled,
          credentials: config.credentials,
          settings: config.settings
        });
      });

      onConfigurationChange?.();
    } catch (error) {
      console.error('Failed to save travel provider configurations:', error);
    }
  };

  const handleAddProvider = (type: 'hotel' | 'flight' | 'activity') => {
    setSelectedType(type);
    setShowAddModal(true);
  };

  const handleEditProvider = (config: TravelProviderConfig) => {
    setEditingConfig(config);
    setShowEditModal(true);
  };

  const handleDeleteProvider = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this provider configuration?')) {
      return;
    }

    const allConfigs = [...hotelConfigs, ...flightConfigs].filter(c => c.id !== configId);
    await saveConfigurations(allConfigs);
    await loadConfigurations();
  };

  const handleTestProvider = async (config: TravelProviderConfig) => {
    setTestingProviders(prev => new Set(prev).add(config.id));
    
    try {
      // Configure the provider
      providerFactory.setProviderConfig(config.name, {
        name: config.name,
        enabled: config.enabled,
        credentials: config.credentials,
        settings: config.settings
      });

      // Test connection
      const success = await providerFactory.testProvider(config.type, config.name);
      
      // Update config status
      const allConfigs = [...hotelConfigs, ...flightConfigs];
      const configIndex = allConfigs.findIndex(c => c.id === config.id);
      if (configIndex !== -1) {
        allConfigs[configIndex] = {
          ...allConfigs[configIndex],
          status: success ? 'connected' : 'error',
          lastTested: new Date().toISOString(),
          errorMessage: success ? undefined : 'Connection test failed'
        };
        await saveConfigurations(allConfigs);
        await loadConfigurations();
      }

      if (success) {
        alert(`✅ ${config.displayName} connection test successful!`);
      } else {
        alert(`❌ ${config.displayName} connection test failed.\n\nPossible issues:\n• Backend server not running\n• Incorrect endpoint URL\n• Invalid credentials\n• Missing test endpoint in backend\n\nCheck the console for more details.`);
      }
    } catch (error) {
      console.error('Provider test failed:', error);
      
      let errorMessage = 'Connection test failed.';
      if (error instanceof Error) {
        if (error.message.includes('not properly configured')) {
          errorMessage = `❌ ${config.displayName} is not properly configured.\n\nPlease ensure all required credentials are filled out.`;
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = `❌ Cannot connect to backend server.\n\nPlease ensure:\n• Backend server is running\n• Endpoint URL is correct: ${config.credentials.endpoint || 'Not set'}\n• No network connectivity issues`;
        } else {
          errorMessage = `❌ ${config.displayName} test failed: ${error.message}`;
        }
      }
      
      alert(errorMessage);
    } finally {
      setTestingProviders(prev => {
        const newSet = new Set(prev);
        newSet.delete(config.id);
        return newSet;
      });
    }
  };

  const toggleCredentialVisibility = (configId: string) => {
    setShowCredentials(prev => ({
      ...prev,
      [configId]: !prev[configId]
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      connected: 'bg-green-100 text-green-800',
      disconnected: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800',
      testing: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || colors.disconnected}`}>
        {status}
      </span>
    );
  };

  const renderProviderCard = (config: TravelProviderConfig) => {
    const definition = getProviderDefinition(config.type, config.provider);
    const isTesting = testingProviders.has(config.id);
    const showCreds = showCredentials[config.id];

    return (
      <div key={config.id} className="bg-white shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className={`p-2 rounded-lg ${config.type === 'hotel' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                {config.type === 'hotel' ? <Building className="h-8 w-8" /> : <Plane className="h-8 w-8" />}
              </div>
            </div>
            <div className="ml-4 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {config.displayName}
                </h3>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(config.status)}
                  {getStatusBadge(config.status)}
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {config.description}
              </p>
              
              {/* Credentials Preview */}
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">Credentials</h4>
                  <button
                    onClick={() => toggleCredentialVisibility(config.id)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    {showCreds ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-1 space-y-1">
                  {definition?.requiredCredentials.map(cred => (
                    <div key={cred.key} className="text-sm text-gray-600">
                      <span className="font-medium">{cred.displayName}:</span>{' '}
                      <span className="font-mono">
                        {showCreds 
                          ? config.credentials[cred.key] || 'Not set'
                          : config.credentials[cred.key] ? '••••••••' : 'Not set'
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {config.lastTested && (
                <p className="mt-2 text-sm text-gray-500">
                  Last tested: {new Date(config.lastTested).toLocaleString()}
                </p>
              )}
              
              {config.errorMessage && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{config.errorMessage}</p>
                </div>
              )}

              <div className="mt-4 flex space-x-3">
                <button
                  onClick={() => handleTestProvider(config)}
                  disabled={isTesting}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  {isTesting ? (
                    <>
                      <TestTube className="h-3 w-3 mr-1 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-3 w-3 mr-1" />
                      Test Connection
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleEditProvider(config)}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Configure
                </button>
                <button
                  onClick={() => handleDeleteProvider(config.id)}
                  className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900">Travel API Providers</h2>
        <div className="space-x-2">
          <button
            onClick={() => handleAddProvider('hotel')}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Hotel Provider
          </button>
          <button
            onClick={() => handleAddProvider('flight')}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Flight Provider
          </button>
        </div>
      </div>

      {/* Hotel Providers */}
      {hotelConfigs.length > 0 && (
        <div className="mb-8">
          <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
            <Building className="h-5 w-5 mr-2 text-blue-600" />
            Hotel Providers ({hotelConfigs.length})
          </h3>
          <div className="space-y-4">
            {hotelConfigs.map(renderProviderCard)}
          </div>
        </div>
      )}

      {/* Flight Providers */}
      {flightConfigs.length > 0 && (
        <div className="mb-8">
          <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
            <Plane className="h-5 w-5 mr-2 text-purple-600" />
            Flight Providers ({flightConfigs.length})
          </h3>
          <div className="space-y-4">
            {flightConfigs.map(renderProviderCard)}
          </div>
        </div>
      )}

      {/* Empty State */}
      {hotelConfigs.length === 0 && flightConfigs.length === 0 && (
        <div className="text-center py-12">
          <MapPin className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No travel providers configured</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding your first hotel or flight API provider.
          </p>
          <div className="mt-6 space-x-3">
            <button
              onClick={() => handleAddProvider('hotel')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Building className="h-4 w-4 mr-2" />
              Add Hotel Provider
            </button>
            <button
              onClick={() => handleAddProvider('flight')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
            >
              <Plane className="h-4 w-4 mr-2" />
              Add Flight Provider
            </button>
          </div>
        </div>
      )}

      {/* Modals will be implemented in separate components */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Add {selectedType} Provider</h3>
            <p className="text-sm text-gray-600 mb-4">
              Choose a {selectedType} provider to configure:
            </p>
            <div className="space-y-2">
              {getProviderDefinitionsByType(selectedType).map(provider => (
                <button
                  key={provider.name}
                  onClick={() => {
                    // Create new config and open edit modal
                    const newConfig: TravelProviderConfig = {
                      id: `${provider.name}-${Date.now()}`,
                      name: provider.name,
                      type: selectedType,
                      provider: provider.name,
                      displayName: provider.displayName,
                      description: provider.description,
                      enabled: true,
                      credentials: {},
                      settings: {},
                      status: 'disconnected',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString()
                    };
                    setEditingConfig(newConfig);
                    setShowAddModal(false);
                    setShowEditModal(true);
                  }}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50"
                >
                  <div className="font-medium">{provider.displayName}</div>
                  <div className="text-sm text-gray-500">{provider.description}</div>
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal - Simplified for now */}
      {showEditModal && editingConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-96 overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">Configure {editingConfig.displayName}</h3>
            <div className="space-y-4">
              {getProviderDefinition(editingConfig.type, editingConfig.provider)?.requiredCredentials.map(cred => (
                <div key={cred.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {cred.displayName}
                  </label>
                  <input
                    type={cred.type === 'password' ? 'password' : 'text'}
                    placeholder={cred.placeholder}
                    value={editingConfig.credentials[cred.key] || ''}
                    onChange={(e) => setEditingConfig({
                      ...editingConfig,
                      credentials: {
                        ...editingConfig.credentials,
                        [cred.key]: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingConfig(null);
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const allConfigs = [...hotelConfigs, ...flightConfigs];
                  const existingIndex = allConfigs.findIndex(c => c.id === editingConfig.id);
                  
                  if (existingIndex !== -1) {
                    allConfigs[existingIndex] = editingConfig;
                  } else {
                    allConfigs.push(editingConfig);
                  }
                  
                  await saveConfigurations(allConfigs);
                  await loadConfigurations();
                  setShowEditModal(false);
                  setEditingConfig(null);
                }}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}