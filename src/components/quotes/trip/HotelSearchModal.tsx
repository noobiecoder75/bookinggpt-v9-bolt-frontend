import React, { useState, useEffect } from 'react';
import { X, Search, Building, Loader, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface HotelSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHotelSelect: (hotel: any) => void;
  destination: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  searchCriteria?: {
    hotelName: string;
    checkInDate: string;
    checkOutDate: string;
    country: string;
    selectedDayId: string;
  };
}

interface HotelRate {
  id: number;
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
  searchCriteria 
}: HotelSearchModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hotels, setHotels] = useState<HotelRate[]>([]);
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
    const hotelItem = {
      id: hotel.id,
      name: hotel.description,
      cost: hotel.cost,
      markup: 0,
      markup_type: 'percentage' as const,
      details: {
        description: hotel.description,
        currency: hotel.currency,
        validStart: hotel.valid_start,
        validEnd: hotel.valid_end,
        checkInDate,
        checkOutDate,
        guests,
        destination,
        ...hotel.details
      }
    };
    onHotelSelect(hotelItem);
    onClose();
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
                Choose from your uploaded hotel rates{destination && ` for ${destination}`}
              </p>
              {checkInDate && checkOutDate && (
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(checkInDate).toLocaleDateString()} - {new Date(checkOutDate).toLocaleDateString()} • {guests} guests
                </p>
              )}
              {searchCriteria?.hotelName && (
                <p className="text-xs text-green-600 mt-1">
                  Searching for: {searchCriteria.hotelName}
                </p>
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
              <p className="ml-3 text-gray-600">Loading hotel rates...</p>
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
                        {hotel.details?.imported_from && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            AI Imported
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
                      <p className="text-sm text-gray-500">per night</p>
                      <button
                        onClick={() => handleHotelSelect(hotel)}
                        className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
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
        
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500">
            Showing {filteredHotels.length} of {hotels.length} hotels
          </p>
        </div>
      </div>
    </div>
  );
} 