import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Loader, AlertCircle, MapPin, Clock, DollarSign, ArrowLeft } from 'lucide-react';
import { getMarkupForItemType } from '../../../utils/markupUtils';
import { useTripData } from '../../../hooks/useTripData';
import { supabase } from '../../../lib/supabase';
import { DayCard } from './DayCard';
import { AddActivityModal } from './AddActivityModal';
import { FlightSearchModal } from '../FlightSearchModal';
import { HotelSearchForm } from './HotelSearchForm';
import { HotelSearchModal } from './HotelSearchModal';
import { ActivitySearchModal } from './ActivitySearchModal';

// Reuse existing types
import { ItineraryItem } from './types';

export function TripCardPlanner() {
  const navigate = useNavigate();
  const { trip, days, setDays, loading, error, agentMarkupSettings, stats } = useTripData();
  
  // UI state  
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  // Advanced search modals
  const [showFlightSearch, setShowFlightSearch] = useState(false);
  const [showHotelSearchForm, setShowHotelSearchForm] = useState(false);
  const [showHotelSearch, setShowHotelSearch] = useState(false);
  const [showActivitySearch, setShowActivitySearch] = useState(false);
  const [hotelSearchCriteria, setHotelSearchCriteria] = useState({
    hotelName: '',
    checkInDate: '',
    checkOutDate: '',
    country: '',
    selectedDayId: ''
  });

  // Expand first few days by default when days change
  React.useEffect(() => {
    if (days.length > 0 && expandedDays.size === 0) {
      setExpandedDays(new Set([days[0]?.id, days[1]?.id].filter(Boolean)));
    }
  }, [days.length, expandedDays.size]);

  // Activity management handlers
  const handleAddActivity = (dayId: string) => {
    setSelectedDayId(dayId);
    setShowAddActivityModal(true);
  };

  const handleOpenAdvancedSearch = (activityType: 'Flight' | 'Hotel' | 'Tour' | 'Transfer') => {
    if (activityType === 'Flight') {
      setShowFlightSearch(true);
    } else if (activityType === 'Hotel') {
      setHotelSearchCriteria(prev => ({ 
        ...prev, 
        selectedDayId: selectedDayId || '',
        checkInDate: trip.startDate,
        checkOutDate: trip.endDate
      }));
      setShowHotelSearchForm(true);
    } else if (activityType === 'Tour') {
      setShowActivitySearch(true);
    }
  };

  const handleActivityAdded = async (activity: Omit<ItineraryItem, 'id'>) => {
    if (!selectedDayId || !agentMarkupSettings || !trip?.id) return;

    const dayIndex = days.findIndex(day => day.id === selectedDayId);
    if (dayIndex === -1) return;

    // Get markup for activity type
    const markupInfo = getMarkupForItemType(activity.type, agentMarkupSettings);
    
    const activityItem: ItineraryItem = {
      id: `temp-${Date.now()}`,
      ...activity,
      markup: markupInfo.markup,
      markup_type: markupInfo.markup_type
    };

    // Save to database
    try {
      const { data, error } = await supabase
        .from('quote_items')
        .insert([{
          quote_id: trip.id,
          item_type: activityItem.type,
          item_name: activityItem.name,
          cost: activityItem.cost,
          quantity: 1,
          markup: activityItem.markup,
          markup_type: activityItem.markup_type,
          details: {
            ...activityItem.details,
            description: activityItem.description,
            startTime: activityItem.startTime,
            endTime: activityItem.endTime,
            day_index: dayIndex
          }
        }])
        .select()
        .single();

      if (error) throw error;

      // Update local state with database ID
      if (data) {
        activityItem.id = data.id.toString();
      }

      setDays(prev => prev.map(day => 
        day.id === selectedDayId
          ? { ...day, items: [...day.items, activityItem] }
          : day
      ));

    } catch (error) {
      console.error('Error saving activity:', error);
      alert('Error saving activity. Please try again.');
    }

    setShowAddActivityModal(false);
    setSelectedDayId(null);
  };

  const handleRemoveActivity = async (dayId: string, itemId: string) => {
    if (!trip?.id) return;

    try {
      const { error } = await supabase
        .from('quote_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setDays(prev => prev.map(day => 
        day.id === dayId
          ? { ...day, items: day.items.filter(item => item.id !== itemId) }
          : day
      ));
    } catch (error) {
      console.error('Error deleting activity:', error);
    }
  };

  const handleReorderActivities = async (dayId: string, fromIndex: number, toIndex: number) => {
    // Update local state immediately for smooth UX
    setDays(prev => prev.map(day => {
      if (day.id !== dayId) return day;
      
      const newItems = [...day.items];
      const [movedItem] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, movedItem);
      
      return { ...day, items: newItems };
    }));

    // Note: In a full implementation, you might want to persist the new order to the database
    // by updating each item's order field or position. For now, we'll just update local state.
  };

  const toggleDayExpansion = (dayId: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dayId)) {
        newSet.delete(dayId);
      } else {
        newSet.add(dayId);
      }
      return newSet;
    });
  };

  // Loading and error states
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading trip details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-red-600">Error loading trip: {error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const totalPrice = stats.totalPrice;
  const customerName = trip?.customer ? `${trip.customer.first_name} ${trip.customer.last_name}` : 'Unknown Customer';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Trip Header with Navigation */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => {
                // Navigate back to overview using the same route pattern (quotes or trips)
                const currentPath = window.location.pathname;
                if (currentPath.includes('/quotes/')) {
                  navigate(`/quotes/${trip?.id}/overview`);
                } else {
                  navigate(`/trips/${trip?.id}/overview`);
                }
              }}
              className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Back to Trip Overview</span>
            </button>
            <span className="text-gray-400">&gt;</span>
            <span className="text-sm text-gray-600">Build Itinerary</span>
          </div>
          
          {/* Trip Info */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-xl flex items-center justify-center">
                  <Clock className="h-7 w-7 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                    Build Detailed Itinerary
                  </h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {trip?.startDate && trip?.endDate 
                          ? `${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}`
                          : 'Dates not set'
                        }
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <DollarSign className="h-4 w-4" />
                      <span>${totalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Customer: {customerName}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                trip?.status === 'Planning' ? 'bg-yellow-100 text-yellow-800' :
                trip?.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {trip?.status || 'Planning'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {days.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No itinerary yet</h3>
            <p className="text-gray-600">Set trip dates to start planning your itinerary.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Trip Itinerary</h2>
              <p className="text-sm text-gray-600">
                {days.length} {days.length === 1 ? 'day' : 'days'} planned
              </p>
            </div>

            <div className="space-y-4">
              {days.map((day, index) => (
                <DayCard
                  key={day.id}
                  day={day}
                  dayNumber={index + 1}
                  tripStartDate={trip.startDate}
                  isExpanded={expandedDays.has(day.id)}
                  onToggleExpansion={() => toggleDayExpansion(day.id)}
                  onAddActivity={() => handleAddActivity(day.id)}
                  onRemoveActivity={(itemId) => handleRemoveActivity(day.id, itemId)}
                  onReorderActivities={(fromIndex, toIndex) => handleReorderActivities(day.id, fromIndex, toIndex)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Activity Modal */}
      {showAddActivityModal && (
        <AddActivityModal
          isOpen={showAddActivityModal}
          onClose={() => {
            setShowAddActivityModal(false);
            setSelectedDayId(null);
          }}
          onAddActivity={handleActivityAdded}
          dayId={selectedDayId}
          onOpenAdvancedSearch={handleOpenAdvancedSearch}
        />
      )}

      {/* Advanced Search Modals */}
      {showFlightSearch && (
        <FlightSearchModal
          isOpen={showFlightSearch}
          onClose={() => {
            setShowFlightSearch(false);
            setSelectedDayId(null);
          }}
          onFlightSelect={(flight: any, requirements: any) => {
            // Use existing flight selection logic from TripOverviewRefactored
            console.log('Flight selected from advanced search:', flight, requirements);
            // TODO: Implement flight handling from TripOverviewRefactored:821-949
            setShowFlightSearch(false);
            setSelectedDayId(null);
          }}
        />
      )}

      {showHotelSearchForm && (
        <HotelSearchForm
          isOpen={showHotelSearchForm}
          onClose={() => {
            setShowHotelSearchForm(false);
            setHotelSearchCriteria({
              hotelName: '',
              checkInDate: '',
              checkOutDate: '',
              country: '',
              selectedDayId: ''
            });
          }}
          onSearch={(criteria) => {
            setHotelSearchCriteria(criteria);
            setShowHotelSearchForm(false);
            setShowHotelSearch(true);
          }}
          tripStartDate={trip.startDate}
          tripEndDate={trip.endDate}
          initialCriteria={hotelSearchCriteria}
        />
      )}

      {showHotelSearch && (
        <HotelSearchModal
          isOpen={showHotelSearch}
          onClose={() => {
            setShowHotelSearch(false);
            setShowHotelSearchForm(false);
            setHotelSearchCriteria({
              hotelName: '',
              checkInDate: '',
              checkOutDate: '',
              country: '',
              selectedDayId: ''
            });
          }}
          onHotelSelect={(hotel: any) => {
            // Use existing hotel selection logic from TripOverviewRefactored
            console.log('Hotel selected from advanced search:', hotel);
            // TODO: Implement hotel handling from TripOverviewRefactored:951-1083
            setShowHotelSearch(false);
            setShowHotelSearchForm(false);
            setSelectedDayId(null);
          }}
          destination={hotelSearchCriteria.country || 'Destination'}
          checkInDate={hotelSearchCriteria.checkInDate}
          checkOutDate={hotelSearchCriteria.checkOutDate}
          guests={1} // Could be enhanced to track guest count
          quoteId={trip?.id}
          searchCriteria={hotelSearchCriteria}
        />
      )}

      {showActivitySearch && selectedDayId && (
        <ActivitySearchModal
          isOpen={showActivitySearch}
          onClose={() => {
            setShowActivitySearch(false);
            setSelectedDayId(null);
          }}
          onActivitySelect={(activity: any) => {
            // Use existing activity selection logic from TripOverviewRefactored
            console.log('Activity selected from advanced search:', activity);
            // TODO: Implement activity handling from TripOverviewRefactored:1085-1148
            setShowActivitySearch(false);
            setSelectedDayId(null);
          }}
          selectedDay={selectedDayId}
        />
      )}
    </div>
  );
}