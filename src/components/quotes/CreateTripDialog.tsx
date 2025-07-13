import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { X, Search, Plus, Calendar, Users, MapPin, Loader } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface CreateTripDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTripDialog({ isOpen, onClose }: CreateTripDialogProps) {
  const navigate = useNavigate();
  
  // Move useAuthContext to the top level of the component
  const { user } = useAuthContext();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [tripLength, setTripLength] = useState<number>(7);
  const [tripName, setTripName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Clear all form data for a fresh start
      setCustomers([]);
      setSearchTerm('');
      setSelectedCustomer(null);
      setTripLength(7);
      setTripName('');
      setIsCreating(false);
      setShowNewCustomerForm(false);
      setNewCustomer({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
      });
    }
  }, [isOpen]);

  // Search customers when search term changes
  useEffect(() => {
    if (searchTerm) {
      const searchCustomers = async () => {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
          .limit(5);
        
        if (data) {
          setCustomers(data);
        }
      };
      
      searchCustomers();
    } else {
      setCustomers([]);
    }
  }, [searchTerm]);

  // Generate default trip name based on customer and dates
  useEffect(() => {
    if (selectedCustomer) {
      const customerName = `${selectedCustomer.first_name || 'Unknown'} ${selectedCustomer.last_name || 'Customer'}`;
      const currentYear = new Date().getFullYear();
      setTripName(`${customerName} - ${tripLength} Day Trip ${currentYear}`);
    }
  }, [selectedCustomer, tripLength]);

  const handleCreateCustomer = async () => {
    try {
      // Use the user from the top-level hook call
      if (!user) {
        alert('User not authenticated');
        return;
      }

      const { data, error } = await supabase
        .from('customers')
        .insert([{
          ...newCustomer,
          agent_id: user.id // Add agent_id for RLS
        }])
        .select()
        .single();

      if (error) throw error;

      setSelectedCustomer(data);
      setShowNewCustomerForm(false);
      setNewCustomer({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
      });
    } catch (error: any) {
      console.error('Error creating customer:', error);
      alert('Error creating customer: ' + error.message);
    }
  };

  const handleCreateTrip = async () => {
    if (!selectedCustomer || !tripName || tripLength < 1) {
      alert('Please fill in all required fields');
      return;
    }

    // Use the user from the top-level hook call
    if (!user) {
      alert('User not authenticated');
      return;
    }

    setIsCreating(true);
    try {
      // Calculate trip dates based on trip length
      const today = new Date();
      const departureDate = today.toISOString().split('T')[0];
      const returnDate = new Date(today.getTime() + (tripLength - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Create a new quote/trip in the database
      const { data: quote, error } = await supabase
        .from('quotes')
        .insert([{
          customer_id: selectedCustomer.id,
          agent_id: user.id, // Add the missing agent_id field
          status: 'Draft',
          total_price: 0,
          markup: 0,
          discount: 0,
          trip_start_date: departureDate,
          trip_end_date: returnDate,
          notes: `Trip for ${selectedCustomer.first_name || 'Unknown'} ${selectedCustomer.last_name || 'Customer'} - ${tripLength} days`,
        }])
        .select()
        .single();

      if (error) throw error;

      // Navigate to TripOverview with the new quote/trip ID
      navigate(`/trips/${quote.id}?customer=${selectedCustomer.id}&length=${tripLength}&name=${encodeURIComponent(tripName)}`);
      onClose();
    } catch (error: any) {
      console.error('Error creating trip:', error);
      alert('Error creating trip: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-gray-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Create New Trip</h2>
              <p className="text-sm text-gray-600 mt-1">Set up basic trip information to get started</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg p-2 transition-all duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Customer *
            </label>
            
            {!selectedCustomer ? (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Search customers by name, email, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  </div>
                  <button
                    onClick={() => setShowNewCustomerForm(true)}
                    className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New
                  </button>
                </div>

                {customers.length > 0 && (
                  <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    {customers.filter(customer => customer && customer.id).map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => setSelectedCustomer(customer)}
                        className="w-full p-4 text-left border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-medium text-gray-900">
                          {customer.first_name || 'Unknown'} {customer.last_name || 'Customer'}
                        </div>
                        <div className="text-sm text-gray-600">{customer.email || 'No email'}</div>
                        <div className="text-sm text-gray-600">{customer.phone || 'No phone'}</div>
                      </button>
                    ))}
                  </div>
                )}

                {showNewCustomerForm && (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h3 className="font-medium mb-3">Create New Customer</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="First Name *"
                        value={newCustomer.first_name}
                        onChange={(e) => setNewCustomer({ ...newCustomer, first_name: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <input
                        type="text"
                        placeholder="Last Name *"
                        value={newCustomer.last_name}
                        onChange={(e) => setNewCustomer({ ...newCustomer, last_name: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <input
                        type="tel"
                        placeholder="Phone"
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleCreateCustomer}
                        disabled={!newCustomer.first_name || !newCustomer.last_name}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Create Customer
                      </button>
                      <button
                        onClick={() => setShowNewCustomerForm(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4 bg-green-50">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-gray-900">
                      {selectedCustomer.first_name} {selectedCustomer.last_name}
                    </div>
                    <div className="text-sm text-gray-600">{selectedCustomer.email}</div>
                    <div className="text-sm text-gray-600">{selectedCustomer.phone}</div>
                  </div>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Trip Length */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trip Length (Days) *
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="365"
                value={tripLength}
                onChange={(e) => setTripLength(parseInt(e.target.value) || 1)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Number of days for this trip (can be adjusted later)
            </p>
          </div>

          {/* Trip Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trip Name *
            </label>
            <input
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="Enter a name for this trip..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              A descriptive name to identify this trip
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateTrip}
            disabled={!selectedCustomer || !tripName || tripLength < 1 || isCreating}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
          >
            {isCreating ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Trip'
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 