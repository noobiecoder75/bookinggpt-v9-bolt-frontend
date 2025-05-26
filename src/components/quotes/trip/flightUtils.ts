import { v4 as uuidv4 } from 'uuid';

interface FlightData {
  id?: string;
  name: string;
  origin: string;
  destination: string;
  cost: number;
  markup: number;
  markup_type: 'percentage' | 'fixed';
  departureTime: string;
  arrivalTime: string;
  returnDepartureTime?: string;
  returnArrivalTime?: string;
  description?: string;
  details: any;
}

interface ItineraryItem {
  id: string;
  type: 'Flight' | 'Hotel' | 'Tour' | 'Transfer';
  name: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  cost: number;
  markup: number;
  markup_type: 'percentage' | 'fixed';
  details: any;
  linkedItemId?: string;
  isReturnFlight?: boolean;
  flightDirection?: 'outbound' | 'return';
}

/**
 * Creates flight items from flight search results
 * For return flights, creates two linked items that should be placed on appropriate days
 */
export function createFlightItems(flightData: FlightData, isReturnFlight: boolean): ItineraryItem[] {
  if (!isReturnFlight) {
    // Create single flight item
    return [{
      id: flightData.id || uuidv4(),
      type: 'Flight',
      name: flightData.name,
      description: flightData.description,
      startTime: flightData.departureTime,
      endTime: flightData.arrivalTime,
      cost: flightData.cost,
      markup: flightData.markup,
      markup_type: flightData.markup_type,
      details: flightData.details
    }];
  }

  // Create linked flight items for return flight
  const outboundId = uuidv4();
  const returnId = uuidv4();

  const outboundFlight: ItineraryItem = {
    id: outboundId,
    type: 'Flight',
    name: `${flightData.origin} → ${flightData.destination}`,
    description: flightData.description,
    startTime: flightData.departureTime,
    endTime: flightData.arrivalTime,
    cost: flightData.cost / 2, // Split cost between segments
    markup: flightData.markup / 2, // Split markup between segments
    markup_type: flightData.markup_type,
    details: {
      ...flightData.details,
      segment: 'outbound',
      originalFlightId: flightData.id
    },
    linkedItemId: returnId,
    isReturnFlight: true,
    flightDirection: 'outbound'
  };

  const returnFlight: ItineraryItem = {
    id: returnId,
    type: 'Flight',
    name: `${flightData.destination} → ${flightData.origin}`,
    description: flightData.description,
    startTime: flightData.returnDepartureTime!,
    endTime: flightData.returnArrivalTime!,
    cost: flightData.cost / 2, // Split cost between segments
    markup: flightData.markup / 2, // Split markup between segments
    markup_type: flightData.markup_type,
    details: {
      ...flightData.details,
      segment: 'return',
      originalFlightId: flightData.id
    },
    linkedItemId: outboundId,
    isReturnFlight: true,
    flightDirection: 'return'
  };

  return [outboundFlight, returnFlight];
}

/**
 * Gets the appropriate day index for a flight item based on its departure time
 */
export function getFlightDayIndex(flightItem: ItineraryItem, tripStartDate: string): number {
  if (!flightItem.startTime) {
    console.log('No startTime for flight item, defaulting to day 0');
    return 0;
  }
  
  // Parse dates more carefully - ensure trip start is in local timezone
  const tripStart = new Date(tripStartDate + 'T00:00:00');
  const flightDate = new Date(flightItem.startTime);
  
  // Check if dates are valid
  if (isNaN(tripStart.getTime()) || isNaN(flightDate.getTime())) {
    console.error('Invalid date detected:', {
      tripStartDate,
      flightStartTime: flightItem.startTime,
      tripStartValid: !isNaN(tripStart.getTime()),
      flightDateValid: !isNaN(flightDate.getTime())
    });
    return 0;
  }
  
  // Reset time to start of day for accurate day calculation
  tripStart.setHours(0, 0, 0, 0);
  flightDate.setHours(0, 0, 0, 0);
  
  // Calculate the difference in days
  const diffTime = flightDate.getTime() - tripStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  const finalDayIndex = Math.max(0, diffDays);
  
  console.log('Flight day calculation:', {
    flightName: flightItem.name,
    flightDirection: flightItem.flightDirection,
    startTime: flightItem.startTime,
    calculatedDayIndex: finalDayIndex,
    rawDiffDays: diffDays
  });
  
  return finalDayIndex;
}

/**
 * Finds all linked flight items in the days array
 */
export function findLinkedFlightItems(days: any[], itemId: string): ItineraryItem[] {
  const linkedItems: ItineraryItem[] = [];
  
  for (const day of days) {
    for (const item of day.items) {
      if (item.id === itemId || item.linkedItemId === itemId) {
        linkedItems.push(item);
      }
    }
  }
  
  return linkedItems;
}

/**
 * Removes all linked flight items from the days array
 */
export function removeLinkedFlightItems(days: any[], itemId: string): any[] {
  return days.map(day => ({
    ...day,
    items: day.items.filter((item: ItineraryItem) => 
      item.id !== itemId && item.linkedItemId !== itemId
    )
  }));
} 