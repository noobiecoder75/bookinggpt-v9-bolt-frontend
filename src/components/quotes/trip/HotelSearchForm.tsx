import React, { useState, useEffect } from 'react';
import { X, Search, Calendar, MapPin, Building } from 'lucide-react';

interface HotelSearchCriteria {
  hotelName: string;
  checkInDate: string;
  checkOutDate: string;
  country: string;
  selectedDayId: string;
}

interface HotelSearchFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (criteria: HotelSearchCriteria) => void;
  tripStartDate: string;
  tripEndDate: string;
  initialCriteria: HotelSearchCriteria;
}

export function HotelSearchForm({ 
  isOpen, 
  onClose, 
  onSearch, 
  tripStartDate, 
  tripEndDate, 
  initialCriteria 
}: HotelSearchFormProps) {
  const [criteria, setCriteria] = useState<HotelSearchCriteria>(initialCriteria);

  useEffect(() => {
    if (isOpen) {
      // Set default dates if not provided
      if (!criteria.checkInDate && tripStartDate) {
        setCriteria(prev => ({ ...prev, checkInDate: tripStartDate }));
      }
      if (!criteria.checkOutDate && tripEndDate) {
        setCriteria(prev => ({ ...prev, checkOutDate: tripEndDate }));
      }
    }
  }, [isOpen, tripStartDate, tripEndDate, criteria.checkInDate, criteria.checkOutDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (criteria.checkInDate && criteria.checkOutDate) {
      onSearch(criteria);
    }
  };

  const handleInputChange = (field: keyof HotelSearchCriteria, value: string) => {
    setCriteria(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Hotel Search</h2>
              <p className="text-sm text-gray-600 mt-1">
                Specify your hotel search criteria
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg p-2 transition-all duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Hotel Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building className="h-4 w-4 inline mr-2" />
              Hotel Name (Optional)
            </label>
            <input
              type="text"
              value={criteria.hotelName}
              onChange={(e) => handleInputChange('hotelName', e.target.value)}
              placeholder="Search by hotel name..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Country/Destination */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="h-4 w-4 inline mr-2" />
              Country/Destination (Optional)
            </label>
            <input
              type="text"
              value={criteria.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              placeholder="e.g., France, Paris, etc."
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Check-in Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-2" />
              Check-in Date *
            </label>
            <input
              type="date"
              value={criteria.checkInDate}
              onChange={(e) => handleInputChange('checkInDate', e.target.value)}
              min={tripStartDate}
              max={tripEndDate}
              required
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Check-out Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-2" />
              Check-out Date *
            </label>
            <input
              type="date"
              value={criteria.checkOutDate}
              onChange={(e) => handleInputChange('checkOutDate', e.target.value)}
              min={criteria.checkInDate || tripStartDate}
              max={tripEndDate}
              required
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Date Range Info */}
          {criteria.checkInDate && criteria.checkOutDate && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-700">
                <strong>Stay Duration:</strong> {
                  Math.ceil((new Date(criteria.checkOutDate).getTime() - new Date(criteria.checkInDate).getTime()) / (1000 * 60 * 60 * 24))
                } nights
              </p>
              <p className="text-xs text-green-600 mt-1">
                Hotel will be added to all days in this date range
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!criteria.checkInDate || !criteria.checkOutDate}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <Search className="h-4 w-4 mr-2" />
              Search Hotels
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 