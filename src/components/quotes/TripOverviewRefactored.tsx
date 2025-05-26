import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { FlightSearchModal } from './FlightSearchModal';
import { HotelSearchModal } from './trip/HotelSearchModal';
import { ActivitySearchModal } from './trip/ActivitySearchModal';
import { Calendar, Plus, Loader, AlertCircle } from 'lucide-react';
import { getAgentMarkupSettings, getMarkupForItemType, AgentMarkupSettings } from '../../utils/markupUtils';

// Import the new components
import { TripHeader } from './trip/TripHeader';
import { TripSidebar } from './trip/TripSidebar';
import { TripOverviewSection } from './trip/TripOverviewSection';
import { TripItinerarySection } from './trip/TripItinerarySection';
import { TripRightSidebar } from './trip/TripRightSidebar';

// Import flight utilities for linked flights
import { createFlightItems, getFlightDayIndex } from './trip/flightUtils';

// Import types
import { 
  Trip, 
  Booking, 
  ActivityItem, 
  Traveler, 
  ItineraryOption, 
  TravelRequirements, 
  DayPlan, 
  ItineraryItem 
} from './trip/types';



export function TripOverviewRefactored() {
  const navigate = useNavigate();
  const { tripId } = useParams();
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState('overview');
  const [isEditingName, setIsEditingName] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get URL parameters
  const customerId = searchParams.get('customer');
  const tripLength = searchParams.get('length');
  const tripName = searchParams.get('name');

  // State for itinerary functionality
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

  const [days, setDays] = useState<DayPlan[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showFlightSearch, setShowFlightSearch] = useState(false);
  const [showActivitySearch, setShowActivitySearch] = useState(false);
  const [showHotelSearch, setShowHotelSearch] = useState(false);
  const [showTransferSearch, setShowTransferSearch] = useState(false);
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);
  const [showAddItemMenu, setShowAddItemMenu] = useState<string | null>(null);
  const [agentMarkupSettings, setAgentMarkupSettings] = useState<AgentMarkupSettings | null>(null);
  const [itemsLoaded, setItemsLoaded] = useState(false);

  const [trip, setTrip] = useState<Trip>({
    id: tripId || 'new',
    name: tripName ? decodeURIComponent(tripName) : 'New Trip',
    status: 'Planning',
    type: 'Regular Trip',
    startDate: '',
    endDate: '',
    currency: 'USD',
    pricingVisible: true,
    pdfDownloadEnabled: false,
    tags: [],
    total_price: 0,
    markup: 0,
    discount: 0,
    notes: ''
  });

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [itineraryOptions, setItineraryOptions] = useState<ItineraryOption[]>([]);



  // Load trip data from database (simplified version)
  useEffect(() => {
    const loadTripData = async () => {
      if (!tripId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const { data: quoteData, error: quoteError } = await supabase
          .from('quotes')
          .select(`
            *,
            customer:customers (
              id,
              first_name,
              last_name,
              email,
              phone
            )
          `)
          .eq('id', tripId)
          .single();

        if (quoteError) throw quoteError;

        if (quoteData) {
          // Process trip data and set up initial state
          let startDate = quoteData.trip_start_date || '';
          let endDate = quoteData.trip_end_date || '';
          
          // Date calculation logic (simplified)
          if ((!startDate || !endDate) && tripLength) {
            const today = new Date();
            startDate = today.toISOString().split('T')[0];
            endDate = new Date(today.getTime() + (parseInt(tripLength) - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          }
          
          setTrip({
            id: quoteData.id,
            name: tripName ? decodeURIComponent(tripName) : `Trip for ${quoteData.customer?.first_name} ${quoteData.customer?.last_name}`,
            status: 'Planning',
            type: 'Regular Trip',
            startDate,
            endDate,
            currency: 'USD',
            pricingVisible: true,
            pdfDownloadEnabled: false,
            tags: ['New Trip'],
            customer: quoteData.customer,
            total_price: quoteData.total_price || 0,
            markup: quoteData.markup || 0,
            discount: quoteData.discount || 0,
            notes: quoteData.notes || ''
          });

          // Initialize itinerary
          if (startDate && endDate) {
            setItineraryOptions([{
              id: '1',
              name: 'Option 1',
              dateRange: `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
              isActive: true
            }]);

            initializeDays(startDate, endDate);
          }
        }
      } catch (error: any) {
        console.error('Error loading trip data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadTripData();
  }, [tripId, customerId, tripLength, tripName]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!showAddItemMenu) return; // Early return if no menu is open
      
      const target = event.target as Element;
      
      // Check if click is inside any dropdown-related element
      const isInsideDropdown = target.closest('.dropdown-menu');
      const isAddItemButton = target.closest('.add-item-button');
      
      // Only close if clicking completely outside dropdown area
      if (!isInsideDropdown && !isAddItemButton) {
        setShowAddItemMenu(null);
      }
    };

    // Only add listener if a menu is actually open
    if (showAddItemMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showAddItemMenu]);

  // Helper functions
  const initializeDays = (startDate: string, endDate: string) => {
    // Create dates in local timezone to avoid timezone offset issues
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (dayCount > 0 && dayCount <= 30) {
      const newDays: DayPlan[] = Array.from({ length: dayCount }, (_, index) => ({
        id: `day-${index + 1}`,
        dayIndex: index,
        name: `Day ${index + 1}`,
        items: [],
        isComplete: false,
      }));
      setDays(newDays);
    }
  };

  const updateTripDates = async (startDate: string, endDate: string) => {
    if (!tripId) return;
    
    try {
      await supabase
        .from('quotes')
        .update({ 
          trip_start_date: startDate,
          trip_end_date: endDate
        })
        .eq('id', tripId);
      
      setTrip(prev => ({ ...prev, startDate, endDate }));
      initializeDays(startDate, endDate);
    } catch (error) {
      console.error('Error updating trip dates:', error);
    }
  };

  const calculateTotalPrice = () => {
    return days.reduce((total, day) => 
      total + day.items.reduce((dayTotal, item) => {
        const itemMarkup = item.markup_type === 'percentage' 
          ? item.cost * (item.markup/100)
          : item.markup;
        return dayTotal + (item.cost + itemMarkup);
      }, 0)
    , 0);
  };

  // Database operations for auto-saving
  const saveItemToDatabase = async (item: ItineraryItem, dayIndex: number) => {
    if (!tripId) return;

    try {
      const { data, error } = await supabase
        .from('quote_items')
        .insert([{
          quote_id: tripId,
          item_type: item.type,
          item_name: item.name,
          cost: item.cost,
          quantity: 1,
          markup: item.markup,
          markup_type: item.markup_type,
          details: {
            ...item.details,
            description: item.description,
            startTime: item.startTime,
            endTime: item.endTime,
            day_index: dayIndex,
            local_id: item.id // Store the local ID for reference
          }
        }])
        .select()
        .single();

      if (error) throw error;

      // Update the local item with the database ID
      if (data) {
        setDays(prev => prev.map(day => ({
          ...day,
          items: day.items.map(localItem => 
            localItem.id === item.id 
              ? { ...localItem, id: data.id.toString() }
              : localItem
          )
        })));
      }
    } catch (error) {
      console.error('Error saving item to database:', error);
    }
  };

  const updateItemInDatabase = async (itemId: string, updates: Partial<ItineraryItem>, dayIndex?: number) => {
    if (!tripId) return;

    try {
      const updateData: any = {};
      
      if (updates.name) updateData.item_name = updates.name;
      if (updates.cost !== undefined) updateData.cost = updates.cost;
      if (updates.markup !== undefined) updateData.markup = updates.markup;
      if (updates.markup_type) updateData.markup_type = updates.markup_type;
      
      if (updates.details || dayIndex !== undefined) {
        // Get current details first
        const { data: currentItem } = await supabase
          .from('quote_items')
          .select('details')
          .eq('id', itemId)
          .single();

        updateData.details = {
          ...(currentItem?.details || {}),
          ...updates.details,
          ...(dayIndex !== undefined && { day_index: dayIndex })
        };
      }

      const { error } = await supabase
        .from('quote_items')
        .update(updateData)
        .eq('id', itemId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating item in database:', error);
    }
  };

  const loadItemsFromDatabase = async () => {
    if (!tripId) return;

    try {
      const { data, error } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', tripId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // Group items by day_index and populate the days
        const itemsByDay: { [key: number]: ItineraryItem[] } = {};
        
        data.forEach(dbItem => {
          const dayIndex = dbItem.details?.day_index ?? 0;
          if (!itemsByDay[dayIndex]) {
            itemsByDay[dayIndex] = [];
          }

          const item: ItineraryItem = {
            id: dbItem.id.toString(),
            type: dbItem.item_type as 'Flight' | 'Hotel' | 'Tour' | 'Transfer',
            name: dbItem.item_name,
            description: dbItem.details?.description,
            startTime: dbItem.details?.startTime,
            endTime: dbItem.details?.endTime,
            cost: dbItem.cost,
            markup: dbItem.markup || 0,
            markup_type: dbItem.markup_type || 'percentage',
            details: dbItem.details || {},
            // Include linked flight properties
            linkedItemId: dbItem.details?.linkedItemId,
            isReturnFlight: dbItem.details?.isReturnFlight,
            flightDirection: dbItem.details?.flightDirection
          };

          itemsByDay[dayIndex].push(item);
        });

        // Update days with loaded items
        setDays(prev => {
          console.log('loadItemsFromDatabase: Setting days with items from database:', {
            totalItemsLoaded: data.length,
            itemsByDay,
            currentDaysItemCounts: prev.map((d, i) => ({ day: i, currentCount: d.items.length }))
          });
          
          return prev.map((day, index) => ({
            ...day,
            items: itemsByDay[index] || []
          }));
        });
      }
    } catch (error) {
      console.error('Error loading items from database:', error);
    }
  };

  // Load items from database when days are initialized
  useEffect(() => {
    if (days.length > 0 && tripId && !itemsLoaded) {
      console.log('Loading items from database for trip:', tripId);
      loadItemsFromDatabase().then(() => {
        setItemsLoaded(true);
      });
    }
  }, [days.length, tripId, itemsLoaded]);

  // Load agent markup settings
  useEffect(() => {
    const loadMarkupSettings = async () => {
      const settings = await getAgentMarkupSettings();
      setAgentMarkupSettings(settings);
    };
    loadMarkupSettings();
  }, []);



  // Event handlers
  const handleCreateItinerary = () => {
    navigate(`/quotes/new?tripId=${trip.id}`);
  };

  const handleEditItinerary = (optionId: string) => {
    navigate(`/quotes/new?tripId=${trip.id}&itineraryId=${optionId}`);
  };

  const handleTripUpdate = (updates: Partial<Trip>) => {
    setTrip(prev => ({ ...prev, ...updates }));
  };



  // Itinerary handlers
  const handleAddFlight = (dayId: string) => {
    setSelectedDay(dayId);
    setShowFlightSearch(true);
    setShowAddItemMenu(null);
  };

  const handleAddHotel = (dayId: string) => {
    setSelectedDay(dayId);
    setShowHotelSearch(true);
    setShowAddItemMenu(null);
  };

  const handleAddTransfer = (dayId: string) => {
    setSelectedDay(dayId);
    setShowTransferSearch(true);
    setShowAddItemMenu(null);
  };

  const handleAddActivity = (dayId: string) => {
    setSelectedDay(dayId);
    setShowActivitySearch(true);
    setShowAddItemMenu(null);
  };

  const handleAddCustomItem = (dayId: string) => {
    setSelectedDay(dayId);
    setShowCustomItemForm(true);
    setShowAddItemMenu(null);
  };

  const handleRemoveItem = async (dayId: string, itemId: string) => {
    // Delete from database
    if (!tripId) return;

    try {
      const { error } = await supabase
        .from('quote_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting item from database:', error);
    }

    setDays(prev => prev.map(day => 
      day.id === dayId
        ? { ...day, items: day.items.filter(item => item.id !== itemId) }
        : day
    ));
  };

  const handleMoveItem = async (fromDayId: string, toDayId: string, itemId: string) => {
    const toDayIndex = days.findIndex(day => day.id === toDayId);
    
    // Update day_index in database
    if (!tripId) return;

    try {
      const { data: currentItem } = await supabase
        .from('quote_items')
        .select('details')
        .eq('id', itemId)
        .single();

      const updateData = {
        details: {
          ...(currentItem?.details || {}),
          day_index: toDayIndex
        }
      };

      const { error } = await supabase
        .from('quote_items')
        .update(updateData)
        .eq('id', itemId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating item in database:', error);
    }

    setDays(prev => {
      // Find the item to move
      const fromDay = prev.find(day => day.id === fromDayId);
      const itemToMove = fromDay?.items.find(item => item.id === itemId);
      
      if (!itemToMove) return prev;
      
      return prev.map(day => {
        if (day.id === fromDayId) {
          // Remove item from source day
          return { ...day, items: day.items.filter(item => item.id !== itemId) };
        } else if (day.id === toDayId) {
          // Add item to target day
          return { ...day, items: [...day.items, itemToMove] };
        }
        return day;
      });
    });
  };

  const handleRemoveLinkedFlights = async (itemId: string) => {
    try {
      // Find all linked flight items
      const linkedItemIds: string[] = [];
      
      for (const day of days) {
        for (const item of day.items) {
          if (item.id === itemId || item.linkedItemId === itemId) {
            linkedItemIds.push(item.id);
          }
        }
      }

      // Remove from database
      if (tripId && linkedItemIds.length > 0) {
        const { error } = await supabase
          .from('quote_items')
          .delete()
          .in('id', linkedItemIds);

        if (error) throw error;
      }

      // Remove from local state
      setDays(prev => prev.map(day => ({
        ...day,
        items: day.items.filter(item => 
          !linkedItemIds.includes(item.id)
        )
      })));
    } catch (error) {
      console.error('Error removing linked flights:', error);
    }
  };



  const handleFlightSelect = async (flight: any, requirements: any) => {
    if (!agentMarkupSettings) {
      return;
    }

    const markupInfo = getMarkupForItemType('Flight', agentMarkupSettings);
    
    // Determine if this is a return flight
    const isReturnFlight = requirements.isReturnFlight && flight.itineraries && flight.itineraries.length > 1;
    
    console.log('Processing Amadeus flight data:', {
      isReturnFlight,
      itinerariesCount: flight.itineraries?.length,
      outboundDeparture: flight.itineraries[0]?.segments[0]?.departure?.at,
      returnDeparture: isReturnFlight ? flight.itineraries[1]?.segments[0]?.departure?.at : 'N/A',
      tripStartDate: trip.startDate
    });
    
    // Create flight items using the utility function
    const flightItems = createFlightItems({
      name: `${requirements.origin} → ${requirements.destination}`,
      origin: requirements.origin,
      destination: requirements.destination,
      cost: parseFloat(flight.price?.total || '0'),
      markup: markupInfo.markup,
      markup_type: markupInfo.markup_type,
      departureTime: flight.itineraries[0]?.segments[0]?.departure?.at,
      arrivalTime: flight.itineraries[0]?.segments[flight.itineraries[0].segments.length - 1]?.arrival?.at,
      returnDepartureTime: isReturnFlight ? flight.itineraries[1]?.segments[0]?.departure?.at : undefined,
      returnArrivalTime: isReturnFlight ? flight.itineraries[1]?.segments[flight.itineraries[1].segments.length - 1]?.arrival?.at : undefined,
      description: `Flight for ${requirements.travelers.adults + requirements.travelers.children + requirements.travelers.seniors} passengers`,
      details: { ...flight, travelers: requirements.travelers }
    }, isReturnFlight);

    // Save to database and add to appropriate days
    if (!tripId) return;

    try {
      for (const flightItem of flightItems) {
        // Calculate which day this flight should be placed on
        const rawDayIndex = getFlightDayIndex(flightItem, trip.startDate);
        let dayIndex = rawDayIndex;
        
        // Handle edge cases for day placement
        if (dayIndex < 0) {
          console.warn('Flight date is before trip start, placing on day 0');
          dayIndex = 0;
        } else if (dayIndex >= days.length) {
          console.warn(`Flight date is after trip end (day ${dayIndex}), placing on last day (${days.length - 1})`);
          dayIndex = days.length - 1;
        }
        
        const targetDay = days[dayIndex];
        
        console.log('Adding flight to day:', {
          flightName: flightItem.name,
          flightDirection: flightItem.flightDirection,
          flightStartTime: flightItem.startTime,
          tripStartDate: trip.startDate,
          rawDayIndex,
          finalDayIndex: dayIndex,
          totalDays: days.length,
          targetDayExists: !!targetDay,
          targetDayName: targetDay?.name
        });
        
        // Save to database
        const { data, error } = await supabase
          .from('quote_items')
          .insert([{
            quote_id: tripId,
            item_type: flightItem.type,
            item_name: flightItem.name,
            cost: flightItem.cost,
            quantity: 1,
            markup: flightItem.markup,
            markup_type: flightItem.markup_type,
            details: {
              ...flightItem.details,
              description: flightItem.description,
              startTime: flightItem.startTime,
              endTime: flightItem.endTime,
              day_index: dayIndex,
              local_id: flightItem.id,
              linkedItemId: flightItem.linkedItemId,
              isReturnFlight: flightItem.isReturnFlight,
              flightDirection: flightItem.flightDirection
            }
          }])
          .select()
          .single();

        if (error) throw error;

        // Update the local item with the database ID
        if (data) {
          flightItem.id = data.id.toString();
        }

        // Add to the appropriate day using dayIndex
        setDays(prev => {
          const newDays = prev.map((day, index) => 
            index === dayIndex
              ? { ...day, items: [...day.items, flightItem] }
              : day
          );
          
          console.log('Updated days after adding flight:', {
            dayIndex,
            flightName: flightItem.name,
            flightDirection: flightItem.flightDirection,
            dayItemsCount: newDays[dayIndex]?.items.length,
            allDaysItemCounts: newDays.map((d, i) => ({ day: i, count: d.items.length }))
          });
          
          return newDays;
        });
      }
      
    } catch (error) {
      console.error('Error saving flight items to database:', error);
    }

    setShowFlightSearch(false);
    setSelectedDay(null);
  };

  const handleHotelSelect = async (hotel: any) => {
    if (!selectedDay || !agentMarkupSettings) {
      return;
    }

    const dayIndex = days.findIndex(day => day.id === selectedDay);
    const markupInfo = getMarkupForItemType('Hotel', agentMarkupSettings);
    
    const hotelItem: ItineraryItem = {
      id: `hotel-${Date.now()}`,
      type: 'Hotel',
      name: hotel.name,
      description: `Hotel accommodation`,
      cost: hotel.cost,
      markup: markupInfo.markup,
      markup_type: markupInfo.markup_type,
      details: hotel.details
    };

    // Save to database
    if (!tripId) return;

    try {
      const { data, error } = await supabase
        .from('quote_items')
        .insert([{
          quote_id: tripId,
          item_type: hotelItem.type,
          item_name: hotelItem.name,
          cost: hotelItem.cost,
          quantity: 1,
          markup: hotelItem.markup,
          markup_type: hotelItem.markup_type,
          details: {
            ...hotelItem.details,
            description: hotelItem.description,
            day_index: dayIndex,
            local_id: hotelItem.id
          }
        }])
        .select()
        .single();

      if (error) throw error;

      // Update the local item with the database ID
      if (data) {
        hotelItem.id = data.id.toString();
      }
    } catch (error) {
      console.error('Error saving item to database:', error);
    }

    setDays(prev => prev.map(day => 
      day.id === selectedDay
        ? { ...day, items: [...day.items, hotelItem] }
        : day
    ));
    setShowHotelSearch(false);
    setSelectedDay(null);
  };

  const handleActivitySelect = async (activity: any) => {
    if (!selectedDay || !agentMarkupSettings) {
      return;
    }

    const dayIndex = days.findIndex(day => day.id === selectedDay);
    const markupInfo = getMarkupForItemType('Tour', agentMarkupSettings);
    
    const activityItem: ItineraryItem = {
      id: `activity-${Date.now()}`,
      type: 'Tour',
      name: activity.name,
      description: `Tour/Activity`,
      cost: activity.cost,
      markup: markupInfo.markup,
      markup_type: markupInfo.markup_type,
      details: activity.details
    };

    // Save to database
    if (!tripId) return;

    try {
      const { data, error } = await supabase
        .from('quote_items')
        .insert([{
          quote_id: tripId,
          item_type: activityItem.type,
          item_name: activityItem.name,
          cost: activityItem.cost,
          quantity: 1,
          markup: activityItem.markup,
          markup_type: activityItem.markup_type,
          details: {
            ...activityItem.details,
            description: activityItem.description,
            day_index: dayIndex,
            local_id: activityItem.id
          }
        }])
        .select()
        .single();

      if (error) throw error;

      // Update the local item with the database ID
      if (data) {
        activityItem.id = data.id.toString();
      }
    } catch (error) {
      console.error('Error saving item to database:', error);
    }

    setDays(prev => prev.map(day => 
      day.id === selectedDay
        ? { ...day, items: [...day.items, activityItem] }
        : day
    ));
    setShowActivitySearch(false);
    setSelectedDay(null);
  };

  // Generate activity data
  const upcomingActivity: ActivityItem[] = trip.startDate && trip.endDate ? [
    {
      id: '1',
      type: 'milestone',
      title: 'Trip starts',
      date: new Date(trip.startDate).toLocaleDateString(),
      icon: <Calendar className="h-4 w-4" />
    },
    {
      id: '2',
      type: 'milestone',
      title: 'Trip ends',
      date: new Date(trip.endDate).toLocaleDateString(),
      icon: <Calendar className="h-4 w-4" />
    }
  ] : [];

  const pastActivity: ActivityItem[] = [
    {
      id: '1',
      type: 'activity',
      title: 'Trip created',
      date: new Date().toLocaleString(),
      icon: <Plus className="h-4 w-4" />,
      user: 'Travel Agent'
    }
  ];

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
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <TripSidebar 
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header Bar */}
        <TripHeader
          trip={trip}
          isEditingName={isEditingName}
          setIsEditingName={setIsEditingName}
          onTripUpdate={handleTripUpdate}
          onTripDatesUpdate={updateTripDates}
          activeSection={activeSection}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex">
          <div className="flex-1 p-6 space-y-6">
            {activeSection === 'overview' && (
              <TripOverviewSection
                bookings={bookings}
                upcomingActivity={upcomingActivity}
                pastActivity={pastActivity}
                onCreateItinerary={handleCreateItinerary}
              />
            )}

            {activeSection === 'itinerary' && (
              <TripItinerarySection
                trip={trip}
                days={days}
                showAddItemMenu={showAddItemMenu}
                onTripDatesUpdate={updateTripDates}
                onAddItemMenuToggle={setShowAddItemMenu}
                onAddFlight={handleAddFlight}
                onAddHotel={handleAddHotel}
                onAddTransfer={handleAddTransfer}
                onAddActivity={handleAddActivity}
                onAddCustomItem={handleAddCustomItem}
                onRemoveItem={handleRemoveItem}
                onMoveItem={handleMoveItem}
                calculateTotalPrice={calculateTotalPrice}
                onRemoveLinkedFlights={handleRemoveLinkedFlights}
              />
            )}

            {/* Other sections */}
            {activeSection !== 'overview' && activeSection !== 'itinerary' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
                </h3>
                <p className="text-gray-500">This section is coming soon...</p>
              </div>
            )}
          </div>

          {/* Right Sidebar - Hidden for Itinerary View */}
          {activeSection !== 'itinerary' && (
            <TripRightSidebar
              trip={trip}
              travelers={travelers}
              itineraryOptions={itineraryOptions}
              onTripUpdate={handleTripUpdate}
              onCreateItinerary={handleCreateItinerary}
              onEditItinerary={handleEditItinerary}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {showFlightSearch && (
        <FlightSearchModal
          isOpen={showFlightSearch}
          onClose={() => {
            setShowFlightSearch(false);
            setSelectedDay(null);
          }}
          onFlightSelect={handleFlightSelect}
        />
      )}

      {showHotelSearch && (
        <HotelSearchModal
          isOpen={showHotelSearch}
          onClose={() => {
            setShowHotelSearch(false);
            setSelectedDay(null);
          }}
          onHotelSelect={handleHotelSelect}
          destination={travelRequirements.destination || 'Destination'}
          checkInDate={trip.startDate}
          checkOutDate={trip.endDate}
          guests={travelRequirements.adults + travelRequirements.children + travelRequirements.seniors}
        />
      )}

      {showActivitySearch && selectedDay && (
        <ActivitySearchModal
          isOpen={showActivitySearch}
          onClose={() => {
            setShowActivitySearch(false);
            setSelectedDay(null);
          }}
          onActivitySelect={handleActivitySelect}
          selectedDay={selectedDay}
        />
      )}
    </div>
  );
}