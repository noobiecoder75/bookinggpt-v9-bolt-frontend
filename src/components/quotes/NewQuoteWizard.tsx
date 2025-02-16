import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Search, Calendar, Users, MapPin, Plane, Building, Car, ArrowLeft, ArrowRight, Plus, Trash2, DollarSign, Clock, Edit2, Save, AlertCircle, X, Loader, ChevronUp, ChevronDown, CheckCircle } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { QuoteServices } from './QuoteServices';
import { QuoteReview } from './QuoteReview';

// Interface for Customer data structure
interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

// Interface for travel requirements form data
interface TravelRequirements {
  adults: number;
  children: number;
  seniors: number;
  departureDate: string;
  returnDate: string;
  origin: string;
  destination: string;
  tripType: 'flight' | 'hotel' | 'flight+hotel' | 'tour' | 'custom';
  specialRequests: string;
}

// Interface for travel service items
interface Service {
  id: string;
  type: string;
  name: string;
  cost: number;
  details: any;
}

// Interface for city selection options
interface CityOption {
  iata: string;
  city: string;
  country: string;
}

// List of major cities with their IATA codes
const MAJOR_CITIES: CityOption[] = [
  { iata: 'JFK', city: 'New York', country: 'United States' },
  { iata: 'LHR', city: 'London', country: 'United Kingdom' },
  { iata: 'CDG', city: 'Paris', country: 'France' },
  { iata: 'DXB', city: 'Dubai', country: 'United Arab Emirates' },
  { iata: 'SIN', city: 'Singapore', country: 'Singapore' },
  { iata: 'HND', city: 'Tokyo', country: 'Japan' },
  { iata: 'SYD', city: 'Sydney', country: 'Australia' },
  { iata: 'HKG', city: 'Hong Kong', country: 'China' },
  { iata: 'AMS', city: 'Amsterdam', country: 'Netherlands' },
  { iata: 'FRA', city: 'Frankfurt', country: 'Germany' },
  { iata: 'BCN', city: 'Barcelona', country: 'Spain' },
  { iata: 'FCO', city: 'Rome', country: 'Italy' },
  { iata: 'YYZ', city: 'Toronto', country: 'Canada' },
  { iata: 'MEX', city: 'Mexico City', country: 'Mexico' },
  { iata: 'GRU', city: 'São Paulo', country: 'Brazil' },
  { iata: 'DOH', city: 'Doha', country: 'Qatar' },
  { iata: 'BKK', city: 'Bangkok', country: 'Thailand' },
  { iata: 'IST', city: 'Istanbul', country: 'Turkey' },
  { iata: 'LAX', city: 'Los Angeles', country: 'United States' },
  { iata: 'MAD', city: 'Madrid', country: 'Spain' },
];

// New interfaces for day-wise itinerary
interface ItineraryItem {
  id: string;
  type: 'Flight' | 'Hotel' | 'Tour';
  name: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  cost: number;
  markup: number;
  markup_type: 'percentage' | 'fixed';
  details: any;
}

interface DayPlan {
  id: string;
  dayIndex: number;
  name: string;
  items: ItineraryItem[];
  isComplete: boolean;
}

interface QuoteDetails {
  id?: string;
  name: string;
  status: 'Draft' | 'Sent' | 'Expired' | 'Converted';
  totalDays: number;
  markup: number;
  discount: number;
  notes: string;
  days: DayPlan[];
}

// Add new interfaces for flight search
interface FlightSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFlightSelect: (flight: any, isReturn: boolean) => void;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  travelers: {
    adults: number;
    children: number;
    seniors: number;
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

// Add FlightSearchModal component
function FlightSearchModal({
  isOpen,
  onClose,
  onFlightSelect,
  origin,
  destination,
  departureDate,
  returnDate,
  travelers,
}: FlightSearchModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flightOffers, setFlightOffers] = useState<FlightOffer[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isReturnFlight, setIsReturnFlight] = useState(false);
  const [expandedFlights, setExpandedFlights] = useState<string[]>([]);
  const flightsPerPage = 5;

  const toggleFlightExpansion = (flightId: string) => {
    setExpandedFlights(prev =>
      prev.includes(flightId)
        ? prev.filter(id => id !== flightId)
        : [...prev, flightId]
    );
  };

  const searchFlights = async () => {
    setLoading(true);
    setError(null);

    try {
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

      // Make the flight search API call
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
              originLocationCode: isReturnFlight ? destination : origin,
              destinationLocationCode: isReturnFlight ? origin : destination,
              departureDateTimeRange: {
                date: isReturnFlight ? returnDate : departureDate
              }
            }
          ],
          travelers: [
            ...(Array(travelers.adults).fill({ id: '1', travelerType: 'ADULT' })),
            ...(Array(travelers.children).fill({ id: '2', travelerType: 'CHILD' })),
            ...(Array(travelers.seniors).fill({ id: '3', travelerType: 'SENIOR' }))
          ],
          sources: ['GDS'],
          searchCriteria: {
            maxFlightOffers: 50,
            flightFilters: {
              cabinRestrictions: [{
                cabin: 'ECONOMY',
                coverage: 'MOST_SEGMENTS',
                originDestinationIds: ['1']
              }]
            }
          }
        })
      });

      if (!searchResponse.ok) {
        const errorData = await searchResponse.json();
        throw new Error(errorData.errors?.[0]?.detail || 'Failed to fetch flight offers');
      }

      const response = await searchResponse.json();
      setFlightOffers(response.data || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      searchFlights();
    }
  }, [isOpen, isReturnFlight]);

  const currentFlights = flightOffers.slice(
    (currentPage - 1) * flightsPerPage,
    currentPage * flightsPerPage
  );

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString();
  };

  const formatDuration = (duration: string) => {
    // Convert PT2H30M to 2h 30m
    const hours = duration.match(/(\d+)H/)?.[1] || '0';
    const minutes = duration.match(/(\d+)M/)?.[1] || '0';
    return `${hours}h ${minutes}m`;
  };

  const renderSegments = (segments: any[]) => {
    return segments.map((segment, index) => (
      <div key={index} className="border-l-2 border-gray-200 pl-4 ml-2 mt-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {segment.departure.iataCode} → {segment.arrival.iataCode}
            </p>
            <p className="text-xs text-gray-500">
              {formatDateTime(segment.departure.at)} - {formatDateTime(segment.arrival.at)}
            </p>
            <p className="text-xs text-gray-500">
              Duration: {formatDuration(segment.duration)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">{segment.carrierCode}</p>
            <p className="text-xs text-gray-500">Flight {segment.number}</p>
          </div>
        </div>
        {index < segments.length - 1 && (
          <div className="my-2 ml-2 text-xs text-gray-500">
            Layover: {formatDuration(segment.layoverDuration || 'PT0H')}
          </div>
        )}
      </div>
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Search Flights</h2>
            <p className="text-sm text-gray-500">
              {isReturnFlight ? `${destination} → ${origin}` : `${origin} → ${destination}`}
            </p>
          </div>
          {returnDate && (
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isReturnFlight}
                  onChange={(e) => setIsReturnFlight(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Search return flight</span>
              </label>
            </div>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="px-4 py-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          ) : currentFlights.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No flights found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentFlights.map((flight) => (
                <div
                  key={flight.id}
                  className="border rounded-lg overflow-hidden hover:border-indigo-500 transition-colors"
                >
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => toggleFlightExpansion(flight.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <Plane className="h-5 w-5 text-gray-400" />
                          <span className="text-lg font-medium text-gray-900">
                            {flight.itineraries[0].segments[0].departure.iataCode} →{' '}
                            {flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.iataCode}
                          </span>
                          {expandedFlights.includes(flight.id) ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Total duration: {formatDuration(flight.itineraries[0].duration)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {flight.numberOfBookableSeats} seats available
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-medium text-gray-900">
                          {flight.price.total} {flight.price.currency}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onFlightSelect(flight, isReturnFlight);
                          }}
                          className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                          Add to Itinerary
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {expandedFlights.includes(flight.id) && (
                    <div className="px-4 pb-4 border-t border-gray-200">
                      {flight.itineraries.map((itinerary, idx) => (
                        <div key={idx} className="mt-3">
                          <h4 className="text-sm font-medium text-gray-900">
                            {idx === 0 ? 'Outbound' : 'Return'} Flight Details
                          </h4>
                          {renderSegments(itinerary.segments)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center">
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage * flightsPerPage >= flightOffers.length}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Add new interface for ActivitySearchModal
interface ActivitySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivitySelect: (activity: any) => void;
  selectedDay: string;
}

// Add ActivitySearchModal component
function ActivitySearchModal({
  isOpen,
  onClose,
  onActivitySelect,
  selectedDay,
}: ActivitySearchModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchActivities();
    }
  }, [isOpen]);

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('quote_items')
        .select('*')
        .eq('item_type', 'Tour');

      if (error) throw error;
      setActivities(data || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Select Activity</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="px-4 py-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No activities found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="border rounded-lg overflow-hidden hover:border-indigo-500 transition-colors p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {activity.item_name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {activity.details?.description}
                      </p>
                      {activity.details?.startTime && (
                        <p className="text-sm text-gray-500">
                          Time: {new Date(activity.details.startTime).toLocaleTimeString()}
                          {activity.details.endTime && ` - ${new Date(activity.details.endTime).toLocaleTimeString()}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-medium text-gray-900">
                        ${activity.cost.toFixed(2)}
                      </p>
                      <button
                        onClick={() => onActivitySelect(activity)}
                        className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        Add to Itinerary
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Add SuccessScreen component
function SuccessScreen({ quoteId, onViewQuote }: { quoteId: string; onViewQuote: () => void }) {
  return (
    <div className="max-w-3xl mx-auto text-center py-16">
      <div className="mb-8">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-4">
        Quote Successfully Created!
      </h2>
      <p className="text-lg text-gray-600 mb-8">
        Your quote has been finalized and is ready to be sent to the customer.
      </p>
      <div className="flex justify-center space-x-4">
        <button
          onClick={onViewQuote}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          View Quote
        </button>
        <button
          onClick={() => window.location.href = '/quotes'}
          className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Return to Quotes
        </button>
      </div>
    </div>
  );
}

export function NewQuoteWizard() {
  // Router hooks for navigation and URL parameters
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get('customer');
  const editQuoteId = searchParams.get('edit');

  // State management for wizard steps and form data
  const [step, setStep] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  
  // Initial state for new customer form
  const [newCustomer, setNewCustomer] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    passport_number: '',
    nationality: '',
  });

  // State for selected customer and travel requirements
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [travelRequirements, setTravelRequirements] = useState<TravelRequirements>({
    adults: 1,
    children: 0,
    seniors: 0,
    departureDate: '',
    returnDate: '',
    origin: '',
    destination: '',
    tripType: 'flight+hotel',
    specialRequests: '',
  });
  const [services, setServices] = useState<Service[]>([]);

  // New state for day-wise itinerary
  const [quoteDetails, setQuoteDetails] = useState<QuoteDetails>({
    name: '',
    status: 'Draft',
    totalDays: 0,
    markup: 0,
    discount: 0,
    notes: '',
    days: [],
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showFlightSearch, setShowFlightSearch] = useState(false);
  const [showActivitySearch, setShowActivitySearch] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [finalizedQuoteId, setFinalizedQuoteId] = useState<string | null>(null);

  // Effect to search customers when search term changes
  useEffect(() => {
    if (searchTerm) {
      const searchCustomers = async () => {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
          .limit(5);
        
        if (data) {
          setCustomers(data);
        }
      };
      
      searchCustomers();
    }
  }, [searchTerm]);

  // Effect to pre-select customer if ID is provided in URL
  useEffect(() => {
    if (customerId) {
      const fetchCustomer = async () => {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single();
        
        if (data) {
          setSelectedCustomer(data);
          // Auto-advance to step 2 since customer is selected
          setStep(2);
        }
      };
      
      fetchCustomer();
    }
  }, [customerId]);

  // Effect to load quote data when in edit mode
  useEffect(() => {
    if (editQuoteId) {
      const loadQuoteData = async () => {
        try {
          const { data: quote, error: quoteError } = await supabase
            .from('quotes')
            .select(`
              *,
              customer:customers (
                id,
                first_name,
                last_name,
                email,
                phone
              ),
              quote_items (
                id,
                item_type,
                item_name,
                cost,
                markup,
                markup_type,
                quantity,
                details
              )
            `)
            .eq('id', editQuoteId)
            .single();

          if (quoteError) throw quoteError;

          // Set selected customer
          if (quote.customer) {
            setSelectedCustomer(quote.customer);
          }

          // Set travel requirements
          setTravelRequirements({
            adults: quote.quote_items[0]?.details.travelers.adults || 1,
            children: quote.quote_items[0]?.details.travelers.children || 0,
            seniors: quote.quote_items[0]?.details.travelers.seniors || 0,
            departureDate: quote.departure_date || '',
            returnDate: quote.return_date || '',
            origin: quote.origin || '',
            destination: quote.destination || '',
            tripType: quote.trip_type || 'custom',
            specialRequests: quote.special_requests || '',
          });

          // Group items by day
          const itemsByDay = quote.quote_items.reduce((acc: Record<number, DayPlan>, item: any) => {
            const dayIndex = item.details.day.index;
            if (!acc[dayIndex]) {
              acc[dayIndex] = {
                id: `day-${dayIndex + 1}`,
                dayIndex,
                name: item.details.day.name,
                items: [],
                isComplete: true,
              };
            }
            acc[dayIndex].items.push({
              id: item.id,
              type: item.item_type,
              name: item.item_name,
              description: item.details.description,
              startTime: item.details.startTime,
              endTime: item.details.endTime,
              cost: item.cost,
              markup: item.markup,
              markup_type: item.markup_type,
              details: item.details,
            });
            return acc;
          }, {});

          // Convert to array and sort by day index
          const days: DayPlan[] = (Object.values(itemsByDay) as DayPlan[]).sort(
            (a, b) => a.dayIndex - b.dayIndex
          );

          // Set quote details
          setQuoteDetails({
            id: quote.id,
            name: quote.name || '',
            status: quote.status,
            totalDays: days.length,
            markup: quote.markup,
            discount: quote.discount,
            notes: quote.notes || '',
            days,
          });

          // Move to step 3 (services)
          setStep(3);
        } catch (error) {
          console.error('Error loading quote:', error);
        }
      };

      loadQuoteData();
    }
  }, [editQuoteId]);

  // New effect to initialize days when requirements are set
  useEffect(() => {
    if (step === 3 && travelRequirements.departureDate && travelRequirements.returnDate) {
      const start = new Date(travelRequirements.departureDate);
      const end = new Date(travelRequirements.returnDate);
      const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      initializeDays(dayCount);
    }
  }, [step, travelRequirements.departureDate, travelRequirements.returnDate]);

  // New effect for autosaving
  useEffect(() => {
    const saveTimeout = setTimeout(saveQuoteToDatabase, 2000);
    return () => clearTimeout(saveTimeout);
  }, [quoteDetails]);

  // Initialize days function
  const initializeDays = (dayCount: number) => {
    const newDays: DayPlan[] = Array.from({ length: dayCount }, (_, index) => ({
      id: `day-${index + 1}`,
      dayIndex: index,
      name: `Day ${index + 1}`,
      items: [],
      isComplete: false,
    }));

    setQuoteDetails(prev => ({
      ...prev,
      totalDays: dayCount,
      days: newDays,
    }));
  };

  // Save quote to database
  const saveQuoteToDatabase = async () => {
    if (!selectedCustomer || !quoteDetails.days.length) return;

    setIsSaving(true);
    try {
      // First, save or update the main quote
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .upsert({
          id: quoteDetails.id,
          customer_id: selectedCustomer.id,
          status: quoteDetails.status,
          total_price: calculateTotalPrice(),
          markup: quoteDetails.markup,
          discount: quoteDetails.discount,
          notes: quoteDetails.notes,
          origin: travelRequirements.origin,
          destination: travelRequirements.destination,
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Then, save all quote items
      const quoteItems = quoteDetails.days.flatMap(day => 
        day.items.map(item => ({
          quote_id: quote.id,
          item_type: item.type,
          item_name: item.name,
          cost: item.cost,
          markup: item.markup,
          markup_type: item.markup_type,
          quantity: 1,
          details: {
            ...item.details,
            day: {
              name: day.name,
              index: day.dayIndex,
            },
            description: item.description,
            startTime: item.startTime,
            endTime: item.endTime,
            travelers: {
              adults: travelRequirements.adults,
              children: travelRequirements.children,
              seniors: travelRequirements.seniors,
              total: travelRequirements.adults + travelRequirements.children + travelRequirements.seniors
            }
          },
        }))
      );

      const { error: itemsError } = await supabase
        .from('quote_items')
        .upsert(quoteItems);

      if (itemsError) throw itemsError;

      setLastSaved(new Date());
      setQuoteDetails(prev => ({ ...prev, id: quote.id }));
    } catch (error) {
      console.error('Error saving quote:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate total price
  const calculateTotalPrice = () => {
    const itemsTotal = quoteDetails.days.reduce((total, day) => 
      total + day.items.reduce((dayTotal, item) => {
        const itemMarkup = item.markup_type === 'percentage' 
          ? item.cost * (item.markup/100)
          : item.markup;
        return dayTotal + (item.cost + itemMarkup);
      }, 0)
    , 0);
    
    const withGlobalMarkup = itemsTotal * (1 + quoteDetails.markup/100);
    const withDiscount = withGlobalMarkup * (1 - quoteDetails.discount/100);
    
    return withDiscount;
  };

  // Handle drag and drop
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const newDays = Array.from(quoteDetails.days);
    
    if (source.droppableId === destination.droppableId) {
      // Reordering within the same day
      const dayIndex = newDays.findIndex(d => d.id === source.droppableId);
      const items = Array.from(newDays[dayIndex].items);
      const [removed] = items.splice(source.index, 1);
      items.splice(destination.index, 0, removed);
      newDays[dayIndex].items = items;
    } else {
      // Moving between days
      const sourceDayIndex = newDays.findIndex(d => d.id === source.droppableId);
      const destDayIndex = newDays.findIndex(d => d.id === destination.droppableId);
      const sourceItems = Array.from(newDays[sourceDayIndex].items);
      const destItems = Array.from(newDays[destDayIndex].items);
      const [removed] = sourceItems.splice(source.index, 1);
      destItems.splice(destination.index, 0, removed);
      newDays[sourceDayIndex].items = sourceItems;
      newDays[destDayIndex].items = destItems;
    }

    setQuoteDetails(prev => ({ ...prev, days: newDays }));
  };

  // Add item to day
  const addItemToDay = (dayId: string, item: ItineraryItem) => {
    setQuoteDetails(prev => ({
      ...prev,
      days: prev.days.map(day => 
        day.id === dayId
          ? { ...day, items: [...day.items, item] }
          : day
      )
    }));
  };

  // Remove item from day
  const removeItemFromDay = (dayId: string, itemId: string) => {
    setQuoteDetails(prev => ({
      ...prev,
      days: prev.days.map(day => 
        day.id === dayId
          ? { ...day, items: day.items.filter(item => item.id !== itemId) }
          : day
      )
    }));
  };

  // Update day name
  const updateDayName = (dayId: string, newName: string) => {
    setQuoteDetails(prev => ({
      ...prev,
      days: prev.days.map(day => 
        day.id === dayId ? { ...day, name: newName } : day
      )
    }));
  };

  // Handler for creating a new customer
  const handleCreateCustomer = async () => {
    const { data, error } = await supabase
      .from('customers')
      .insert([newCustomer])
      .select()
      .single();

    if (error) {
      alert('Error creating customer: ' + error.message);
      return;
    }

    if (data) {
      setSelectedCustomer(data);
      setShowNewCustomerForm(false);
      // Reset new customer form
      setNewCustomer({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        passport_number: '',
        nationality: '',
      });
    }
  };

  // Navigation handlers for wizard steps
  const handleNext = () => {
    // Validation before proceeding to next step
    if (step === 1 && !selectedCustomer) {
      alert('Please select a customer');
      return;
    }
    if (step === 2 && !travelRequirements.destination) {
      alert('Please fill in the required fields');
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  // Define wizard steps
  const steps = [
    { number: 1, label: 'Customer' },
    { number: 2, label: 'Requirements' },
    { number: 3, label: 'Services' },
    { number: 4, label: 'Review' },
  ];

  // Handler for clicking on step indicators
  const handleStepClick = (stepNumber: number) => {
    // Only allow going back to previous steps
    if (stepNumber < step) {
      setStep(stepNumber);
    }
  };

  // Add flight selection handler
  const handleFlightSelect = (flight: any, isReturn: boolean) => {
    if (!selectedDay) return;

    const totalTravelers = travelRequirements.adults + travelRequirements.children + travelRequirements.seniors;

    const flightItem: ItineraryItem = {
      id: `flight-${Date.now()}`,
      type: 'Flight',
      name: `Flight ${flight.itineraries[0].segments[0].departure.iataCode} → ${flight.itineraries[0].segments[0].arrival.iataCode}`,
      description: `Departure: ${new Date(flight.itineraries[0].segments[0].departure.at).toLocaleString()}`,
      startTime: flight.itineraries[0].segments[0].departure.at,
      endTime: flight.itineraries[0].segments[0].arrival.at,
      cost: parseFloat(flight.price.total),
      markup: 0,
      markup_type: 'percentage',
      details: {
        ...flight,
        travelers: {
          adults: travelRequirements.adults,
          children: travelRequirements.children,
          seniors: travelRequirements.seniors,
          total: totalTravelers
        }
      },
    };

    if (isReturn) {
      // Create outbound flight item
      const outboundFlight: ItineraryItem = {
        id: `flight-${Date.now()}-outbound`,
        type: 'Flight',
        name: `Flight ${travelRequirements.origin} → ${travelRequirements.destination}`,
        description: `Departure: ${new Date(flight.itineraries[0].segments[0].departure.at).toLocaleString()}`,
        startTime: flight.itineraries[0].segments[0].departure.at,
        endTime: flight.itineraries[0].segments[0].arrival.at,
        cost: parseFloat(flight.price.total) / 2,
        markup: 0,
        markup_type: 'percentage',
        details: {
          ...flight,
          itineraries: [flight.itineraries[0]],
          travelers: {
            adults: travelRequirements.adults,
            children: travelRequirements.children,
            seniors: travelRequirements.seniors,
            total: totalTravelers
          }
        },
      };

      // Create return flight item
      const returnFlight: ItineraryItem = {
        id: `flight-${Date.now()}-return`,
        type: 'Flight',
        name: `Flight ${travelRequirements.destination} → ${travelRequirements.origin}`,
        description: `Departure: ${new Date(flight.itineraries[1].segments[0].departure.at).toLocaleString()}`,
        startTime: flight.itineraries[1].segments[0].departure.at,
        endTime: flight.itineraries[1].segments[0].arrival.at,
        cost: parseFloat(flight.price.total) / 2,
        markup: 0,
        markup_type: 'percentage',
        details: {
          ...flight,
          itineraries: [flight.itineraries[1]],
          travelers: {
            adults: travelRequirements.adults,
            children: travelRequirements.children,
            seniors: travelRequirements.seniors,
            total: totalTravelers
          }
        },
      };

      addItemToDay(quoteDetails.days[0].id, outboundFlight);
      addItemToDay(quoteDetails.days[quoteDetails.days.length - 1].id, returnFlight);
    } else {
      addItemToDay(selectedDay, flightItem);
    }

    setShowFlightSearch(false);
  };

  // Add activity selection handler
  const handleActivitySelect = (activity: any) => {
    if (!selectedDay) return;

    const activityItem: ItineraryItem = {
      id: `activity-${Date.now()}`,
      type: 'Tour',
      name: activity.item_name,
      description: activity.details?.description,
      startTime: activity.details?.startTime,
      endTime: activity.details?.endTime,
      cost: activity.cost,
      markup: activity.markup || 0,
      markup_type: activity.markup_type || 'percentage',
      details: {
        ...activity.details,
        travelers: {
          adults: travelRequirements.adults,
          children: travelRequirements.children,
          seniors: travelRequirements.seniors,
          total: travelRequirements.adults + travelRequirements.children + travelRequirements.seniors
        }
      },
    };

    addItemToDay(selectedDay, activityItem);
    setShowActivitySearch(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Progress Steps Navigation */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {steps.map((s, index) => (
            <div key={s.number} className="flex items-center">
              <button
                onClick={() => handleStepClick(s.number)}
                className={`group flex flex-col items-center ${
                  s.number < step ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                  step >= s.number ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                } ${s.number < step ? 'group-hover:bg-indigo-500' : ''}`}>
                  {s.number}
                </div>
                <span className={`mt-2 text-sm font-medium ${
                  step >= s.number ? 'text-indigo-600' : 'text-gray-500'
                } ${s.number < step ? 'group-hover:text-indigo-500' : ''}`}>
                  {s.label}
                </span>
              </button>
              {index < steps.length - 1 && (
                <div className={`h-1 w-16 mx-4 transition-colors ${
                  step > s.number ? 'bg-indigo-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Customer Selection */}
      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Select Customer</h2>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search customers by name, email, or phone..."
            />
          </div>

          {/* Add New Customer Button */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setShowNewCustomerForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
            >
              Can't find customer? Create new
            </button>
          </div>

          {/* New Customer Form */}
          {showNewCustomerForm && (
            <div className="mt-6 bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Create New Customer</h3>
                <button
                  onClick={() => setShowNewCustomerForm(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ×
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={newCustomer.first_name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, first_name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={newCustomer.last_name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, last_name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Passport Number
                  </label>
                  <input
                    type="text"
                    value={newCustomer.passport_number}
                    onChange={(e) => setNewCustomer({ ...newCustomer, passport_number: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nationality
                  </label>
                  <input
                    type="text"
                    value={newCustomer.nationality}
                    onChange={(e) => setNewCustomer({ ...newCustomer, nationality: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleCreateCustomer}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Create Customer
                </button>
              </div>
            </div>
          )}

          {customers.length > 0 && (
            <div className="mt-4 space-y-4">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedCustomer?.id === customer.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-lg font-medium text-indigo-600">
                          {customer.first_name[0]}
                          {customer.last_name[0]}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {customer.first_name} {customer.last_name}
                      </h3>
                      <p className="text-sm text-gray-500">{customer.email}</p>
                      <p className="text-sm text-gray-500">{customer.phone}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Travel Requirements */}
      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Travel Requirements</h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Departure Date
              </label>
              <input
                type="date"
                value={travelRequirements.departureDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  const newDepartureDate = e.target.value;
                  setTravelRequirements(prev => ({
                    ...prev,
                    departureDate: newDepartureDate,
                    returnDate: prev.returnDate && prev.returnDate < newDepartureDate ? '' : prev.returnDate
                  }));
                }}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Return Date
              </label>
              <input
                type="date"
                value={travelRequirements.returnDate}
                min={travelRequirements.departureDate || new Date().toISOString().split('T')[0]}
                disabled={!travelRequirements.departureDate}
                onChange={(e) => setTravelRequirements({
                  ...travelRequirements,
                  returnDate: e.target.value
                })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Origin
              </label>
              <select
                value={travelRequirements.origin}
                onChange={(e) => setTravelRequirements({
                  ...travelRequirements,
                  origin: e.target.value
                })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">Select origin city</option>
                {MAJOR_CITIES.map((city) => (
                  <option key={city.iata} value={city.iata}>
                    {city.iata} - {city.city}, {city.country}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Destination
              </label>
              <select
                value={travelRequirements.destination}
                onChange={(e) => setTravelRequirements({
                  ...travelRequirements,
                  destination: e.target.value
                })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">Select destination city</option>
                {MAJOR_CITIES.filter(city => city.iata !== travelRequirements.origin).map((city) => (
                  <option key={city.iata} value={city.iata}>
                    {city.iata} - {city.city}, {city.country}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Trip Type
              </label>
              <select
                value={travelRequirements.tripType}
                onChange={(e) => setTravelRequirements({
                  ...travelRequirements,
                  tripType: e.target.value as any
                })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="flight">Flight Only</option>
                <option value="hotel">Hotel Only</option>
                <option value="flight+hotel">Flight + Hotel</option>
                <option value="tour">Tour Package</option>
                <option value="custom">Custom Package</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Adults
              </label>
              <input
                type="number"
                min="1"
                value={travelRequirements.adults}
                onChange={(e) => setTravelRequirements({
                  ...travelRequirements,
                  adults: parseInt(e.target.value)
                })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Children
              </label>
              <input
                type="number"
                min="0"
                value={travelRequirements.children}
                onChange={(e) => setTravelRequirements({
                  ...travelRequirements,
                  children: parseInt(e.target.value)
                })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Seniors
              </label>
              <input
                type="number"
                min="0"
                value={travelRequirements.seniors}
                onChange={(e) => setTravelRequirements({
                  ...travelRequirements,
                  seniors: parseInt(e.target.value)
                })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Special Requests
            </label>
            <textarea
              value={travelRequirements.specialRequests}
              onChange={(e) => setTravelRequirements({
                ...travelRequirements,
                specialRequests: e.target.value
              })}
              rows={4}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Any special requirements or preferences..."
            />
          </div>
        </div>
      )}

      {/* Step 3: Services Selection */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Day-Wise Itinerary</h2>
            <div className="flex items-center space-x-4">
              {isSaving && <p className="text-sm text-gray-500">Saving...</p>}
              {lastSaved && (
                <p className="text-sm text-gray-500">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </p>
              )}
              <button
                onClick={saveQuoteToDatabase}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Save className="h-5 w-5 mr-2" />
                Save
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Days List with Content */}
            <div className="col-span-8 space-y-4">
              {quoteDetails.days.map((day) => (
                <div
                  key={day.id}
                  className="bg-white shadow sm:rounded-lg"
                >
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex justify-between items-center mb-4">
                      <input
                        type="text"
                        value={day.name}
                        onChange={(e) => updateDayName(day.id, e.target.value)}
                        className="text-lg font-medium text-gray-900 border-none focus:ring-0 p-0"
                      />
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => {
                            setSelectedDay(day.id);
                            setShowFlightSearch(true);
                          }}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Plane className="h-4 w-4 mr-2" />
                          Add Flight
                        </button>
                        <button
                          onClick={() => {/* Add hotel dialog */}}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Building className="h-4 w-4 mr-2" />
                          Add Hotel
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDay(day.id);
                            setShowActivitySearch(true);
                          }}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Add Activity
                        </button>
                      </div>
                    </div>

                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId={day.id}>
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-4"
                          >
                            {day.items.map((item, index) => (
                              <Draggable
                                key={item.id}
                                draggableId={item.id}
                                index={index}
                              >
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                                  >
                                    <div className="flex items-center">
                                      {item.type === 'Flight' && <Plane className="h-5 w-5 text-gray-400 mr-2" />}
                                      {item.type === 'Hotel' && <Building className="h-5 w-5 text-gray-400 mr-2" />}
                                      {item.type === 'Tour' && <Calendar className="h-5 w-5 text-gray-400 mr-2" />}
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                                        {item.description && (
                                          <p className="text-sm text-gray-500">{item.description}</p>
                                        )}
                                        {(item.startTime || item.endTime) && (
                                          <p className="text-xs text-gray-400">
                                            {item.startTime} - {item.endTime}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                      <div className="text-right">
                                        <p className="text-sm font-medium text-gray-900">
                                          ${item.cost.toFixed(2)}
                                        </p>
                                        {item.markup > 0 && (
                                          <p className="text-xs text-gray-500">
                                            +{item.markup}% markup
                                          </p>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => removeItemFromDay(day.id, item.id)}
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
              ))}
            </div>

            {/* Summary Panel */}
            <div className="col-span-4">
              <div className="bg-white shadow sm:rounded-lg sticky top-4">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Trip Summary</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">Total Days</p>
                      <p className="text-lg font-medium text-gray-900">{quoteDetails.days.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Items</p>
                      <p className="text-lg font-medium text-gray-900">
                        {quoteDetails.days.reduce((total, day) => total + day.items.length, 0)}
                      </p>
                    </div>
                    <div className="pt-4 border-t">
                      <p className="text-sm text-gray-500">Subtotal</p>
                      <p className="text-lg font-medium text-gray-900">
                        ${calculateTotalPrice().toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quote Summary */}
          <div className="fixed bottom-0 right-0 left-0 bg-white border-t shadow-lg">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-8">
                  <div>
                    <p className="text-sm text-gray-500">Subtotal</p>
                    <p className="text-lg font-medium text-gray-900">
                      ${calculateTotalPrice().toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Markup %</label>
                    <input
                      type="number"
                      value={quoteDetails.markup}
                      onChange={(e) => setQuoteDetails(prev => ({
                        ...prev,
                        markup: parseFloat(e.target.value)
                      }))}
                      className="ml-2 w-20 text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Discount %</label>
                    <input
                      type="number"
                      value={quoteDetails.discount}
                      onChange={(e) => setQuoteDetails(prev => ({
                        ...prev,
                        discount: parseFloat(e.target.value)
                      }))}
                      className="ml-2 w-20 text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setStep(4)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Review Quote
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quote Review (step 4) */}
      {step === 4 && !showSuccess && (
        <QuoteReview
          quoteDetails={quoteDetails}
          travelers={{
            adults: travelRequirements.adults,
            children: travelRequirements.children,
            seniors: travelRequirements.seniors,
          }}
          travelRequirements={travelRequirements}
          onQuoteFinalize={async (quoteData) => {
            if (!selectedCustomer) return;

            const { data: quote } = await supabase
              .from('quotes')
              .insert([{
                customer_id: selectedCustomer.id,
                status: 'Sent',
                total_price: calculateTotalPrice(),
                origin: travelRequirements.origin,
                destination: travelRequirements.destination,
                markup: quoteDetails.markup,
                discount: quoteDetails.discount,
                notes: quoteDetails.notes,
                expiry_date: quoteData.expiry_date,
              }])
              .select()
              .single();

            if (quote) {
              // Add quote items from day-wise itinerary with updated schema
              const quoteItems = quoteDetails.days.flatMap(day => 
                day.items.map(item => ({
                  quote_id: quote.id,
                  item_type: item.type,
                  item_name: item.name,
                  cost: item.cost,
                  markup: item.markup,
                  markup_type: item.markup_type,
                  quantity: 1,
                  details: {
                    ...item.details,
                    day: {
                      name: day.name,
                      index: day.dayIndex,
                    },
                    description: item.description,
                    startTime: item.startTime,
                    endTime: item.endTime,
                    travelers: {
                      adults: travelRequirements.adults,
                      children: travelRequirements.children,
                      seniors: travelRequirements.seniors,
                      total: travelRequirements.adults + travelRequirements.children + travelRequirements.seniors
                    }
                  },
                }))
              );

              await supabase
                .from('quote_items')
                .insert(quoteItems);

              setFinalizedQuoteId(quote.id);
              setShowSuccess(true);
            }
          }}
        />
      )}

      {/* Success Screen */}
      {showSuccess && finalizedQuoteId && (
        <SuccessScreen
          quoteId={finalizedQuoteId}
          onViewQuote={() => navigate(`/quotes/${finalizedQuoteId}`)}
        />
      )}

      <div className="mt-6 flex justify-between">
        {step > 1 && (
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </button>
        )}
        
        {step < 4 && (
          <button
            onClick={handleNext}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 ml-auto"
          >
            Next
            <ArrowRight className="h-5 w-5 ml-2" />
          </button>
        )}
      </div>

      {/* Add the modal components */}
      {showFlightSearch && (
        <FlightSearchModal
          isOpen={showFlightSearch}
          onClose={() => setShowFlightSearch(false)}
          onFlightSelect={handleFlightSelect}
          origin={travelRequirements.origin}
          destination={travelRequirements.destination}
          departureDate={travelRequirements.departureDate}
          returnDate={travelRequirements.returnDate}
          travelers={{
            adults: travelRequirements.adults,
            children: travelRequirements.children,
            seniors: travelRequirements.seniors,
          }}
        />
      )}

      {showActivitySearch && (
        <ActivitySearchModal
          isOpen={showActivitySearch}
          onClose={() => setShowActivitySearch(false)}
          onActivitySelect={handleActivitySelect}
          selectedDay={selectedDay || ''}
        />
      )}
    </div>
  );
}