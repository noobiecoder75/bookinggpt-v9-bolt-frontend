import React from 'react';
import { createFlightItems, getFlightDayIndex } from './flightUtils';

/**
 * Test component to verify flight day calculation
 */
export function FlightDayCalculationTest() {
  // Test scenario: 7-day trip starting March 15, 2024
  const tripStartDate = '2024-03-15';
  
  // Test flight data with return flight 5 days later
  const testFlightData = {
    name: 'Test Flight',
    origin: 'NYC',
    destination: 'LAX',
    cost: 500,
    markup: 50,
    markup_type: 'fixed' as const,
    departureTime: '2024-03-15T10:00:00', // Day 0 (departure day)
    arrivalTime: '2024-03-15T13:00:00',
    returnDepartureTime: '2024-03-20T14:00:00', // Day 5 (return day)
    returnArrivalTime: '2024-03-20T17:00:00',
    description: 'Test return flight',
    details: { test: true }
  };

  // Create return flights
  const returnFlights = createFlightItems(testFlightData, true);
  
  // Calculate day indices
  const outboundDayIndex = getFlightDayIndex(returnFlights[0], tripStartDate);
  const returnDayIndex = getFlightDayIndex(returnFlights[1], tripStartDate);

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 max-w-2xl">
      <h3 className="text-lg font-semibold mb-4">Flight Day Calculation Test</h3>
      
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded">
          <h4 className="font-medium mb-2">Test Scenario</h4>
          <p className="text-sm text-gray-600">Trip Start: {tripStartDate}</p>
          <p className="text-sm text-gray-600">Outbound: {testFlightData.departureTime}</p>
          <p className="text-sm text-gray-600">Return: {testFlightData.returnDepartureTime}</p>
        </div>

        <div className="space-y-3">
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <h5 className="font-medium text-blue-900">Outbound Flight</h5>
            <p className="text-sm text-blue-700">
              {returnFlights[0].name} ({returnFlights[0].flightDirection})
            </p>
            <p className="text-sm text-blue-600">
              Departure: {returnFlights[0].startTime}
            </p>
            <p className="text-sm font-medium text-blue-800">
              Calculated Day Index: {outboundDayIndex} (Expected: 0)
            </p>
            <p className="text-xs text-blue-600">
              {outboundDayIndex === 0 ? '✅ Correct' : '❌ Incorrect'}
            </p>
          </div>

          <div className="bg-green-50 p-3 rounded border border-green-200">
            <h5 className="font-medium text-green-900">Return Flight</h5>
            <p className="text-sm text-green-700">
              {returnFlights[1].name} ({returnFlights[1].flightDirection})
            </p>
            <p className="text-sm text-green-600">
              Departure: {returnFlights[1].startTime}
            </p>
            <p className="text-sm font-medium text-green-800">
              Calculated Day Index: {returnDayIndex} (Expected: 5)
            </p>
            <p className="text-xs text-green-600">
              {returnDayIndex === 5 ? '✅ Correct' : '❌ Incorrect'}
            </p>
          </div>
        </div>

        <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
          <h5 className="font-medium text-yellow-800">Expected Behavior</h5>
          <ul className="text-sm text-yellow-700 mt-1 space-y-1">
            <li>• Outbound flight should be on Day 0 (March 15)</li>
            <li>• Return flight should be on Day 5 (March 20)</li>
            <li>• Both flights should be linked with different IDs</li>
            <li>• Cost should be split evenly between segments</li>
          </ul>
        </div>

        <div className="bg-gray-50 p-3 rounded">
          <h5 className="font-medium text-gray-800">Debug Info</h5>
          <pre className="text-xs text-gray-600 mt-1 overflow-x-auto">
            {JSON.stringify({
              tripStartDate,
              outboundFlight: {
                startTime: returnFlights[0].startTime,
                dayIndex: outboundDayIndex
              },
              returnFlight: {
                startTime: returnFlights[1].startTime,
                dayIndex: returnDayIndex
              }
            }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
} 