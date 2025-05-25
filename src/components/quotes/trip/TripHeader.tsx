import React, { useState, useEffect } from 'react';
import { Edit3, Eye, Send, Users, Calendar, Check, X } from 'lucide-react';

interface TripHeaderProps {
  trip: {
    id: string;
    name: string;
    status: string;
    type: string;
    startDate: string;
    endDate: string;
    customer?: {
      first_name: string;
      last_name: string;
      email: string;
    };
  };
  isEditingName: boolean;
  setIsEditingName: (editing: boolean) => void;
  onTripUpdate: (updates: any) => void;
  onTripDatesUpdate?: (startDate: string, endDate: string) => void;
  activeSection: string;
}

export function TripHeader({ 
  trip, 
  isEditingName, 
  setIsEditingName, 
  onTripUpdate, 
  onTripDatesUpdate,
  activeSection
}: TripHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState({
    name: trip.name,
    startDate: trip.startDate,
    endDate: trip.endDate
  });

  // Sync editing data when trip data changes
  useEffect(() => {
    setEditingData({
      name: trip.name,
      startDate: trip.startDate,
      endDate: trip.endDate
    });
  }, [trip.name, trip.startDate, trip.endDate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planning': return 'bg-blue-100 text-blue-800';
      case 'Confirmed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-gray-100 text-gray-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDayCount = () => {
    if (trip.startDate && trip.endDate) {
      return Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    return 0;
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditingData({
      name: trip.name,
      startDate: trip.startDate,
      endDate: trip.endDate
    });
  };

  const handleSaveEdit = () => {
    onTripUpdate({ name: editingData.name });
    if (onTripDatesUpdate && editingData.startDate && editingData.endDate) {
      onTripDatesUpdate(editingData.startDate, editingData.endDate);
    }
    setIsEditing(false);
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setIsEditingName(false);
    setEditingData({
      name: trip.name,
      startDate: trip.startDate,
      endDate: trip.endDate
    });
  };

  return (
    <div className="sticky top-16 z-40 bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {isEditing ? (
            /* Editing Mode */
            <div className="flex items-center space-x-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex flex-col space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Trip Name</label>
                  <input
                    type="text"
                    value={editingData.name}
                    onChange={(e) => setEditingData(prev => ({ ...prev, name: e.target.value }))}
                    className="text-lg font-semibold bg-white border border-gray-300 rounded px-3 py-1 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter trip name"
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={editingData.startDate}
                      onChange={(e) => setEditingData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={editingData.endDate}
                      onChange={(e) => setEditingData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  {editingData.startDate && editingData.endDate && (
                    <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {Math.ceil((new Date(editingData.endDate).getTime() - new Date(editingData.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col space-y-2 ml-4">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 flex items-center"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Display Mode */
            <>
              <div className="cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors" onClick={handleStartEdit}>
                <h1 className="text-xl font-semibold text-gray-900 hover:text-indigo-600 flex items-center">
                  {trip.name}
                  <Edit3 className="inline h-4 w-4 ml-2 opacity-50" />
                </h1>
                {activeSection === 'itinerary' && trip.startDate && trip.endDate && (
                  <div className="flex items-center space-x-2 mt-1">
                    <Calendar className="h-3 w-3 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {getDayCount()} days
                    </span>
                  </div>
                )}
              </div>
              
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(trip.status)}`}>
                {trip.status}
              </span>
              
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                {trip.type}
              </span>

              {/* Customer Info in Header for Itinerary View */}
              {activeSection === 'itinerary' && trip.customer && (
                <div className="flex items-center space-x-2 ml-6 pl-6 border-l border-gray-200">
                  <Users className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {trip.customer.first_name} {trip.customer.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{trip.customer.email}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        {!isEditing && (
          <div className="flex items-center space-x-3">
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </button>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center">
              <Send className="h-4 w-4 mr-2" />
              Publish
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 