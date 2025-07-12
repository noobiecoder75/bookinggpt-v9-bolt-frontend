// Provider Factory - Central provider management system
// This factory manages provider registration, configuration, and instantiation

import { 
  IHotelProvider, 
  IFlightProvider, 
  IActivityProvider, 
  ProviderType,
  ProviderConfig,
  ProviderError,
  ProviderConfigurationError 
} from '../../types/providers';

class ProviderFactory {
  private hotelProviders = new Map<string, () => IHotelProvider>();
  private flightProviders = new Map<string, () => IFlightProvider>();
  private activityProviders = new Map<string, () => IActivityProvider>();
  
  private configurations = new Map<string, ProviderConfig>();
  private activeProviders = new Map<string, {
    hotel?: string;
    flight?: string;
    activity?: string;
  }>();

  // Provider Registration Methods
  registerHotelProvider(name: string, providerFactory: () => IHotelProvider) {
    this.hotelProviders.set(name, providerFactory);
    console.log(`Registered hotel provider: ${name}`);
  }

  registerFlightProvider(name: string, providerFactory: () => IFlightProvider) {
    this.flightProviders.set(name, providerFactory);
    console.log(`Registered flight provider: ${name}`);
  }

  registerActivityProvider(name: string, providerFactory: () => IActivityProvider) {
    this.activityProviders.set(name, providerFactory);
    console.log(`Registered activity provider: ${name}`);
  }

  // Configuration Management
  setProviderConfig(providerName: string, config: ProviderConfig) {
    this.configurations.set(providerName, config);
    console.log(`Configured provider: ${providerName}`);
  }

  getProviderConfig(providerName: string): ProviderConfig | undefined {
    return this.configurations.get(providerName);
  }

  setActiveProvider(type: ProviderType, providerName: string, userId?: string) {
    const key = userId || 'default';
    const current = this.activeProviders.get(key) || {};
    current[type] = providerName;
    this.activeProviders.set(key, current);
    console.log(`Set active ${type} provider to: ${providerName}`);
  }

  getActiveProvider(type: ProviderType, userId?: string): string | undefined {
    const key = userId || 'default';
    const providers = this.activeProviders.get(key);
    return providers?.[type];
  }

  // Provider Instance Creation
  getHotelProvider(providerName?: string, userId?: string): IHotelProvider {
    const name = providerName || this.getActiveProvider('hotel', userId);
    
    if (!name) {
      throw new ProviderError('No hotel provider specified and no default configured', 'unknown');
    }

    const factory = this.hotelProviders.get(name);
    if (!factory) {
      throw new ProviderError(`Hotel provider '${name}' not found`, name);
    }

    const provider = factory();
    const config = this.getProviderConfig(name);
    
    if (config) {
      provider.configure(config);
    }

    if (!provider.isConfigured()) {
      throw new ProviderConfigurationError(name, provider.getRequiredCredentials());
    }

    return provider;
  }

  getFlightProvider(providerName?: string, userId?: string): IFlightProvider {
    const name = providerName || this.getActiveProvider('flight', userId);
    
    if (!name) {
      throw new ProviderError('No flight provider specified and no default configured', 'unknown');
    }

    const factory = this.flightProviders.get(name);
    if (!factory) {
      throw new ProviderError(`Flight provider '${name}' not found`, name);
    }

    const provider = factory();
    const config = this.getProviderConfig(name);
    
    if (config) {
      provider.configure(config);
    }

    if (!provider.isConfigured()) {
      throw new ProviderConfigurationError(name, provider.getRequiredCredentials());
    }

    return provider;
  }

  getActivityProvider(providerName?: string, userId?: string): IActivityProvider {
    const name = providerName || this.getActiveProvider('activity', userId);
    
    if (!name) {
      throw new ProviderError('No activity provider specified and no default configured', 'unknown');
    }

    const factory = this.activityProviders.get(name);
    if (!factory) {
      throw new ProviderError(`Activity provider '${name}' not found`, name);
    }

    const provider = factory();
    const config = this.getProviderConfig(name);
    
    if (config) {
      provider.configure(config);
    }

    if (!provider.isConfigured()) {
      throw new ProviderConfigurationError(name, provider.getRequiredCredentials());
    }

    return provider;
  }

  // Provider Information Methods
  getAvailableHotelProviders(): string[] {
    return Array.from(this.hotelProviders.keys());
  }

  getAvailableFlightProviders(): string[] {
    return Array.from(this.flightProviders.keys());
  }

  getAvailableActivityProviders(): string[] {
    return Array.from(this.activityProviders.keys());
  }

  getProviderInfo(type: ProviderType, providerName: string) {
    let factory;
    
    switch (type) {
      case 'hotel':
        factory = this.hotelProviders.get(providerName);
        break;
      case 'flight':
        factory = this.flightProviders.get(providerName);
        break;
      case 'activity':
        factory = this.activityProviders.get(providerName);
        break;
      default:
        throw new ProviderError(`Unknown provider type: ${type}`, providerName);
    }

    if (!factory) {
      throw new ProviderError(`Provider '${providerName}' not found for type '${type}'`, providerName);
    }

    const provider = factory();
    return {
      name: provider.name,
      displayName: provider.getDisplayName(),
      description: provider.getDescription(),
      requiredCredentials: provider.getRequiredCredentials(),
      isConfigured: false // Will be updated when we check actual config
    };
  }

  // Utility Methods
  async testProvider(type: ProviderType, providerName: string): Promise<boolean> {
    try {
      let provider;
      
      switch (type) {
        case 'hotel':
          provider = this.getHotelProvider(providerName);
          break;
        case 'flight':
          provider = this.getFlightProvider(providerName);
          break;
        case 'activity':
          provider = this.getActivityProvider(providerName);
          break;
        default:
          throw new ProviderError(`Unknown provider type: ${type}`, providerName);
      }

      return await provider.testConnection();
    } catch (error) {
      console.error(`Failed to test provider ${providerName}:`, error);
      return false;
    }
  }

  // Load configuration from external source (e.g., Supabase)
  async loadConfigurations(userId?: string): Promise<void> {
    try {
      // This will be implemented to load from Supabase
      // For now, we'll use localStorage as a fallback
      const key = `provider_configs_${userId || 'default'}`;
      const stored = localStorage.getItem(key);
      
      if (stored) {
        const configs = JSON.parse(stored);
        Object.entries(configs.providers || {}).forEach(([name, config]) => {
          this.setProviderConfig(name, config as ProviderConfig);
        });
        
        Object.entries(configs.active || {}).forEach(([type, providerName]) => {
          this.setActiveProvider(type as ProviderType, providerName as string, userId);
        });
      }
    } catch (error) {
      console.error('Failed to load provider configurations:', error);
    }
  }

  // Save configuration to external source
  async saveConfigurations(userId?: string): Promise<void> {
    try {
      const key = `provider_configs_${userId || 'default'}`;
      const data = {
        providers: Object.fromEntries(this.configurations),
        active: this.activeProviders.get(userId || 'default') || {}
      };
      
      localStorage.setItem(key, JSON.stringify(data));
      console.log('Provider configurations saved');
    } catch (error) {
      console.error('Failed to save provider configurations:', error);
    }
  }

  // Reset factory (useful for testing)
  reset() {
    this.configurations.clear();
    this.activeProviders.clear();
    console.log('Provider factory reset');
  }
}

// Export singleton instance
export const providerFactory = new ProviderFactory();
export default providerFactory;