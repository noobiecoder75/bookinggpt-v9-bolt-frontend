import React, { useState } from 'react';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  Plane, 
  Building, 
  Car, 
  Camera,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  ArrowRight,
  Star,
  Shield,
  Award,
  CreditCard
} from 'lucide-react';

interface Quote {
  id: string;
  quote_reference?: string;
  status: string;
  total_price: number;
  discount: number;
  notes: string;
  expiry_date: string;
  created_at: string;
  trip_start_date?: string;
  trip_end_date?: string;
  customer: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  quote_items: Array<{
    id: number;
    item_type: 'Flight' | 'Hotel' | 'Tour' | 'Transfer';
    item_name: string;
    cost: number;
    markup: number;
    markup_type: 'percentage' | 'fixed';
    quantity: number;
    details: any;
  }>;
}

interface ClientQuoteViewProps {
  quote: Quote;
  calculateCustomerPrice: (item: Quote['quote_items'][0]) => number;
}

export function ClientQuoteView({ quote, calculateCustomerPrice }: ClientQuoteViewProps) {
  const [expandedDays, setExpandedDays] = useState<number[]>([0, 1]); // Expand first 2 days by default

  // Helper functions
  const getItemIcon = (type: string) => {
    switch (type) {
      case 'Flight':
        return <Plane className="h-5 w-5 text-blue-500" />;
      case 'Hotel':
        return <Building className="h-5 w-5 text-indigo-500" />;
      case 'Tour':
        return <Camera className="h-5 w-5 text-green-500" />;
      case 'Transfer':
        return <Car className="h-5 w-5 text-yellow-500" />;
      default:
        return <MapPin className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatTime = (time: string) => {
    return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTripDuration = () => {
    if (!quote?.trip_start_date || !quote?.trip_end_date) return 'Not specified';
    
    const start = new Date(quote.trip_start_date + 'T00:00:00');
    const end = new Date(quote.trip_end_date + 'T00:00:00');
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  const getTotalTravelers = () => {
    const itemWithTravelers = quote?.quote_items.find(item => item.details?.travelers);
    if (itemWithTravelers?.details?.travelers) {
      const travelers = itemWithTravelers.details.travelers;
      return {
        adults: travelers.adults || 0,
        children: travelers.children || 0,
        seniors: travelers.seniors || 0,
        total: (travelers.adults || 0) + (travelers.children || 0) + (travelers.seniors || 0)
      };
    }
    return { adults: 0, children: 0, seniors: 0, total: 0 };
  };

  const getTripDestinations = () => {
    const flights = quote?.quote_items.filter(item => item.item_type === 'Flight') || [];
    if (flights.length === 0) return 'Multi-destination adventure';
    
    const destinations = new Set<string>();
    flights.forEach(flight => {
      const flightName = flight.item_name;
      const arrowMatch = flightName.match(/(.+?)\s*[→→]\s*(.+)/);
      const toMatch = flightName.match(/(.+?)\s+to\s+(.+)/i);
      
      if (arrowMatch) {
        destinations.add(arrowMatch[1].trim());
        destinations.add(arrowMatch[2].trim());
      } else if (toMatch) {
        destinations.add(toMatch[1].trim());
        destinations.add(toMatch[2].trim());
      }
    });
    
    const destArray = Array.from(destinations);
    if (destArray.length >= 2) {
      return `${destArray[0]} → ${destArray[1]}`;
    } else if (destArray.length === 1) {
      return destArray[0];
    }
    
    return 'Amazing destinations await';
  };

  // Group items by day
  const getTripDurationInDays = () => {
    if (!quote?.trip_start_date || !quote?.trip_end_date) return 0;
    
    const start = new Date(quote.trip_start_date + 'T00:00:00');
    const end = new Date(quote.trip_end_date + 'T00:00:00');
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return Math.max(0, days);
  };

  const itemsByDay = quote.quote_items.reduce((acc, item) => {
    const dayIndex = item.details.day_index ?? item.details.day?.index ?? 0;
    const tripDuration = getTripDurationInDays();
    
    if (tripDuration > 0 && (dayIndex < 0 || dayIndex >= tripDuration)) {
      return acc;
    }
    
    const dayName = item.details.day?.name ?? `Day ${dayIndex + 1}`;
    
    if (!acc[dayIndex]) {
      acc[dayIndex] = {
        name: dayName,
        items: []
      };
    }
    acc[dayIndex].items.push(item);
    return acc;
  }, {} as Record<number, { name: string; items: Quote['quote_items'] }>);

  const getTripDayDate = (dayIndex: number) => {
    if (!quote.trip_start_date) return null;
    const startDate = new Date(quote.trip_start_date + 'T00:00:00');
    const dayDate = new Date(startDate);
    dayDate.setDate(dayDate.getDate() + dayIndex);
    return dayDate;
  };

  const toggleDayExpansion = (dayIndex: number) => {
    setExpandedDays(prev =>
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  const calculateDayTotal = (items: Quote['quote_items']) => {
    return items.reduce((total, item) => total + calculateCustomerPrice(item), 0);
  };

  return (
    <div className="space-y-8">
      {/* Trip Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-700">Destinations</h3>
            </div>
            <p className="text-slate-900 font-medium">{getTripDestinations()}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mr-3">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-slate-700">Travelers</h3>
            </div>
            <p className="text-slate-900 font-medium">
              {getTotalTravelers().total > 0 
                ? `${getTotalTravelers().adults} Adults, ${getTotalTravelers().children} Children, ${getTotalTravelers().seniors} Seniors`
                : 'Perfect for any group size'
              }
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mr-3">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-700">Duration</h3>
            </div>
            <p className="text-slate-900 font-medium">{getTripDuration()}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mr-3">
                <Camera className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="font-semibold text-slate-700">Experiences</h3>
            </div>
            <p className="text-slate-900 font-medium">{quote.quote_items.length} Amazing Activities</p>
          </div>
        </div>
      </div>

      {/* Trust Signals */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl"></div>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-slate-700">100% Secure</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-slate-700">IATA Certified</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-slate-700">Best Price Guarantee</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="text-sm text-slate-600 ml-2">4.9/5 from 2,847 reviews</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Itinerary */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl"></div>
        <div className="relative z-10">
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
            <h2 className="text-xl font-bold text-gray-900">
              Your Detailed Itinerary
            </h2>
            <p className="text-gray-600 mt-1">Every moment of your journey, carefully planned</p>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {Object.entries(itemsByDay).length > 0 ? (
                Object.entries(itemsByDay).map(([dayIndex, { name, items }]) => {
                  const dayDate = getTripDayDate(parseInt(dayIndex));
                  const formattedDate = dayDate ? dayDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  }) : '';

                  return (
                    <div key={dayIndex} className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                      <div
                        className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 flex items-center justify-between cursor-pointer hover:from-indigo-100 hover:to-blue-100 transition-all duration-200"
                        onClick={() => toggleDayExpansion(parseInt(dayIndex))}
                      >
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
                          {formattedDate && (
                            <p className="text-sm text-slate-600">{formattedDate}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="bg-indigo-100 text-indigo-800 text-sm font-medium px-3 py-1 rounded-full">
                            {items.length} activities
                          </span>
                          <p className="text-lg font-bold text-slate-900">
                            ${calculateDayTotal(items).toFixed(2)}
                          </p>
                          {expandedDays.includes(parseInt(dayIndex)) ? (
                            <ChevronUp className="h-5 w-5 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                      </div>
                      
                      {expandedDays.includes(parseInt(dayIndex)) && (
                        <div className="px-5 py-4 space-y-4">
                          {items.map((item, index) => (
                            <div key={item.id} className="flex items-start justify-between p-4 rounded-xl bg-gradient-to-r from-slate-50/80 to-blue-50/80 border border-white/30">
                              <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0 mt-1">
                                  {getItemIcon(item.item_type)}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                                      item.item_type === 'Flight' ? 'bg-blue-100 text-blue-800' :
                                      item.item_type === 'Hotel' ? 'bg-green-100 text-green-800' :
                                      item.item_type === 'Transfer' ? 'bg-yellow-100 text-yellow-800' :
                                      item.item_type === 'Tour' ? 'bg-purple-100 text-purple-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {item.item_type}
                                    </span>
                                  </div>
                                  <h4 className="text-lg font-semibold text-slate-900 mb-1">
                                    {item.item_name}
                                  </h4>
                                  {item.details?.description && (
                                    <p className="text-slate-600 mb-2">{item.details.description}</p>
                                  )}
                                  {(item.details?.startTime || item.details?.endTime) && (
                                    <p className="text-sm text-slate-500 flex items-center gap-1">
                                      <Clock className="w-4 h-4" />
                                      {item.details?.startTime && formatTime(item.details.startTime)}
                                      {item.details?.startTime && item.details?.endTime && ' - '}
                                      {item.details?.endTime && formatTime(item.details.endTime)}
                                    </p>
                                  )}
                                  {item.details?.checkInDate && item.details?.checkOutDate && (
                                    <p className="text-sm text-slate-500 flex items-center gap-1">
                                      <Calendar className="w-4 h-4" />
                                      Check-in: {new Date(item.details.checkInDate).toLocaleDateString()} - 
                                      Check-out: {new Date(item.details.checkOutDate).toLocaleDateString()}
                                      {item.details.nights && ` (${item.details.nights} nights)`}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 ml-4">
                                <div className="text-xl font-bold text-blue-600">
                                  ${calculateCustomerPrice(item).toFixed(2)}
                                </div>
                                {item.quantity > 1 && (
                                  <p className="text-sm text-slate-500">Quantity: {item.quantity}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">Itinerary Being Prepared</h3>
                  <p className="text-sm">Your detailed itinerary is being crafted with care.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Summary */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl"></div>
        <div className="relative z-10">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">
              Investment Summary
            </h2>
            <p className="text-gray-600 mt-1">Transparent pricing for your dream adventure</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between text-lg">
                <span className="text-slate-600">Total Trip Cost</span>
                <span className="font-bold text-slate-900">
                  ${quote.total_price.toFixed(2)}
                </span>
              </div>
              {quote.discount > 0 && (
                <div className="flex justify-between text-lg text-green-600">
                  <span>Special Discount ({quote.discount}%)</span>
                  <span className="font-bold">
                    -${(quote.total_price * (quote.discount / 100)).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-900">Your Investment</span>
                  <span className="text-3xl font-bold text-green-600">
                    ${(quote.total_price * (1 - quote.discount / 100)).toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  All taxes and fees included • No hidden charges
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps CTA */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl shadow-lg p-8 text-white text-center">
        <h2 className="text-2xl font-bold mb-2">Ready to Make This Dream a Reality?</h2>
        <p className="text-white/80 mb-6 text-lg">
          Secure your dates and start the adventure of a lifetime!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="inline-flex items-center justify-center px-8 py-4 bg-white text-indigo-600 font-bold rounded-2xl hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 shadow-lg">
            <CreditCard className="w-5 h-5 mr-2" />
            Secure Your Trip Now
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
          <button className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white font-bold rounded-2xl hover:bg-white hover:text-indigo-600 transition-all duration-200">
            Chat with Sarah First
          </button>
        </div>
      </div>

      {/* Additional Notes */}
      {quote.notes && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl"></div>
          <div className="relative z-10">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Important Information</h2>
            <div className="bg-white/70 rounded-2xl p-4 text-gray-700 whitespace-pre-wrap">
              {quote.notes}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}