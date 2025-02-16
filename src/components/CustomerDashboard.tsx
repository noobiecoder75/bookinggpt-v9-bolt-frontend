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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
        <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-5 w-5 mr-2" />
          Add Customer
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-lg">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => {
              console.log('Search term changed:', e.target.value);
              setSearchTerm(e.target.value);
              if (e.target.value === '') {
                fetchCustomers();
              }
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                console.log('Search initiated with term:', searchTerm);
                fetchCustomers();
              }
            }}
          />
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {loading ? (
            <li className="px-6 py-4 text-center text-gray-500">Loading customers...</li>
          ) : customers.length === 0 ? (
            <li className="px-6 py-4 text-center text-gray-500">No customers found</li>
          ) : (
            customers.map((customer) => (
              <li key={customer.id} className="hover:bg-gray-50">
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-lg font-medium text-indigo-600">
                              {customer.first_name[0]}
                              {customer.last_name[0]}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <h2 className="text-lg font-medium text-gray-900">
                            {customer.first_name} {customer.last_name}
                          </h2>
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <span>{customer.email}</span>
                            <span className="mx-2">•</span>
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
                      <button className="inline-flex items-center px-3 py-1.5 border border-indigo-600 text-xs font-medium rounded text-indigo-600 bg-white hover:bg-indigo-50">
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