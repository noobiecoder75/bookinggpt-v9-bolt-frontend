import React, { useState, useEffect } from 'react';
import { Plus, Trash2, MapPin, Calendar, Users, DollarSign, Star, Activity, AlertCircle } from 'lucide-react';

interface Destination {
  id: string;
  city: string;
  nights: number;
}

interface FormData {
  tripDates: {
    checkIn: string;
    checkOut: string;
  };
  destinations: Destination[];
  occupancy: {
    rooms: number;
    adults: number;
    children: number;
  };
  budget: {
    total: number;
    perNight: number;
    currency: string;
  };
  hotelPreferences: {
    minStars: number;
    maxStars: number;
    boardType: string;
  };
  activityPreferences: string[];
  travelPace: string;
  specialRequests: string;
}

interface TripBuilderFormProps {
  onSubmit: (formData: FormData) => void;
  isLoading?: boolean;
}

const ACTIVITY_OPTIONS = [
  'Museums & Culture',
  'Adventure & Outdoor',
  'Food & Wine',
  'Shopping',
  'Relaxation & Spa',
  'Nightlife',
  'Family Activities',
  'Photography',
  'Local Experiences',
  'Historical Sites'
];

const TRAVEL_PACE_OPTIONS = [
  { value: 'relaxed', label: 'Relaxed', description: '1-2 activities per day' },
  { value: 'moderate', label: 'Moderate', description: '2-3 activities per day' },
  { value: 'active', label: 'Active', description: '3+ activities per day' }
];

export function TripBuilderForm({ onSubmit, isLoading = false }: TripBuilderFormProps) {
  const [formData, setFormData] = useState<FormData>({
    tripDates: {
      checkIn: '',
      checkOut: ''
    },
    destinations: [
      { id: '1', city: '', nights: 3 }
    ],
    occupancy: {
      rooms: 1,
      adults: 2,
      children: 0
    },
    budget: {
      total: 3000,
      perNight: 0,
      currency: 'USD'
    },
    hotelPreferences: {
      minStars: 3,
      maxStars: 4,
      boardType: 'breakfast'
    },
    activityPreferences: [],
    travelPace: 'moderate',
    specialRequests: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate total nights and budget per night
  useEffect(() => {
    const totalNights = formData.destinations.reduce((sum, dest) => sum + dest.nights, 0);
    const perNight = totalNights > 0 ? formData.budget.total / totalNights : 0;
    
    setFormData(prev => ({
      ...prev,
      budget: {
        ...prev.budget,
        perNight: Math.round(perNight)
      }
    }));
  }, [formData.budget.total, formData.destinations]);

  // Update trip dates based on destinations
  useEffect(() => {
    if (formData.tripDates.checkIn && formData.destinations.length > 0) {
      const totalNights = formData.destinations.reduce((sum, dest) => sum + dest.nights, 0);
      const checkIn = new Date(formData.tripDates.checkIn);
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + totalNights);
      
      setFormData(prev => ({
        ...prev,
        tripDates: {
          ...prev.tripDates,
          checkOut: checkOut.toISOString().split('T')[0]
        }
      }));
    }
  }, [formData.tripDates.checkIn, formData.destinations]);

  const addDestination = () => {
    const newId = Date.now().toString();
    setFormData(prev => ({
      ...prev,
      destinations: [...prev.destinations, { id: newId, city: '', nights: 3 }]
    }));
  };

  const removeDestination = (id: string) => {
    if (formData.destinations.length > 1) {
      setFormData(prev => ({
        ...prev,
        destinations: prev.destinations.filter(d => d.id !== id)
      }));
    }
  };

  const updateDestination = (id: string, field: keyof Destination, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      destinations: prev.destinations.map(d =>
        d.id === id ? { ...d, [field]: value } : d
      )
    }));
  };

  const toggleActivity = (activity: string) => {
    setFormData(prev => ({
      ...prev,
      activityPreferences: prev.activityPreferences.includes(activity)
        ? prev.activityPreferences.filter(a => a !== activity)
        : [...prev.activityPreferences, activity]
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.tripDates.checkIn) {
      newErrors.checkIn = 'Check-in date is required';
    }

    if (formData.destinations.some(d => !d.city)) {
      newErrors.destinations = 'All destinations must have a city name';
    }

    if (formData.budget.total <= 0) {
      newErrors.budget = 'Budget must be greater than 0';
    }

    if (formData.occupancy.adults === 0) {
      newErrors.adults = 'At least one adult is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const totalNights = formData.destinations.reduce((sum, dest) => sum + dest.nights, 0);
  const hotelBudget = Math.round(formData.budget.perNight * 0.4);
  const activityBudget = Math.round(formData.budget.perNight * 0.3);
  const mealBudget = Math.round(formData.budget.perNight * 0.3);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Trip Dates */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-blue-600" />
          Trip Dates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Check-in Date
            </label>
            <input
              type="date"
              value={formData.tripDates.checkIn}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                tripDates: { ...prev.tripDates, checkIn: e.target.value }
              }))}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            {errors.checkIn && (
              <p className="mt-1 text-sm text-red-600">{errors.checkIn}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Check-out Date
            </label>
            <input
              type="date"
              value={formData.tripDates.checkOut}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
            <p className="mt-1 text-xs text-gray-500">Auto-calculated from destinations</p>
          </div>
        </div>
      </div>

      {/* Destinations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <MapPin className="h-5 w-5 mr-2 text-blue-600" />
            Destinations
          </h3>
          <button
            type="button"
            onClick={addDestination}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add City
          </button>
        </div>
        
        {errors.destinations && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 mr-2" />
            {errors.destinations}
          </div>
        )}

        <div className="space-y-3">
          {formData.destinations.map((dest, index) => (
            <div key={dest.id} className="flex gap-3 items-center">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="City name (e.g., Paris)"
                  value={dest.city}
                  onChange={(e) => updateDestination(dest.id, 'city', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="w-32">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={dest.nights}
                  onChange={(e) => updateDestination(dest.id, 'nights', parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <span className="text-sm text-gray-600">nights</span>
              {formData.destinations.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDestination(dest.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900">
            Total trip duration: <span className="font-semibold">{totalNights} nights</span>
          </p>
        </div>
      </div>

      {/* Travelers */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2 text-blue-600" />
          Travelers
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rooms
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.occupancy.rooms}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                occupancy: { ...prev.occupancy, rooms: parseInt(e.target.value) || 1 }
              }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adults
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={formData.occupancy.adults}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                occupancy: { ...prev.occupancy, adults: parseInt(e.target.value) || 1 }
              }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.adults && (
              <p className="mt-1 text-sm text-red-600">{errors.adults}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Children
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={formData.occupancy.children}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                occupancy: { ...prev.occupancy, children: parseInt(e.target.value) || 0 }
              }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Budget */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
          Budget
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Trip Budget (USD)
            </label>
            <input
              type="number"
              min="100"
              step="100"
              value={formData.budget.total}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                budget: { ...prev.budget, total: parseInt(e.target.value) || 0 }
              }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            {errors.budget && (
              <p className="mt-1 text-sm text-red-600">{errors.budget}</p>
            )}
          </div>
          
          {totalNights > 0 && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Budget Breakdown:</p>
              <div className="space-y-1 text-sm">
                <p className="flex justify-between">
                  <span className="text-gray-600">Per Night:</span>
                  <span className="font-semibold text-gray-900">${formData.budget.perNight}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-600">Hotels (40%):</span>
                  <span className="font-medium text-gray-800">${hotelBudget}/night</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-600">Activities (30%):</span>
                  <span className="font-medium text-gray-800">${activityBudget}/day</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-600">Meals (30%):</span>
                  <span className="font-medium text-gray-800">${mealBudget}/day</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hotel Preferences */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Star className="h-5 w-5 mr-2 text-blue-600" />
          Hotel Preferences
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Stars
            </label>
            <select
              value={formData.hotelPreferences.minStars}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                hotelPreferences: { ...prev.hotelPreferences, minStars: parseInt(e.target.value) }
              }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {[1, 2, 3, 4, 5].map(stars => (
                <option key={stars} value={stars}>{stars} Star{stars > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maximum Stars
            </label>
            <select
              value={formData.hotelPreferences.maxStars}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                hotelPreferences: { ...prev.hotelPreferences, maxStars: parseInt(e.target.value) }
              }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {[1, 2, 3, 4, 5].map(stars => (
                <option key={stars} value={stars}>{stars} Star{stars > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Board Type
            </label>
            <select
              value={formData.hotelPreferences.boardType}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                hotelPreferences: { ...prev.hotelPreferences, boardType: e.target.value }
              }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="room-only">Room Only</option>
              <option value="breakfast">Breakfast Included</option>
              <option value="half-board">Half Board</option>
              <option value="full-board">Full Board</option>
              <option value="all-inclusive">All Inclusive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activity Preferences */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Activity className="h-5 w-5 mr-2 text-blue-600" />
          Activity Preferences
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {ACTIVITY_OPTIONS.map(activity => (
            <label
              key={activity}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={formData.activityPreferences.includes(activity)}
                onChange={() => toggleActivity(activity)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{activity}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Travel Pace */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Travel Pace</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TRAVEL_PACE_OPTIONS.map(option => (
            <label
              key={option.value}
              className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition ${
                formData.travelPace === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="travelPace"
                value={option.value}
                checked={formData.travelPace === option.value}
                onChange={(e) => setFormData(prev => ({ ...prev, travelPace: e.target.value }))}
                className="sr-only"
              />
              <span className="text-sm font-semibold text-gray-900">{option.label}</span>
              <span className="text-xs text-gray-600 mt-1">{option.description}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Special Requests */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Special Requests</h3>
        <textarea
          value={formData.specialRequests}
          onChange={(e) => setFormData(prev => ({ ...prev, specialRequests: e.target.value }))}
          placeholder="Any special requirements, dietary restrictions, accessibility needs, or specific preferences..."
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className={`px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:from-blue-700 hover:to-indigo-700 transition transform hover:scale-105 ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? 'Generating Itinerary...' : 'Generate AI Itinerary'}
        </button>
      </div>
    </form>
  );
}