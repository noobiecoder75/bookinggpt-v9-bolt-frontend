import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getAgentMarkupSettings, AgentMarkupSettings } from '../utils/markupUtils';
import { 
  calculateQuoteTotal, 
  determineMarkupStrategy,
  DEFAULT_PRICING_OPTIONS,
  type PricingQuote,
  type PricingItem,
  type MarkupStrategy
} from '../utils/pricingUtils';
import { Trip, ItineraryItem, DayPlan } from '../components/quotes/trip/types';

// Extended Trip interface to match database
export interface TripData extends Trip {
  markup_strategy: MarkupStrategy;
  customer?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

export interface TripStats {
  totalDays: number;
  activitiesCount: number;
  totalPrice: number;
  completionPercentage: number;
  activityBreakdown: { [key: string]: number };
}

export interface UseTripDataReturn {
  // Core trip data
  trip: TripData | null;
  days: DayPlan[];
  loading: boolean;
  error: string | null;
  
  // Calculated metrics
  stats: TripStats;
  
  // Additional state
  agentMarkupSettings: AgentMarkupSettings | null;
  itemsLoadingState: 'idle' | 'loading' | 'loaded';
  
  // Actions
  refreshTrip: () => Promise<void>;
  updateTrip: (updates: Partial<TripData>) => Promise<void>;
  setDays: React.Dispatch<React.SetStateAction<DayPlan[]>>;
  setTrip: React.Dispatch<React.SetStateAction<TripData>>;
}

export function useTripData(): UseTripDataReturn {
  // Handle both tripId and id parameters (for trips and quotes routes)
  const { tripId, id } = useParams<{ tripId?: string; id?: string }>();
  const actualTripId = tripId || id;
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get URL parameters
  const customerId = searchParams.get('customer');
  const tripLength = searchParams.get('length');
  const tripName = searchParams.get('name');

  // Main state
  const [trip, setTrip] = useState<TripData>({
    id: actualTripId || 'new',
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
    notes: '',
    markup_strategy: 'global' as MarkupStrategy
  });

  const [days, setDays] = useState<DayPlan[]>([]);
  const [agentMarkupSettings, setAgentMarkupSettings] = useState<AgentMarkupSettings | null>(null);
  const [itemsLoadingState, setItemsLoadingState] = useState<'idle' | 'loading' | 'loaded'>('idle');
  const isLoadingRef = useRef(false);

  // Initialize days based on trip dates
  const initializeDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (dayCount > 0 && dayCount <= 30) {
      const newDays: DayPlan[] = Array.from({ length: dayCount }, (_, index) => {
        const dayDate = new Date(start.getTime() + index * 24 * 60 * 60 * 1000);
        return {
          id: `day-${index + 1}`,
          dayIndex: index,
          name: `Day ${index + 1}`,
          items: [],
          isComplete: false,
        };
      });
      setDays(newDays);
    }
  };

  // Load trip data
  const loadTripData = async () => {
    if (!actualTripId) {
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
        .eq('id', actualTripId)
        .single();

      if (quoteError) throw quoteError;

      if (quoteData) {
        let startDate = quoteData.trip_start_date || '';
        let endDate = quoteData.trip_end_date || '';
        
        // Date calculation logic for new trips
        if ((!startDate || !endDate) && tripLength) {
          const today = new Date();
          startDate = today.toISOString().split('T')[0];
          endDate = new Date(today.getTime() + (parseInt(tripLength) - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }
        
        setTrip({
          id: quoteData.id,
          name: tripName ? decodeURIComponent(tripName) : `Trip for ${quoteData.customer?.first_name || 'Unknown'} ${quoteData.customer?.last_name || 'Customer'}`,
          status: quoteData.status || 'Planning',
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
          notes: quoteData.notes || '',
          markup_strategy: quoteData.markup_strategy || 'global'
        });

        // Initialize days if we have dates
        if (startDate && endDate) {
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

  // Load items from database
  const loadItemsFromDatabase = async () => {
    if (!actualTripId || days.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', actualTripId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const itemsByDay: { [key: number]: ItineraryItem[] } = {};
        
        data.forEach(dbItem => {
          const dayIndex = dbItem.details?.day_index ?? 0;
          const spanDays = dbItem.details?.span_days ?? 1;
          const isMultiDayHotel = dbItem.item_type === 'Hotel' && spanDays > 1;
          
          if (dayIndex < 0 || dayIndex >= days.length) {
            console.warn(`Item "${dbItem.item_name}" has day_index ${dayIndex} outside trip boundaries`);
            return;
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
            details: dbItem.details
          };

          // Handle multi-day hotels
          if (isMultiDayHotel) {
            const endDayIndex = Math.min(dayIndex + spanDays - 1, days.length - 1);
            for (let i = dayIndex; i <= endDayIndex; i++) {
              if (!itemsByDay[i]) itemsByDay[i] = [];
              itemsByDay[i].push(item);
            }
          } else {
            if (!itemsByDay[dayIndex]) itemsByDay[dayIndex] = [];
            itemsByDay[dayIndex].push(item);
          }
        });

        setDays(prev => prev.map((day, index) => ({
          ...day,
          items: itemsByDay[index] || []
        })));
      }
    } catch (error) {
      console.error('Error loading items from database:', error);
    }
  };

  // Calculate total price
  const calculateTotalPrice = (): number => {
    const allItems: PricingItem[] = [];
    
    days.forEach(day => {
      day.items.forEach(item => {
        allItems.push({
          id: item.id,
          cost: item.cost,
          markup: item.markup || 0,
          markup_type: item.markup_type || 'percentage',
          quantity: item.details?.quantity || 1,
          item_type: item.type,
          details: item.details
        });
      });
    });

    const pricingQuote: PricingQuote = {
      id: trip.id,
      markup: trip.markup || 0,
      discount: trip.discount || 0,
      markup_strategy: trip.markup_strategy || 'global',
      quote_items: allItems
    };

    const pricingOptions = {
      ...DEFAULT_PRICING_OPTIONS,
      markupStrategy: trip.markup_strategy || determineMarkupStrategy(pricingQuote)
    };

    return calculateQuoteTotal(pricingQuote, pricingOptions);
  };

  // Calculate statistics
  const calculateStats = (): TripStats => {
    const totalDays = days.length;
    const activitiesCount = days.reduce((sum, day) => sum + day.items.length, 0);
    const totalPrice = calculateTotalPrice();
    
    // Calculate completion percentage (days with activities vs empty days)
    const daysWithActivities = days.filter(day => day.items.length > 0).length;
    const completionPercentage = totalDays > 0 ? Math.round((daysWithActivities / totalDays) * 100) : 0;
    
    // Calculate activity breakdown by type
    const activityBreakdown: { [key: string]: number } = {};
    days.forEach(day => {
      day.items.forEach(item => {
        activityBreakdown[item.type] = (activityBreakdown[item.type] || 0) + 1;
      });
    });
    
    return {
      totalDays,
      activitiesCount,
      totalPrice,
      completionPercentage,
      activityBreakdown
    };
  };

  // Load trip data on mount
  useEffect(() => {
    loadTripData();
  }, [actualTripId, customerId, tripLength, tripName]);

  // Load items when days are ready
  useEffect(() => {
    if (days.length > 0 && actualTripId && !isLoadingRef.current && itemsLoadingState !== 'loaded') {
      isLoadingRef.current = true;
      setItemsLoadingState('loading');
      
      loadItemsFromDatabase()
        .then(() => {
          setItemsLoadingState('loaded');
          isLoadingRef.current = false;
        })
        .catch((error) => {
          console.error('Error loading items:', error);
          setItemsLoadingState('idle');
          isLoadingRef.current = false;
        });
    }
  }, [days.length, actualTripId]);

  // Load agent markup settings
  useEffect(() => {
    const loadMarkupSettings = async () => {
      const settings = await getAgentMarkupSettings();
      setAgentMarkupSettings(settings);
    };
    loadMarkupSettings();
  }, []);

  const refreshTrip = async () => {
    await loadTripData();
  };

  const updateTrip = async (updates: Partial<TripData>) => {
    setTrip(prev => ({ ...prev, ...updates }));
    
    if (actualTripId && actualTripId !== 'new') {
      try {
        const { error } = await supabase
          .from('quotes')
          .update(updates)
          .eq('id', actualTripId);
        
        if (error) throw error;
      } catch (error) {
        console.error('Error updating trip:', error);
      }
    }
  };

  return {
    trip,
    days,
    loading,
    error,
    stats: calculateStats(),
    agentMarkupSettings,
    itemsLoadingState,
    refreshTrip,
    updateTrip,
    setDays,
    setTrip
  };
}