import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, CheckCircle, AlertCircle } from 'lucide-react';
import { CustomerForm } from './CustomerForm';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';

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

export function NewCustomer() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleSubmit = async (formData: CustomerFormData) => {
    setIsLoading(true);
    setFeedback(null);

    try {
      // Check if user is authenticated
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check for duplicate email
      const { data: existingCustomers, error: checkError } = await supabase
        .from('customers')
        .select('id, email')
        .eq('email', formData.email.toLowerCase().trim());

      if (checkError) {
        throw new Error(`Failed to check for existing customer: ${checkError.message}`);
      }

      if (existingCustomers && existingCustomers.length > 0) {
        setFeedback({
          type: 'error',
          message: 'A customer with this email address already exists.'
        });
        setIsLoading(false);
        return;
      }

      // Create new customer with agent_id
      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert([{
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.toLowerCase().trim(),
          phone: formData.phone.trim(),
          passport_number: formData.passport_number.trim() || null,
          passport_expiry: formData.passport_expiry || null,
          nationality: formData.nationality.trim() || null,
          date_of_birth: formData.date_of_birth || null,
          agent_id: user.id, // Add agent_id for RLS
        }])
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create customer: ${insertError.message}`);
      }

      // Show success message
      setFeedback({
        type: 'success',
        message: `Customer ${formData.first_name} ${formData.last_name} has been created successfully!`
      });

      // Navigate to customer profile after a brief delay
      setTimeout(() => {
        navigate(`/customers/${newCustomer.id}`);
      }, 2000);

    } catch (error) {
      console.error('Error creating customer:', error);
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred while creating the customer.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/customers');
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => navigate('/customers')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Back to Customers
          </button>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <UserPlus className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Add New Customer</h1>
              <p className="text-gray-600 text-base sm:text-lg">Create a new customer profile with their travel details</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Messages */}
      {feedback && (
        <div className={`mb-6 rounded-lg p-4 ${
          feedback.type === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center">
            {feedback.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            )}
            <p className={`text-sm font-medium ${
              feedback.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {feedback.message}
            </p>
          </div>
        </div>
      )}

      {/* Customer Form */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Customer Information</h2>
          <p className="text-gray-600">Please fill in the customer's details. Fields marked with * are required.</p>
        </div>

        <CustomerForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
          isEditing={false}
        />
      </div>

      {/* Help Text */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="h-5 w-5 text-blue-600 mt-0.5">ℹ️</div>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Tips for adding customers</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Ensure the email address is unique and valid for communication</li>
                <li>Passport information is optional but helpful for international travel quotes</li>
                <li>Phone numbers should include country codes for international customers</li>
                <li>Customer profiles can be edited later from the customer details page</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}