import React from 'react';
import { createFlightItems, getFlightDayIndex } from './flightUtils';

interface TestFlightAdderProps {
  tripStartDate: string;
  days: any[];
  onAddFlight: (dayIndex: number, flight: any) => void;
}

export function TestFlightAdder({ tripStartDate, days, onAddFlight }: TestFlightAdderProps) {
  const addTestFlight = () => {
    console.log('Adding test flight...');
    
    // Create a simple test flight
    const testFlightData = {
      name: 'Test Flight',
      origin: 'NYC',
      destination: 'LAX',
      cost: 500,
      markup: 50,
      markup_type: 'fixed' as const,
      departureTime: tripStartDate + 'T10:00:00',
      arrivalTime: tripStartDate + 'T13:00:00',
      returnDepartureTime: getDatePlusDays(tripStartDate, 3) + 'T14:00:00',
      returnArrivalTime: getDatePlusDays(tripStartDate, 3) + 'T17:00:00',
      description: 'Test return flight',
      details: { test: true }
    };

    const flights = createFlightItems(testFlightData, true);
    
    flights.forEach((flight) => {
      const dayIndex = getFlightDayIndex(flight, tripStartDate);
      console.log('Adding flight to day:', dayIndex, flight.name, flight.flightDirection);
      onAddFlight(dayIndex, flight);
    });
  };

  return (
    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h4 className="font-medium text-yellow-800 mb-2">Test Flight Adder</h4>
      <p className="text-sm text-yellow-700 mb-3">
        Click to add a test return flight (Day 0 → Day 3)
      </p>
      <button
        onClick={addTestFlight}
        className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
      >
        Add Test Return Flight
      </button>
    </div>
  );
}

function getDatePlusDays(dateString: string, days: number): string {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
} 