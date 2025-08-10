import React, { useState } from 'react';
import { Calendar, Plus, Plane, Building, Car, MapPin, Trash2, Move, Edit2, Check, X } from 'lucide-react';
import { 
  calculateItemPrice,
  DEFAULT_PRICING_OPTIONS,
  type PricingQuote,
  type PricingItem,
  type MarkupStrategy
} from '../../../utils/pricingUtils';
import { 
  validateMarkup, 
  enforceMinimumMarkup, 
  createMarkupValidationError,
  type MarkupValidationError 
} from '../../../utils/markupUtils';

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
  markup?: number;
  discount?: number;
  markup_strategy?: MarkupStrategy;
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
  onUpdateItem: (dayId: string, itemId: string, updates: Partial<ItineraryItem>) => void;
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
  onUpdateItem,
  calculateTotalPrice,
  onRemoveLinkedFlights
}: TripItinerarySectionProps) {


  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<{
    item: ItineraryItem;
    fromDayId: string;
  } | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  // Markup editing state
  const [editingMarkup, setEditingMarkup] = useState<{
    itemId: string;
    dayId: string;
    newMarkup: number;
    validationError: MarkupValidationError | null;
  } | null>(null);

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

  // Helper function to check if an item is a multi-day hotel (shouldn't be moved)
  const isMultiDayHotel = (item: ItineraryItem): boolean => {
    return item.type === 'Hotel' && (
      (item.details?.numberOfNights && item.details.numberOfNights > 1) ||
      (item.details?.nights && item.details.nights > 1) ||
      (item.details?.spanDays && item.details.spanDays > 1)
    );
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
      // Check if this is a multi-day hotel - if so, prevent moving
      if (isMultiDayHotel(draggedItem.item)) {
        alert('Multi-day hotels cannot be moved as their dates are fixed. Please remove and re-add the hotel if needed.');
        setDraggedItem(null);
        return;
      }
      onMoveItem(draggedItem.fromDayId, toDayId, draggedItem.item.id);
    }
    setDraggedItem(null);
  };

  // Helper function to calculate item price using unified pricing system
  const calculateItemPriceUnified = (item: ItineraryItem) => {
    // Convert to pricing format
    const pricingItem: PricingItem = {
      id: item.id,
      cost: item.cost,
      markup: item.markup || 0,
      markup_type: item.markup_type || 'percentage',
      quantity: item.details?.quantity || 1,
      item_type: item.type,
      details: item.details
    };

    const pricingQuote: PricingQuote = {
      id: `trip-${Date.now()}`, // Temporary ID for trip context
      markup: trip.markup || 0,
      discount: trip.discount || 0,
      markup_strategy: trip.markup_strategy || 'global'
    };

    // Use unified pricing calculation
    const pricingOptions = {
      ...DEFAULT_PRICING_OPTIONS,
      markupStrategy: trip.markup_strategy || 'global'
    };

    return calculateItemPrice(pricingItem, pricingQuote, pricingOptions);
  };

  // Markup editing handlers
  const handleStartMarkupEdit = (item: ItineraryItem, dayId: string) => {
    setEditingMarkup({
      itemId: item.id,
      dayId: dayId,
      newMarkup: item.markup || 0,
      validationError: null
    });
  };

  const handleMarkupChange = async (newMarkup: number) => {
    if (!editingMarkup) return;

    // Find the item being edited
    const day = days.find(d => d.id === editingMarkup.dayId);
    const item = day?.items.find(i => i.id === editingMarkup.itemId);
    
    if (!item) return;

    // Validate the new markup
    const validation = await validateMarkup(item.type, newMarkup, item.markup_type);
    
    setEditingMarkup(prev => prev ? {
      ...prev,
      newMarkup,
      validationError: validation.isValid ? null : createMarkupValidationError(
        item.type,
        newMarkup,
        validation.minimumMarkup
      )
    } : null);
  };

  const handleSaveMarkup = async () => {
    if (!editingMarkup) return;

    const day = days.find(d => d.id === editingMarkup.dayId);
    const item = day?.items.find(i => i.id === editingMarkup.itemId);
    
    if (!item) return;

    // Validate one more time before saving
    const validation = await validateMarkup(item.type, editingMarkup.newMarkup, item.markup_type);
    
    if (!validation.isValid) {
      setEditingMarkup(prev => prev ? {
        ...prev,
        validationError: createMarkupValidationError(
          item.type,
          editingMarkup.newMarkup,
          validation.minimumMarkup
        )
      } : null);
      return;
    }

    // Update the item markup via the callback
    await onUpdateItem(editingMarkup.dayId, editingMarkup.itemId, { 
      markup: editingMarkup.newMarkup 
    });
    
    setEditingMarkup(null);
  };

  const handleCancelMarkupEdit = () => {
    setEditingMarkup(null);
  };

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Trip Itinerary</h2>
        <p className="text-sm text-gray-600 mt-1">Drag and drop items between days or add new items to each day</p>
      </div>

      {/* Calendar-Kanban Grid */}
      {days.length > 0 ? (
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4" style={{ minWidth: 'fit-content' }}>
          <div className="flex gap-3 sm:gap-4">
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
                  className={`bg-white/90 backdrop-blur rounded-xl shadow-sm border border-gray-100 min-h-[500px] sm:min-h-[600px] flex flex-col flex-shrink-0 transition-all duration-200 w-64 sm:w-72 lg:w-80 ${
                    dragOverDay === day.id ? 'border-indigo-300 bg-indigo-50 shadow-md' : 'hover:shadow'
                  }`}
                  onDragOver={(e) => handleDragOver(e, day.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, day.id)}
                >
                  {/* Day Header */}
                  <div className="p-3 sm:p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-t-xl">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{day.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-600">{formattedDate}</p>
                      </div>
                      <span className="bg-indigo-100 text-indigo-800 text-[11px] font-medium px-2 py-0.5 rounded-full">
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
                        className="add-item-button w-full flex items-center justify-center px-2 sm:px-3 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-xs sm:text-sm font-medium hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 shadow-sm hover:shadow"
                      >
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Add Item
                      </button>
                      
                      {/* Dropdown Menu */}
                      {showAddItemMenu === day.id && (
                        <div 
                          className="dropdown-menu absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur rounded-lg shadow-xl border border-gray-100 py-2 z-50"
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
                    {day.items.map((item) => {
                      // Check if this hotel extends beyond this day
                      const isHotelExtendingBeyond = item.type === 'Hotel' && 
                        item.details?.numberOfNights > 1 && 
                        item.details?.checkInDate;
                      
                      let daysRemaining = 0;
                      if (isHotelExtendingBeyond) {
                        const checkInDate = new Date(item.details.checkInDate);
                        const currentDayDate = new Date(trip.startDate + 'T00:00:00');
                        currentDayDate.setDate(currentDayDate.getDate() + index);
                        const daysDiff = Math.floor((currentDayDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
                        daysRemaining = Math.max(0, item.details.numberOfNights - daysDiff);
                      }

                      return (
                      <div
                        key={item.id}
                        className={`bg-white rounded-lg p-3 border transition-all duration-200 ${
                          isPartOfReturnFlight(item) 
                            ? 'border-blue-200 bg-blue-50 cursor-not-allowed' 
                            : isMultiDayHotel(item)
                            ? 'border-purple-200 bg-purple-50 cursor-not-allowed'
                            : 'border-gray-100 cursor-move hover:border-indigo-200'
                        } hover:shadow ${
                          draggedItem?.item.id === item.id ? 'opacity-50' : ''
                        }`}
                        draggable={!isPartOfReturnFlight(item) && !isMultiDayHotel(item)}
                        onDragStart={(e) => {
                          if (isPartOfReturnFlight(item) || isMultiDayHotel(item)) {
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
                              {!isPartOfReturnFlight(item) && !isMultiDayHotel(item) && (
                                <Move className="h-3 w-3 text-gray-400 cursor-grab" />
                              )}
                              {isPartOfReturnFlight(item) && (
                                <div className="h-3 w-3 flex items-center justify-center">
                                  <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                                </div>
                              )}
                              {isMultiDayHotel(item) && (
                                <div className="h-3 w-3 flex items-center justify-center">
                                  <div className="h-2 w-2 bg-purple-400 rounded-full"></div>
                                </div>
                              )}
                              <span className={`px-2 py-0.5 text-[11px] rounded-full font-medium ${
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
                              {isMultiDayHotel(item) && (
                                <span className="px-2 py-1 text-xs rounded-full font-medium bg-purple-200 text-purple-900">
                                  Multi-day
                                </span>
                              )}
                            </div>
                            <h4 className="font-medium text-sm text-gray-900 mb-1">
                              {item.name}{getFlightDirectionDisplay(item)}
                              {item.type === 'Hotel' && isMultiDayHotel(item) && (
                                <span className="text-xs text-purple-600 ml-2">
                                  (Check-in: {item.details?.numberOfNights || item.details?.nights || item.details?.spanDays} nights)
                                </span>
                              )}
                            </h4>
                            {item.description && (
                              <p className="text-xs text-gray-600 mb-1">{item.description}</p>
                            )}
                            {item.type === 'Hotel' && item.details?.checkInDate && item.details?.checkOutDate ? (
                              <p className="text-xs text-gray-500">
                                Check-in: {new Date(item.details.checkInDate).toLocaleDateString()} 3:00 PM<br/>
                                Check-out: {new Date(item.details.checkOutDate).toLocaleDateString()} 11:00 AM
                              </p>
                            ) : (item.startTime || item.endTime) && (
                              <p className="text-xs text-gray-500">
                                {item.startTime && new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {item.startTime && item.endTime && ' - '}
                                {item.endTime && new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                          <div className="text-right ml-2">
                            <div className="space-y-1">
                              {item.type === 'Hotel' ? (
                                // Special handling for hotel pricing
                                <>
                                  {isMultiDayHotel(item) ? (
                                    <>
                                      <p className="text-xs text-gray-600">
                                        ${item.details?.perNightCost?.toFixed(2) || (item.cost / (item.details?.numberOfNights || item.details?.nights || item.details?.spanDays || 1)).toFixed(2)} per night
                                      </p>
                                      <p className="text-sm font-medium text-gray-900">
                                        ${item.cost.toFixed(2)} total
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {item.details?.numberOfNights || item.details?.nights || item.details?.spanDays} {(item.details?.numberOfNights || item.details?.nights || item.details?.spanDays) === 1 ? 'night' : 'nights'}
                                      </p>
                                    </>
                                  ) : (
                                    <p className="text-sm font-medium text-gray-900">
                                      ${item.cost.toFixed(2)}
                                    </p>
                                  )}
                                </>
                              ) : (
                                // Regular pricing for non-hotel items
                                <p className="text-sm font-medium text-gray-900">
                                  ${item.cost.toFixed(2)}
                                </p>
                              )}
                              {/* Markup editing interface */}
                              {editingMarkup?.itemId === item.id ? (
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="number"
                                      value={editingMarkup.newMarkup}
                                      onChange={(e) => handleMarkupChange(Number(e.target.value))}
                                      className={`w-16 px-2 py-1 text-xs border rounded-md ${
                                        editingMarkup.validationError 
                                          ? 'border-red-300 bg-red-50' 
                                          : 'border-gray-200'
                                      }`}
                                      step="0.1"
                                      min="0"
                                    />
                                    <span className="text-xs text-gray-600">
                                      {item.markup_type === 'percentage' ? '%' : '$'} markup
                                    </span>
                                    <button
                                      onClick={handleSaveMarkup}
                                      disabled={!!editingMarkup.validationError}
                                      className="p-1 text-green-600 hover:text-green-700 disabled:text-gray-400"
                                    >
                                      <Check className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={handleCancelMarkupEdit}
                                      className="p-1 text-red-600 hover:text-red-700"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                  {editingMarkup.validationError && (
                                    <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                      {editingMarkup.validationError.message}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1">
                                  <p className={`text-xs ${item.markup > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                    +{item.markup}{item.markup_type === 'percentage' ? '%' : '$'} markup
                                  </p>
                                  <button
                                    onClick={() => handleStartMarkupEdit(item, day.id)}
                                    className="p-1 text-gray-400 hover:text-gray-600"
                                    title="Edit markup"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                              <p className="text-xs font-semibold text-indigo-600">
                                Final: ${calculateItemPriceUnified(item).toFixed(2)}
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
                              className="text-red-500 hover:text-red-600 text-xs mt-1 flex items-center"
                              title={
                                isPartOfReturnFlight(item) 
                                  ? 'Remove both flight segments' 
                                  : isMultiDayHotel(item)
                                  ? `Remove ${item.details?.numberOfNights || item.details?.nights || item.details?.spanDays}-night hotel stay`
                                  : 'Remove item'
                              }
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              {isPartOfReturnFlight(item) ? 'Remove Flight' : 'Remove'}
                            </button>
                          </div>
                        </div>
                      </div>
                      );
                    })}
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
        <div className="text-center py-12 bg-white/90 backdrop-blur rounded-xl border border-gray-100">
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
        <div className="mt-6 bg-white/90 backdrop-blur rounded-xl border border-gray-100 p-4">
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