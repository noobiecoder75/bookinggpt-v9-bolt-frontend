import React from 'react';
import { createFlightItems, getFlightDayIndex } from './flightUtils';

/**
 * Example component demonstrating how to use the linked flight functionality
 * This shows how to create and handle return flights that are split into two linked items
 */
export function LinkedFlightExample() {
  // Example flight data from Amadeus API
  const exampleFlightData = {
    name: 'New York to London',
    origin: 'JFK',
    destination: 'LHR',
    cost: 850.00,
    markup: 50,
    markup_type: 'fixed' as const,
    departureTime: '2024-03-15T08:00:00',
    arrivalTime: '2024-03-15T20:00:00',
    returnDepartureTime: '2024-03-22T10:00:00',
    returnArrivalTime: '2024-03-22T18:00:00',
    description: 'Round trip flight for 2 passengers',
    details: {
      airline: 'British Airways',
      flightNumber: 'BA178/BA179',
      aircraft: 'Boeing 777',
      class: 'Economy'
    }
  };

  const tripStartDate = '2024-03-15';

  // Example 1: Create a one-way flight
  const oneWayFlights = createFlightItems(exampleFlightData, false);
  console.log('One-way flight:', oneWayFlights);

  // Example 2: Create a return flight (creates 2 linked items)
  const returnFlights = createFlightItems(exampleFlightData, true);
  console.log('Return flights:', returnFlights);

  // Example 3: Calculate day placement
  const outboundDayIndex = getFlightDayIndex(returnFlights[0], tripStartDate);
  const returnDayIndex = getFlightDayIndex(returnFlights[1], tripStartDate);
  console.log('Day placement:', { outboundDayIndex, returnDayIndex });

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Linked Flight Example</h3>
      
      <div className="space-y-6">
        <div>
          <h4 className="font-medium text-gray-900 mb-2">One-Way Flight</h4>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm">Creates: {oneWayFlights.length} item(s)</p>
            <p className="text-sm text-gray-600">
              {oneWayFlights[0].name} - ${oneWayFlights[0].cost}
            </p>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-2">Return Flight</h4>
          <div className="space-y-2">
            {returnFlights.map((flight, index) => (
              <div key={flight.id} className="bg-blue-50 p-3 rounded border border-blue-200">
                <p className="text-sm font-medium">
                  {flight.name} ({flight.flightDirection})
                </p>
                <p className="text-sm text-gray-600">
                  Cost: ${flight.cost} | Linked to: {flight.linkedItemId}
                </p>
                <p className="text-sm text-gray-600">
                  Day: {index === 0 ? outboundDayIndex : returnDayIndex}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
          <h4 className="font-medium text-yellow-800 mb-2">Key Features:</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Return flights are automatically split into outbound and return segments</li>
            <li>• Each segment is placed on the appropriate day based on departure time</li>
            <li>• Segments are linked and must be removed together</li>
            <li>• Cost and markup are split evenly between segments</li>
            <li>• Visual indicators show linked status in the UI</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 