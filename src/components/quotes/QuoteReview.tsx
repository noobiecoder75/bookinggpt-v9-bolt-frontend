import React, { useState } from 'react';
import { Plane, Building, Car, Calendar, DollarSign, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { QuoteDetails, TravelRequirements, DayPlan, ItineraryItem } from './types';

interface Props {
  quoteDetails: QuoteDetails;
  travelers: {
    adults: number;
    children: number;
    seniors: number;
  };
  travelRequirements: TravelRequirements;
  onQuoteFinalize: (quoteData: any) => void;
}

export function QuoteReview({
  quoteDetails,
  travelers,
  travelRequirements,
  onQuoteFinalize,
}: Props) {
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const toggleDayExpansion = (dayId: string) => {
    setExpandedDays(prev =>
      prev.includes(dayId)
        ? prev.filter(id => id !== dayId)
        : [...prev, dayId]
    );
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'flight':
        return <Plane className="h-5 w-5 text-blue-500" />;
      case 'hotel':
        return <Building className="h-5 w-5 text-indigo-500" />;
      case 'activity':
        return <Calendar className="h-5 w-5 text-green-500" />;
      case 'transfer':
        return <Car className="h-5 w-5 text-orange-500" />;
      default:
        return null;
    }
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString();
  };

  const calculateDayTotal = (items: ItineraryItem[]) => {
    return items.reduce((total: number, item: ItineraryItem) => 
      total + (item.cost * (1 + item.markup/100)), 0
    );
  };

  return (
    <div className="space-y-8">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900">Trip Overview</h3>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Travel Dates</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date(travelRequirements.departureDate).toLocaleDateString()} - {new Date(travelRequirements.returnDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Route</p>
              <p className="text-sm font-medium text-gray-900">
                {travelRequirements.origin} → {travelRequirements.destination}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Travelers</p>
              <p className="text-sm font-medium text-gray-900">
                {travelers.adults} Adults, {travelers.children} Children, {travelers.seniors} Seniors
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Day-by-Day Itinerary</h3>
          <div className="space-y-4">
            {quoteDetails.days.map((day: DayPlan) => (
              <div key={day.id} className="border rounded-lg overflow-hidden">
                <div
                  className="px-4 py-3 bg-gray-50 flex items-center justify-between cursor-pointer"
                  onClick={() => toggleDayExpansion(day.id)}
                >
                  <div className="flex items-center space-x-3">
                    <h4 className="text-sm font-medium text-gray-900">{day.name}</h4>
                    {!day.isComplete && (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    <p className="text-sm font-medium text-gray-900">
                      ${calculateDayTotal(day.items).toFixed(2)}
                    </p>
                    {expandedDays.includes(day.id) ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
                
                {expandedDays.includes(day.id) && (
                  <div className="px-4 py-3 space-y-3">
                    {day.items.map((item: ItineraryItem) => (
                      <div key={item.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start space-x-3">
                          {getItemIcon(item.type)}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.name}</p>
                            {item.description && (
                              <p className="text-sm text-gray-500">{item.description}</p>
                            )}
                            {(item.startTime || item.endTime) && (
                              <p className="text-xs text-gray-400">
                                {item.startTime && formatDateTime(item.startTime)}
                                {item.endTime && ` - ${formatDateTime(item.endTime)}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            ${item.cost.toFixed(2)}
                          </p>
                          {item.markup > 0 && (
                            <p className="text-xs text-gray-500">
                              +{item.markup}% markup
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900">Pricing Summary</h3>
          <div className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Subtotal</p>
              <p className="text-sm font-medium text-gray-900">
                ${quoteDetails.days.reduce((total: number, day: DayPlan) => 
                  total + calculateDayTotal(day.items), 0
                ).toFixed(2)}
              </p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Markup ({quoteDetails.markup}%)</p>
              <p className="text-sm font-medium text-gray-900">
                ${(quoteDetails.days.reduce((total: number, day: DayPlan) => 
                  total + calculateDayTotal(day.items), 0
                ) * (quoteDetails.markup / 100)).toFixed(2)}
              </p>
            </div>
            {quoteDetails.discount > 0 && (
              <div className="flex justify-between items-center text-green-600">
                <p className="text-sm">Discount ({quoteDetails.discount}%)</p>
                <p className="text-sm font-medium">
                  -${(quoteDetails.days.reduce((total: number, day: DayPlan) => 
                    total + calculateDayTotal(day.items), 0
                  ) * (1 + quoteDetails.markup / 100) * (quoteDetails.discount / 100)).toFixed(2)}
                </p>
              </div>
            )}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <p className="text-base font-medium text-gray-900">Total</p>
                <p className="text-base font-medium text-gray-900">
                  ${(quoteDetails.days.reduce((total: number, day: DayPlan) => 
                    total + calculateDayTotal(day.items), 0
                  ) * (1 + quoteDetails.markup / 100) * (1 - quoteDetails.discount / 100)).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900">Finalize Quote</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Quote Expiry Date
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => onQuoteFinalize({
                  status: 'Sent',
                  expiry_date: expiryDate,
                })}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Finalize Quote
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}