import React, { useState, useEffect } from 'react';
import { X, Search, MapPin, Loader, AlertCircle, Clock, Users } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getDefaultMarkupForNewItem } from '../../../utils/markupUtils';

interface ActivitySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivitySelect: (activity: any) => void;
  selectedDay: string;
}

interface ActivityRate {
  id: number;
  rate_type: string;
  description: string;
  cost: number;
  currency: string;
  valid_start: string;
  valid_end: string;
  details?: {
    imported_from?: string;
    imported_at?: string;
    extraction_method?: string;
    duration?: string;
    max_participants?: number;
    includes?: string[];
    location?: string;
    difficulty?: string;
    category?: string;
  };
}

export function ActivitySearchModal({ 
  isOpen, 
  onClose, 
  onActivitySelect, 
  selectedDay 
}: ActivitySearchModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<ActivityRate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (isOpen) {
      fetchActivities();
    }
  }, [isOpen]);

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('rates')
        .select('*')
        .eq('rate_type', 'Tour')
        .order('description', { ascending: true });

      if (error) throw error;
      setActivities(data || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories from activities
  const categories = ['all', ...new Set(activities.map(activity => 
    activity.details?.category || 'Other'
  ))];

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (activity.details?.location && activity.details.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (activity.details?.imported_from && activity.details.imported_from.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || 
      (activity.details?.category || 'Other') === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleActivitySelect = async (activity: ActivityRate) => {
    // Get default markup for activities (Tour type)
    const defaultMarkup = await getDefaultMarkupForNewItem('Tour');
    
    const activityItem = {
      id: activity.id,
      name: activity.description,
      cost: activity.cost,
      markup: defaultMarkup.markup,
      markup_type: defaultMarkup.markup_type,
      details: {
        description: activity.description,
        currency: activity.currency,
        validStart: activity.valid_start,
        validEnd: activity.valid_end,
        selectedDay,
        ...activity.details
      }
    };
    onActivitySelect(activityItem);
    onClose();
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Select Tour/Activity</h2>
              <p className="text-sm text-gray-600 mt-1">
                Choose from your uploaded tour and activity rates for {selectedDay}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg p-2 transition-all duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search activities by name, location, or source..."
                className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white shadow-sm transition-all duration-200"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white shadow-sm"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="px-4 py-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-8 w-8 animate-spin text-purple-600" />
              <p className="ml-3 text-gray-600">Loading activities...</p>
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No activities found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Try adjusting your search or filter.' 
                  : 'Upload tour rates to see them here.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="border rounded-lg overflow-hidden hover:border-purple-500 transition-colors p-4 bg-white shadow-sm"
                >
                  <div className="flex flex-col h-full">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {activity.description}
                      </h3>
                      
                      <div className="flex items-center space-x-2 mb-3 flex-wrap gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {activity.rate_type}
                        </span>
                        {activity.details?.category && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {activity.details.category}
                          </span>
                        )}
                        {activity.details?.difficulty && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(activity.details.difficulty)}`}>
                            {activity.details.difficulty}
                          </span>
                        )}
                        {activity.details?.imported_from && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            AI Imported
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        {activity.details?.location && (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                            {activity.details.location}
                          </div>
                        )}
                        {activity.details?.duration && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-gray-400" />
                            {activity.details.duration}
                          </div>
                        )}
                        {activity.details?.max_participants && (
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-2 text-gray-400" />
                            Max {activity.details.max_participants} participants
                          </div>
                        )}
                      </div>

                      {activity.details?.includes && activity.details.includes.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-gray-700 mb-1">Includes:</p>
                          <div className="flex flex-wrap gap-1">
                            {activity.details.includes.map((item, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {activity.valid_start && activity.valid_end && (
                        <p className="text-sm text-gray-500 mt-3">
                          Valid: {new Date(activity.valid_start).toLocaleDateString()} - {new Date(activity.valid_end).toLocaleDateString()}
                        </p>
                      )}

                      {activity.details?.imported_from && (
                        <p className="text-xs text-gray-400 mt-2">
                          Source: {activity.details.imported_from}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
                      <div>
                        <p className="text-xl font-bold text-gray-900">
                          {activity.currency} {activity.cost.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">per person</p>
                      </div>
                      <button
                        onClick={() => handleActivitySelect(activity)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                      >
                        Add to Itinerary
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500">
            Showing {filteredActivities.length} of {activities.length} activities
            {selectedCategory !== 'all' && ` in ${selectedCategory}`}
          </p>
        </div>
      </div>
    </div>
  );
} 