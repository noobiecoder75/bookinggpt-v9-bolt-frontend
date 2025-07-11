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
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-teal-500 rounded-xl flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Bookings</h3>
          </div>
          <button 
            onClick={onCreateItinerary}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
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
              className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
            >
              Create Booking
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-4 border border-blue-100 rounded-xl bg-gradient-to-r from-white to-blue-50 hover:shadow-md transition-all duration-200">
                <div>
                  <h4 className="font-medium text-gray-900">{booking.name}</h4>
                  <p className="text-sm text-gray-500">{booking.type} • {booking.date}</p>
                </div>
                <span className="px-3 py-1 bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 rounded-full text-xs font-medium">
                  {booking.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Activity Card */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Upcoming Activity</h3>
        </div>
        <div className="space-y-3">
          {upcomingActivity.map((item) => (
            <div key={item.id} className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-100 to-teal-100 rounded-xl flex items-center justify-center text-blue-600 shadow-md">
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
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-slate-500 to-gray-600 rounded-xl flex items-center justify-center">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Past Activity</h3>
        </div>
        <div className="space-y-3">
          {pastActivity.map((item) => (
            <div key={item.id} className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-gray-100 to-slate-100 rounded-xl flex items-center justify-center text-gray-600 shadow-md">
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