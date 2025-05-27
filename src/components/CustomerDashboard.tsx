import React, { useState, useEffect } from 'react';
import { Search, Plus, FileText, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  passport_number: string;
  passport_expiry: string;
  nationality: string;
  date_of_birth: string;
}

interface CustomerStats {
  lifetimeValue: number;
  potentialValue: number;
  totalBookings: number;
  activeQuotes: number;
}

export function CustomerDashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [customerStats, setCustomerStats] = useState<Record<number, CustomerStats>>({});
  const navigate = useNavigate();

  console.log('CustomerDashboard rendered', { searchTerm, loading, customersCount: customers.length });

  useEffect(() => {
    console.log('Initial fetch starting');
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    try {
      console.log('Fetching customers with search term:', searchTerm);
      let query = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(
          `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      console.log('Customers fetched successfully:', { count: data?.length });

      setCustomers(data || []);
      fetchCustomerStats(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setLoading(false);
    }
  }

  async function fetchCustomerStats(customers: Customer[]) {
    const stats: Record<number, CustomerStats> = {};

    console.log('Fetching stats for customers:', customers.length);

    await Promise.all(
      customers.map(async (customer) => {
        const [bookingsResponse, quotesResponse] = await Promise.all([
          supabase
            .from('bookings')
            .select('total_price, status')
            .eq('customer_id', customer.id),
          supabase
            .from('quotes')
            .select('total_price, status')
            .eq('customer_id', customer.id)
            .eq('status', 'Sent'),
        ]);

        const bookings = bookingsResponse.data || [];
        const quotes = quotesResponse.data || [];

        console.log(`Stats for customer ${customer.id}:`, { bookingsCount: bookings.length, quotesCount: quotes.length });

        stats[customer.id] = {
          lifetimeValue: bookings
            .filter((b) => b.status === 'Completed')
            .reduce((sum, b) => sum + Number(b.total_price), 0),
          potentialValue: quotes.reduce((sum, q) => sum + Number(q.total_price), 0),
          totalBookings: bookings.length,
          activeQuotes: quotes.length,
        };
      })
    );

    console.log('All customer stats fetched:', Object.keys(stats).length);
    setCustomerStats(stats);
  }

  const handleCreateQuote = (customerId: number) => {
    navigate(`/quotes/new?customer=${customerId}`);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Customers</h1>
            <p className="text-gray-600 text-base sm:text-lg">Manage your customer relationships</p>
          </div>
          <button className="inline-flex items-center justify-center px-4 sm:px-6 py-3 border border-transparent shadow-lg text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-xl">
            <Plus className="h-5 w-5 mr-2" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search customers by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {loading ? (
            <li className="px-4 sm:px-6 py-4 text-center text-gray-500">Loading customers...</li>
          ) : customers.length === 0 ? (
            <li className="px-4 sm:px-6 py-4 text-center text-gray-500">No customers found</li>
          ) : (
            customers.map((customer) => (
              <li key={customer.id} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 transition-all duration-200">
                <div className="px-4 sm:px-6 py-4 sm:py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <div className="flex items-center mb-3 sm:mb-0">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-base sm:text-lg font-medium text-indigo-600">
                                {customer.first_name[0]}
                                {customer.last_name[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3 sm:ml-4">
                            <h2 className="text-base sm:text-lg font-medium text-gray-900">
                              {customer.first_name} {customer.last_name}
                            </h2>
                          </div>
                        </div>
                        <div className="sm:ml-auto">
                          <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-500 space-y-1 sm:space-y-0 sm:space-x-4">
                            <span className="break-all">{customer.email}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>{customer.phone}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">Lifetime Value</p>
                        <p className="mt-1 text-lg text-green-600">
                          ${customerStats[customer.id]?.lifetimeValue.toLocaleString() || '0'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">Potential Value</p>
                        <p className="mt-1 text-lg text-blue-600">
                          ${customerStats[customer.id]?.potentialValue.toLocaleString() || '0'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <div className="flex space-x-6">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-5 w-5 mr-1.5 text-gray-400" />
                        <span>
                          {customerStats[customer.id]?.totalBookings || 0} Bookings
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <FileText className="h-5 w-5 mr-1.5 text-gray-400" />
                        <span>
                          {customerStats[customer.id]?.activeQuotes || 0} Active Quotes
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => navigate(`/customers/${customer.id}`)}
                        className="inline-flex items-center px-3 py-1.5 border border-indigo-600 text-xs font-medium rounded text-indigo-600 bg-white hover:bg-indigo-50"
                      >
                        View Profile
                      </button>
                      <button 
                        onClick={() => handleCreateQuote(customer.id)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        Create Quote
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}