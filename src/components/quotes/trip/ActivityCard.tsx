import React from 'react';
import { 
  Plane, 
  Hotel, 
  MapPin, 
  Car, 
  Clock, 
  DollarSign, 
  Trash2,
  CheckCircle,
  Circle
} from 'lucide-react';
import { ItineraryItem } from './types';

interface ActivityCardProps {
  activity: ItineraryItem;
  activityIndex: number;
  onRemove: () => void;
}

export function ActivityCard({ activity, activityIndex, onRemove }: ActivityCardProps) {
  // Get appropriate icon for activity type
  const getActivityIcon = () => {
    switch (activity.type) {
      case 'Flight':
        return <Plane className="h-5 w-5" />;
      case 'Hotel':
        return <Hotel className="h-5 w-5" />;
      case 'Tour':
        return <MapPin className="h-5 w-5" />;
      case 'Transfer':
        return <Car className="h-5 w-5" />;
      default:
        return <Circle className="h-5 w-5" />;
    }
  };

  // Get color scheme for activity type
  const getActivityColors = () => {
    switch (activity.type) {
      case 'Flight':
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
          icon: 'text-blue-600'
        };
      case 'Hotel':
        return {
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200',
          icon: 'text-green-600'
        };
      case 'Tour':
        return {
          bg: 'bg-purple-50',
          text: 'text-purple-700',
          border: 'border-purple-200',
          icon: 'text-purple-600'
        };
      case 'Transfer':
        return {
          bg: 'bg-orange-50',
          text: 'text-orange-700',
          border: 'border-orange-200',
          icon: 'text-orange-600'
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          border: 'border-gray-200',
          icon: 'text-gray-600'
        };
    }
  };

  const colors = getActivityColors();
  
  // Format time if available
  const formatTime = (time?: string) => {
    if (!time) return null;
    try {
      // Handle both full datetime and time-only formats
      if (time.includes('T') || time.includes(' ')) {
        return new Date(time).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
      } else {
        // Assume it's just a time string like "09:00"
        const [hours, minutes] = time.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return date.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
      }
    } catch {
      return time; // Return as-is if parsing fails
    }
  };

  const startTime = formatTime(activity.startTime);
  const endTime = formatTime(activity.endTime);
  const hasTimeRange = startTime && endTime && startTime !== endTime;

  // Check if this activity is "booked" based on details
  const isBooked = activity.details?.isBooked || activity.details?.status === 'booked';

  return (
    <div className={`relative group rounded-xl border-2 ${colors.border} ${colors.bg} p-4 hover:shadow-sm transition-all duration-200`}>
      {/* Activity Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {/* Activity Icon */}
          <div className={`p-2 rounded-lg bg-white ${colors.icon} flex-shrink-0`}>
            {getActivityIcon()}
          </div>
          
          {/* Activity Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className={`font-semibold ${colors.text} truncate`}>
                  {activity.name}
                </h4>
                {activity.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {activity.description}
                  </p>
                )}
              </div>
              
              {/* Booking Status */}
              <div className="flex items-center space-x-2 ml-3">
                {isBooked ? (
                  <div className="flex items-center space-x-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">Booked</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-gray-400">
                    <Circle className="h-4 w-4" />
                    <span className="text-xs">Planned</span>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Metadata */}
            <div className="flex items-center space-x-4 mt-2">
              {/* Time Range */}
              {(startTime || endTime) && (
                <div className="flex items-center space-x-1 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>
                    {hasTimeRange ? `${startTime} - ${endTime}` : startTime || endTime}
                  </span>
                </div>
              )}

              {/* Cost */}
              {activity.cost > 0 && (
                <div className="flex items-center space-x-1 text-sm text-gray-600">
                  <DollarSign className="h-4 w-4" />
                  <span>${activity.cost.toLocaleString()}</span>
                </div>
              )}

              {/* Activity Type Badge */}
              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${colors.bg} ${colors.text}`}>
                {activity.type}
              </span>
            </div>

            {/* Special Details for Different Activity Types */}
            {activity.type === 'Hotel' && activity.details?.nights && (
              <div className="mt-2 text-sm text-gray-600">
                <span className="font-medium">{activity.details.nights} nights</span>
                {activity.details.checkInDate && activity.details.checkOutDate && (
                  <span className="ml-2">
                    ({new Date(activity.details.checkInDate).toLocaleDateString()} - {new Date(activity.details.checkOutDate).toLocaleDateString()})
                  </span>
                )}
              </div>
            )}

            {activity.type === 'Flight' && activity.details?.flightDirection && (
              <div className="mt-2 text-sm text-gray-600">
                <span className="font-medium capitalize">{activity.details.flightDirection} flight</span>
                {activity.details.departureTime && (
                  <span className="ml-2">
                    Departure: {formatTime(activity.details.departureTime)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Remove Button */}
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 text-red-500 hover:bg-red-50 rounded-lg ml-2"
          title="Remove activity"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Drag Handle (for future drag & drop) */}
      <div className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-30 transition-opacity duration-200">
        <div className="w-1 h-6 bg-gray-400 rounded-full"></div>
      </div>
    </div>
  );
}