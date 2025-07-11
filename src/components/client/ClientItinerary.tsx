import React, { useState, useEffect } from 'react';
import { 
  Plane, 
  MapPin, 
  Building, 
  Camera, 
  Car, 
  Clock, 
  Calendar, 
  Users,
  ChevronDown,
  ChevronUp,
  Star,
  Coffee,
  Utensils,
  Sun,
  Moon,
  Navigation,
  Info,
  ExternalLink,
  Heart,
  Zap
} from 'lucide-react';
import { validateItineraryData, formatDateSafely } from '../../utils/itineraryDataValidator';

interface Quote {
  id: string;
  trip_start_date?: string;
  trip_end_date?: string;
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

interface ClientItineraryProps {
  quote: Quote;
  calculateCustomerPrice: (item: Quote['quote_items'][0]) => number;
}

interface ItineraryDay {
  date: Date;
  dayNumber: number;
  items: Quote['quote_items'];
  totalCost: number;
  highlights: string[];
}

export function ClientItinerary({ quote, calculateCustomerPrice }: ClientItineraryProps) {
  const [expandedDays, setExpandedDays] = useState<number[]>([0]);
  const [viewMode, setViewMode] = useState<'timeline' | 'map'>('timeline');
  const [validatedQuote, setValidatedQuote] = useState(quote);
  const [dataWarnings, setDataWarnings] = useState<string[]>([]);

  // Validate and normalize data when quote changes
  useEffect(() => {
    const validation = validateItineraryData(quote);
    
    if (validation.warnings.length > 0) {
      console.warn('Itinerary data warnings:', validation.warnings);
      setDataWarnings(validation.warnings);
    }
    
    if (validation.errors.length > 0) {
      console.error('Itinerary data errors:', validation.errors);
    }
    
    setValidatedQuote(validation.normalizedQuote);
  }, [quote]);

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

  const getItemColor = (type: string) => {
    switch (type) {
      case 'Flight':
        return 'from-blue-400 to-blue-600';
      case 'Hotel':
        return 'from-indigo-400 to-indigo-600';
      case 'Tour':
        return 'from-green-400 to-green-600';
      case 'Transfer':
        return 'from-yellow-400 to-yellow-600';
      default:
        return 'from-gray-400 to-gray-600';
    }
  };

  const formatTime = (time: string) => {
    return formatDateSafely(time, 'time');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatShortDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Build itinerary days with improved database sync
  const buildItineraryDays = (): ItineraryDay[] => {
    // Use validated quote which has normalized/inferred dates
    if (!validatedQuote.trip_start_date || !validatedQuote.trip_end_date) {
      return []; // Validation should have handled this
    }

    const startDate = new Date(validatedQuote.trip_start_date + 'T00:00:00');
    const endDate = new Date(validatedQuote.trip_end_date + 'T00:00:00');

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const days: ItineraryDay[] = [];
    
    // Enhanced grouping with better database field handling
    const itemsByDay = validatedQuote.quote_items.reduce((acc, item) => {
      // Try multiple ways to get day index from database
      let dayIndex = 0;
      
      // Priority 1: Explicit day_index in details
      if (item.details?.day_index !== undefined && item.details.day_index !== null) {
        dayIndex = item.details.day_index;
      }
      // Priority 2: day.index in details (legacy)
      else if (item.details?.day?.index !== undefined) {
        dayIndex = item.details.day.index;
      }
      // Priority 3: Calculate from date for hotels
      else if (item.item_type === 'Hotel' && item.details?.check_in) {
        const checkInDate = new Date(item.details.check_in + 'T00:00:00');
        const diffTime = checkInDate.getTime() - startDate.getTime();
        dayIndex = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      }
      // Priority 4: Calculate from date for tours/activities
      else if ((item.item_type === 'Tour' || item.item_type === 'Transfer') && item.details?.date) {
        const activityDate = new Date(item.details.date + 'T00:00:00');
        const diffTime = activityDate.getTime() - startDate.getTime();
        dayIndex = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      }
      // Priority 5: Calculate from departure for flights
      else if (item.item_type === 'Flight' && item.details?.departure) {
        const flightDate = new Date(item.details.departure);
        const diffTime = flightDate.getTime() - startDate.getTime();
        dayIndex = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      }
      
      // Ensure dayIndex is within valid range
      dayIndex = Math.max(0, Math.min(dayIndex, totalDays - 1));
      
      if (!acc[dayIndex]) acc[dayIndex] = [];
      acc[dayIndex].push(item);
      return acc;
    }, {} as Record<number, Quote['quote_items']>);

    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      
      const dayItems = itemsByDay[i] || [];
      
      // Sort items by time for better display
      const sortedDayItems = dayItems.sort((a, b) => {
        const getItemTime = (item: any) => {
          return item.details?.startTime || 
                 item.details?.departure || 
                 item.details?.check_in || 
                 '00:00';
        };
        
        const timeA = getItemTime(a);
        const timeB = getItemTime(b);
        return timeA.localeCompare(timeB);
      });
      
      // Calculate total cost, handling multi-day items properly
      const totalCost = sortedDayItems.reduce((sum, item) => {
        try {
          const itemPrice = calculateCustomerPrice(item);
          
          // For hotels, only add cost on check-in day to avoid double-counting
          if (item.item_type === 'Hotel') {
            const checkInDate = item.details?.check_in || item.details?.checkInDate;
            if (checkInDate) {
              const checkIn = new Date(checkInDate + 'T00:00:00');
              const dayDate = new Date(currentDate);
              dayDate.setHours(0, 0, 0, 0);
              checkIn.setHours(0, 0, 0, 0);
              
              // Only add hotel cost on the check-in day
              if (dayDate.getTime() === checkIn.getTime()) {
                return sum + itemPrice;
              } else {
                return sum; // Don't add cost on other days
              }
            }
          }
          
          // For other item types, add the full cost
          return sum + itemPrice;
        } catch (error) {
          console.warn('Error calculating price for item:', item.id, error);
          return sum;
        }
      }, 0);
      
      // Generate highlights based on activities
      const highlights = generateDayHighlights(sortedDayItems);
      
      days.push({
        date: currentDate,
        dayNumber: i + 1,
        items: sortedDayItems,
        totalCost,
        highlights
      });
    }

    return days;
  };

  const generateDayHighlights = (items: Quote['quote_items']): string[] => {
    const highlights: string[] = [];
    
    // Sort items by time for better highlight display
    const sortedItems = [...items].sort((a, b) => {
      const timeA = a.details?.startTime || a.details?.departure || a.details?.check_in || '00:00';
      const timeB = b.details?.startTime || b.details?.departure || b.details?.check_in || '00:00';
      return timeA.localeCompare(timeB);
    });
    
    sortedItems.forEach(item => {
      let highlight = '';
      
      switch (item.item_type) {
        case 'Flight':
          // Extract departure/arrival cities from flight name
          const flightMatch = item.item_name.match(/(.+?)\s*[→-]\s*(.+)/);
          if (flightMatch) {
            highlight = `✈️ ${flightMatch[1]} → ${flightMatch[2]}`;
          } else {
            highlight = `✈️ ${item.item_name}`;
          }
          // Add departure time if available
          if (item.details?.departure) {
            const time = formatTime(item.details.departure);
            highlight += ` (${time})`;
          }
          break;
        case 'Hotel':
          highlight = `🏨 ${item.item_name}`;
          // Add check-in info if available
          if (item.details?.check_in) {
            highlight += ` (Check-in)`;
          }
          break;
        case 'Tour':
          highlight = `🎯 ${item.item_name}`;
          // Add duration if available
          if (item.details?.duration) {
            highlight += ` (${item.details.duration})`;
          }
          break;
        case 'Transfer':
          highlight = `🚗 ${item.item_name}`;
          break;
        case 'Insurance':
          highlight = `🛡️ ${item.item_name}`;
          break;
        default:
          highlight = `📍 ${item.item_name}`;
      }
      
      if (highlight) {
        highlights.push(highlight);
      }
    });
    
    return highlights;
  };

  const toggleDayExpansion = (dayIndex: number) => {
    setExpandedDays(prev =>
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  const itineraryDays = buildItineraryDays();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Your Journey Awaits</h1>
              <p className="text-slate-600">A beautiful visual timeline of your upcoming adventure</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'timeline' 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Timeline
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'map' 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Navigation className="w-4 h-4 inline mr-2" />
                  Map View
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trip Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Duration</h3>
            </div>
            <p className="text-2xl font-bold text-blue-600">{itineraryDays.length} Days</p>
            <p className="text-sm text-slate-600 mt-1">
              {validatedQuote.trip_start_date && formatShortDate(new Date(validatedQuote.trip_start_date))} - {validatedQuote.trip_end_date && formatShortDate(new Date(validatedQuote.trip_end_date))}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Activities</h3>
            </div>
            <p className="text-2xl font-bold text-green-600">{validatedQuote.quote_items.length}</p>
            <p className="text-sm text-slate-600 mt-1">Unique experiences</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Heart className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Destinations</h3>
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {(() => {
                // Extract unique destinations from flights and hotels
                const destinations = new Set<string>();
                
                // From flight destinations
                validatedQuote.quote_items.filter(item => item.item_type === 'Flight').forEach(flight => {
                  const match = flight.item_name.match(/(.+?)\s*[→-]\s*(.+)/);
                  if (match) {
                    destinations.add(match[1].trim());
                    destinations.add(match[2].trim());
                  }
                });
                
                // From hotel locations (extract city names)
                validatedQuote.quote_items.filter(item => item.item_type === 'Hotel').forEach(hotel => {
                  if (hotel.details?.location) {
                    destinations.add(hotel.details.location);
                  } else {
                    // Fallback: try to extract from hotel name
                    const cityMatch = hotel.item_name.match(/(.+?)\s+(Hotel|Resort|Inn|Lodge)/i);
                    if (cityMatch) {
                      destinations.add(cityMatch[1].trim());
                    }
                  }
                });
                
                return Math.max(destinations.size, 1);
              })()}
            </p>
            <p className="text-sm text-slate-600 mt-1">Amazing places</p>
          </div>
        </div>
      </div>

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="space-y-6">
          {itineraryDays.map((day, dayIndex) => (
            <div key={dayIndex} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl"></div>
              <div className="relative z-10">
                {/* Day Header */}
                <div 
                  className="px-6 py-5 border-b border-gray-100 cursor-pointer hover:bg-gradient-to-r hover:from-indigo-100 hover:to-blue-100 transition-all duration-200"
                  onClick={() => toggleDayExpansion(dayIndex)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                        {day.dayNumber}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">Day {day.dayNumber}</h3>
                        <p className="text-slate-600">{formatDate(day.date)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                          <Zap className="w-4 h-4" />
                          {day.items.length} activities
                        </div>
                        {day.totalCost > 0 && (
                          <p className="text-lg font-bold text-indigo-600">
                            ${day.totalCost.toFixed(2)}
                          </p>
                        )}
                      </div>
                      {expandedDays.includes(dayIndex) ? (
                        <ChevronUp className="h-5 w-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                  
                  {/* Day Highlights */}
                  {!expandedDays.includes(dayIndex) && day.highlights.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {day.highlights.slice(0, 3).map((highlight, idx) => (
                        <span key={idx} className="px-3 py-1 bg-white bg-opacity-70 rounded-full text-sm text-slate-700">
                          {highlight}
                        </span>
                      ))}
                      {day.highlights.length > 3 && (
                        <span className="px-3 py-1 bg-white bg-opacity-70 rounded-full text-sm text-slate-500">
                          +{day.highlights.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded Day Content */}
                {expandedDays.includes(dayIndex) && (
                  <div className="p-6">
                    {day.items.length > 0 ? (
                      <div className="space-y-4">
                        {day.items.map((item, itemIndex) => (
                          <div 
                            key={item.id} 
                            className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 hover:shadow-lg transition-all duration-200"
                          >
                            <div className="flex items-start gap-4">
                              {/* Time & Icon */}
                              <div className="flex flex-col items-center gap-2">
                                <div className={`w-12 h-12 bg-gradient-to-br ${getItemColor(item.item_type)} rounded-xl flex items-center justify-center text-white`}>
                                  {getItemIcon(item.item_type)}
                                </div>
                                {/* Display time based on item type and available data */}
                                {(
                                  item.details?.startTime || 
                                  item.details?.departure || 
                                  item.details?.check_in
                                ) && (
                                  <span className="text-xs font-medium text-slate-500">
                                    {item.details?.startTime && formatTime(item.details.startTime)}
                                    {!item.details?.startTime && item.details?.departure && formatTime(item.details.departure)}
                                    {!item.details?.startTime && !item.details?.departure && item.details?.check_in && 'Check-in'}
                                  </span>
                                )}
                              </div>

                              {/* Content */}
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h4 className="text-lg font-semibold text-slate-900 mb-1">
                                      {item.item_name}
                                    </h4>
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                      item.item_type === 'Flight' ? 'bg-blue-100 text-blue-800' :
                                      item.item_type === 'Hotel' ? 'bg-indigo-100 text-indigo-800' :
                                      item.item_type === 'Tour' ? 'bg-green-100 text-green-800' :
                                      'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {item.item_type}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xl font-bold text-indigo-600">
                                      ${calculateCustomerPrice(item).toFixed(2)}
                                    </p>
                                    {item.quantity > 1 && (
                                      <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                                    )}
                                  </div>
                                </div>

                                {/* Details */}
                                {item.details?.description && (
                                  <p className="text-slate-600 mb-3">{item.details.description}</p>
                                )}

                                {/* Additional Info - Enhanced database field handling */}
                                <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                                  {/* Flight specific details */}
                                  {item.item_type === 'Flight' && (
                                    <>
                                      {item.details?.departure && item.details?.arrival && (
                                        <div className="flex items-center gap-1">
                                          <Clock className="w-4 h-4" />
                                          {formatTime(item.details.departure)} - {formatTime(item.details.arrival)}
                                        </div>
                                      )}
                                      {item.details?.class && (
                                        <div className="flex items-center gap-1">
                                          <Users className="w-4 h-4" />
                                          {item.details.class}
                                        </div>
                                      )}
                                    </>
                                  )}
                                  
                                  {/* Hotel specific details */}
                                  {item.item_type === 'Hotel' && (
                                    <>
                                      {(item.details?.check_in || item.details?.checkInDate) && (item.details?.check_out || item.details?.checkOutDate) && (
                                        <div className="flex items-center gap-1">
                                          <Building className="w-4 h-4" />
                                          {new Date((item.details.check_in || item.details.checkInDate) + 'T00:00:00').toLocaleDateString()} - 
                                          {new Date((item.details.check_out || item.details.checkOutDate) + 'T00:00:00').toLocaleDateString()}
                                        </div>
                                      )}
                                      {(item.details?.nights || item.details?.numberOfNights) && (
                                        <div className="flex items-center gap-1">
                                          <Calendar className="w-4 h-4" />
                                          {item.details.nights || item.details.numberOfNights} nights
                                        </div>
                                      )}
                                      {item.details?.room_type && (
                                        <div className="flex items-center gap-1">
                                          <MapPin className="w-4 h-4" />
                                          {item.details.room_type}
                                        </div>
                                      )}
                                    </>
                                  )}
                                  
                                  {/* Tour/Activity specific details */}
                                  {(item.item_type === 'Tour' || item.item_type === 'Transfer') && (
                                    <>
                                      {item.details?.duration && (
                                        <div className="flex items-center gap-1">
                                          <Clock className="w-4 h-4" />
                                          Duration: {item.details.duration}
                                        </div>
                                      )}
                                      {item.details?.startTime && item.details?.endTime && (
                                        <div className="flex items-center gap-1">
                                          <Clock className="w-4 h-4" />
                                          {formatTime(item.details.startTime)} - {formatTime(item.details.endTime)}
                                        </div>
                                      )}
                                      {item.details?.includes_lunch && (
                                        <div className="flex items-center gap-1">
                                          <Utensils className="w-4 h-4" />
                                          Lunch included
                                        </div>
                                      )}
                                    </>
                                  )}
                                  
                                  {/* Generic location info */}
                                  {item.details?.location && (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-4 h-4" />
                                      {item.details.location}
                                    </div>
                                  )}
                                  
                                  {/* Traveler info */}
                                  {item.details?.travelers && (
                                    <div className="flex items-center gap-1">
                                      <Users className="w-4 h-4" />
                                      {item.details.travelers.adults} Adults
                                      {item.details.travelers.children > 0 && `, ${item.details.travelers.children} Children`}
                                      {item.details.travelers.seniors > 0 && `, ${item.details.travelers.seniors} Seniors`}
                                    </div>
                                  )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 mt-3">
                                  <button className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm hover:bg-indigo-200 transition-colors">
                                    <Info className="w-3 h-3" />
                                    Details
                                  </button>
                                  <button className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors">
                                    <ExternalLink className="w-3 h-3" />
                                    View
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Sun className="w-8 h-8 text-gray-400" />
                        </div>
                        <h4 className="text-lg font-medium text-slate-900 mb-1">Free Day</h4>
                        <p className="text-slate-600">Enjoy some leisure time or explore on your own</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Map View Placeholder */}
      {viewMode === 'map' && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl"></div>
          <div className="relative z-10">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Navigation className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Interactive Map Coming Soon</h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              We're working on a beautiful interactive map that will show your journey route, destinations, and key landmarks.
            </p>
            <button 
              onClick={() => setViewMode('timeline')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Back to Timeline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}