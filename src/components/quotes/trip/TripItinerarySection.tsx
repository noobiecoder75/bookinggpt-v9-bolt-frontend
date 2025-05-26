import React, { useState } from 'react';
import { Calendar, Plus, Plane, Building, Car, MapPin, Trash2, Move } from 'lucide-react';

/**
 * Utility function to create linked flight items for return flights
 * This should be called from the parent component when processing flight search results
 * 
 * Example usage:
 * const createLinkedFlightItems = (flightData: any, isReturnFlight: boolean) => {
 *   if (!isReturnFlight) {
 *     return [createSingleFlightItem(flightData)];
 *   }
 *   
 *   const outboundId = generateId();
 *   const returnId = generateId();
 *   
 *   const outboundFlight = {
 *     id: outboundId,
 *     type: 'Flight' as const,
 *     name: `${flightData.origin} → ${flightData.destination}`,
 *     cost: flightData.cost / 2, // Split cost between segments
 *     linkedItemId: returnId,
 *     isReturnFlight: true,
 *     flightDirection: 'outbound' as const,
 *     startTime: flightData.departureTime,
 *     endTime: flightData.arrivalTime,
 *     // ... other properties
 *   };
 *   
 *   const returnFlight = {
 *     id: returnId,
 *     type: 'Flight' as const,
 *     name: `${flightData.destination} → ${flightData.origin}`,
 *     cost: flightData.cost / 2,
 *     linkedItemId: outboundId,
 *     isReturnFlight: true,
 *     flightDirection: 'return' as const,
 *     startTime: flightData.returnDepartureTime,
 *     endTime: flightData.returnArrivalTime,
 *     // ... other properties
 *   };
 *   
 *   return [outboundFlight, returnFlight];
 * };
 */

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
  // For linked flight items (return flights)
  linkedItemId?: string;
  isReturnFlight?: boolean;
  flightDirection?: 'outbound' | 'return';
}

interface DayPlan {
  id: string;
  dayIndex: number;
  name: string;
  items: ItineraryItem[];
  isComplete: boolean;
}

interface Trip {
  startDate: string;
  endDate: string;
}

interface TripItinerarySectionProps {
  trip: Trip;
  days: DayPlan[];
  showAddItemMenu: string | null;
  onTripDatesUpdate: (startDate: string, endDate: string) => void;
  onAddItemMenuToggle: (dayId: string | null) => void;
  onAddFlight: (dayId: string) => void;
  onAddHotel: (dayId: string) => void;
  onAddTransfer: (dayId: string) => void;
  onAddActivity: (dayId: string) => void;
  onAddCustomItem: (dayId: string) => void;
  onRemoveItem: (dayId: string, itemId: string) => void;
  onMoveItem: (fromDayId: string, toDayId: string, itemId: string) => void;
  calculateTotalPrice: () => number;
  onRemoveLinkedFlights: (itemId: string) => void;
}

export function TripItinerarySection({
  trip,
  days,
  showAddItemMenu,
  onTripDatesUpdate,
  onAddItemMenuToggle,
  onAddFlight,
  onAddHotel,
  onAddTransfer,
  onAddActivity,
  onAddCustomItem,
  onRemoveItem,
  onMoveItem,
  calculateTotalPrice,
  onRemoveLinkedFlights
}: TripItinerarySectionProps) {


  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<{
    item: ItineraryItem;
    fromDayId: string;
  } | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  // Helper function to find linked flight
  const findLinkedFlight = (itemId: string): ItineraryItem | null => {
    for (const day of days) {
      const linkedItem = day.items.find(item => 
        item.linkedItemId === itemId || 
        (item.id !== itemId && item.linkedItemId && item.linkedItemId === itemId)
      );
      if (linkedItem) return linkedItem;
    }
    return null;
  };

  // Helper function to check if an item is part of a return flight
  const isPartOfReturnFlight = (item: ItineraryItem): boolean => {
    return item.type === 'Flight' && (item.isReturnFlight || !!item.linkedItemId);
  };

  // Helper function to get flight direction display
  const getFlightDirectionDisplay = (item: ItineraryItem): string => {
    if (!isPartOfReturnFlight(item)) return '';
    return item.flightDirection === 'outbound' ? ' (Departure)' : ' (Return)';
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: ItineraryItem, dayId: string) => {
    setDraggedItem({ item, fromDayId: dayId });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
    
    // Add visual feedback
    (e.currentTarget as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setDraggedItem(null);
    setDragOverDay(null);
    (e.currentTarget as HTMLElement).style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent, dayId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDay(dayId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the day container, not just moving between child elements
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverDay(null);
    }
  };

  const handleDrop = (e: React.DragEvent, toDayId: string) => {
    e.preventDefault();
    setDragOverDay(null);
    
    if (draggedItem && draggedItem.fromDayId !== toDayId) {
      // Check if this is a linked flight - if so, prevent moving
      if (isPartOfReturnFlight(draggedItem.item)) {
        alert('Return flight segments cannot be moved individually. Please remove and re-add the entire return flight if needed.');
        setDraggedItem(null);
        return;
      }
      onMoveItem(draggedItem.fromDayId, toDayId, draggedItem.item.id);
    }
    setDraggedItem(null);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Trip Itinerary</h2>
        <p className="text-sm text-gray-600 mt-1">Drag and drop items between days or add new items to each day</p>
      </div>

      {/* Calendar-Kanban Grid */}
      {days.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minWidth: 'fit-content' }}>
          <div className="flex gap-4" style={{ minWidth: `${days.length * 320}px` }}>
            {days.map((day, index) => {
              // Create date in local timezone to avoid timezone offset issues
              const dayDate = new Date(trip.startDate + 'T00:00:00');
              dayDate.setDate(dayDate.getDate() + index);
              const formattedDate = dayDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              });

              return (
                <div 
                  key={day.id} 
                  className={`bg-white rounded-lg shadow-sm border border-gray-200 min-h-[600px] flex flex-col flex-shrink-0 transition-all duration-200 ${
                    dragOverDay === day.id ? 'border-indigo-400 bg-indigo-50 shadow-lg' : ''
                  }`}
                  style={{ width: '300px' }}
                  onDragOver={(e) => handleDragOver(e, day.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, day.id)}
                >
                  {/* Day Header */}
                  <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{day.name}</h3>
                        <p className="text-sm text-gray-600">{formattedDate}</p>
                      </div>
                      <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-1 rounded-full">
                        {day.items.length} items
                      </span>
                    </div>
                    
                    {/* Add Item Button in Header */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          const newMenuState = showAddItemMenu === day.id ? null : day.id;
                          onAddItemMenuToggle(newMenuState);
                        }}
                        className="add-item-button w-full flex items-center justify-center px-3 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </button>
                      
                      {/* Dropdown Menu */}
                      {showAddItemMenu === day.id && (
                        <div 
                          className="dropdown-menu absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onAddFlight(day.id);
                            }}
                            className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                          >
                            <Plane className="h-4 w-4 mr-3 text-blue-600" />
                            Add Flight
                          </button>
                          <button
                            onClick={() => {
                              onAddHotel(day.id);
                              onAddItemMenuToggle(null);
                            }}
                            className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                          >
                            <Building className="h-4 w-4 mr-3 text-green-600" />
                            Add Hotel
                          </button>
                          <button
                            onClick={() => {
                              onAddTransfer(day.id);
                              onAddItemMenuToggle(null);
                            }}
                            className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 transition-colors"
                          >
                            <Car className="h-4 w-4 mr-3 text-yellow-600" />
                            Add Transfer
                          </button>
                          <button
                            onClick={() => {
                              onAddActivity(day.id);
                              onAddItemMenuToggle(null);
                            }}
                            className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                          >
                            <MapPin className="h-4 w-4 mr-3 text-purple-600" />
                            Add Activity
                          </button>
                          <div className="border-t border-gray-100 my-1"></div>
                          <button
                            onClick={() => {
                              onAddCustomItem(day.id);
                              onAddItemMenuToggle(null);
                            }}
                            className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                          >
                            <Plus className="h-4 w-4 mr-3 text-gray-600" />
                            Add Custom Item
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                    {day.items.length === 0 && dragOverDay === day.id && (
                      <div className="border-2 border-dashed border-indigo-300 rounded-lg p-6 text-center bg-indigo-50">
                        <Move className="h-8 w-8 text-indigo-400 mx-auto mb-2" />
                        <p className="text-sm text-indigo-600 font-medium">Drop item here</p>
                      </div>
                    )}
                    {day.items.length === 0 && dragOverDay !== day.id && (
                      <div className="text-center py-8 text-gray-400">
                        <Calendar className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">No items scheduled</p>
                        <p className="text-xs mt-1">Drag items here or use the Add Item button</p>
                      </div>
                    )}
                    {day.items.map((item) => (
                      <div
                        key={item.id}
                        className={`bg-gray-50 rounded-lg p-3 border transition-all duration-200 ${
                          isPartOfReturnFlight(item) 
                            ? 'border-blue-300 bg-blue-50 cursor-not-allowed' 
                            : 'border-gray-200 cursor-move hover:border-indigo-300'
                        } hover:shadow-sm ${
                          draggedItem?.item.id === item.id ? 'opacity-50 scale-95' : ''
                        }`}
                        draggable={!isPartOfReturnFlight(item)}
                        onDragStart={(e) => {
                          if (isPartOfReturnFlight(item)) {
                            e.preventDefault();
                            return;
                          }
                          handleDragStart(e, item, day.id);
                        }}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {!isPartOfReturnFlight(item) && (
                                <Move className="h-3 w-3 text-gray-400 cursor-grab" />
                              )}
                              {isPartOfReturnFlight(item) && (
                                <div className="h-3 w-3 flex items-center justify-center">
                                  <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                                </div>
                              )}
                              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                item.type === 'Flight' ? 'bg-blue-100 text-blue-800' :
                                item.type === 'Hotel' ? 'bg-green-100 text-green-800' :
                                item.type === 'Transfer' ? 'bg-yellow-100 text-yellow-800' :
                                item.type === 'Tour' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {item.type}
                              </span>
                              {isPartOfReturnFlight(item) && (
                                <span className="px-2 py-1 text-xs rounded-full font-medium bg-blue-200 text-blue-900">
                                  Linked
                                </span>
                              )}
                            </div>
                            <h4 className="font-medium text-sm text-gray-900 mb-1">
                              {item.name}{getFlightDirectionDisplay(item)}
                            </h4>
                            {item.description && (
                              <p className="text-xs text-gray-600 mb-1">{item.description}</p>
                            )}
                            {(item.startTime || item.endTime) && (
                              <p className="text-xs text-gray-500">
                                {item.startTime && new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {item.startTime && item.endTime && ' - '}
                                {item.endTime && new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                          <div className="text-right ml-2">
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-gray-900">${item.cost.toFixed(2)}</p>
                              {item.markup > 0 && (
                                <p className="text-xs text-green-600">
                                  +{item.markup}{item.markup_type === 'percentage' ? '%' : '$'} markup
                                </p>
                              )}
                              <p className="text-xs font-semibold text-indigo-600">
                                Total: ${(item.cost + (item.markup_type === 'percentage' ? item.cost * (item.markup / 100) : item.markup)).toFixed(2)}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                if (isPartOfReturnFlight(item)) {
                                  // For return flights, remove both segments
                                  onRemoveLinkedFlights(item.id);
                                } else {
                                  // For regular items, remove normally
                                  onRemoveItem(day.id, item.id);
                                }
                              }}
                              className="text-red-500 hover:text-red-700 text-xs mt-1 flex items-center"
                              title={isPartOfReturnFlight(item) ? 'Remove both flight segments' : 'Remove item'}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              {isPartOfReturnFlight(item) ? 'Remove Flight' : 'Remove'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {day.items.length > 0 && dragOverDay === day.id && draggedItem?.fromDayId !== day.id && (
                      <div className="border-2 border-dashed border-indigo-300 rounded-lg p-3 text-center bg-indigo-50 mt-2">
                        <p className="text-xs text-indigo-600 font-medium">Drop to add to this day</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No itinerary created yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Your trip calendar will appear here automatically based on your trip dates.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Trip dates: {trip.startDate ? new Date(trip.startDate + 'T00:00:00').toLocaleDateString() : 'Not set'} - {trip.endDate ? new Date(trip.endDate + 'T00:00:00').toLocaleDateString() : 'Not set'}
          </p>
          {(!trip.startDate || !trip.endDate) && (
            <p className="text-xs text-amber-600 mt-2">
              Please ensure your trip has valid start and end dates to see the calendar.
            </p>
          )}
        </div>
      )}

      {/* Total Price Summary */}
      {days.length > 0 && (
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Trip Total</h3>
              <p className="text-sm text-gray-600">{days.reduce((total, day) => total + day.items.length, 0)} items across {days.length} days</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-600">${calculateTotalPrice().toFixed(2)}</p>
              <p className="text-sm text-gray-500">Total cost</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 