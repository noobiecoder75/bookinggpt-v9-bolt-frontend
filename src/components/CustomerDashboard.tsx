import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Plus, FileText, Calendar, Filter, X, ChevronDown, RefreshCw, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useGoogleOAuth } from '../hooks/useGoogleOAuth';
import { useAuthContext } from '../contexts/AuthContext';

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
  created_at: string;
}

interface CustomerStats {
  lifetimeValue: number;
  potentialValue: number;
  totalBookings: number;
  activeQuotes: number;
  totalEmailsSent: number;
  lastEmailDate?: string;
}

export function CustomerDashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerStats, setCustomerStats] = useState<Record<number, CustomerStats>>({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const navigate = useNavigate();
  const { isConnected } = useGoogleOAuth();
  
  // Move useAuthContext to the top level of the component
  const { user } = useAuthContext();

  // Simplified filter states
  const [filters, setFilters] = useState({
    lifetimeValueRange: {
      min: '',
      max: ''
    },
    dateRange: {
      start: '',
      end: ''
    },
    nationality: '',
    passportStatus: 'all' as 'all' | 'valid' | 'expiring-soon' | 'expired'
  });

  console.log('CustomerDashboard rendered', { searchTerm, loading, customersCount: customers.length });

  useEffect(() => {
    console.log('Initial fetch starting');
    fetchCustomers();
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCustomers();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const fetchCustomers = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      setError(null);

      console.log('Fetching customers with search term:', searchTerm);
      
      // Use the user from the top-level hook call
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch customers that the agent has access to through quotes or bookings
      // This query explicitly includes agent context for clarity, though RLS policies will enforce this
      let query = supabase
        .from('customers')
        .select(`
          *,
          quotes!inner(agent_id),
          bookings!inner(agent_id)
        `)
        .or(`quotes.agent_id.eq.${user.id},bookings.agent_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(
          `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,nationality.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      console.log('Customers fetched successfully:', { count: data?.length });

      // Remove duplicates that might occur from joins
      const uniqueCustomers = data ? data.filter((customer, index, self) => 
        index === self.findIndex(c => c.id === customer.id)
      ) : [];

      setCustomers(uniqueCustomers);
      await fetchCustomerStats(uniqueCustomers);
      setLastUpdated(new Date());
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch customers');
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, searchTerm]); // Add user as dependency

  const fetchCustomerStats = useCallback(async (customers: Customer[]) => {
    const stats: Record<number, CustomerStats> = {};

    console.log('Fetching stats for customers:', customers.length);

    // Use the user from the top-level hook call
    if (!user) {
      console.warn('User not authenticated, skipping stats fetch');
      return;
    }

    await Promise.all(
      customers.map(async (customer) => {
        const [bookingsResponse, quotesResponse, emailsResponse] = await Promise.all([
          supabase
            .from('bookings')
            .select('total_price, status')
            .eq('customer_id', customer.id)
            .eq('agent_id', user.id), // Explicit agent filtering
          supabase
            .from('quotes')
            .select('total_price, status')
            .eq('customer_id', customer.id)
            .eq('agent_id', user.id) // Explicit agent filtering
            .eq('status', 'Sent'),
          supabase
            .from('email_communications')
            .select('sent_at')
            .eq('customer_id', customer.id)
            .order('sent_at', { ascending: false })
        ]);

        const bookings = bookingsResponse.data || [];
        const quotes = quotesResponse.data || [];
        const emails = emailsResponse.data || [];

        console.log(`Stats for customer ${customer.id}:`, { bookingsCount: bookings.length, quotesCount: quotes.length, emailsCount: emails.length });

        stats[customer.id] = {
          lifetimeValue: bookings
            .filter((b) => b.status === 'Completed')
            .reduce((sum, b) => sum + Number(b.total_price), 0),
          potentialValue: quotes.reduce((sum, q) => sum + Number(q.total_price), 0),
          totalBookings: bookings.length,
          activeQuotes: quotes.length,
          totalEmailsSent: emails.length,
          lastEmailDate: emails[0]?.sent_at
        };
      })
    );

    console.log('All customer stats fetched:', Object.keys(stats).length);
    setCustomerStats(stats);
  }, [user]); // Add user as dependency

  // Filter helper functions
  const handleFilterChange = (filterType: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilters({
      lifetimeValueRange: { min: '', max: '' },
      dateRange: { start: '', end: '' },
      nationality: '',
      passportStatus: 'all'
    });
  };

  const handleRefresh = () => {
    fetchCustomers(true);
  };

  // Check passport expiry status
  const getPassportStatus = (expiryDate: string) => {
    if (!expiryDate) return 'unknown';
    const expiry = new Date(expiryDate);
    const today = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(today.getMonth() + 6);

    if (expiry < today) return 'expired';
    if (expiry < sixMonthsFromNow) return 'expiring-soon';
    return 'valid';
  };

  // Filtered customers with advanced filtering
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const stats = customerStats[customer.id] || { lifetimeValue: 0, potentialValue: 0, totalBookings: 0, activeQuotes: 0 };
      
      // Basic search term matching
      const matchesSearch = searchTerm === '' || 
        (customer.first_name && customer.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.last_name && customer.last_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.phone && customer.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.nationality && customer.nationality.toLowerCase().includes(searchTerm.toLowerCase()));

      // Lifetime value range filter
      const matchesLifetimeValue = 
        (filters.lifetimeValueRange.min === '' || stats.lifetimeValue >= parseFloat(filters.lifetimeValueRange.min)) &&
        (filters.lifetimeValueRange.max === '' || stats.lifetimeValue <= parseFloat(filters.lifetimeValueRange.max));

      // Nationality filter
      const matchesNationality = filters.nationality === '' ||
        (customer.nationality && customer.nationality.toLowerCase().includes(filters.nationality.toLowerCase()));

      // Created date range filter
      const customerCreatedDate = new Date(customer.created_at).toISOString().split('T')[0];
      const matchesDateRange = 
        (filters.dateRange.start === '' || customerCreatedDate >= filters.dateRange.start) &&
        (filters.dateRange.end === '' || customerCreatedDate <= filters.dateRange.end);

      // Passport status filter
      const passportStatus = getPassportStatus(customer.passport_expiry);
      const matchesPassportStatus = filters.passportStatus === 'all' || passportStatus === filters.passportStatus;

      return matchesSearch && matchesLifetimeValue && matchesNationality && 
             matchesDateRange && matchesPassportStatus;
    });
  }, [customers, customerStats, searchTerm, filters]);

  const hasActiveFilters = useMemo(() => {
    return searchTerm !== '' || 
           filters.nationality !== '' ||
           filters.lifetimeValueRange.min !== '' || 
           filters.lifetimeValueRange.max !== '' ||
           filters.dateRange.start !== '' || 
           filters.dateRange.end !== '' ||
           filters.passportStatus !== 'all';
  }, [searchTerm, filters]);

  const handleCreateQuote = (customerId: number) => {
    navigate(`/quotes/new?customer=${customerId}`);
  };

  const handleSendEmail = (customerId: number, customerEmail: string) => {
    // Navigate to communications with pre-selected customer
    navigate(`/communications?customer=${customerId}&email=${encodeURIComponent(customerEmail)}`);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Customers</h1>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  refreshing 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Refresh customers"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-gray-600 text-base sm:text-lg">Manage your customer relationships</p>
            <p className="text-xs text-gray-400 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <button 
            onClick={() => navigate('/customers/new')}
            className="inline-flex items-center justify-center px-4 sm:px-6 py-3 border border-transparent shadow-lg text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-xl"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Customer
          </button>
        </div>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
            <button 
              onClick={handleRefresh}
              className="mt-2 text-red-700 hover:text-red-800 text-sm underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
        <div className="flex flex-col space-y-4">
          {/* Basic Filters Row */}
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-sm sm:text-base"
                  placeholder="Search customers by name, email, phone, or nationality..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center px-4 py-3 border rounded-xl transition-all duration-200 ${
                showAdvancedFilters 
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4 mr-2" />
              Advanced
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform duration-200 ${
                showAdvancedFilters ? 'rotate-180' : ''
              }`} />
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center px-4 py-3 border border-red-200 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-all duration-200"
              >
                <X className="h-4 w-4 mr-2" />
                Clear All
              </button>
            )}
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="border-t border-gray-200 pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nationality Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nationality
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by nationality..."
                    value={filters.nationality}
                    onChange={(e) => handleFilterChange('nationality', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Lifetime Value Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lifetime Value ($)
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.lifetimeValueRange.min}
                      onChange={(e) => handleFilterChange('lifetimeValueRange', { ...filters.lifetimeValueRange, min: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.lifetimeValueRange.max}
                      onChange={(e) => handleFilterChange('lifetimeValueRange', { ...filters.lifetimeValueRange, max: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Registration Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Registration Date Range
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="date"
                      value={filters.dateRange.start}
                      onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, start: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <input
                      type="date"
                      value={filters.dateRange.end}
                      onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, end: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Passport Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passport Status
                  </label>
                  <select
                    value={filters.passportStatus}
                    onChange={(e) => handleFilterChange('passportStatus', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">All Passports</option>
                    <option value="valid">Valid</option>
                    <option value="expiring-soon">Expiring Soon (6 months)</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              {/* Active Filters Summary */}
              {hasActiveFilters && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Showing {filteredCustomers.length} of {customers.length} customers
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {searchTerm && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          Search: "{searchTerm}"
                          <button
                            onClick={() => setSearchTerm('')}
                            className="ml-1 hover:text-blue-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      )}
                      {filters.nationality && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Nationality: {filters.nationality}
                          <button
                            onClick={() => handleFilterChange('nationality', '')}
                            className="ml-1 hover:text-green-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      )}
                      {filters.passportStatus !== 'all' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                          Passport: {filters.passportStatus.replace('-', ' ')}
                          <button
                            onClick={() => handleFilterChange('passportStatus', 'all')}
                            className="ml-1 hover:text-purple-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {loading ? (
            <li className="px-4 sm:px-6 py-12 text-center">
              <div className="inline-flex items-center space-x-2">
                <RefreshCw className="h-5 w-5 animate-spin text-indigo-600" />
                <span className="text-gray-600">Loading customers...</span>
              </div>
            </li>
          ) : filteredCustomers.length === 0 ? (
            <li className="px-4 sm:px-6 py-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No customers found</p>
              {hasActiveFilters ? (
                <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
              ) : (
                <p className="text-gray-400 text-sm">Add your first customer to get started</p>
              )}
            </li>
          ) : (
            filteredCustomers.map((customer) => (
              <li key={customer.id} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-cyan-50/50 transition-all duration-200 backdrop-blur-sm">
                <div 
                  className="px-4 sm:px-6 py-4 sm:py-6 cursor-pointer"
                  onClick={() => navigate(`/customers/${customer.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <div className="flex items-center mb-3 sm:mb-0">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-sm sm:text-lg font-medium text-indigo-600">
                                {customer.first_name[0]}
                                {customer.last_name[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                            <h2 className="text-base sm:text-lg font-medium text-gray-900 truncate">
                              {customer.first_name} {customer.last_name}
                            </h2>
                            {/* Show email only on desktop */}
                            <div className="hidden sm:block mt-1">
                              <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-500 space-y-1 sm:space-y-0 sm:space-x-4">
                                <span className="break-all">{customer.email}</span>
                                <span className="hidden sm:inline">•</span>
                                <span>{customer.phone}</span>
                                {customer.nationality && (
                                  <>
                                    <span className="hidden sm:inline">•</span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                                      {customer.nationality}
                                    </span>
                                  </>
                                )}
                                {customer.passport_expiry && (
                                  <>
                                    <span className="hidden sm:inline">•</span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                                      getPassportStatus(customer.passport_expiry) === 'expired' 
                                        ? 'bg-red-100 text-red-700'
                                        : getPassportStatus(customer.passport_expiry) === 'expiring-soon'
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-green-100 text-green-700'
                                    }`}>
                                      Passport {getPassportStatus(customer.passport_expiry).replace('-', ' ')}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-6 ml-4">
                      <div className="text-right">
                        <p className="text-xs sm:text-sm font-medium text-gray-900">Lifetime Value</p>
                        <p className="mt-1 text-base sm:text-lg text-green-600 font-semibold">
                          ${customerStats[customer.id]?.lifetimeValue.toLocaleString() || '0'}
                        </p>
                      </div>
                      {/* Show potential value only on desktop */}
                      <div className="hidden sm:block text-right">
                        <p className="text-sm font-medium text-gray-900">Potential Value</p>
                        <p className="mt-1 text-lg text-blue-600 font-semibold">
                          ${customerStats[customer.id]?.potentialValue.toLocaleString() || '0'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Mobile-only contact info and actions */}
                  <div className="mt-3 sm:hidden">
                    <div className="flex justify-between items-start">
                      <div className="text-xs text-gray-500 space-y-1 flex-1">
                        <div className="truncate">{customer.email}</div>
                        <div>{customer.phone}</div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {customer.nationality && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                              {customer.nationality}
                            </span>
                          )}
                          {customer.passport_expiry && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                              getPassportStatus(customer.passport_expiry) === 'expired' 
                                ? 'bg-red-100 text-red-700'
                                : getPassportStatus(customer.passport_expiry) === 'expiring-soon'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              Passport {getPassportStatus(customer.passport_expiry).replace('-', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {isConnected && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendEmail(customer.id, customer.email);
                            }}
                            className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                            title="Send email"
                          >
                            <Mail className="h-3 w-3" />
                          </button>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent card click
                            handleCreateQuote(customer.id);
                          }}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                          Create Quote
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Desktop-only stats and actions */}
                  <div className="hidden sm:block mt-4">
                    <div className="flex justify-between items-center">
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
                        <div className="flex items-center text-sm text-gray-500">
                          <Mail className="h-5 w-5 mr-1.5 text-gray-400" />
                          <span>
                            {customerStats[customer.id]?.totalEmailsSent || 0} Emails
                            {customerStats[customer.id]?.lastEmailDate && (
                              <span className="text-xs text-gray-400 ml-1">
                                • Last: {new Date(customerStats[customer.id].lastEmailDate!).toLocaleDateString()}
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <span>Joined {new Date(customer.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {isConnected && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendEmail(customer.id, customer.email);
                            }}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                            title="Send email to customer"
                          >
                            <Mail className="h-4 w-4 mr-1" />
                            Email
                          </button>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent card click
                            handleCreateQuote(customer.id);
                          }}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                          Create Quote
                        </button>
                      </div>
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