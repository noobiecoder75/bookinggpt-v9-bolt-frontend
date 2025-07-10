import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Plane, Search, ArrowRight, Users, Calendar, MapPin, Loader, X } from 'lucide-react';

interface FlightSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFlightSelect: (flight: any, requirements: {
    travelers: {
      adults: number;
      children: number;
      seniors: number;
    };
    origin: string;
    destination: string;
    departureDate: string;
    returnDate: string;
    isReturnFlight: boolean;
  }) => void;
}

interface FlightRequirements {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  adults: number;
  children: number;
  seniors: number;
  isReturnFlight: boolean;
}

const MAJOR_CITIES = [
  { iata: 'JFK', city: 'New York', country: 'USA' },
  { iata: 'LAX', city: 'Los Angeles', country: 'USA' },
  { iata: 'LHR', city: 'London', country: 'UK' },
  { iata: 'CDG', city: 'Paris', country: 'France' },
  { iata: 'DXB', city: 'Dubai', country: 'UAE' },
  // Add more cities as needed
];

const formatDateTime = (dateTime: string) => {
  return new Date(dateTime).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDuration = (duration: string) => {
  const hours = duration.match(/(\d+)H/)?.[1] || '0';
  const minutes = duration.match(/(\d+)M/)?.[1] || '0';
  return `${hours}h ${minutes}m`;
};

export function FlightSearchModal({ isOpen, onClose, onFlightSelect }: FlightSearchModalProps) {
  console.log('FlightSearchModal rendered with props:', { isOpen });

  // Step management
  const [currentStep, setCurrentStep] = useState<'requirements' | 'search'>('requirements');
  
  // Requirements state
  const [requirements, setRequirements] = useState<FlightRequirements>({
    origin: '',
    destination: '',
    departureDate: '',
    returnDate: '',
    adults: 1,
    children: 0,
    seniors: 0,
    isReturnFlight: false,
  });

  // Search results state
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [flightOffers, setFlightOffers] = useState<any[]>([]);

  // Add useEffect to log state changes
  useEffect(() => {
    console.log('FlightSearchModal state updated:', {
      currentStep,
      requirements,
      isSearching,
      searchError,
      flightOffersCount: flightOffers.length
    });
  }, [currentStep, requirements, isSearching, searchError, flightOffers]);

  const handleRequirementsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep('search');
    await searchFlights();
  };

  // Debug function to test API connectivity
  const testDuffelConnection = async () => {
    try {
      console.log('Testing Duffel API connection via server proxy...');
      const response = await fetch('/api/duffel/test');
      
      console.log('Test response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Duffel API connection successful!', data);
      } else {
        const errorData = await response.json();
        console.error('❌ Duffel API connection failed:', errorData);
      }
    } catch (error) {
      console.error('❌ Network error testing Duffel API:', error);
    }
  };

  const searchFlights = async () => {
    setIsSearching(true);
    setSearchError(null);

    try {
      console.log('Starting flight search via server proxy...');

      // Validate search inputs
      if (!requirements.origin || !requirements.destination || !requirements.departureDate) {
        throw new Error('Please fill in all required fields (origin, destination, and departure date)');
      }

      // Format dates to YYYY-MM-DD as required by Duffel
      const formatDate = (date: string) => {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
      };

      // Prepare slices for Duffel API
      const slices = requirements.isReturnFlight ? [
        {
          origin: requirements.origin,
          destination: requirements.destination,
          departure_date: formatDate(requirements.departureDate)
        },
        {
          origin: requirements.destination,
          destination: requirements.origin,
          departure_date: formatDate(requirements.returnDate)
        }
      ] : [
        {
          origin: requirements.origin,
          destination: requirements.destination,
          departure_date: formatDate(requirements.departureDate)
        }
      ];

      // Prepare passengers for Duffel API
      const passengers = [];
      for (let i = 0; i < requirements.adults; i++) {
        passengers.push({ type: 'adult' });
      }
      for (let i = 0; i < requirements.children; i++) {
        passengers.push({ type: 'child' });
      }
      for (let i = 0; i < requirements.seniors; i++) {
        passengers.push({ type: 'adult' }); // Duffel doesn't have separate senior type
      }

      // Prepare request body for Duffel API
      const requestBody = {
        data: {
          slices,
          passengers,
          cabin_class: 'economy'
        }
      };

      console.log('Making Duffel flight search request via server proxy:', {
        type: requirements.isReturnFlight ? 'return' : 'one-way',
        url: '/api/duffel/offer-requests',
        body: requestBody
      });

      // Make the flight search API call via server proxy
      const searchResponse = await fetch('/api/duffel/offer-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Duffel offer request response:', {
        status: searchResponse.status,
        statusText: searchResponse.statusText,
        ok: searchResponse.ok
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('Duffel API Error Response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          throw new Error(`HTTP ${searchResponse.status}: ${searchResponse.statusText} - ${errorText}`);
        }
        
        throw new Error(errorData.errors?.[0]?.message || `HTTP ${searchResponse.status}: ${errorData.message || 'Failed to fetch flight offers'}`);
      }

      const response = await searchResponse.json();
      console.log('Duffel offer request created:', {
        status: searchResponse.status,
        offerRequestId: response.data?.id,
        type: requirements.isReturnFlight ? 'return' : 'one-way'
      });

      // Now fetch the offers from the offer request via server proxy
      console.log('Fetching offers for request ID:', response.data.id);
      const offersResponse = await fetch(`/api/duffel/offers?offer_request_id=${response.data.id}`);

      if (!offersResponse.ok) {
        const errorData = await offersResponse.json();
        throw new Error(errorData.errors?.[0]?.message || 'Failed to fetch offers');
      }

      const offersData = await offersResponse.json();
      console.log('Duffel offers response:', {
        status: offersResponse.status,
        offersCount: offersData.data?.length || 0,
        type: requirements.isReturnFlight ? 'return' : 'one-way'
      });

      setFlightOffers(offersData.data || []);
    } catch (error: any) {
      console.error('Flight search error:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        type: requirements.isReturnFlight ? 'return' : 'one-way',
        requirements: requirements
      });
      
      // Provide more helpful error messages
      let userFriendlyMessage = error.message;
      if (error.message.includes('Failed to fetch')) {
        userFriendlyMessage = 'Network error: Unable to connect to Duffel API. Please check your internet connection and API credentials.';
      } else if (error.message.includes('401')) {
        userFriendlyMessage = 'Authentication failed: Please check your Duffel API token.';
      } else if (error.message.includes('400')) {
        userFriendlyMessage = 'Invalid request: Please check your search criteria (dates, airports, etc.).';
      }
      
      setSearchError(userFriendlyMessage);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={currentStep === 'requirements' ? 'Flight Requirements' : 'Flight Search Results'}
      maxWidth="4xl"
    >
      {currentStep === 'requirements' ? (
        <form onSubmit={handleRequirementsSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Origin & Destination */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Origin City</label>
              <select
                required
                value={requirements.origin}
                onChange={(e) => setRequirements(prev => ({ ...prev, origin: e.target.value }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">Select origin city</option>
                {MAJOR_CITIES.map((city) => (
                  <option key={city.iata} value={city.iata}>
                    {city.city}, {city.country} ({city.iata})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Destination City</label>
              <select
                required
                value={requirements.destination}
                onChange={(e) => setRequirements(prev => ({ ...prev, destination: e.target.value }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">Select destination city</option>
                {MAJOR_CITIES.map((city) => (
                  <option key={city.iata} value={city.iata}>
                    {city.city}, {city.country} ({city.iata})
                  </option>
                ))}
              </select>
            </div>

            {/* Dates */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Departure Date</label>
              <input
                type="date"
                required
                value={requirements.departureDate}
                onChange={(e) => setRequirements(prev => ({ ...prev, departureDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Flight Type</label>
              <div className="flex items-center justify-between px-3 py-2 bg-gray-100 rounded-lg">
                <span className={`text-sm ${!requirements.isReturnFlight ? 'text-indigo-600 font-medium' : 'text-gray-500'}`}>
                  One-way
                </span>
                <button
                  type="button"
                  onClick={() => setRequirements(prev => ({ 
                    ...prev, 
                    isReturnFlight: !prev.isReturnFlight,
                    returnDate: !prev.isReturnFlight ? prev.returnDate : ''
                  }))}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    requirements.isReturnFlight ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      requirements.isReturnFlight ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className={`text-sm ${requirements.isReturnFlight ? 'text-indigo-600 font-medium' : 'text-gray-500'}`}>
                  Return
                </span>
              </div>
            </div>
            {requirements.isReturnFlight && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Return Date</label>
                <input
                  type="date"
                  required
                  value={requirements.returnDate}
                  onChange={(e) => setRequirements(prev => ({ ...prev, returnDate: e.target.value }))}
                  min={requirements.departureDate}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            )}

            {/* Travelers */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Adults (12+ years)</label>
              <input
                type="number"
                required
                min="1"
                value={requirements.adults}
                onChange={(e) => setRequirements(prev => ({ ...prev, adults: parseInt(e.target.value) }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Children (2-11 years)</label>
              <input
                type="number"
                min="0"
                value={requirements.children}
                onChange={(e) => setRequirements(prev => ({ ...prev, children: parseInt(e.target.value) }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Seniors (65+ years)</label>
              <input
                type="number"
                min="0"
                value={requirements.seniors}
                onChange={(e) => setRequirements(prev => ({ ...prev, seniors: parseInt(e.target.value) }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={testDuffelConnection}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Test API Connection
            </button>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Search className="h-4 w-4 mr-2" />
              Search Flights
            </button>
          </div>
        </form>
      ) : (
        <div>
          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader className="h-8 w-8 text-indigo-600 animate-spin" />
              <p className="mt-2 text-sm text-gray-500">Searching for flights...</p>
            </div>
          ) : searchError ? (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error searching flights</h3>
                  <div className="mt-2 text-sm text-red-700">{searchError}</div>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => setCurrentStep('requirements')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Modify Search
                </button>
              </div>
            </div>
          ) : flightOffers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">No flights found for your search criteria.</p>
              <button
                onClick={() => setCurrentStep('requirements')}
                className="mt-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Modify Search
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {flightOffers.map((flight) => (
                <div
                  key={flight.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-indigo-500 transition-colors"
                >
                  {/* Outbound Flight */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {requirements.isReturnFlight ? 'Outbound Flight' : 'Flight'}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {formatDate(requirements.departureDate)}
                      </span>
                    </div>
                    {renderFlightDetails(flight.slices[0])}
                  </div>

                  {/* Return Flight (if exists) */}
                  {requirements.isReturnFlight && flight.slices[1] && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900">Return Flight</h4>
                        <span className="text-xs text-gray-500">
                          {formatDate(requirements.returnDate)}
                        </span>
                      </div>
                      {renderFlightDetails(flight.slices[1])}
                    </div>
                  )}

                  <div className="mt-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        ${parseFloat(flight.total_amount).toFixed(2)} {flight.total_currency}
                      </p>
                      <p className="text-xs text-gray-500">
                        {requirements.isReturnFlight ? 'Round-trip total' : 'One-way fare'}
                      </p>
                    </div>
                    <button
                      onClick={() => onFlightSelect(flight, {
                        travelers: {
                          adults: requirements.adults,
                          children: requirements.children,
                          seniors: requirements.seniors
                        },
                        origin: requirements.origin,
                        destination: requirements.destination,
                        departureDate: requirements.departureDate,
                        returnDate: requirements.returnDate,
                        isReturnFlight: requirements.isReturnFlight
                      })}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Select Flight
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

const renderFlightDetails = (slice: any) => {
  return (
    <div className="space-y-2">
      {slice.segments.map((segment: any, idx: number) => (
        <div key={idx} className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Plane className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {segment.origin.iata_code} → {segment.destination.iata_code}
              </p>
              <div className="text-xs text-gray-500">
                <p>{formatDateTime(segment.departing_at)} - {formatDateTime(segment.arriving_at)}</p>
                <p>Flight {segment.marketing_carrier.iata_code}{segment.marketing_carrier_flight_number}</p>
                <p>Duration: {formatDuration(segment.duration)}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}; 