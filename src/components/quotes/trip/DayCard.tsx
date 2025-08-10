import React from 'react';
import { ChevronDown, ChevronRight, Plus, Calendar, MapPin } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { ActivityCard } from './ActivityCard';
import { DayPlan } from './types';

interface DayCardProps {
  day: DayPlan;
  dayNumber: number;
  tripStartDate: string;
  isExpanded: boolean;
  onToggleExpansion: () => void;
  onAddActivity: () => void;
  onRemoveActivity: (itemId: string) => void;
  onReorderActivities: (fromIndex: number, toIndex: number) => void;
}

export function DayCard({ 
  day, 
  dayNumber, 
  tripStartDate, 
  isExpanded, 
  onToggleExpansion,
  onAddActivity,
  onRemoveActivity,
  onReorderActivities 
}: DayCardProps) {
  // Calculate the actual date for this day
  const getDayDate = () => {
    if (!tripStartDate) return null;
    const startDate = new Date(tripStartDate + 'T00:00:00');
    const dayDate = new Date(startDate.getTime() + (dayNumber - 1) * 24 * 60 * 60 * 1000);
    return dayDate;
  };

  const dayDate = getDayDate();
  const dayName = dayDate?.toLocaleDateString('en-US', { weekday: 'long' });
  const dayDateFormatted = dayDate?.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });

  const activityCount = day.items.length;
  const hasActivities = activityCount > 0;

  // Handle drag and drop reordering
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const fromIndex = result.source.index;
    const toIndex = result.destination.index;
    
    if (fromIndex !== toIndex) {
      onReorderActivities(fromIndex, toIndex);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200 group">
      {/* Day Header - Always Visible */}
      <div 
        className="px-6 py-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
        onClick={onToggleExpansion}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-400" />
              )}
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl flex items-center justify-center">
                <span className="text-sm font-bold text-indigo-600">{dayNumber}</span>
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Day {dayNumber}
                </h3>
                {dayName && (
                  <span className="text-sm text-gray-600 font-medium">
                    {dayName}
                  </span>
                )}
              </div>
              {dayDateFormatted && (
                <div className="flex items-center space-x-1 mt-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">{dayDateFormatted}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Activity Count Badge */}
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              hasActivities 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {activityCount} {activityCount === 1 ? 'activity' : 'activities'}
            </div>

            {/* Quick Add Button - Visible on Hover */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddActivity();
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
              title="Add activity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-6 py-4">
          {hasActivities ? (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId={`day-${day.id}`}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-3 transition-colors duration-200 ${
                      snapshot.isDraggingOver ? 'bg-indigo-50/50 rounded-lg p-2' : ''
                    }`}
                  >
                    {day.items.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`transition-all duration-200 ${
                              snapshot.isDragging ? 'rotate-2 shadow-lg' : ''
                            }`}
                          >
                            <ActivityCard
                              activity={item}
                              activityIndex={index}
                              onRemove={() => onRemoveActivity(item.id)}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-gray-400" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No activities yet</h4>
              <p className="text-gray-600 mb-4">Add your first activity to start planning this day</p>
              <button
                onClick={onAddActivity}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
              >
                <Plus className="h-4 w-4" />
                <span>Add Activity</span>
              </button>
            </div>
          )}

          {/* Add Activity Button - Always Visible When Expanded */}
          {hasActivities && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={onAddActivity}
                className="w-full flex items-center justify-center space-x-2 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-200 text-gray-600 hover:text-indigo-600"
              >
                <Plus className="h-5 w-5" />
                <span className="font-medium">Add Another Activity</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}