import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plane, Building, Car, DollarSign, Plus, Trash2, Loader } from 'lucide-react';
import { amadeus, ensureAuthenticated } from '../../lib/amadeus';

interface Service {
  id: string;
  type: string;
  name: string;
  cost: number;
  details: {
    day: number;
    [key: string]: any;
  };
}

interface FlightOffer {
  id: string;
  itineraries: any[];
  price: {
    total: string;
    currency: string;
  };
  numberOfBookableSeats: number;
}

interface QuoteServicesProps {
  onServicesChange: (services: any[]) => void;
  travelDates: {
    start: string;
    end: string;
  };
  travelers: {
    adults: number;
    children: number;
    seniors: number;
  };
  origin: string;
  destination: string;
}

export function QuoteServices({ 
  onServicesChange, 
  travelDates, 
  travelers,
  origin,
  destination 
}: QuoteServicesProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [loading, setLoading] = useState(false);
  const [flightOffers, setFlightOffers] = useState<FlightOffer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedFlights, setSelectedFlights] = useState<FlightOffer[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const flightsPerPage = 10;

  // Calculate pagination
  const indexOfLastFlight = currentPage * flightsPerPage;
  const indexOfFirstFlight = indexOfLastFlight - flightsPerPage;
  const currentFlights = flightOffers.slice(indexOfFirstFlight, indexOfLastFlight);
  const totalPages = Math.ceil(flightOffers.length / flightsPerPage);

  useEffect(() => {
    fetchAvailableServices();
    if (origin && destination && travelDates.start) {
      searchFlights();
    }
  }, [origin, destination, travelDates.start]);

  useEffect(() => {
    onServicesChange(services);
  }, [services]);

  async function fetchAvailableServices() {
    const { data: rates } = await supabase
      .from('rates')
      .select('*')
      .gte('valid_start', travelDates.start)
      .lte('valid_end', travelDates.end);

    if (rates) {
      setAvailableServices(rates);
    }
  }

  const searchFlights = async () => {
    setLoading(true);
    setError(null);

    try {
      // Log initial parameters
      const initialParams = {
        origin,
        destination,
        departureDate: travelDates.start,
        returnDate: travelDates.end,
        adults: travelers.adults,
        children: travelers.children,
        seniors: travelers.seniors
      };
      console.log('Initial parameters:', initialParams);

      // Validate required fields
      if (!origin || !destination || !travelDates.start) {
        throw new Error('Please fill in all required fields (origin, destination, and departure date)');
      }

      // Format dates to YYYY-MM-DD as required by Amadeus
      const formatDate = (date: string) => {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
      };

      // First, get the access token
      const tokenResponse = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: import.meta.env.VITE_AMADEUS_CLIENT_ID,
          client_secret: import.meta.env.VITE_AMADEUS_CLIENT_SECRET,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to obtain access token');
      }

      const tokenData = await tokenResponse.json();
      console.log('Authentication successful');

      // Make the flight search API call
      console.log('Making Amadeus API call...');
      const searchResponse = await fetch('https://test.api.amadeus.com/v2/shopping/flight-offers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currencyCode: 'USD',
          originDestinations: [
            {
              id: '1',
              originLocationCode: origin,
              destinationLocationCode: destination,
              departureDateTimeRange: {
                date: formatDate(travelDates.start)
              }
            },
            ...(travelDates.end ? [{
              id: '2',
              originLocationCode: destination,
              destinationLocationCode: origin,
              departureDateTimeRange: {
                date: formatDate(travelDates.end)
              }
            }] : [])
          ],
          travelers: [
            ...(Array(travelers.adults).fill({ id: '1', travelerType: 'ADULT' })),
            ...(Array(travelers.children).fill({ id: '2', travelerType: 'CHILD' })),
            ...(Array(travelers.seniors).fill({ id: '3', travelerType: 'SENIOR' }))
          ],
          sources: ['GDS'],
          searchCriteria: {
            maxFlightOffers: 250,
            flightFilters: {
              cabinRestrictions: [{
                cabin: 'ECONOMY',
                coverage: 'MOST_SEGMENTS',
                originDestinationIds: ['1', '2']
              }]
            }
          }
        })
      });

      if (!searchResponse.ok) {
        const errorData = await searchResponse.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.errors?.[0]?.detail || 'Failed to fetch flight offers');
      }

      const response = await searchResponse.json();
      console.log('Raw Amadeus response:', {
        status: searchResponse.status,
        data: response.data,
        dictionaries: response.dictionaries,
        meta: response.meta
      });

      if (!response.data || response.data.length === 0) {
        console.warn('No flight offers found in response');
        throw new Error('No flights found for the specified criteria');
      }

      // Process and set the flight offers
      const processedOffers = response.data.map((offer: any) => ({
        ...offer,
        price: {
          ...offer.price,
          formattedTotal: `${offer.price.currency} ${parseFloat(offer.price.total).toFixed(2)}`
        }
      }));

      setFlightOffers(processedOffers);
      console.log('Successfully processed and set flight offers:', {
        count: processedOffers.length,
        sampleOffer: processedOffers[0]
      });
    } catch (error: any) {
      console.error('Flight search error details:', {
        error,
        name: error.name,
        message: error.message,
        stack: error.stack,
        response: error.response,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
        errors: error.response?.data?.errors,
        timestamp: new Date().toISOString()
      });

      // Handle different types of errors
      let errorMessage = 'Flight search failed: ';
      
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        errorMessage += 'Network error - please check your internet connection';
      } else if (error.response?.status === 401) {
        errorMessage += `Authentication failed (401). Please try again.`;
      } else if (error.response?.status === 400) {
        const detail = error.response?.data?.errors?.[0]?.detail;
        errorMessage += `Invalid parameters (400): ${detail || 'Please check your search criteria'}`;
      } else if (error.response?.status === 429) {
        errorMessage += `Rate limit exceeded (429). Please try again later.`;
      } else {
        errorMessage += `${error.response?.data?.errors?.[0]?.detail || error.message || 'Unknown error'} (Code: ${error.response?.status || 'unknown'})`;
      }

      setError(errorMessage);
      console.error('Final error message:', errorMessage);
    } finally {
      setLoading(false);
      console.log('Flight search completed');
    }
  };

  const handleFlightSelection = (flight: FlightOffer) => {
    console.log('Flight selection changed:', {
      flightId: flight.id,
      isSelected: !selectedFlights.some(f => f.id === flight.id),
      details: {
        price: flight.price,
        seats: flight.numberOfBookableSeats,
        itinerary: flight.itineraries
      }
    });

    const isSelected = selectedFlights.some(f => f.id === flight.id);
    
    if (isSelected) {
      setSelectedFlights(selectedFlights.filter(f => f.id !== flight.id));
    } else {
      setSelectedFlights([...selectedFlights, flight]);
    }

    // Update parent component with selected services
    const updatedServices = selectedFlights.map(flight => {
      const service = {
        id: flight.id,
        type: 'flight',
        name: `Flight ${flight.itineraries[0].segments[0].departure.iataCode} - ${flight.itineraries[0].segments[0].arrival.iataCode}`,
        cost: parseFloat(flight.price.total),
        details: flight
      };
      console.log('Converting flight to service:', service);
      return service;
    });

    onServicesChange(updatedServices);
  };

  const days = travelDates.start && travelDates.end
    ? Math.ceil((new Date(travelDates.end).getTime() - new Date(travelDates.start).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  function handleDragEnd(result: any) {
    if (!result.destination) return;

    const items = Array.from(services);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setServices(items);
  }

  function addService(service: any) {
    const newService: Service = {
      id: `service-${Date.now()}`,
      type: service.rate_type,
      name: service.description,
      cost: service.cost,
      details: {
        day: selectedDay,
        ...service.details,
      },
    };

    setServices([...services, newService]);
  }

  function removeService(serviceId: string) {
    setServices(services.filter(s => s.id !== serviceId));
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Available Flights</h2>
        <button
          onClick={searchFlights}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader className="animate-spin h-5 w-5 mr-2" />
              Searching...
            </>
          ) : (
            <>
              <Plane className="h-5 w-5 mr-2" />
              Search Flights
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error searching flights</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Available Services */}
        <div className="col-span-1 bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Available Services</h3>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-4">
                  <Loader className="animate-spin h-8 w-8 mx-auto text-indigo-600" />
                  <p className="mt-2 text-sm text-gray-500">Searching for flights...</p>
                </div>
              ) : currentFlights.length > 0 ? (
                <>
                  {currentFlights.map((flight) => (
                    <div
                      key={flight.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-indigo-500 cursor-pointer"
                      onClick={() => handleFlightSelection(flight)}
                    >
                      <div className="flex items-center">
                        <Plane className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {flight.itineraries[0].segments[0].departure.iataCode} →{' '}
                            {flight.itineraries[0].segments[0].arrival.iataCode}
                          </p>
                          <p className="text-sm text-gray-500">
                            ${parseFloat(flight.price.total).toFixed(2)} {flight.price.currency}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(flight.itineraries[0].segments[0].departure.at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Plus className={`h-5 w-5 ${selectedFlights.some(f => f.id === flight.id) ? 'text-indigo-600' : 'text-gray-400'}`} />
                    </div>
                  ))}
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center space-x-2 mt-4">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              ) : !error ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No flights found. Try searching with different criteria.</p>
                </div>
              ) : null}
              
              {/* Other Available Services */}
              {availableServices.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-indigo-500 cursor-pointer"
                  onClick={() => addService(service)}
                >
                  <div className="flex items-center">
                    {service.rate_type === 'Hotel' && <Building className="h-5 w-5 text-gray-400 mr-2" />}
                    {service.rate_type === 'Transfer' && <Car className="h-5 w-5 text-gray-400 mr-2" />}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{service.description}</p>
                      <p className="text-sm text-gray-500">${service.cost}</p>
                    </div>
                  </div>
                  <Plus className="h-5 w-5 text-gray-400" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Services */}
        <div className="col-span-2 bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Selected Services</h3>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="services">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-4"
                  >
                    {services.map((service, index) => (
                      <Draggable key={service.id} draggableId={service.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center">
                              {service.type === 'Flight' && <Plane className="h-5 w-5 text-gray-400 mr-2" />}
                              {service.type === 'Hotel' && <Building className="h-5 w-5 text-gray-400 mr-2" />}
                              {service.type === 'Transfer' && <Car className="h-5 w-5 text-gray-400 mr-2" />}
                              <div>
                                <p className="text-sm font-medium text-gray-900">{service.name}</p>
                                <p className="text-sm text-gray-500">
                                  Day {service.details.day + 1} • ${service.cost}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="text-sm font-medium text-gray-900">
                                ${(service.cost * (travelers.adults + travelers.children + travelers.seniors)).toLocaleString()}
                              </span>
                              <button
                                onClick={() => removeService(service.id)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>
      </div>
    </div>
  );
}