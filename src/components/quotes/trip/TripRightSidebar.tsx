import React from 'react';
import { Users, Plus, Edit3, ToggleLeft, ToggleRight } from 'lucide-react';

interface Traveler {
  id: string;
  name: string;
  email: string;
  type: 'Adult' | 'Child' | 'Senior';
}

interface ItineraryOption {
  id: string;
  name: string;
  dateRange: string;
  isActive: boolean;
}

interface Trip {
  customer?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  currency: string;
  pricingVisible: boolean;
  pdfDownloadEnabled: boolean;
  tags: string[];
}

interface TripRightSidebarProps {
  trip: Trip;
  travelers: Traveler[];
  itineraryOptions: ItineraryOption[];
  onTripUpdate: (updates: any) => void;
  onCreateItinerary: () => void;
  onEditItinerary: (optionId: string) => void;
}

export function TripRightSidebar({ 
  trip, 
  travelers, 
  itineraryOptions, 
  onTripUpdate, 
  onCreateItinerary, 
  onEditItinerary 
}: TripRightSidebarProps) {
  return (
    <div className="w-80 p-6 space-y-6">
      {/* Travelers Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">Travelers</h3>
          <button className="text-indigo-600 hover:text-indigo-800 text-sm">
            Manage Travelers
          </button>
        </div>
        
        {trip.customer ? (
          <div className="space-y-3">
            {/* Primary Customer */}
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {trip.customer.first_name} {trip.customer.last_name}
                  </p>
                  <p className="text-xs text-gray-600">{trip.customer.email}</p>
                  {trip.customer.phone && (
                    <p className="text-xs text-gray-600">{trip.customer.phone}</p>
                  )}
                </div>
                <span className="text-xs text-indigo-700 bg-indigo-100 px-2 py-1 rounded-full">
                  Primary
                </span>
              </div>
            </div>
            
            {/* Additional Travelers */}
            {travelers.length > 0 && (
              <div className="space-y-2">
                {travelers.map((traveler) => (
                  <div key={traveler.id} className="flex items-center justify-between p-2 border border-gray-200 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{traveler.name}</p>
                      <p className="text-xs text-gray-500">{traveler.email}</p>
                    </div>
                    <span className="text-xs text-gray-500">{traveler.type}</span>
                  </div>
                ))}
              </div>
            )}
            
            {travelers.length === 0 && (
              <div className="text-center py-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Click "Manage Travelers" to add additional travelers
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <Users className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No travelers added yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Add travelers to start planning the trip
            </p>
          </div>
        )}
      </div>

      {/* Itinerary Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">Itinerary</h3>
          <button 
            onClick={onCreateItinerary}
            className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        
        <div className="space-y-2">
          {itineraryOptions.map((option) => (
            <div key={option.id} className="flex items-center justify-between p-2 border border-gray-200 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">{option.name}</p>
                <p className="text-xs text-gray-500">{option.dateRange}</p>
              </div>
              <button 
                onClick={() => onEditItinerary(option.id)}
                className="w-6 h-6 text-gray-400 hover:text-gray-600"
              >
                <Edit3 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Trip Settings Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Trip Settings</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
            <select 
              value={trip.currency}
              onChange={(e) => onTripUpdate({ currency: e.target.value })}
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-700">Pricing Visibility</label>
            <button
              onClick={() => onTripUpdate({ pricingVisible: !trip.pricingVisible })}
              className="text-indigo-600"
            >
              {trip.pricingVisible ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
            </button>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tags</label>
            <div className="flex flex-wrap gap-1">
              {trip.tags.map((tag, index) => (
                <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-700">PDF Download</label>
            <button
              onClick={() => onTripUpdate({ pdfDownloadEnabled: !trip.pdfDownloadEnabled })}
              className="text-indigo-600"
            >
              {trip.pdfDownloadEnabled ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 