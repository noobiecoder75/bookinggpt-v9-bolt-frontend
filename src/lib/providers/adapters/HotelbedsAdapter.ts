// HotelbedsAdapter - Adapts the existing Hotelbeds API integration to the provider interface
// This adapter wraps your existing Hotelbeds implementation to make it work with the new provider system

import { 
  IHotelProvider, 
  HotelSearchCriteria, 
  StandardizedHotel, 
  ProviderResponse, 
  ProviderConfig,
  ProviderError 
} from '../../../types/providers';

export class HotelbedsAdapter implements IHotelProvider {
  public readonly name = 'hotelbeds';
  private config: ProviderConfig | null = null;
  private baseUrl = 'http://localhost:3001'; // Your existing backend endpoint

  constructor() {
    // Initialize with any default settings
  }

  getDisplayName(): string {
    return 'Hotelbeds';
  }

  getDescription(): string {
    return 'Access to Hotelbeds hotel inventory with real-time availability and competitive rates';
  }

  getRequiredCredentials(): string[] {
    return ['apiKey', 'secret', 'endpoint'];
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
        console.warn('Hotelbeds provider is not properly configured');
        return false;
      }

      console.log(`Testing Hotelbeds connection via backend: ${this.baseUrl}`);

      // Test connection through your backend only (no direct external API calls)
      try {
        const response = await fetch(`${this.baseUrl}/api/hotelbeds/test`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (response.ok) {
          console.log('✅ Hotelbeds backend test endpoint successful');
          return true;
        } else {
          console.warn(`❌ Hotelbeds backend test failed: ${response.status} ${response.statusText}`);
          return false;
        }
      } catch (fetchError) {
        // Check if it's a network error (backend offline) vs endpoint not found
        if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
          console.warn('❌ Hotelbeds backend appears to be offline at:', this.baseUrl);
          return false;
        }
        
        // If the specific test endpoint doesn't exist, try a simple health check
        try {
          const healthResponse = await fetch(`${this.baseUrl}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000) // 5 second timeout
          });
          
          if (healthResponse.ok) {
            console.warn('⚠️ Backend is running but /api/hotelbeds/test endpoint not implemented');
            // Return true since backend is reachable, just missing test endpoint
            return true;
          }
        } catch (healthError) {
          console.warn('❌ Backend health check failed:', healthError);
        }
        
        console.error('❌ Hotelbeds connection test failed:', fetchError);
        return false;
      }
    } catch (error) {
      console.error('❌ Hotelbeds connection test error:', error);
      return false;
    }
  }

  async searchHotels(criteria: HotelSearchCriteria): Promise<ProviderResponse<StandardizedHotel>> {
    try {
      if (!this.isConfigured()) {
        throw new ProviderError('Hotelbeds provider is not properly configured', this.name);
      }

      // Use your existing API call structure
      const searchPayload = {
        destination: criteria.country || criteria.destination,
        checkInDate: criteria.checkInDate,
        checkOutDate: criteria.checkOutDate,
        guests: criteria.guests || 1,
        ...(criteria.hotelName && { hotelName: criteria.hotelName })
      };

      console.log('HotelbedsAdapter: Searching with payload:', searchPayload);

      const response = await fetch(`${this.baseUrl}/api/hotelbeds/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchPayload)
      });

      console.log('HotelbedsAdapter: Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If we can't parse JSON, use the raw text
          errorMessage = errorText || errorMessage;
        }
        
        throw new ProviderError(errorMessage, this.name);
      }

      const data = await response.json();
      const hotels = data.hotels || [];

      console.log(`HotelbedsAdapter: Found ${hotels.length} hotels`);

      // Transform Hotelbeds response to standardized format
      const standardizedHotels: StandardizedHotel[] = hotels.map((hotel: any) => ({
        id: hotel.id || hotel.hotelCode || `hotelbeds-${Date.now()}-${Math.random()}`,
        name: hotel.description || hotel.name || 'Unknown Hotel',
        description: hotel.description || hotel.name || 'Unknown Hotel',
        cost: hotel.cost || 0,
        currency: hotel.currency || 'USD',
        provider: this.name,
        rateType: hotel.rate_type || 'Hotel',
        validStart: hotel.valid_start,
        validEnd: hotel.valid_end,
        details: {
          source: 'hotelbeds',
          chain: hotel.details?.chain,
          category: hotel.details?.category,
          address: hotel.details?.address,
          facilities: hotel.details?.facilities,
          images: hotel.details?.images,
          includes_breakfast: hotel.details?.includes_breakfast,
          min_nights: hotel.details?.min_nights,
          rateKey: hotel.details?.rateKey,
          selectedRoom: hotel.details?.selectedRoom,
          bookingAvailable: hotel.details?.bookingAvailable || false,
          hotelCode: hotel.details?.hotelCode || hotel.hotelCode,
          imported_from: hotel.details?.imported_from,
          imported_at: hotel.details?.imported_at,
          extraction_method: hotel.details?.extraction_method,
          // Preserve all original details
          ...hotel.details
        }
      }));

      return {
        success: true,
        data: standardizedHotels,
        provider: this.name,
        metadata: {
          totalResults: standardizedHotels.length,
          page: 1
        }
      };

    } catch (error) {
      console.error('HotelbedsAdapter search error:', error);
      
      if (error instanceof ProviderError) {
        throw error;
      }
      
      throw new ProviderError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        this.name,
        error instanceof Error ? error : undefined
      );
    }
  }

  // Additional helper methods specific to Hotelbeds
  async getHotelDetails(hotelCode: string): Promise<any> {
    try {
      if (!this.isConfigured()) {
        throw new ProviderError('Hotelbeds provider is not properly configured', this.name);
      }

      const response = await fetch(`${this.baseUrl}/api/hotelbeds/hotels/${hotelCode}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new ProviderError(`Failed to fetch hotel details: ${response.statusText}`, this.name);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get hotel details:', error);
      throw error;
    }
  }

  async checkAvailability(hotelCode: string, rateKey: string): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        return false;
      }

      const response = await fetch(`${this.baseUrl}/api/hotelbeds/availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hotelCode,
          rateKey
        })
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.available === true;
    } catch (error) {
      console.error('Failed to check availability:', error);
      return false;
    }
  }

  // Get rate limits and API status
  async getApiStatus(): Promise<{ available: boolean; rateLimit?: any }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/hotelbeds/status`);
      
      if (!response.ok) {
        return { available: false };
      }

      const data = await response.json();
      return {
        available: true,
        rateLimit: data.rateLimit
      };
    } catch (error) {
      return { available: false };
    }
  }
}