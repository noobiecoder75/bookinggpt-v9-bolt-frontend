import React from 'react';
import { FileText, Plus, Calendar } from 'lucide-react';

interface Booking {
  id: string;
  type: string;
  name: string;
  date: string;
  status: string;
}

interface ActivityItem {
  id: string;
  type: 'milestone' | 'activity';
  title: string;
  date: string;
  icon: React.ReactNode;
  user?: string;
}

interface TripOverviewSectionProps {
  bookings: Booking[];
  upcomingActivity: ActivityItem[];
  pastActivity: ActivityItem[];
  onCreateItinerary: () => void;
}

export function TripOverviewSection({ 
  bookings, 
  upcomingActivity, 
  pastActivity, 
  onCreateItinerary 
}: TripOverviewSectionProps) {
  return (
    <>
      {/* Bookings Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Bookings</h3>
          <button 
            onClick={onCreateItinerary}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            Add Booking
          </button>
        </div>
        
        {bookings.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h4 className="mt-2 text-sm font-medium text-gray-900">No bookings found</h4>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first booking.</p>
            <button 
              onClick={onCreateItinerary}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create Booking
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{booking.name}</h4>
                  <p className="text-sm text-gray-500">{booking.type} • {booking.date}</p>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  {booking.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Activity Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Upcoming Activity</h3>
        <div className="space-y-3">
          {upcomingActivity.map((item) => (
            <div key={item.id} className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                {item.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                <p className="text-sm text-gray-500">{item.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Past Activity Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Past Activity</h3>
        <div className="space-y-3">
          {pastActivity.map((item) => (
            <div key={item.id} className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
                {item.icon}
              </div>
              <div>
                <p className="text-sm text-gray-900">
                  {item.title} {item.user && <span className="font-medium">by {item.user}</span>}
                </p>
                <p className="text-sm text-gray-500">{item.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
} 