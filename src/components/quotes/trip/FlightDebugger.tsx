import React, { useEffect } from 'react';
import { createFlightItems, getFlightDayIndex } from './flightUtils';

interface FlightDebuggerProps {
  tripStartDate: string;
  days: any[];
}

export function FlightDebugger({ tripStartDate, days }: FlightDebuggerProps) {
  useEffect(() => {
    console.log('=== FLIGHT DEBUGGER ===');
    console.log('Trip start date:', tripStartDate);
    console.log('Number of days:', days.length);
    console.log('Days structure:', days.map((day, index) => ({
      index,
      id: day.id,
      name: day.name,
      itemCount: day.items.length
    })));

    // Test flight creation
    const testFlight = {
      name: 'Test Flight',
      origin: 'NYC',
      destination: 'LAX',
      cost: 500,
      markup: 50,
      markup_type: 'fixed' as const,
      departureTime: tripStartDate + 'T10:00:00', // Same day as trip start
      arrivalTime: tripStartDate + 'T13:00:00',
      returnDepartureTime: getDatePlusDays(tripStartDate, 5) + 'T14:00:00', // 5 days later
      returnArrivalTime: getDatePlusDays(tripStartDate, 5) + 'T17:00:00',
      description: 'Test return flight',
      details: { test: true }
    };

    const flights = createFlightItems(testFlight, true);
    console.log('Created flights:', flights);

    flights.forEach((flight, index) => {
      const dayIndex = getFlightDayIndex(flight, tripStartDate);
      console.log(`Flight ${index + 1}:`, {
        name: flight.name,
        direction: flight.flightDirection,
        startTime: flight.startTime,
        calculatedDayIndex: dayIndex,
        expectedDay: index === 0 ? 0 : 5
      });
    });

    console.log('=== END FLIGHT DEBUGGER ===');
  }, [tripStartDate, days]);

  return null; // This component doesn't render anything
}

function getDatePlusDays(dateString: string, days: number): string {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
} 