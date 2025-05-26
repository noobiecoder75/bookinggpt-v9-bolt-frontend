# Flight Integration Guide

This guide explains how to integrate the new linked flight functionality with your existing flight search and trip management system.

## Overview

The system now supports splitting return flights into two linked items:
1. **Outbound Flight** - Placed on the departure day
2. **Return Flight** - Placed on the return day

Both items are linked and must be removed together, but they appear on their respective days in the itinerary.

## Key Changes

### 1. Updated ItineraryItem Interface

```typescript
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
  // New properties for linked flights
  linkedItemId?: string;
  isReturnFlight?: boolean;
  flightDirection?: 'outbound' | 'return';
}
```

### 2. New Props for TripItinerarySection

```typescript
interface TripItinerarySectionProps {
  // ... existing props
  onRemoveLinkedFlights: (itemId: string) => void;
}
```

## Integration Steps

### Step 1: Update FlightSearchModal Integration

The FlightSearchModal already supports return flights with the `isReturnFlight` property. The updated `handleFlightSelect` function in `TripOverviewRefactored.tsx` now uses the new utility functions:

```typescript
import { createFlightItems, getFlightDayIndex } from './flightUtils';

const handleFlightSelect = async (flight: any, requirements: any) => {
  if (!selectedDay || !agentMarkupSettings) {
    return;
  }

  const markupInfo = getMarkupForItemType('Flight', agentMarkupSettings);
  
  // Determine if this is a return flight
  const isReturnFlight = requirements.isReturnFlight && flight.itineraries && flight.itineraries.length > 1;
  
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
  for (const flightItem of flightItems) {
    // Calculate which day this flight should be placed on
    const dayIndex = getFlightDayIndex(flightItem, trip.startDate);
    const targetDay = days[dayIndex] || days[0]; // Fallback to first day if calculation fails
    
    // Save to database with linked flight properties
    // ... database save logic
    
    // Add to the appropriate day
    setDays(prev => prev.map(day => 
      day.id === targetDay.id
        ? { ...day, items: [...day.items, flightItem] }
        : day
    ));
  }
};
```

### Step 2: Update Trip Management Functions

```typescript
// Add this function to handle linked flight removal
const handleRemoveLinkedFlights = (itemId: string) => {
  setDays(prevDays => {
    return prevDays.map(day => ({
      ...day,
      items: day.items.filter(item => 
        item.id !== itemId && item.linkedItemId !== itemId
      )
    }));
  });
};

// Update your TripItinerarySection usage
<TripItinerarySection
  // ... existing props
  onRemoveLinkedFlights={handleRemoveLinkedFlights}
/>
```

### Step 3: Update Cost Calculation

When calculating total costs, be aware that linked flights split their cost:

```typescript
const calculateTotalPrice = () => {
  return days.reduce((total, day) => {
    return total + day.items.reduce((dayTotal, item) => {
      const itemCost = item.cost;
      const markup = item.markup_type === 'percentage' 
        ? itemCost * (item.markup / 100) 
        : item.markup;
      return dayTotal + itemCost + markup;
    }, 0);
  }, 0);
};
```

## Visual Indicators

The system provides several visual indicators for linked flights:

1. **Blue border and background** - Linked flight items have a blue theme
2. **"Linked" badge** - Shows that the item is part of a return flight
3. **Direction indicator** - Shows "(Departure)" or "(Return)" in the title
4. **Non-draggable** - Linked flights cannot be moved individually
5. **Special remove button** - Shows "Remove Flight" instead of "Remove"

## Behavior Rules

1. **Linked flights cannot be moved individually** - Drag and drop is disabled
2. **Removing one removes both** - The remove button removes both segments
3. **Cost is split evenly** - Each segment shows half the total flight cost
4. **Markup is split evenly** - Each segment gets half the markup
5. **Automatic placement** - Flights are placed on days based on their departure times

## Error Handling

The system includes several safeguards:

1. **Drag prevention** - Alerts user if they try to drag a linked flight
2. **Validation** - Ensures return flights have valid return times
3. **Fallback placement** - Places flights on day 0 if date calculation fails

## Testing

To test the functionality:

1. Search for a return flight
2. Select a flight from the results
3. Verify two linked items appear on appropriate days
4. Try to drag one item (should be prevented)
5. Remove one item (should remove both)
6. Verify cost calculation includes both segments

## Migration

If you have existing flight data, you may need to migrate it:

```typescript
// Example migration function
const migrateSingleFlightsToLinked = (existingFlights: ItineraryItem[]) => {
  return existingFlights.map(flight => {
    if (flight.type === 'Flight' && !flight.hasOwnProperty('isReturnFlight')) {
      return {
        ...flight,
        isReturnFlight: false,
        flightDirection: undefined,
        linkedItemId: undefined
      };
    }
    return flight;
  });
};
``` 