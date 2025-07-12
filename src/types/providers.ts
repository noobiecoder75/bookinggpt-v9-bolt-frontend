// Travel API Provider Interfaces
// This file defines the contracts that all travel API providers must implement

// Common types used across all providers
export interface SearchCriteria {
  checkInDate?: string;
  checkOutDate?: string;
  destination?: string;
  guests?: number;
}

export interface ProviderConfig {
  name: string;
  enabled: boolean;
  credentials: Record<string, string>;
  settings: Record<string, any>;
}

export interface ProviderResponse<T> {
  success: boolean;
  data: T[];
  error?: string;
  provider: string;
  metadata?: {
    totalResults?: number;
    page?: number;
    rateLimit?: {
      remaining: number;
      resetTime: string;
    };
  };
}

// Hotel Provider Interface
export interface HotelSearchCriteria extends SearchCriteria {
  hotelName?: string;
  country?: string;
  selectedDayId?: string;
}

export interface StandardizedHotel {
  id: string | number;
  name: string;
  description: string;
  cost: number;
  currency: string;
  provider: string;
  rateType: string;
  validStart?: string;
  validEnd?: string;
  details: {
    source: string;
    chain?: string;
    category?: string;
    address?: any;
    facilities?: any[];
    images?: any[];
    includes_breakfast?: boolean;
    min_nights?: number;
    rateKey?: string;
    selectedRoom?: any;
    bookingAvailable?: boolean;
    hotelCode?: string;
    imported_from?: string;
    imported_at?: string;
    extraction_method?: string;
    [key: string]: any;
  };
}

export interface IHotelProvider {
  name: string;
  isConfigured(): boolean;
  configure(config: ProviderConfig): void;
  searchHotels(criteria: HotelSearchCriteria): Promise<ProviderResponse<StandardizedHotel>>;
  testConnection(): Promise<boolean>;
  getRequiredCredentials(): string[];
  getDisplayName(): string;
  getDescription(): string;
}

// Flight Provider Interface
export interface FlightSearchCriteria extends SearchCriteria {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  seniors: number;
  isReturnFlight: boolean;
  cabinClass?: 'economy' | 'premium_economy' | 'business' | 'first';
}

export interface StandardizedFlight {
  id: string;
  provider: string;
  totalAmount: number;
  totalCurrency: string;
  slices: FlightSlice[];
  validUntil?: string;
  bookingAvailable: boolean;
  details: {
    source: string;
    offerRequestId?: string;
    [key: string]: any;
  };
}

export interface FlightSlice {
  origin: {
    iataCode: string;
    name?: string;
  };
  destination: {
    iataCode: string;
    name?: string;
  };
  departureDateTime: string;
  arrivalDateTime: string;
  duration: string;
  segments: FlightSegment[];
}

export interface FlightSegment {
  id: string;
  origin: {
    iata_code: string;
    name?: string;
  };
  destination: {
    iata_code: string;
    name?: string;
  };
  departing_at: string;
  arriving_at: string;
  duration: string;
  marketing_carrier: {
    iata_code: string;
    name?: string;
  };
  marketing_carrier_flight_number: string;
  aircraft?: {
    name?: string;
  };
}

export interface IFlightProvider {
  name: string;
  isConfigured(): boolean;
  configure(config: ProviderConfig): void;
  searchFlights(criteria: FlightSearchCriteria): Promise<ProviderResponse<StandardizedFlight>>;
  testConnection(): Promise<boolean>;
  getRequiredCredentials(): string[];
  getDisplayName(): string;
  getDescription(): string;
}

// Activity Provider Interface (for future use)
export interface ActivitySearchCriteria extends SearchCriteria {
  location?: string;
  category?: string;
  duration?: string;
}

export interface StandardizedActivity {
  id: string;
  name: string;
  description: string;
  cost: number;
  currency: string;
  provider: string;
  duration?: string;
  location?: string;
  category?: string;
  details: {
    source: string;
    [key: string]: any;
  };
}

export interface IActivityProvider {
  name: string;
  isConfigured(): boolean;
  configure(config: ProviderConfig): void;
  searchActivities(criteria: ActivitySearchCriteria): Promise<ProviderResponse<StandardizedActivity>>;
  testConnection(): Promise<boolean>;
  getRequiredCredentials(): string[];
  getDisplayName(): string;
  getDescription(): string;
}

// Provider Registration Types
export type ProviderType = 'hotel' | 'flight' | 'activity';

export interface ProviderRegistration {
  type: ProviderType;
  name: string;
  provider: IHotelProvider | IFlightProvider | IActivityProvider;
}

// Error types
export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class ProviderConfigurationError extends ProviderError {
  constructor(provider: string, missingCredentials: string[]) {
    super(
      `Provider ${provider} is not properly configured. Missing: ${missingCredentials.join(', ')}`,
      provider
    );
    this.name = 'ProviderConfigurationError';
  }
}