import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, DollarSign, Plane, Building, Car, Coffee, Utensils, Camera, Save, Edit2, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ItineraryItem {
  time: string;
  type: 'hotel' | 'activity' | 'meal' | 'transfer';
  name: string;
  description?: string;
  duration?: string;
  cost: number;
  notes?: string;
}

interface DayPlan {
  date: string;
  city: string;
  dayNumber: number;
  dayTitle?: string;
  items: ItineraryItem[];
}

interface ItinerarySummary {
  totalEstimatedCost: number;
  hotelsNeeded: string[];
  keyHighlights: string[];
}

interface TripBuilderResultsProps {
  itinerary: {
    days: DayPlan[];
    summary?: ItinerarySummary;
  };
  formData: any;
  onEdit?: () => void;
}

const getItemIcon = (type: string) => {
  switch (type) {
    case 'hotel': return <Building className="h-4 w-4" />;
    case 'activity': return <Camera className="h-4 w-4" />;
    case 'meal': return <Utensils className="h-4 w-4" />;
    case 'transfer': return <Car className="h-4 w-4" />;
    default: return <MapPin className="h-4 w-4" />;
  }
};

const getItemColor = (type: string) => {
  switch (type) {
    case 'hotel': return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'activity': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'meal': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'transfer': return 'bg-green-100 text-green-700 border-green-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

export function TripBuilderResults({ itinerary, formData, onEdit }: TripBuilderResultsProps) {
  const navigate = useNavigate();
  const [days, setDays] = useState<DayPlan[]>(itinerary.days);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set(itinerary.days.map((_, i) => i)));
  const [isSaving, setIsSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<{ dayIndex: number; itemIndex: number } | null>(null);

  const toggleDayExpansion = (dayIndex: number) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dayIndex)) {
        newSet.delete(dayIndex);
      } else {
        newSet.add(dayIndex);
      }
      return newSet;
    });
  };

  const removeItem = (dayIndex: number, itemIndex: number) => {
    setDays(prev => prev.map((day, dIdx) => 
      dIdx === dayIndex 
        ? { ...day, items: day.items.filter((_, iIdx) => iIdx !== itemIndex) }
        : day
    ));
  };

  const updateItem = (dayIndex: number, itemIndex: number, updates: Partial<ItineraryItem>) => {
    setDays(prev => prev.map((day, dIdx) => 
      dIdx === dayIndex 
        ? {
            ...day,
            items: day.items.map((item, iIdx) => 
              iIdx === itemIndex ? { ...item, ...updates } : item
            )
          }
        : day
    ));
    setEditingItem(null);
  };

  const moveItem = (dayIndex: number, itemIndex: number, direction: 'up' | 'down') => {
    setDays(prev => prev.map((day, dIdx) => {
      if (dIdx !== dayIndex) return day;
      
      const newItems = [...day.items];
      const newIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
      
      if (newIndex >= 0 && newIndex < newItems.length) {
        [newItems[itemIndex], newItems[newIndex]] = [newItems[newIndex], newItems[itemIndex]];
      }
      
      return { ...day, items: newItems };
    }));
  };

  const calculateTotalCost = () => {
    return days.reduce((total, day) => 
      total + day.items.reduce((dayTotal, item) => dayTotal + (item.cost || 0), 0), 0
    );
  };

  const saveAsQuote = async () => {
    setIsSaving(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please log in to save your itinerary');
        return;
      }

      // Create a new quote
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          agent_id: user.id,
          status: 'draft',
          trip_start_date: formData.tripDates.checkIn,
          trip_end_date: formData.tripDates.checkOut,
          total_price: calculateTotalCost(),
          notes: `Generated itinerary for ${formData.destinations.map((d: any) => d.city).join(', ')}`,
          markup_strategy: 'global'
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Convert itinerary items to quote_items
      const quoteItems = [];
      for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
        const day = days[dayIndex];
        for (const item of day.items) {
          quoteItems.push({
            quote_id: quote.id,
            item_type: item.type === 'activity' ? 'Tour' : 
                      item.type === 'hotel' ? 'Hotel' :
                      item.type === 'transfer' ? 'Transfer' : 'Tour',
            item_name: item.name,
            cost: item.cost || 0,
            quantity: 1,
            markup: 0,
            markup_type: 'percentage',
            details: {
              description: item.description,
              startTime: item.time,
              duration: item.duration,
              notes: item.notes,
              day_index: dayIndex,
              city: day.city,
              date: day.date
            }
          });
        }
      }

      if (quoteItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('quote_items')
          .insert(quoteItems);

        if (itemsError) throw itemsError;
      }

      // Navigate to the quote view
      navigate(`/quotes/${quote.id}/overview`);
    } catch (error) {
      console.error('Error saving itinerary:', error);
      alert('Failed to save itinerary. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const totalCost = calculateTotalCost();

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      {itinerary.summary && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trip Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Estimated Total Cost</p>
              <p className="text-2xl font-bold text-blue-600">${totalCost.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Hotels Recommended</p>
              <ul className="text-sm space-y-1">
                {itinerary.summary.hotelsNeeded.slice(0, 3).map((hotel, i) => (
                  <li key={i} className="text-gray-700">• {hotel}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Key Highlights</p>
              <ul className="text-sm space-y-1">
                {itinerary.summary.keyHighlights.slice(0, 3).map((highlight, i) => (
                  <li key={i} className="text-gray-700">• {highlight}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <button
            onClick={onEdit}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center"
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Edit Form
          </button>
        </div>
        <button
          onClick={saveAsQuote}
          disabled={isSaving}
          className={`px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg shadow-lg hover:from-green-700 hover:to-emerald-700 transition flex items-center ${
            isSaving ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save as Quote'}
        </button>
      </div>

      {/* Day-by-Day Itinerary */}
      <div className="space-y-4">
        {days.map((day, dayIndex) => (
          <div key={dayIndex} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Day Header */}
            <div 
              className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 cursor-pointer"
              onClick={() => toggleDayExpansion(dayIndex)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-gray-900">Day {day.dayNumber}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">{day.city}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  {day.dayTitle && (
                    <span className="text-sm text-gray-600 italic">{day.dayTitle}</span>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-600">
                    {day.items.length} activities
                  </span>
                  <span className="text-sm font-semibold text-green-600">
                    ${day.items.reduce((sum, item) => sum + (item.cost || 0), 0)}
                  </span>
                  {expandedDays.has(dayIndex) ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Day Items */}
            {expandedDays.has(dayIndex) && (
              <div className="p-6">
                <div className="space-y-3">
                  {day.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="group relative">
                      <div className={`flex items-start space-x-4 p-4 rounded-lg border ${getItemColor(item.type)} hover:shadow-sm transition`}>
                        {/* Drag Handle */}
                        <div className="opacity-0 group-hover:opacity-100 transition cursor-move">
                          <GripVertical className="h-5 w-5 text-gray-400" />
                        </div>

                        {/* Time */}
                        <div className="flex items-center space-x-1 min-w-[80px]">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">{item.time}</span>
                        </div>

                        {/* Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {getItemIcon(item.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          {editingItem?.dayIndex === dayIndex && editingItem?.itemIndex === itemIndex ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => updateItem(dayIndex, itemIndex, { name: e.target.value })}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                                autoFocus
                              />
                              <textarea
                                value={item.description || ''}
                                onChange={(e) => updateItem(dayIndex, itemIndex, { description: e.target.value })}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                rows={2}
                              />
                              <div className="flex space-x-2">
                                <input
                                  type="number"
                                  value={item.cost}
                                  onChange={(e) => updateItem(dayIndex, itemIndex, { cost: parseFloat(e.target.value) || 0 })}
                                  className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                  placeholder="Cost"
                                />
                                <button
                                  onClick={() => setEditingItem(null)}
                                  className="px-2 py-1 bg-blue-600 text-white rounded text-sm"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h4 className="font-medium text-gray-900">{item.name}</h4>
                              {item.description && (
                                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                              )}
                              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                {item.duration && (
                                  <span className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {item.duration}
                                  </span>
                                )}
                                {item.cost > 0 && (
                                  <span className="flex items-center font-medium text-green-600">
                                    <DollarSign className="h-3 w-3" />
                                    {item.cost}
                                  </span>
                                )}
                                {item.notes && (
                                  <span className="italic">{item.notes}</span>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                          {itemIndex > 0 && (
                            <button
                              onClick={() => moveItem(dayIndex, itemIndex, 'up')}
                              className="p-1 text-gray-500 hover:text-gray-700"
                              title="Move up"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                          )}
                          {itemIndex < day.items.length - 1 && (
                            <button
                              onClick={() => moveItem(dayIndex, itemIndex, 'down')}
                              className="p-1 text-gray-500 hover:text-gray-700"
                              title="Move down"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setEditingItem({ dayIndex, itemIndex })}
                            className="p-1 text-blue-500 hover:text-blue-700"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeItem(dayIndex, itemIndex)}
                            className="p-1 text-red-500 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Total Cost Footer */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Total Estimated Cost</p>
            <p className="text-3xl font-bold text-gray-900">${totalCost.toLocaleString()}</p>
          </div>
          <div className="text-sm text-gray-500">
            <p>{days.length} days</p>
            <p>{days.reduce((sum, day) => sum + day.items.length, 0)} total activities</p>
          </div>
        </div>
      </div>
    </div>
  );
}