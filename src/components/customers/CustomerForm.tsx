import React, { useState } from 'react';
import { User, Mail, Phone, Globe, Calendar, FileText, Save, X } from 'lucide-react';

interface CustomerFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  passport_number: string;
  passport_expiry: string;
  nationality: string;
  date_of_birth: string;
}

interface CustomerFormProps {
  initialData?: Partial<CustomerFormData>;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isEditing?: boolean;
}

export function CustomerForm({ 
  initialData = {}, 
  onSubmit, 
  onCancel, 
  isLoading = false,
  isEditing = false 
}: CustomerFormProps) {
  const [formData, setFormData] = useState<CustomerFormData>({
    first_name: initialData.first_name || '',
    last_name: initialData.last_name || '',
    email: initialData.email || '',
    phone: initialData.phone || '',
    passport_number: initialData.passport_number || '',
    passport_expiry: initialData.passport_expiry || '',
    nationality: initialData.nationality || '',
    date_of_birth: initialData.date_of_birth || '',
  });

  const [errors, setErrors] = useState<Partial<CustomerFormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<CustomerFormData> = {};

    // Required field validation
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    // Date validation
    if (formData.date_of_birth) {
      const birthDate = new Date(formData.date_of_birth);
      const today = new Date();
      if (birthDate > today) {
        newErrors.date_of_birth = 'Birth date cannot be in the future';
      }
    }

    // Passport expiry validation
    if (formData.passport_expiry) {
      const expiryDate = new Date(formData.passport_expiry);
      const today = new Date();
      if (expiryDate < today) {
        newErrors.passport_expiry = 'Passport has expired';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleInputChange = (field: keyof CustomerFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="h-4 w-4 inline mr-1" />
            First Name *
          </label>
          <input
            type="text"
            value={formData.first_name}
            onChange={(e) => handleInputChange('first_name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
              errors.first_name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter first name"
            disabled={isLoading}
          />
          {errors.first_name && (
            <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="h-4 w-4 inline mr-1" />
            Last Name *
          </label>
          <input
            type="text"
            value={formData.last_name}
            onChange={(e) => handleInputChange('last_name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
              errors.last_name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter last name"
            disabled={isLoading}
          />
          {errors.last_name && (
            <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
          )}
        </div>
      </div>

      {/* Contact Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Mail className="h-4 w-4 inline mr-1" />
            Email Address *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter email address"
            disabled={isLoading}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Phone className="h-4 w-4 inline mr-1" />
            Phone Number *
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
              errors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter phone number"
            disabled={isLoading}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
          )}
        </div>
      </div>

      {/* Personal Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="h-4 w-4 inline mr-1" />
            Date of Birth
          </label>
          <input
            type="date"
            value={formData.date_of_birth}
            onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
              errors.date_of_birth ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isLoading}
          />
          {errors.date_of_birth && (
            <p className="mt-1 text-sm text-red-600">{errors.date_of_birth}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Globe className="h-4 w-4 inline mr-1" />
            Nationality
          </label>
          <input
            type="text"
            value={formData.nationality}
            onChange={(e) => handleInputChange('nationality', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder="Enter nationality"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Passport Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FileText className="h-4 w-4 inline mr-1" />
            Passport Number
          </label>
          <input
            type="text"
            value={formData.passport_number}
            onChange={(e) => handleInputChange('passport_number', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder="Enter passport number"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="h-4 w-4 inline mr-1" />
            Passport Expiry Date
          </label>
          <input
            type="date"
            value={formData.passport_expiry}
            onChange={(e) => handleInputChange('passport_expiry', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
              errors.passport_expiry ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isLoading}
          />
          {errors.passport_expiry && (
            <p className="mt-1 text-sm text-red-600">{errors.passport_expiry}</p>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
        >
          <X className="h-4 w-4 inline mr-2" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {isEditing ? 'Updating...' : 'Creating...'}
            </div>
          ) : (
            <>
              <Save className="h-4 w-4 inline mr-2" />
              {isEditing ? 'Update Customer' : 'Create Customer'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}