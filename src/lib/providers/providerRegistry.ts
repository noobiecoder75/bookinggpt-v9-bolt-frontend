// Provider Registry - Registers all available providers with the factory
// This file bootstraps the provider system by registering all available adapters

import { providerFactory } from './ProviderFactory';
import { HotelbedsAdapter } from './adapters/HotelbedsAdapter';
import { DuffelAdapter } from './adapters/DuffelAdapter';

// Register Hotel Providers
export function registerHotelProviders() {
  providerFactory.registerHotelProvider('hotelbeds', () => new HotelbedsAdapter());
  
  // Additional hotel providers can be registered here
  // providerFactory.registerHotelProvider('expedia', () => new ExpediaAdapter());
  // providerFactory.registerHotelProvider('booking', () => new BookingAdapter());
}

// Register Flight Providers
export function registerFlightProviders() {
  providerFactory.registerFlightProvider('duffel', () => new DuffelAdapter());
  
  // Additional flight providers can be registered here
  // providerFactory.registerFlightProvider('amadeus', () => new AmadeusAdapter());
  // providerFactory.registerFlightProvider('sabre', () => new SabreAdapter());
}

// Register Activity Providers
export function registerActivityProviders() {
  // Activity providers will be added here in the future
  // providerFactory.registerActivityProvider('viator', () => new ViatorAdapter());
  // providerFactory.registerActivityProvider('getyourguide', () => new GetYourGuideAdapter());
}

// Initialize all providers
export function initializeProviders() {
  console.log('Initializing travel API providers...');
  
  registerHotelProviders();
  registerFlightProviders();
  registerActivityProviders();
  
  // Load any saved configurations
  providerFactory.loadConfigurations();
  
  console.log('Travel API providers initialized successfully');
}

// Default provider configurations for easy setup
export const DEFAULT_PROVIDER_CONFIGS = {
  hotelbeds: {
    name: 'hotelbeds',
    displayName: 'Hotelbeds',
    description: 'Access to Hotelbeds hotel inventory with real-time availability and competitive rates',
    enabled: true,
    credentials: {
      apiKey: '',
      secret: '',
      endpoint: 'http://localhost:3001'
    },
    settings: {
      timeout: 30000,
      retryAttempts: 3,
      cacheResults: true,
      cacheDuration: 60,
      priority: 1
    }
  },
  duffel: {
    name: 'duffel',
    displayName: 'Duffel',
    description: 'Access to comprehensive flight inventory with real-time pricing and booking capabilities',
    enabled: true,
    credentials: {
      accessToken: '',
      endpoint: '/api/duffel'
    },
    settings: {
      timeout: 30000,
      retryAttempts: 3,
      cacheResults: true,
      cacheDuration: 30,
      priority: 1
    }
  }
};

// Provider definitions for the UI
export const PROVIDER_DEFINITIONS = {
  hotel: [
    {
      name: 'hotelbeds',
      displayName: 'Hotelbeds',
      description: 'Leading hotel distribution platform with extensive global inventory',
      requiredCredentials: [
        { key: 'apiKey', displayName: 'API Key', type: 'password', required: true },
        { key: 'secret', displayName: 'Secret', type: 'password', required: true },
        { key: 'endpoint', displayName: 'Backend Endpoint URL', type: 'url', required: true, placeholder: 'http://localhost:3001' }
      ],
      capabilities: {
        searchHotels: true,
        realTimeAvailability: true,
        instantBooking: true,
        multiCurrency: true,
        geographicCoverage: ['Global']
      }
    }
  ],
  flight: [
    {
      name: 'duffel',
      displayName: 'Duffel',
      description: 'Modern flight booking API with comprehensive airline coverage',
      requiredCredentials: [
        { key: 'accessToken', displayName: 'Access Token', type: 'password', required: true },
        { key: 'endpoint', displayName: 'Backend Endpoint URL', type: 'url', required: true, placeholder: '/api/duffel' }
      ],
      capabilities: {
        searchFlights: true,
        realTimeAvailability: true,
        instantBooking: true,
        multiCurrency: true,
        geographicCoverage: ['Global']
      }
    }
  ],
  activity: [
    // Activity providers will be added here in the future
  ]
};

// Helper function to get provider definition
export function getProviderDefinition(type: 'hotel' | 'flight' | 'activity', providerName: string) {
  return PROVIDER_DEFINITIONS[type].find(p => p.name === providerName);
}

// Helper function to get all provider definitions by type
export function getProviderDefinitionsByType(type: 'hotel' | 'flight' | 'activity') {
  return PROVIDER_DEFINITIONS[type];
}