import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  MapPin, 
  DollarSign, 
  Users, 
  Plane, 
  Hotel, 
  Car, 
  Activity,
  CheckCircle,
  Clock,
  ArrowRight,
  Plus,
  FileText,
  Share,
  Loader,
  AlertCircle
} from 'lucide-react';
import { useTripData } from '../../../hooks/useTripData';

export function TripOverviewShell() {
  const navigate = useNavigate();
  const { trip, days, loading, error, stats } = useTripData();

  // Loading and error states
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading trip overview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-red-600">Error loading trip: {error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!trip) {
    return null;
  }

  const customerName = trip.customer ? `${trip.customer.first_name} ${trip.customer.last_name}` : 'Unknown Customer';

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'Flight': return <Plane className="h-4 w-4" />;
      case 'Hotel': return <Hotel className="h-4 w-4" />;
      case 'Transfer': return <Car className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planning': return 'bg-yellow-100 text-yellow-800';
      case 'Confirmed': return 'bg-green-100 text-green-800';
      case 'Complete': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Trip Hero Section */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-2xl flex items-center justify-center">
                  <MapPin className="h-8 w-8 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {trip.name}
                  </h1>
                  <div className="flex items-center space-x-6 text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">Customer: {customerName}</span>
                    </div>
                    {trip.startDate && trip.endDate && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">
                          {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(trip.status)}`}>
                {trip.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Days Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Trip Duration</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.totalDays} {stats.totalDays === 1 ? 'Day' : 'Days'}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${Math.min(100, (stats.totalDays / 14) * 100)}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Trip length</p>
            </div>
          </div>

          {/* Activities Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Activities</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.activitiesCount}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center space-x-1">
                {Object.entries(stats.activityBreakdown).map(([type, count], index) => (
                  <div key={type} className="flex items-center space-x-1 text-xs text-gray-600">
                    {getActivityIcon(type)}
                    <span>{count}</span>
                    {index < Object.entries(stats.activityBreakdown).length - 1 && <span className="mx-1">•</span>}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Planned activities</p>
            </div>
          </div>

          {/* Budget Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Budget</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ${stats.totalPrice.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-gray-500">
                {trip.markup_strategy} markup strategy
              </p>
            </div>
          </div>

          {/* Progress Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Progress</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.completionPercentage}%
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{ width: `${stats.completionPercentage}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Days with activities</p>
            </div>
          </div>
        </div>

        {/* Quick Activity Summary */}
        {stats.activitiesCount > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(stats.activityBreakdown).map(([type, count]) => (
                <div key={type} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    {getActivityIcon(type)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{count} {type}s</p>
                    <p className="text-sm text-gray-500">
                      {count === 1 ? '1 item planned' : `${count} items planned`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => {
                // Navigate to planner using the same route pattern (quotes or trips)
                const currentPath = window.location.pathname;
                if (currentPath.includes('/quotes/')) {
                  navigate(`/quotes/${trip.id}/planner`);
                } else {
                  navigate(`/trips/${trip.id}/planner`);
                }
              }}
              className="flex-1 flex items-center justify-center px-6 py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <Clock className="h-5 w-5 mr-2" />
              Build Detailed Itinerary
              <ArrowRight className="h-5 w-5 ml-2" />
            </button>
            
            <button
              onClick={() => {/* TODO: Generate quote functionality */}}
              className="flex-1 flex items-center justify-center px-6 py-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              <FileText className="h-5 w-5 mr-2" />
              Generate Quote
            </button>
            
            <button
              onClick={() => {/* TODO: Share trip functionality */}}
              className="flex-1 flex items-center justify-center px-6 py-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              <Share className="h-5 w-5 mr-2" />
              Share Trip
            </button>
          </div>
          
          {stats.activitiesCount === 0 && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm">
                <Plus className="h-4 w-4 mr-2" />
                Start by building your itinerary to add flights, hotels, and activities
              </div>
            </div>
          )}
        </div>
        
        {/* Empty State Helper */}
        {days.length === 0 && (
          <div className="text-center py-12 mt-8">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to start planning?</h3>
            <p className="text-gray-600 mb-6">Set your trip dates and begin adding activities to create the perfect itinerary.</p>
            <button
              onClick={() => {
                // Navigate to planner using the same route pattern (quotes or trips)
                const currentPath = window.location.pathname;
                if (currentPath.includes('/quotes/')) {
                  navigate(`/quotes/${trip.id}/planner`);
                } else {
                  navigate(`/trips/${trip.id}/planner`);
                }
              }}
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <Plus className="h-5 w-5 mr-2" />
              Start Planning
            </button>
          </div>
        )}
      </div>
    </div>
  );
}