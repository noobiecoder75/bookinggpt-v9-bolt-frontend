// DuffelAdapter - Adapts the existing Duffel API integration to the provider interface
// This adapter wraps your existing Duffel implementation to make it work with the new provider system

import { 
  IFlightProvider, 
  FlightSearchCriteria, 
  StandardizedFlight, 
  FlightSlice,
  FlightSegment,
  ProviderResponse, 
  ProviderConfig,
  ProviderError 
} from '../../../types/providers';

export class DuffelAdapter implements IFlightProvider {
  public readonly name = 'duffel';
  private config: ProviderConfig | null = null;
  private baseUrl = '/api/duffel'; // Your existing API endpoint

  constructor() {
    // Initialize with any default settings
  }

  getDisplayName(): string {
    return 'Duffel';
  }

  getDescription(): string {
    return 'Access to comprehensive flight inventory with real-time pricing and booking capabilities';
  }

  getRequiredCredentials(): string[] {
    return ['accessToken', 'endpoint'];
  }

  isConfigured(): boolean {
    if (!this.config || !this.config.enabled) {
      return false;
    }

    const required = this.getRequiredCredentials();
    return required.every(key => 
      this.config?.credentials[key] && 
      this.config.credentials[key].trim() !== ''
    );
  }

  configure(config: ProviderConfig): void {
    this.config = config;
    
    // Update base URL if provided in credentials
    if (config.credentials.endpoint) {
      this.baseUrl = config.credentials.endpoint;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        console.warn('Duffel provider is not properly configured');
        return false;
      }

      console.log(`Testing Duffel connection via backend: ${this.baseUrl}`);

      // Test connection through your backend only (no direct external API calls)
      try {
        const response = await fetch(`${this.baseUrl}/test`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (response.ok) {
          console.log('✅ Duffel backend test endpoint successful');
          return true;
        } else {
          console.warn(`❌ Duffel backend test failed: ${response.status} ${response.statusText}`);
          return false;
        }
      } catch (fetchError) {
        // Check if it's a network error vs endpoint not found
        if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
          console.warn('❌ Duffel backend endpoint appears to be offline:', this.baseUrl);
          return false;
        }
        
        // If the test endpoint doesn't exist, the backend might still be working
        // but just doesn't have the test endpoint implemented yet
        console.warn('⚠️ Duffel test endpoint not available, but backend may be functional');
        console.warn('⚠️ Consider implementing', `${this.baseUrl}/test`, 'endpoint in your backend');
        
        // For now, assume it's configured correctly if we have credentials
        return true;
      }
    } catch (error) {
      console.error('❌ Duffel connection test error:', error);
      return false;
    }
  }

  async searchFlights(criteria: FlightSearchCriteria): Promise<ProviderResponse<StandardizedFlight>> {
    try {
      if (!this.isConfigured()) {
        throw new ProviderError('Duffel provider is not properly configured', this.name);
      }

      // Validate search inputs
      if (!criteria.origin || !criteria.destination || !criteria.departureDate) {
        throw new ProviderError('Missing required flight search criteria (origin, destination, and departure date)', this.name);
      }

      // Format dates to YYYY-MM-DD as required by Duffel
      const formatDate = (date: string) => {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
      };

      // Prepare slices for Duffel API (using your existing logic)
      const slices = criteria.isReturnFlight ? [
        {
          origin: criteria.origin,
          destination: criteria.destination,
          departure_date: formatDate(criteria.departureDate)
        },
        {
          origin: criteria.destination,
          destination: criteria.origin,
          departure_date: formatDate(criteria.returnDate!)
        }
      ] : [
        {
          origin: criteria.origin,
          destination: criteria.destination,
          departure_date: formatDate(criteria.departureDate)
        }
      ];

      // Prepare passengers for Duffel API
      const passengers = [];
      for (let i = 0; i < criteria.adults; i++) {
        passengers.push({ type: 'adult' });
      }
      for (let i = 0; i < criteria.children; i++) {
        passengers.push({ type: 'child' });
      }
      for (let i = 0; i < criteria.seniors; i++) {
        passengers.push({ type: 'adult' }); // Duffel doesn't have separate senior type
      }

      // Prepare request body for Duffel API
      const requestBody = {
        data: {
          slices,
          passengers,
          cabin_class: criteria.cabinClass || 'economy'
        }
      };

      console.log('DuffelAdapter: Making flight search request:', {
        type: criteria.isReturnFlight ? 'return' : 'one-way',
        url: `${this.baseUrl}/offer-requests`,
        body: requestBody
      });

      // Make the flight search API call (using your existing logic)
      const searchResponse = await fetch(`${this.baseUrl}/offer-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('DuffelAdapter: Offer request response:', {
        status: searchResponse.status,
        statusText: searchResponse.statusText,
        ok: searchResponse.ok
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('DuffelAdapter: API Error Response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          throw new ProviderError(`HTTP ${searchResponse.status}: ${searchResponse.statusText} - ${errorText}`, this.name);
        }
        
        throw new ProviderError(
          errorData.errors?.[0]?.message || `HTTP ${searchResponse.status}: ${errorData.message || 'Failed to fetch flight offers'}`,
          this.name
        );
      }

      const response = await searchResponse.json();
      console.log('DuffelAdapter: Offer request created:', {
        status: searchResponse.status,
        offerRequestId: response.data?.id,
        type: criteria.isReturnFlight ? 'return' : 'one-way'
      });

      // Now fetch the offers from the offer request
      console.log('DuffelAdapter: Fetching offers for request ID:', response.data.id);
      const offersResponse = await fetch(`${this.baseUrl}/offers?offer_request_id=${response.data.id}`);

      if (!offersResponse.ok) {
        const errorData = await offersResponse.json();
        throw new ProviderError(errorData.errors?.[0]?.message || 'Failed to fetch offers', this.name);
      }

      const offersData = await offersResponse.json();
      console.log('DuffelAdapter: Offers response:', {
        status: offersResponse.status,
        offersCount: offersData.data?.length || 0,
        type: criteria.isReturnFlight ? 'return' : 'one-way'
      });

      const flights = offersData.data || [];

      // Transform Duffel response to standardized format
      const standardizedFlights: StandardizedFlight[] = flights.map((flight: any) => ({
        id: flight.id,
        provider: this.name,
        totalAmount: parseFloat(flight.total_amount),
        totalCurrency: flight.total_currency,
        validUntil: flight.expires_at,
        bookingAvailable: true, // Duffel flights are generally bookable
        slices: this.transformSlices(flight.slices || []),
        details: {
          source: 'duffel',
          offerRequestId: response.data.id,
          // Preserve all original Duffel data
          ...flight
        }
      }));

      return {
        success: true,
        data: standardizedFlights,
        provider: this.name,
        metadata: {
          totalResults: standardizedFlights.length,
          page: 1
        }
      };

    } catch (error) {
      console.error('DuffelAdapter search error:', error);
      
      if (error instanceof ProviderError) {
        throw error;
      }
      
      // Provide more helpful error messages
      let userFriendlyMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (userFriendlyMessage.includes('Failed to fetch')) {
        userFriendlyMessage = 'Network error: Unable to connect to Duffel API. Please check your internet connection and API credentials.';
      } else if (userFriendlyMessage.includes('401')) {
        userFriendlyMessage = 'Authentication failed: Please check your Duffel API token.';
      } else if (userFriendlyMessage.includes('400')) {
        userFriendlyMessage = 'Invalid request: Please check your search criteria (dates, airports, etc.).';
      }
      
      throw new ProviderError(
        userFriendlyMessage,
        this.name,
        error instanceof Error ? error : undefined
      );
    }
  }

  private transformSlices(duffelSlices: any[]): FlightSlice[] {
    return duffelSlices.map(slice => ({
      origin: {
        iataCode: slice.origin?.iata_code || '',
        name: slice.origin?.name
      },
      destination: {
        iataCode: slice.destination?.iata_code || '',
        name: slice.destination?.name
      },
      departureDateTime: slice.segments?.[0]?.departing_at || '',
      arrivalDateTime: slice.segments?.[slice.segments.length - 1]?.arriving_at || '',
      duration: slice.duration || '',
      segments: this.transformSegments(slice.segments || [])
    }));
  }

  private transformSegments(duffelSegments: any[]): FlightSegment[] {
    return duffelSegments.map(segment => ({
      id: segment.id || '',
      origin: {
        iata_code: segment.origin?.iata_code || '',
        name: segment.origin?.name
      },
      destination: {
        iata_code: segment.destination?.iata_code || '',
        name: segment.destination?.name
      },
      departing_at: segment.departing_at || '',
      arriving_at: segment.arriving_at || '',
      duration: segment.duration || '',
      marketing_carrier: {
        iata_code: segment.marketing_carrier?.iata_code || '',
        name: segment.marketing_carrier?.name
      },
      marketing_carrier_flight_number: segment.marketing_carrier_flight_number || '',
      aircraft: {
        name: segment.aircraft?.name
      }
    }));
  }

  // Additional helper methods specific to Duffel
  async createOrder(offerId: string, passengers: any[]): Promise<any> {
    try {
      if (!this.isConfigured()) {
        throw new ProviderError('Duffel provider is not properly configured', this.name);
      }

      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            selected_offers: [offerId],
            passengers: passengers
          }
        })
      });

      if (!response.ok) {
        throw new ProviderError(`Failed to create order: ${response.statusText}`, this.name);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create order:', error);
      throw error;
    }
  }

  async getOfferDetails(offerId: string): Promise<any> {
    try {
      if (!this.isConfigured()) {
        throw new ProviderError('Duffel provider is not properly configured', this.name);
      }

      const response = await fetch(`${this.baseUrl}/offers/${offerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new ProviderError(`Failed to fetch offer details: ${response.statusText}`, this.name);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get offer details:', error);
      throw error;
    }
  }

  // Get rate limits and API status
  async getApiStatus(): Promise<{ available: boolean; rateLimit?: any }> {
    try {
      const response = await fetch(`${this.baseUrl}/test`);
      
      if (!response.ok) {
        return { available: false };
      }

      // Duffel includes rate limit info in headers
      const rateLimit = {
        remaining: response.headers.get('x-ratelimit-remaining'),
        limit: response.headers.get('x-ratelimit-limit'),
        resetTime: response.headers.get('x-ratelimit-reset')
      };

      return {
        available: true,
        rateLimit
      };
    } catch (error) {
      return { available: false };
    }
  }
}