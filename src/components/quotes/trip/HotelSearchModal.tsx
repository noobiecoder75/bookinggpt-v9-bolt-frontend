import React, { useState, useEffect } from 'react';
import { X, Search, Building, Loader, AlertCircle, Globe, Database } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface HotelSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHotelSelect: (hotel: any) => void;
  destination: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  quoteId?: string; // Add quoteId for persistence
  searchCriteria?: {
    hotelName: string;
    checkInDate: string;
    checkOutDate: string;
    country: string;
    selectedDayId: string;
  };
}

interface HotelRate {
  id: number | string;
  rate_type: string;
  description: string;
  cost: number;
  currency: string;
  valid_start: string;
  valid_end: string;
  details?: {
    imported_from?: string;
    imported_at?: string;
    extraction_method?: string;
    chain?: string;
    min_nights?: number;
    includes_breakfast?: boolean;
    source?: string;
    hotelCode?: string;
    category?: string;
    address?: any;
    facilities?: any[];
    images?: any[];
    // Hotelbeds booking properties
    rateKey?: string;
    selectedRoom?: any;
    bookingAvailable?: boolean;
  };
}

export function HotelSearchModal({ 
  isOpen, 
  onClose, 
  onHotelSelect, 
  destination, 
  checkInDate, 
  checkOutDate, 
  guests, 
  quoteId,
  searchCriteria 
}: HotelSearchModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hotels, setHotels] = useState<HotelRate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchingSources, setSearchingSources] = useState<{
    local: boolean;
    hotelbeds: boolean;
  }>({ local: false, hotelbeds: false });
  const [sessionKey, setSessionKey] = useState<string | null>(null);

  // Calculate number of nights for the stay
  const calculateNights = (checkIn: string, checkOut: string): number => {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  const numberOfNights = checkInDate && checkOutDate ? calculateNights(checkInDate, checkOutDate) : 1;

  // Generate a unique session key for this search
  const generateSessionKey = () => {
    const criteria = searchCriteria || { country: destination, checkInDate, checkOutDate, hotelName: '', selectedDayId: '' };
    return `${criteria.country || destination}-${criteria.checkInDate}-${criteria.checkOutDate}-${criteria.hotelName || ''}-${guests}`;
  };

  // Save search results to database
  const saveSearchSession = async (searchResults: HotelRate[], criteria: any) => {
    if (!quoteId) return;

    try {
      const sessionKey = generateSessionKey();
      
      const searchData = {
        quote_id: quoteId,
        session_key: sessionKey,
        search_criteria: criteria,
        search_results: searchResults,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
      };

      // Check if session already exists
      const { data: existingSession } = await supabase
        .from('hotel_search_sessions')
        .select('id')
        .eq('quote_id', quoteId)
        .eq('session_key', sessionKey)
        .single();

      if (existingSession) {
        // Update existing session
        await supabase
          .from('hotel_search_sessions')
          .update({
            search_results: searchResults,
            updated_at: new Date().toISOString(),
            expires_at: searchData.expires_at
          })
          .eq('id', existingSession.id);
      } else {
        // Create new session
        await supabase
          .from('hotel_search_sessions')
          .insert([searchData]);
      }

      setSessionKey(sessionKey);
      console.log('Search session saved successfully');
    } catch (error) {
      console.error('Error saving search session:', error);
    }
  };

  // Load search results from database
  const loadSearchSession = async () => {
    if (!quoteId) return null;

    try {
      const sessionKey = generateSessionKey();
      
      const { data, error } = await supabase
        .from('hotel_search_sessions')
        .select('*')
        .eq('quote_id', quoteId)
        .eq('session_key', sessionKey)
        .gt('expires_at', new Date().toISOString())
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        throw error;
      }

      if (data && data.search_results) {
        console.log('Loaded saved search session with', data.search_results.length, 'hotels');
        setSessionKey(sessionKey);
        return data.search_results as HotelRate[];
      }

      return null;
    } catch (error) {
      console.error('Error loading search session:', error);
      return null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Try to load saved results first, then fetch if none found
      loadSearchSession().then(savedResults => {
        if (savedResults && savedResults.length > 0) {
          setHotels(savedResults);
        } else {
          fetchHotels();
        }
      });
    }
  }, [isOpen, searchCriteria]);

  const fetchLocalHotels = async (): Promise<HotelRate[]> => {
    try {
      setSearchingSources(prev => ({ ...prev, local: true }));
      
      const { data, error } = await supabase
        .from('rates')
        .select('*')
        .eq('rate_type', 'Hotel')
        .order('description', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(hotel => ({
        ...hotel,
        details: {
          ...hotel.details,
          source: 'local'
        }
      }));
    } catch (error: any) {
      console.error('Error fetching local hotels:', error);
      return [];
    } finally {
      setSearchingSources(prev => ({ ...prev, local: false }));
    }
  };

  const fetchHotelbedsHotels = async (): Promise<HotelRate[]> => {
    // Only search Hotelbeds if we have search criteria with destination info
    if (!searchCriteria?.country && !destination) {
      return [];
    }

    try {
      setSearchingSources(prev => ({ ...prev, hotelbeds: true }));
      
      const searchPayload = {
        destination: searchCriteria?.country || destination,
        checkInDate: searchCriteria?.checkInDate || checkInDate,
        checkOutDate: searchCriteria?.checkOutDate || checkOutDate,
        guests: guests,
        ...(searchCriteria?.hotelName && { hotelName: searchCriteria.hotelName })
      };

      console.log('Searching Hotelbeds with payload:', searchPayload);

      const response = await fetch('http://localhost:3001/api/hotelbeds/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchPayload)
      });

      console.log('Hotelbeds API response status:', response.status);
      console.log('Hotelbeds API response content-type:', response.headers.get('content-type'));

      // Get response text first to see what we're actually receiving
      const responseText = await response.text();
      console.log('Hotelbeds API raw response (first 500 chars):', responseText.substring(0, 500));

      if (!response.ok) {
        console.warn('Hotelbeds API error - Status:', response.status);
        console.warn('Hotelbeds API error - Response:', responseText.substring(0, 200));
        
        // Try to parse as JSON for error details
        try {
          const errorData = JSON.parse(responseText);
          console.warn('Hotelbeds API parsed error:', errorData.error);
        } catch (parseError) {
          console.warn('Hotelbeds API returned non-JSON response (likely HTML error page)');
          console.warn('This usually means the server endpoint is not working or credentials are missing');
        }
        
        return []; // Return empty array instead of throwing to allow local results to show
      }

      // Try to parse the response as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.warn('Failed to parse Hotelbeds response as JSON:', parseError);
        console.warn('Response was:', responseText.substring(0, 200) + '...');
        return [];
      }

      return data.hotels || [];
      
    } catch (error: any) {
      console.warn('Hotelbeds API unavailable:', error.message);
      console.warn('Full error:', error);
      return []; // Return empty array to allow local results to show
    } finally {
      setSearchingSources(prev => ({ ...prev, hotelbeds: false }));
    }
  };

  const fetchHotels = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch from both sources in parallel
      const [localHotels, hotelbedsHotels] = await Promise.all([
        fetchLocalHotels(),
        fetchHotelbedsHotels()
      ]);

      // Combine results, with local hotels first
      const combinedHotels = [...localHotels, ...hotelbedsHotels];
      
      console.log(`Found ${localHotels.length} local hotels and ${hotelbedsHotels.length} Hotelbeds hotels`);
      
      setHotels(combinedHotels);
      
      // Save search results to database for persistence
      if (combinedHotels.length > 0) {
        const criteria = searchCriteria || { 
          country: destination, 
          checkInDate, 
          checkOutDate, 
          hotelName: '', 
          selectedDayId: '',
          guests 
        };
        await saveSearchSession(combinedHotels, criteria);
      }
      
      if (combinedHotels.length === 0) {
        setError('No hotels found. Try adjusting your search criteria or check your internet connection.');
      }
      
    } catch (error: any) {
      console.error('Error in fetchHotels:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredHotels = hotels.filter(hotel => {
    // Text search filter
    const matchesSearch = hotel.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (hotel.details?.imported_from && hotel.details.imported_from.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (hotel.details?.chain && hotel.details.chain.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Hotel name filter from search criteria
    const matchesHotelName = !searchCriteria?.hotelName || 
      hotel.description.toLowerCase().includes(searchCriteria.hotelName.toLowerCase());
    
    // Country filter from search criteria
    const matchesCountry = !searchCriteria?.country || 
      hotel.description.toLowerCase().includes(searchCriteria.country.toLowerCase()) ||
      (hotel.details?.imported_from && hotel.details.imported_from.toLowerCase().includes(searchCriteria.country.toLowerCase()));
    
    return matchesSearch && matchesHotelName && matchesCountry;
  });

  const handleHotelSelect = (hotel: HotelRate) => {
    // Calculate total stay cost
    const totalStayCost = hotel.cost * numberOfNights;
    
    // Debug logging for rate key preservation
    console.log('=== HotelSearchModal: Hotel Selection Debug ===');
    console.log('Original hotel object:', hotel);
    console.log('Hotel details:', hotel.details);
    console.log('Rate key from hotel.details:', hotel.details?.rateKey);
    console.log('Booking available:', hotel.details?.bookingAvailable);
    console.log('Source:', hotel.details?.source);
    
    const hotelItem = {
      id: hotel.id,
      name: hotel.description,
      cost: totalStayCost, // Store total stay cost, not per-night
      markup: 0,
      markup_type: 'percentage' as const,
      quantity: 1, // Hotels are typically quantity 1 for the entire stay
      details: {
        description: hotel.description,
        currency: hotel.currency,
        validStart: hotel.valid_start,
        validEnd: hotel.valid_end,
        checkInDate,
        checkOutDate,
        guests,
        destination,
        numberOfNights,
        perNightCost: hotel.cost, // Store original per-night cost for reference
        totalStayCost: totalStayCost,
        spanDays: numberOfNights, // Used by TripItinerarySection for multi-day display
        isMultiDay: numberOfNights > 1,
        startTime: checkInDate + 'T15:00:00', // Standard check-in time
        endTime: checkOutDate + 'T11:00:00', // Standard check-out time
        // Preserve ALL original details first
        ...hotel.details,
        // Override with our specific properties (this ensures our values take precedence)
        rateKey: hotel.details?.rateKey, // CRITICAL: Explicit override to ensure it's not lost
        selectedRoom: hotel.details?.selectedRoom,
        bookingAvailable: hotel.details?.bookingAvailable,
        hotelCode: hotel.details?.hotelCode,
        source: hotel.details?.source || 'unknown'
      }
    };
    
    console.log('=== HotelSearchModal: Final Hotel Item ===');
    console.log('Hotel item being passed to itinerary:', hotelItem);
    console.log('Rate key in final hotel item:', hotelItem.details.rateKey);
    console.log('Booking available in final hotel item:', hotelItem.details.bookingAvailable);
    console.log('Source in final hotel item:', hotelItem.details.source);
    
    onHotelSelect(hotelItem);
    onClose();
  };

  const getSourceBadge = (hotel: HotelRate) => {
    const source = hotel.details?.source;
    
    if (source === 'hotelbeds') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Globe className="h-3 w-3 mr-1" />
          Hotelbeds API
        </span>
      );
    } else if (hotel.details?.imported_from) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <Database className="h-3 w-3 mr-1" />
          AI Imported
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <Database className="h-3 w-3 mr-1" />
          Local Inventory
        </span>
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Select Hotel</h2>
              <p className="text-sm text-gray-600 mt-1">
                Choose from your inventory and live API results{destination && ` for ${destination}`}
              </p>
              {checkInDate && checkOutDate && (
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(checkInDate).toLocaleDateString()} - {new Date(checkOutDate).toLocaleDateString()} • {guests} guests • {numberOfNights} {numberOfNights === 1 ? 'night' : 'nights'}
                </p>
              )}
              {searchCriteria?.hotelName && (
                <p className="text-xs text-green-600 mt-1">
                  Searching for: {searchCriteria.hotelName}
                </p>
              )}
              {(searchingSources.local || searchingSources.hotelbeds) && (
                <div className="flex items-center space-x-2 mt-2">
                  {searchingSources.local && (
                    <span className="text-xs text-blue-600">Searching local inventory...</span>
                  )}
                  {searchingSources.hotelbeds && (
                    <span className="text-xs text-blue-600">Searching Hotelbeds API...</span>
                  )}
                </div>
              )}
              {sessionKey && !loading && hotels.length > 0 && (
                <div className="mt-2">
                  <span className="text-xs text-green-600">✓ Results loaded from saved search</span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg p-2 transition-all duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search hotels by name, chain, or source..."
              className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white shadow-sm transition-all duration-200"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
        
        <div className="px-4 py-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-8 w-8 animate-spin text-green-600" />
              <p className="ml-3 text-gray-600">Loading hotels from all sources...</p>
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
                {searchTerm ? 'Try adjusting your search terms.' : 'Upload hotel rates or check your search criteria.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHotels.map((hotel) => {
                const totalStayCost = hotel.cost * numberOfNights;
                
                return (
                  <div
                    key={`${hotel.details?.source || 'local'}-${hotel.id}`}
                    className="border rounded-lg overflow-hidden hover:border-green-500 transition-colors p-4 bg-white shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">
                          {hotel.description}
                        </h3>
                        <div className="mt-2 flex items-center space-x-4 flex-wrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {hotel.rate_type}
                          </span>
                          <span className="text-sm text-gray-500">
                            {hotel.currency}
                          </span>
                          {getSourceBadge(hotel)}
                          {hotel.details?.bookingAvailable && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              ✓ Auto-Bookable
                            </span>
                          )}
                          {hotel.details?.source === 'hotelbeds' && !hotel.details?.bookingAvailable && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              ⚠ Manual Booking
                            </span>
                          )}
                          {numberOfNights > 1 && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {numberOfNights} nights
                            </span>
                          )}
                          {hotel.details?.chain && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {hotel.details.chain}
                            </span>
                          )}
                          {hotel.details?.includes_breakfast && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              Breakfast Included
                            </span>
                          )}
                        </div>
                        {hotel.valid_start && hotel.valid_end && (
                          <p className="text-sm text-gray-500 mt-2">
                            Valid: {new Date(hotel.valid_start).toLocaleDateString()} - {new Date(hotel.valid_end).toLocaleDateString()}
                          </p>
                        )}
                        {hotel.details?.min_nights && (
                          <p className="text-sm text-gray-500">
                            Minimum {hotel.details.min_nights} nights
                          </p>
                        )}
                        {hotel.details?.category && (
                          <p className="text-sm text-gray-500">
                            Category: {hotel.details.category}
                          </p>
                        )}
                        {hotel.details?.address && (
                          <p className="text-xs text-gray-400 mt-1">
                            {hotel.details.address.content || 'Address available'}
                          </p>
                        )}
                        {hotel.details?.imported_from && hotel.details.source !== 'hotelbeds' && (
                          <p className="text-xs text-gray-400 mt-1">
                            Source: {hotel.details.imported_from}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className="space-y-1">
                          <p className="text-xl font-bold text-gray-900">
                            {hotel.currency} {hotel.cost.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-500">per night</p>
                          {numberOfNights > 1 && (
                            <>
                              <p className="text-lg font-bold text-green-600">
                                {hotel.currency} {totalStayCost.toFixed(2)}
                              </p>
                              <p className="text-sm text-green-600">total stay</p>
                            </>
                          )}
                        </div>
                        <button
                          onClick={() => handleHotelSelect(hotel)}
                          className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        >
                          Add to Itinerary
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">
            Showing {filteredHotels.length} of {hotels.length} hotels
            {numberOfNights > 1 && (
              <span className="ml-2 text-green-600 font-medium">
                • Prices shown for {numberOfNights} nights
              </span>
            )}
          </p>
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center">
                <Database className="h-3 w-3 mr-1" />
                {hotels.filter(h => h.details?.source !== 'hotelbeds').length} Local
              </div>
              <div className="flex items-center">
                <Globe className="h-3 w-3 mr-1" />
                {hotels.filter(h => h.details?.source === 'hotelbeds').length} Live API
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 