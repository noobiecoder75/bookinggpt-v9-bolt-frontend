// Travel API Configuration Types and Models
// These types define how travel API configurations are stored and managed

export interface TravelProviderCredentials {
  [key: string]: string;
}

export interface TravelProviderSettings {
  timeout?: number;
  retryAttempts?: number;
  cacheResults?: boolean;
  cacheDuration?: number; // in minutes
  priority?: number; // for fallback ordering
  enabled?: boolean;
  [key: string]: any;
}

export interface TravelProviderConfig {
  id: string;
  name: string;
  type: 'hotel' | 'flight' | 'activity';
  provider: string; // e.g., 'hotelbeds', 'duffel', 'expedia'
  displayName: string;
  description: string;
  enabled: boolean;
  credentials: TravelProviderCredentials;
  settings: TravelProviderSettings;
  status: 'connected' | 'disconnected' | 'error' | 'testing';
  lastTested?: string;
  lastSync?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// Database schema for Supabase
export interface TravelProviderConfigRow {
  id: string;
  user_id: string;
  name: string;
  type: 'hotel' | 'flight' | 'activity';
  provider: string;
  display_name: string;
  description: string;
  enabled: boolean;
  credentials: TravelProviderCredentials; // JSONB in Supabase
  settings: TravelProviderSettings; // JSONB in Supabase
  status: 'connected' | 'disconnected' | 'error' | 'testing';
  last_tested?: string;
  last_sync?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// Active provider preferences
export interface UserProviderPreferences {
  userId: string;
  defaultHotelProvider?: string;
  defaultFlightProvider?: string;
  defaultActivityProvider?: string;
  fallbackProviders: {
    hotel: string[];
    flight: string[];
    activity: string[];
  };
  updatedAt: string;
}

// Provider capability definitions
export interface ProviderCapability {
  searchHotels?: boolean;
  searchFlights?: boolean;
  searchActivities?: boolean;
  realTimeAvailability?: boolean;
  instantBooking?: boolean;
  cancellation?: boolean;
  modification?: boolean;
  multiCurrency?: boolean;
  geographicCoverage?: string[]; // list of countries/regions
}

export interface ProviderDefinition {
  name: string;
  displayName: string;
  description: string;
  type: 'hotel' | 'flight' | 'activity' | 'multi';
  capabilities: ProviderCapability;
  requiredCredentials: ProviderCredentialDefinition[];
  optionalSettings: ProviderSettingDefinition[];
  documentationUrl?: string;
  supportUrl?: string;
  isActive: boolean;
}

export interface ProviderCredentialDefinition {
  key: string;
  displayName: string;
  description: string;
  type: 'text' | 'password' | 'url' | 'email';
  required: boolean;
  placeholder?: string;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

export interface ProviderSettingDefinition {
  key: string;
  displayName: string;
  description: string;
  type: 'boolean' | 'number' | 'string' | 'select';
  defaultValue: any;
  options?: { value: any; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

// Configuration management operations
export interface TravelConfigService {
  // Provider configuration CRUD
  createProviderConfig(config: Omit<TravelProviderConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<TravelProviderConfig>;
  updateProviderConfig(id: string, updates: Partial<TravelProviderConfig>): Promise<TravelProviderConfig>;
  deleteProviderConfig(id: string): Promise<void>;
  getProviderConfig(id: string): Promise<TravelProviderConfig | null>;
  getUserProviderConfigs(userId: string, type?: 'hotel' | 'flight' | 'activity'): Promise<TravelProviderConfig[]>;
  
  // Provider preferences
  getUserPreferences(userId: string): Promise<UserProviderPreferences | null>;
  updateUserPreferences(userId: string, preferences: Partial<UserProviderPreferences>): Promise<UserProviderPreferences>;
  
  // Provider testing and validation
  testProviderConnection(id: string): Promise<{ success: boolean; error?: string }>;
  validateProviderCredentials(provider: string, credentials: TravelProviderCredentials): Promise<{ valid: boolean; error?: string }>;
  
  // Provider information
  getAvailableProviders(type?: 'hotel' | 'flight' | 'activity'): Promise<ProviderDefinition[]>;
  getProviderDefinition(provider: string): Promise<ProviderDefinition | null>;
}

// React hook types for configuration management
export interface UseTravelConfigReturn {
  configs: TravelProviderConfig[];
  preferences: UserProviderPreferences | null;
  loading: boolean;
  error: string | null;
  
  // Configuration management
  createConfig: (config: Omit<TravelProviderConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateConfig: (id: string, updates: Partial<TravelProviderConfig>) => Promise<void>;
  deleteConfig: (id: string) => Promise<void>;
  testConfig: (id: string) => Promise<boolean>;
  
  // Preferences management
  setDefaultProvider: (type: 'hotel' | 'flight' | 'activity', providerId: string) => Promise<void>;
  updateFallbackProviders: (type: 'hotel' | 'flight' | 'activity', providerIds: string[]) => Promise<void>;
  
  // Utility functions
  getActiveProvider: (type: 'hotel' | 'flight' | 'activity') => TravelProviderConfig | null;
  getProvidersByType: (type: 'hotel' | 'flight' | 'activity') => TravelProviderConfig[];
  isProviderConfigured: (providerId: string) => boolean;
  
  // Refresh data
  refresh: () => Promise<void>;
}

// Form types for the settings UI
export interface ProviderConfigFormData {
  name: string;
  provider: string;
  displayName: string;
  description: string;
  enabled: boolean;
  credentials: Record<string, string>;
  settings: Record<string, any>;
}

export interface ProviderTestResult {
  success: boolean;
  message: string;
  details?: {
    responseTime?: number;
    apiVersion?: string;
    capabilities?: string[];
  };
  error?: {
    code?: string;
    message: string;
    details?: any;
  };
}

// Constants
export const SUPPORTED_PROVIDERS = {
  hotel: [
    'hotelbeds',
    'expedia',
    'booking',
    'agoda',
    'amadeus'
  ],
  flight: [
    'duffel',
    'amadeus',
    'sabre',
    'travelport'
  ],
  activity: [
    'viator',
    'getyourguide',
    'amadeus'
  ]
} as const;

export const PROVIDER_STATUS_COLORS = {
  connected: 'green',
  disconnected: 'gray',
  error: 'red',
  testing: 'yellow'
} as const;

export const DEFAULT_PROVIDER_SETTINGS: TravelProviderSettings = {
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  cacheResults: true,
  cacheDuration: 60, // 1 hour
  priority: 1,
  enabled: true
};