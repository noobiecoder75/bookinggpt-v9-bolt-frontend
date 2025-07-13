import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Search, Calendar, Users, MapPin, Plane, Building, Car, ArrowLeft, ArrowRight, Plus, Trash2, DollarSign, Clock, Edit2, Save, AlertCircle, X, Loader, ChevronUp, ChevronDown, CheckCircle, Eye, Globe, Database } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { QuoteServices } from './QuoteServices';
import { QuoteReview } from './QuoteReview';
import { Modal } from '../../components/Modal';
import { FlightSearchModal } from './FlightSearchModal';
import { useAuthContext } from '../../contexts/AuthContext';
import { providerFactory } from '../../lib/providers/ProviderFactory';
import { ProviderError } from '../../types/providers';

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
  travelers?: {
    adults: number;
    children: number;
    seniors: number;
  };
  isReturnFlight?: boolean;
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
  status: 'Draft' | 'Sent' | 'Expired' | 'Converted' | 'Published';
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

// Add interface for ActivitySearchModal
interface ActivitySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivitySelect: (activity: any) => void;
  selectedDay: string;
}

// Add HotelSearchModal interface and component
interface HotelSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHotelSelect: (hotel: any) => void;
  destination: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
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
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchActivities();
    }
  }, [isOpen]);

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch tours from the rates table
      const { data, error } = await supabase
        .from('rates')
        .select('*')
        .eq('rate_type', 'Tour')
        .order('description', { ascending: true });

      if (error) throw error;
      setActivities(data || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter activities based on search term
  const filteredActivities = activities.filter(activity =>
    activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (activity.details?.imported_from && activity.details.imported_from.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Select Tour/Activity</h2>
              <p className="text-sm text-gray-600 mt-1">Choose from your uploaded tour rates</p>
            </div>
          <button
            onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg p-2 transition-all duration-200"
          >
            <X className="h-5 w-5" />
          </button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tours and activities..."
              className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm transition-all duration-200"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
        
        <div className="px-4 py-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
              </div>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No tours found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search terms.' : 'Upload tour rates to see them here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="border border-gray-200 rounded-xl overflow-hidden hover:border-indigo-300 hover:shadow-lg transition-all duration-300 p-6 bg-white hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/30 group"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors duration-200">
                            {activity.description}
                      </h3>
                          <div className="mt-3 flex items-center space-x-3">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 group-hover:bg-indigo-200 transition-colors duration-200">
                              {activity.rate_type}
                            </span>
                            <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                              {activity.currency}
                            </span>
                            {activity.details?.imported_from && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                                AI Imported
                              </span>
                            )}
                          </div>
                          {activity.valid_start && activity.valid_end && (
                            <p className="text-sm text-gray-600 mt-2 flex items-center">
                              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                              Valid: {new Date(activity.valid_start).toLocaleDateString()} - {new Date(activity.valid_end).toLocaleDateString()}
                            </p>
                          )}
                          {activity.details?.imported_from && (
                            <p className="text-xs text-gray-500 mt-2 flex items-center">
                              <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                              Source: {activity.details.imported_from}
                        </p>
                      )}
                    </div>
                        <div className="text-right ml-6">
                          <p className="text-2xl font-bold text-gray-900 mb-3">
                            {activity.currency} {activity.cost.toFixed(2)}
                      </p>
                      <button
                            onClick={() => {
                              // Convert rate to activity format for compatibility
                              const activityItem = {
                                id: activity.id,
                                name: activity.description,
                                cost: activity.cost,
                                markup: 0,
                                markup_type: 'percentage',
                                details: {
                                  description: activity.description,
                                  currency: activity.currency,
                                  validStart: activity.valid_start,
                                  validEnd: activity.valid_end,
                                  imported_from: activity.details?.imported_from,
                                  extraction_method: activity.details?.extraction_method
                                }
                              };
                              onActivitySelect(activityItem);
                            }}
                            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                        Add to Itinerary
                      </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500">
            Showing {filteredActivities.length} of {activities.length} tours
          </p>
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

// Add this function before the NewQuoteWizard component
const formatDateTime = (dateTime: string) => {
  return new Date(dateTime).toLocaleString();
};

// Add HotelSearchModal interface and component
function HotelSearchModal({ isOpen, onClose, onHotelSelect, destination, checkInDate, checkOutDate, guests }: HotelSearchModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hotels, setHotels] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchHotels();
    }
  }, [isOpen]);

  const fetchHotels = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch hotels from the rates table
      const { data, error } = await supabase
        .from('rates')
        .select('*')
        .eq('rate_type', 'Hotel')
        .order('description', { ascending: true });

      if (error) throw error;
      setHotels(data || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter hotels based on search term
  const filteredHotels = hotels.filter(hotel =>
    hotel.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (hotel.details?.imported_from && hotel.details.imported_from.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Select Hotel</h2>
              <p className="text-sm text-gray-600 mt-1">Choose from your uploaded hotel rates</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg p-2 transition-all duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search hotels..."
              className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm transition-all duration-200"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
        
        <div className="px-4 py-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          ) : filteredHotels.length === 0 ? (
            <div className="text-center py-8">
              <Building className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hotels found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search terms.' : 'Upload hotel rates to see them here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHotels.map((hotel) => (
                <div
                  key={hotel.id}
                  className="border rounded-lg overflow-hidden hover:border-indigo-500 transition-colors p-4 bg-white shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {hotel.description}
                          </h3>
                          <div className="mt-2 flex items-center space-x-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              {hotel.rate_type}
                            </span>
                            <span className="text-sm text-gray-500">
                              {hotel.currency}
                            </span>
                            {hotel.details?.imported_from && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                AI Imported
                              </span>
                            )}
                          </div>
                          {hotel.valid_start && hotel.valid_end && (
                            <p className="text-sm text-gray-500 mt-1">
                              Valid: {new Date(hotel.valid_start).toLocaleDateString()} - {new Date(hotel.valid_end).toLocaleDateString()}
                            </p>
                          )}
                          {hotel.details?.imported_from && (
                            <p className="text-xs text-gray-400 mt-1">
                              Source: {hotel.details.imported_from}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-xl font-bold text-gray-900">
                            {hotel.currency} {hotel.cost.toFixed(2)}
                          </p>
                          <button
                            onClick={() => {
                              // Convert rate to hotel format for compatibility
                              const hotelItem = {
                                id: hotel.id,
                                name: hotel.description,
                                cost: hotel.cost,
                                markup: 0,
                                markup_type: 'percentage',
                                details: {
                                  description: hotel.description,
                                  currency: hotel.currency,
                                  validStart: hotel.valid_start,
                                  validEnd: hotel.valid_end,
                                  imported_from: hotel.details?.imported_from,
                                  extraction_method: hotel.details?.extraction_method
                                }
                              };
                              onHotelSelect(hotelItem);
                            }}
                            className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Add to Itinerary
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500">
            Showing {filteredHotels.length} of {hotels.length} hotels
          </p>
        </div>
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
  const tripId = searchParams.get('tripId');
  const itineraryId = searchParams.get('itineraryId');

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
  const [showHotelSearch, setShowHotelSearch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add new state for delete confirmation
  const [dayToDelete, setDayToDelete] = useState<string | null>(null);

  // Add new state for expanded items
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

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

    // Get current authenticated user
    const { user } = useAuthContext();
    if (!user) {
      console.error('User not authenticated');
      setError('User not authenticated. Please sign in again.');
      return;
    }

    console.log('Saving quote with user:', { 
      userId: user.id, 
      email: user.email,
      customerId: selectedCustomer.id,
      quoteId: quoteDetails.id 
    });

    setIsSaving(true);
    try {
      // First, save or update the main quote
      const quoteData = {
        id: quoteDetails.id,
        customer_id: selectedCustomer.id,
        agent_id: user.id, // Add the missing agent_id field
        status: quoteDetails.status,
        total_price: calculateTotalPrice(),
        markup: quoteDetails.markup,
        discount: quoteDetails.discount,
        notes: quoteDetails.notes,
        origin: travelRequirements.origin,
        destination: travelRequirements.destination,
      };

      console.log('Attempting to save quote with data:', quoteData);

      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .upsert(quoteData)
        .select()
        .single();

      if (quoteError) {
        console.error('Quote save error:', quoteError);
        throw new Error(`Failed to save quote: ${quoteError.message}`);
      }

      console.log('Quote saved successfully:', quote);

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
    const dayToModify = quoteDetails.days.find(day => day.id === dayId);
    const itemToRemove = dayToModify?.items.find(item => item.id === itemId);

    if (!itemToRemove || !dayToModify) return;

    // If this is a flight and has a linked flight, remove both
    if (itemToRemove.type === 'Flight' && itemToRemove.details.linkedFlightId) {
      const linkedId = itemToRemove.details.linkedFlightId;
      
      setQuoteDetails(prev => ({
        ...prev,
        days: prev.days.map(day => ({
          ...day,
          items: day.items.filter(item => 
            item.id !== itemId && item.id !== linkedId
          )
        }))
      }));
    } else {
      // Regular item removal
      setQuoteDetails(prev => ({
        ...prev,
        days: prev.days.map(day => 
          day.id === dayId
            ? { ...day, items: day.items.filter(item => item.id !== itemId) }
            : day
        )
      }));
    }
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
    // Get current authenticated user
    const { user } = useAuthContext();
    if (!user) {
      alert('User not authenticated');
      return;
    }

    const { data, error } = await supabase
      .from('customers')
      .insert([{
        ...newCustomer,
        agent_id: user.id // Add agent_id for RLS
      }])
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
    { number: 1, title: 'Customer & Dates', description: 'Select customer and trip dates' },
    { number: 2, title: 'Services', description: 'Build itinerary' },
    { number: 3, title: 'Review', description: 'Finalize quote' },
  ];

  // Handler for clicking on step indicators
  const handleStepClick = (stepNumber: number) => {
    // Only allow going back to previous steps
    if (stepNumber < step) {
      setStep(stepNumber);
    }
  };

  // Add flight selection handler
  const handleFlightSelect = (flight: any, requirements: any) => {
    setShowFlightSearch(false);

    // Create outbound flight item
    const outboundFlight: ItineraryItem = {
      id: `flight-${Date.now()}`,
      type: 'Flight',
      name: `${requirements.origin} → ${requirements.destination}`,
      description: `Flight ${flight.itineraries[0].segments[0].carrierCode}${flight.itineraries[0].segments[0].number}`,
      startTime: flight.itineraries[0].segments[0].departure.at,
      endTime: flight.itineraries[0].segments[0].arrival.at,
      cost: parseFloat(flight.price.total) / (requirements.isReturnFlight ? 2 : 1), // Split cost for return flights
      markup: 0,
      markup_type: 'percentage',
      details: {
        ...flight,
        isOutbound: true,
        linkedFlightId: requirements.isReturnFlight ? `return-flight-${Date.now()}` : null
      }
    };

    // Find the first and last days
    const firstDay = quoteDetails.days.find(day => 
      new Date(day.name).toISOString().split('T')[0] === requirements.departureDate
    );

    if (firstDay) {
      addItemToDay(firstDay.id, outboundFlight);
    }

    // Handle return flight if it exists
    if (requirements.isReturnFlight && flight.itineraries[1]) {
      const returnFlight: ItineraryItem = {
        id: `return-flight-${Date.now()}`,
        type: 'Flight',
        name: `${requirements.destination} → ${requirements.origin}`,
        description: `Flight ${flight.itineraries[1].segments[0].carrierCode}${flight.itineraries[1].segments[0].number}`,
        startTime: flight.itineraries[1].segments[0].departure.at,
        endTime: flight.itineraries[1].segments[0].arrival.at,
        cost: parseFloat(flight.price.total) / 2, // Split cost for return flights
        markup: 0,
        markup_type: 'percentage',
        details: {
          ...flight,
          isOutbound: false,
          linkedFlightId: outboundFlight.id
        }
      };

      const lastDay = quoteDetails.days.find(day => 
        new Date(day.name).toISOString().split('T')[0] === requirements.returnDate
      );

      if (lastDay) {
        addItemToDay(lastDay.id, returnFlight);
      }
    }
  };

  // Add activity selection handler
  const handleActivitySelect = (activity: any) => {
    if (!selectedDay) return;

    // Create a new activity service item based on the selected activity's details
    const activityItem: ItineraryItem = {
      id: `activity-${Date.now()}`,
      type: 'Tour',
      name: activity.name,
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

  // Add flight search handler
  const handleFlightSearch = () => {
    setShowFlightSearch(true);
  };

  // Add activity search handler
  const handleActivitySearch = () => {
    setShowActivitySearch(true);
  };

  // Add hotel search handler
  const handleHotelSearch = () => {
    setShowHotelSearch(true);
  };

  // Add success handler
  const handleSuccess = () => {
    setShowSuccess(true);
  };

  // Add hotel selection handler
  const handleHotelSelect = (hotel: any) => {
    // Implementation for hotel selection
  };

  // Add delete handler
  const handleDelete = () => {
    // Implementation for deleting a day
  };

  // Add expand handler
  const handleExpand = (dayId: string) => {
    // Implementation for expanding a day
  };

  // Add collapse handler
  const handleCollapse = (dayId: string) => {
    // Implementation for collapsing a day
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      {showSuccess && finalizedQuoteId ? (
        <SuccessScreen 
          quoteId={finalizedQuoteId} 
          onViewQuote={handleSuccess}
        />
      ) : (
        <>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
            <div>
                <div className="flex items-center space-x-4">
                  {tripId && (
              <button
                      onClick={() => navigate(`/trips/${tripId}`)}
                      className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                  >
                      <ArrowLeft className="h-5 w-5 mr-2" />
                      Back to Trip Overview
              </button>
                  )}
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      {editQuoteId ? 'Edit Quote' : tripId ? 'Create Itinerary' : 'Create New Quote'}
                    </h1>
                    <p className="text-gray-600 mt-2">
                      {editQuoteId ? 'Update your existing quote' : tripId ? 'Build an itinerary for this trip' : 'Build a custom travel quote for your client'}
                    </p>
            </div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[
                { number: 1, title: 'Customer & Dates', description: 'Select customer and trip dates' },
                { number: 2, title: 'Services', description: 'Build itinerary' },
                { number: 3, title: 'Review', description: 'Finalize quote' },
              ].map((stepItem, index) => (
                <div key={stepItem.number} className="flex items-center">
                  <div
                    className={`flex items-center cursor-pointer ${
                      step >= stepItem.number ? 'text-indigo-600' : 'text-gray-400'
                    }`}
                    onClick={() => handleStepClick(stepItem.number)}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                        step >= stepItem.number
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-gray-300 text-gray-400'
                      }`}
                    >
                      {stepItem.number}
            </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium">{stepItem.title}</p>
                      <p className="text-xs">{stepItem.description}</p>
                    </div>
                  </div>
                  {index < 2 && (
                    <div
                      className={`flex-1 h-0.5 mx-4 ${
                        step > stepItem.number ? 'bg-indigo-600' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            {step === 1 && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Customer & Trip Dates</h2>
                
                {/* Customer Selection Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium mb-4">Select Customer</h3>
                  
                  {!selectedCustomer ? (
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="flex-1">
            <input
              type="text"
                            placeholder="Search customers by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
                    </div>
            <button
              onClick={() => setShowNewCustomerForm(true)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
                          New Customer
            </button>
          </div>

          {customers.length > 0 && (
                        <div className="border border-gray-200 rounded-lg">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                              className="p-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedCustomer(customer)}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <h3 className="font-medium">
                        {customer.first_name} {customer.last_name}
                                  </h3>
                                  <p className="text-sm text-gray-600">{customer.email}</p>
                                  <p className="text-sm text-gray-600">{customer.phone}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

                      {showNewCustomerForm && (
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h3 className="font-medium mb-4">Create New Customer</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <input
                              type="text"
                              placeholder="First Name"
                              value={newCustomer.first_name}
                              onChange={(e) => setNewCustomer({ ...newCustomer, first_name: e.target.value })}
                              className="px-3 py-2 border border-gray-300 rounded-lg"
                            />
                            <input
                              type="text"
                              placeholder="Last Name"
                              value={newCustomer.last_name}
                              onChange={(e) => setNewCustomer({ ...newCustomer, last_name: e.target.value })}
                              className="px-3 py-2 border border-gray-300 rounded-lg"
                            />
                            <input
                              type="email"
                              placeholder="Email"
                              value={newCustomer.email}
                              onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                              className="px-3 py-2 border border-gray-300 rounded-lg"
                            />
                            <input
                              type="tel"
                              placeholder="Phone"
                              value={newCustomer.phone}
                              onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                              className="px-3 py-2 border border-gray-300 rounded-lg"
                            />
                            <input
                              type="text"
                              placeholder="Passport Number"
                              value={newCustomer.passport_number}
                              onChange={(e) => setNewCustomer({ ...newCustomer, passport_number: e.target.value })}
                              className="px-3 py-2 border border-gray-300 rounded-lg"
                            />
                            <input
                              type="text"
                              placeholder="Nationality"
                              value={newCustomer.nationality}
                              onChange={(e) => setNewCustomer({ ...newCustomer, nationality: e.target.value })}
                              className="px-3 py-2 border border-gray-300 rounded-lg"
                            />
        </div>
                          <div className="flex gap-2 mt-4">
              <button
                              onClick={handleCreateCustomer}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                              Create Customer
              </button>
              <button
                              onClick={() => setShowNewCustomerForm(false)}
                              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                              Cancel
              </button>
            </div>
          </div>
                      )}
        </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">
                            {selectedCustomer.first_name} {selectedCustomer.last_name}
                          </h3>
                          <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
                          <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
            </div>
                  <button
                          onClick={() => setSelectedCustomer(null)}
                          className="text-indigo-600 hover:text-indigo-800"
                  >
                          Change Customer
                  </button>
                </div>
                    </div>
                  )}
                </div>

                {/* Trip Dates Section */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium mb-4">Trip Dates</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Departure Date
                      </label>
                      <input
                        type="date"
                        value={travelRequirements.departureDate}
                        onChange={(e) => setTravelRequirements({ 
                          ...travelRequirements, 
                          departureDate: e.target.value 
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Return Date
                      </label>
                      <input
                        type="date"
                        value={travelRequirements.returnDate}
                        onChange={(e) => setTravelRequirements({ 
                          ...travelRequirements, 
                          returnDate: e.target.value 
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Total Days
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={quoteDetails.totalDays}
                        onChange={(e) => {
                          const days = parseInt(e.target.value) || 1;
                          setQuoteDetails({ ...quoteDetails, totalDays: days });
                          initializeDays(days);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Quote Details Section */}
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h3 className="text-lg font-medium mb-4">Quote Details</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quote Name
                      </label>
                      <input
                        type="text"
                        value={quoteDetails.name}
                        onChange={(e) => setQuoteDetails({ ...quoteDetails, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter quote name..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        value={quoteDetails.status}
                        onChange={(e) => setQuoteDetails({ 
                          ...quoteDetails, 
                          status: e.target.value as QuoteDetails['status']
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Sent">Sent</option>
                        <option value="Expired">Expired</option>
                        <option value="Converted">Converted</option>
                        <option value="Published">Published</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-semibold">Build Itinerary</h2>
                    <p className="text-sm text-gray-600 mt-1">Add travel requirements and services for each day</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={handleFlightSearch}
                      className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <Plane className="w-5 h-5 mr-2" />
                      Add Flight
                    </button>
                    <button
                      onClick={handleHotelSearch}
                      className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <Building className="w-5 h-5 mr-2" />
                      Add Hotel
                    </button>
                    <button
                      onClick={handleActivitySearch}
                      className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add Activity
                    </button>
                  </div>
              </div>
            
                {/* Simplified Travel Requirements Section */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-medium mb-4">Travelers</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Adults
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={travelRequirements.adults}
                        onChange={(e) => setTravelRequirements({ 
                          ...travelRequirements, 
                          adults: parseInt(e.target.value) || 1 
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Children
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={travelRequirements.children}
                        onChange={(e) => setTravelRequirements({ 
                          ...travelRequirements, 
                          children: parseInt(e.target.value) || 0 
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Seniors
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={travelRequirements.seniors}
                        onChange={(e) => setTravelRequirements({ 
                          ...travelRequirements, 
                          seniors: parseInt(e.target.value) || 0 
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Origin
                      </label>
                      <input
                        type="text"
                        placeholder="Departure city"
                        value={travelRequirements.origin}
                        onChange={(e) => setTravelRequirements({ 
                          ...travelRequirements, 
                          origin: e.target.value 
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Destination
                      </label>
                      <input
                        type="text"
                        placeholder="Destination city"
                        value={travelRequirements.destination}
                        onChange={(e) => setTravelRequirements({ 
                          ...travelRequirements, 
                          destination: e.target.value 
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Special Requests
                    </label>
                    <textarea
                      rows={3}
                      value={travelRequirements.specialRequests}
                      onChange={(e) => setTravelRequirements({ 
                        ...travelRequirements, 
                        specialRequests: e.target.value 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Any special requirements or preferences..."
                    />
                  </div>
                </div>

                {/* Day-wise Itinerary */}
              <div className="space-y-4">
                {quoteDetails.days.map((day) => (
                    <div key={day.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                          <input
                            type="text"
                            value={day.name}
                            onChange={(e) => updateDayName(day.id, e.target.value)}
                          className="text-lg font-medium bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            {day.items.length} items
                          </span>
                          <button
                            onClick={() => setDayToDelete(day.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete Day
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {day.items.map((item) => (
                          <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    item.type === 'Flight' ? 'bg-blue-100 text-blue-800' :
                                    item.type === 'Hotel' ? 'bg-green-100 text-green-800' :
                                    'bg-purple-100 text-purple-800'
                                  }`}>
                                    {item.type}
                                            </span>
                                  <h4 className="font-medium">{item.name}</h4>
                                        </div>
                                        {item.description && (
                                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                )}
                                {(item.startTime || item.endTime) && (
                                  <p className="text-sm text-gray-500 mt-1">
                                    {item.startTime} - {item.endTime}
                                          </p>
                                        )}
                                      </div>
                                    <div className="text-right">
                                <p className="font-medium">${item.cost}</p>
                                    <button
                                      onClick={() => removeItemFromDay(day.id, item.id)}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                  Remove
                                    </button>
                                  </div>
                                </div>
                              </div>
                        ))}
                            </div>
                            
                      {day.items.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <p>No items added to this day yet.</p>
                          <p className="text-sm">Use the buttons above to add flights, hotels, or activities.</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">Total Price:</span>
                    <span className="text-2xl font-bold text-indigo-600">
                      ${calculateTotalPrice().toFixed(2)}
                    </span>
                    </div>
                  </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Review & Finalize</h2>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quote Name
                      </label>
                      <input
                        type="text"
                        value={quoteDetails.name}
                        onChange={(e) => setQuoteDetails({ ...quoteDetails, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Enter quote name..."
                      />
            </div>
            
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        value={quoteDetails.status}
                        onChange={(e) => setQuoteDetails({ 
                          ...quoteDetails, 
                          status: e.target.value as QuoteDetails['status']
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Sent">Sent</option>
                        <option value="Expired">Expired</option>
                        <option value="Converted">Converted</option>
                        <option value="Published">Published</option>
                      </select>
                </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Markup (%)
                      </label>
              <input
                type="number"
                        min="0"
                        max="100"
                      value={quoteDetails.markup}
                        onChange={(e) => setQuoteDetails({ 
                          ...quoteDetails, 
                          markup: parseFloat(e.target.value) || 0 
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
            </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Discount ($)
                      </label>
              <input
                type="number"
                        min="0"
                      value={quoteDetails.discount}
                        onChange={(e) => setQuoteDetails({ 
                          ...quoteDetails, 
                          discount: parseFloat(e.target.value) || 0 
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                  </div>
                </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      rows={4}
                      value={quoteDetails.notes}
                      onChange={(e) => setQuoteDetails({ ...quoteDetails, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Internal notes about this quote..."
                    />
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium mb-4">Quote Summary</h3>
                    <div className="space-y-2">
                  <div className="flex justify-between">
                        <span>Customer:</span>
                        <span>{selectedCustomer?.first_name} {selectedCustomer?.last_name}</span>
                  </div>
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span>{quoteDetails.totalDays} days</span>
                </div>
                      <div className="flex justify-between">
                        <span>Total Items:</span>
                        <span>{quoteDetails.days.reduce((sum, day) => sum + day.items.length, 0)}</span>
              </div>
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>${calculateTotalPrice().toFixed(2)}</span>
            </div>
                      <div className="flex justify-between">
                        <span>Markup ({quoteDetails.markup}%):</span>
                        <span>${(calculateTotalPrice() * quoteDetails.markup / 100).toFixed(2)}</span>
          </div>
                      <div className="flex justify-between">
                        <span>Discount:</span>
                        <span>-${quoteDetails.discount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Final Total:</span>
                        <span>${(calculateTotalPrice() * (1 + quoteDetails.markup / 100) - quoteDetails.discount).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <button
                onClick={handleBack}
                disabled={step === 1}
                className={`px-6 py-2 rounded-lg ${
                  step === 1
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                Back
              </button>

              <div className="flex gap-2">
                {step < 3 ? (
                  <button
                    onClick={handleNext}
                    disabled={
                      (step === 1 && (!selectedCustomer || !travelRequirements.departureDate || !travelRequirements.returnDate)) ||
                      (step === 2 && quoteDetails.days.every(day => day.items.length === 0))
                    }
                    className={`px-6 py-2 rounded-lg ${
                      (step === 1 && (!selectedCustomer || !travelRequirements.departureDate || !travelRequirements.returnDate)) ||
                      (step === 2 && quoteDetails.days.every(day => day.items.length === 0))
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    Next
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={saveQuoteToDatabase}
                      disabled={isSaving || !quoteDetails.name}
                      className={`px-6 py-2 rounded-lg ${
                        isSaving || !quoteDetails.name
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {isSaving ? 'Saving...' : 'Save Quote'}
                    </button>
          </div>
                )}
        </div>
        </div>
      </div>

      {/* Modals */}
      {showFlightSearch && (
        <FlightSearchModal
          isOpen={showFlightSearch}
              onClose={() => setShowFlightSearch(false)}
          onFlightSelect={(flight, requirements) => {
                console.log('Flight selected:', flight, requirements);
                // Add the flight to the first day's itinerary
                const newFlight: ItineraryItem = {
                  id: Date.now().toString(),
                type: 'Flight',
                  name: `Flight from ${requirements.origin} to ${requirements.destination}`,
                  description: `${requirements.travelers.adults + requirements.travelers.children + requirements.travelers.seniors} travelers`,
                  startTime: requirements.departureDate,
                  endTime: requirements.departureDate,
                  cost: flight.price?.total ? parseFloat(flight.price.total) : 500,
                markup: 0,
                markup_type: 'percentage',
                details: {
                    airline: flight.itineraries?.[0]?.segments?.[0]?.carrierCode || 'Unknown',
                    flightNumber: flight.itineraries?.[0]?.segments?.[0]?.number || 'N/A',
                  origin: requirements.origin,
                  destination: requirements.destination,
                    departureTime: flight.itineraries?.[0]?.segments?.[0]?.departure?.at || requirements.departureDate,
                    arrivalTime: flight.itineraries?.[0]?.segments?.[0]?.arrival?.at || requirements.departureDate,
                    travelers: requirements.travelers
                  }
                };
                
                // Add to the first day if it exists, otherwise create a new day
                setQuoteDetails(prev => {
                  const updatedDays = [...prev.days];
                  if (updatedDays.length === 0) {
                    updatedDays.push({
                      id: '1',
                      dayIndex: 1,
                      name: 'Day 1',
                      items: [newFlight],
                      isComplete: false
                    });
            } else {
                    updatedDays[0] = {
                      ...updatedDays[0],
                      items: [...updatedDays[0].items, newFlight]
                    };
                  }
                  return { ...prev, days: updatedDays };
                });
            setShowFlightSearch(false);
          }}
        />
      )}

          {showActivitySearch && selectedDay && (
        <ActivitySearchModal
          isOpen={showActivitySearch}
          onClose={() => setShowActivitySearch(false)}
          onActivitySelect={handleActivitySelect}
              selectedDay={selectedDay}
        />
      )}

      {showHotelSearch && (
        <HotelSearchModal
          isOpen={showHotelSearch}
          onClose={() => setShowHotelSearch(false)}
              destination={travelRequirements.destination}
              onHotelSelect={(hotel) => {
                console.log('Hotel selected:', hotel);
                // Add the hotel to the first day's itinerary
                const newHotel: ItineraryItem = {
                  id: Date.now().toString(),
                  type: 'Hotel',
                  name: hotel.description || 'Hotel Booking',
                  description: 'Accommodation',
                  startTime: new Date().toISOString().split('T')[0],
                  endTime: new Date().toISOString().split('T')[0],
                  cost: hotel.cost || 150,
                  markup: 0,
                  markup_type: 'percentage',
                    details: {
                    rating: hotel.details?.rating || 4,
                    amenities: hotel.details?.amenities || ['WiFi', 'Breakfast'],
                    checkIn: hotel.details?.checkIn || new Date().toISOString().split('T')[0],
                    checkOut: hotel.details?.checkOut || new Date(Date.now() + 86400000).toISOString().split('T')[0]
                  }
                };
                
                // Add to the first day if it exists, otherwise create a new day
                setQuoteDetails(prev => {
                  const updatedDays = [...prev.days];
                  if (updatedDays.length === 0) {
                    updatedDays.push({
                      id: '1',
                      dayIndex: 1,
                      name: 'Day 1',
                      items: [newHotel],
                      isComplete: false
                    });
                  } else {
                    updatedDays[0] = {
                      ...updatedDays[0],
                      items: [...updatedDays[0].items, newHotel]
                    };
                  }
                  return { ...prev, days: updatedDays };
                });
                setShowHotelSearch(false);
              }}
              checkInDate={new Date().toISOString().split('T')[0]}
              checkOutDate={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
              guests={1}
            />
          )}
        </>
      )}
    </div>
  );
}