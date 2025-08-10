import React, { useState } from 'react';
import { 
  X, 
  Plane, 
  Hotel, 
  MapPin, 
  Car, 
  Clock, 
  DollarSign,
  Calendar,
  FileText,
  Search
} from 'lucide-react';
import { ItineraryItem } from './types';

interface AddActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddActivity: (activity: Omit<ItineraryItem, 'id'>) => void;
  dayId: string | null;
  onOpenAdvancedSearch?: (type: ActivityType) => void;
}

type ActivityType = 'Flight' | 'Hotel' | 'Tour' | 'Transfer';

interface ActivityTemplate {
  type: ActivityType;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
  defaultName: string;
}

const ACTIVITY_TEMPLATES: ActivityTemplate[] = [
  {
    type: 'Flight',
    icon: <Plane className="h-6 w-6" />,
    label: 'Flight',
    description: 'Domestic or international flights',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    defaultName: 'Flight'
  },
  {
    type: 'Hotel',
    icon: <Hotel className="h-6 w-6" />,
    label: 'Accommodation',
    description: 'Hotels, resorts, or other stays',
    color: 'text-green-600 bg-green-50 border-green-200',
    defaultName: 'Hotel Stay'
  },
  {
    type: 'Tour',
    icon: <MapPin className="h-6 w-6" />,
    label: 'Activity/Tour',
    description: 'Sightseeing, excursions, or experiences',
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    defaultName: 'Tour/Activity'
  },
  {
    type: 'Transfer',
    icon: <Car className="h-6 w-6" />,
    label: 'Transfer',
    description: 'Transportation between locations',
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    defaultName: 'Transfer'
  }
];

export function AddActivityModal({ isOpen, onClose, onAddActivity, dayId, onOpenAdvancedSearch }: AddActivityModalProps) {
  const [selectedType, setSelectedType] = useState<ActivityType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startTime: '',
    endTime: '',
    cost: '',
    location: ''
  });

  const resetForm = () => {
    setSelectedType(null);
    setFormData({
      name: '',
      description: '',
      startTime: '',
      endTime: '',
      cost: '',
      location: ''
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTypeSelect = (type: ActivityType) => {
    const template = ACTIVITY_TEMPLATES.find(t => t.type === type);
    setSelectedType(type);
    setFormData(prev => ({
      ...prev,
      name: template?.defaultName || ''
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedType || !formData.name.trim()) {
      return;
    }

    const activity: Omit<ItineraryItem, 'id'> = {
      type: selectedType,
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      startTime: formData.startTime || undefined,
      endTime: formData.endTime || undefined,
      cost: formData.cost ? parseFloat(formData.cost) : 0,
      markup: 0,
      markup_type: 'percentage',
      details: {
        location: formData.location.trim() || undefined,
        isBooked: false
      }
    };

    onAddActivity(activity);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-gray-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add Activity</h2>
              <p className="text-sm text-gray-600 mt-1">Choose an activity type and fill in the details</p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg p-2 transition-all duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {!selectedType ? (
            /* Activity Type Selection */
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">What type of activity?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ACTIVITY_TEMPLATES.map((template) => (
                  <button
                    key={template.type}
                    onClick={() => handleTypeSelect(template.type)}
                    className={`p-4 rounded-xl border-2 ${template.color} hover:shadow-md transition-all duration-200 text-left group`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-2 rounded-lg bg-white">
                        {template.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 group-hover:text-current">
                          {template.label}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Activity Details Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Selected Type Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${ACTIVITY_TEMPLATES.find(t => t.type === selectedType)?.color}`}>
                    {ACTIVITY_TEMPLATES.find(t => t.type === selectedType)?.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {ACTIVITY_TEMPLATES.find(t => t.type === selectedType)?.label}
                    </h3>
                    <p className="text-sm text-gray-600">Fill in the activity details</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedType(null)}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Change Type
                </button>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Activity Name */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="h-4 w-4 inline mr-1" />
                    Activity Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter activity name"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    rows={2}
                    placeholder="Optional description or notes"
                  />
                </div>

                {/* Start Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* End Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="h-4 w-4 inline mr-1" />
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Cost */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="h-4 w-4 inline mr-1" />
                    Cost
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter location"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-3">
                  {onOpenAdvancedSearch && (selectedType === 'Flight' || selectedType === 'Hotel') && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenAdvancedSearch(selectedType);
                        handleClose();
                      }}
                      className="inline-flex items-center px-3 py-2 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors duration-200"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Advanced Search
                    </button>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.name.trim()}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    Add Activity
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}