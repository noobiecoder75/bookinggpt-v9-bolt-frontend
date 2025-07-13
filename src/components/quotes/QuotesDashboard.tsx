import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Download, Mail, Calendar, FileText, RefreshCw, Filter, X, ChevronDown, Eye } from 'lucide-react';
import { CreateTripDialog } from './CreateTripDialog';
import { 
  calculateQuoteTotal, 
  calculateAverageMarkup,
  determineMarkupStrategy,
  validateHotelPricing,
  DEFAULT_PRICING_OPTIONS,
  type PricingQuote,
  type MarkupStrategy
} from '../../utils/pricingUtils';
import { useGoogleOAuth } from '../../hooks/useGoogleOAuth';
import { useAuthContext } from '../../contexts/AuthContext';

interface Quote {
  id: number;
  quote_reference: string;
  status: 'Draft' | 'Sent' | 'Expired' | 'Converted' | 'Published';
  total_price: number;
  markup: number; // Global/average markup
  discount: number;
  markup_strategy: MarkupStrategy;
  created_at: string;
  updated_at: string;
  customer: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  quote_items?: {
    id: number;
    item_type: string;
    item_name: string;
    cost: number;
    markup: number;
    markup_type: 'percentage' | 'fixed';
    quantity: number;
    details?: any;
  }[];
}

export function QuotesDashboard() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showCreateTripDialog, setShowCreateTripDialog] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const navigate = useNavigate();
  const { isConnected } = useGoogleOAuth();
  
  // Simplified filter states
  const [filters, setFilters] = useState({
    priceRange: {
      min: '',
      max: ''
    },
    dateRange: {
      start: '',
      end: ''
    },
    customerName: '',
    itemTypes: [] as string[]
  });

  // Calculate dynamic total price from quote items using unified pricing
  const calculateQuoteTotalPrice = useCallback((quote: Quote): number => {
    if (!quote.quote_items || quote.quote_items.length === 0) {
      return quote.total_price || 0;
    }

    // Convert to pricing format
    const pricingQuote: PricingQuote = {
      id: quote.id,
      markup: quote.markup || 0,
      discount: quote.discount || 0,
      markup_strategy: quote.markup_strategy || 'global',
      quote_items: quote.quote_items.map(item => ({
        id: item.id,
        cost: item.cost,
        markup: item.markup || 0,
        markup_type: item.markup_type || 'percentage',
        quantity: item.quantity || 1,
        item_type: item.item_type,
        details: item.details
      }))
    };

    // Use unified pricing calculation with dynamic markup strategy
    const pricingOptions = {
      ...DEFAULT_PRICING_OPTIONS,
      markupStrategy: quote.markup_strategy || determineMarkupStrategy(pricingQuote)
    };

    // Validate hotel pricing in development
    if (process.env.NODE_ENV === 'development') {
      const validation = validateHotelPricing(pricingQuote);
      if (validation.issues.length > 0) {
        console.warn(`QuotesDashboard - Quote ${quote.id} hotel pricing issues:`, validation.issues);
      }
    }

    return calculateQuoteTotal(pricingQuote, pricingOptions);
  }, []);

  const fetchEmailStats = useCallback(async (quotes: Quote[]) => {
    try {
      const quotesWithStats = await Promise.all(
        quotes.map(async (quote) => {
          const { data: emails, error } = await supabase
            .from('email_communications')
            .select('sent_at, opened_at')
            .eq('customer_id', quote.customer.id)
            .or(`quote_id.eq.${quote.id},quote_id.is.null`)
            .order('sent_at', { ascending: false });

          if (error) {
            console.error('Error fetching email stats:', error);
            return quote;
          }

          const emailStats = {
            totalSent: emails?.length || 0,
            lastSent: emails?.[0]?.sent_at,
            hasOpened: emails?.some(email => email.opened_at) || false
          };

          return { ...quote, emailStats };
        })
      );
      
      setQuotes(quotesWithStats);
    } catch (error) {
      console.error('Error fetching email stats:', error);
    }
  }, []);

  // Calculate average markup for a quote using unified pricing
  const calculateQuoteAverageMarkup = useCallback((quote: Quote): number => {
    if (!quote.quote_items || quote.quote_items.length === 0) {
      return quote.markup || 0;
    }

    // Convert to pricing format
    const pricingQuote: PricingQuote = {
      id: quote.id,
      markup: quote.markup || 0,
      discount: quote.discount || 0,
      markup_strategy: quote.markup_strategy || 'global',
      quote_items: quote.quote_items.map(item => ({
        id: item.id,
        cost: item.cost,
        markup: item.markup || 0,
        markup_type: item.markup_type || 'percentage',
        quantity: item.quantity || 1,
        item_type: item.item_type,
        details: item.details
      }))
    };

    return calculateAverageMarkup(pricingQuote, DEFAULT_PRICING_OPTIONS);
  }, []);

  // Process quotes with dynamic calculations
  const processedQuotes = useMemo(() => {
    return quotes.map(quote => ({
      ...quote,
      total_price: calculateQuoteTotalPrice(quote),
      markup: calculateQuoteAverageMarkup(quote)
    }));
  }, [quotes, calculateQuoteTotalPrice, calculateQuoteAverageMarkup]);

  const fetchQuotes = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      setError(null);

      // Get current authenticated user for agent filtering
      const { user } = useAuthContext();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          customer:customers (
            id,
            first_name,
            last_name,
            email
          ),
          quote_items (
            id,
            item_type,
            item_name,
            cost,
            markup,
            markup_type,
            quantity,
            details
          )
        `)
        .eq('agent_id', user.id) // Explicit agent filtering
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setQuotes(data || []);
      
      // Fetch email stats for all quotes
      if (data && data.length > 0) {
        await fetchEmailStats(data);
      }
      
      setLastUpdated(new Date());
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch quotes');
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchEmailStats]);

  // Set up real-time subscriptions
  useEffect(() => {
    fetchQuotes();

    // Subscribe to quotes table changes
    const quotesSubscription = supabase
      .channel('quotes_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'quotes' },
        (payload) => {
          console.log('Quote change detected:', payload);
          fetchQuotes();
        }
      )
      .subscribe();

    // Subscribe to quote_items table changes
    const quoteItemsSubscription = supabase
      .channel('quote_items_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'quote_items' },
        (payload) => {
          console.log('Quote item change detected:', payload);
          fetchQuotes();
        }
      )
      .subscribe();

    // Subscribe to customers table changes (in case customer info changes)
    const customersSubscription = supabase
      .channel('customers_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        (payload) => {
          console.log('Customer change detected:', payload);
          fetchQuotes();
        }
      )
      .subscribe();

    // Auto-refresh every 5 minutes as fallback
    const autoRefreshInterval = setInterval(() => {
      fetchQuotes();
    }, 5 * 60 * 1000);

    return () => {
      quotesSubscription.unsubscribe();
      quoteItemsSubscription.unsubscribe();
      customersSubscription.unsubscribe();
      clearInterval(autoRefreshInterval);
    };
  }, [fetchQuotes]);

  const filteredQuotes = useMemo(() => {
    return processedQuotes.filter(quote => {
      // Basic search term matching
      const matchesSearch = searchTerm === '' || 
        (quote.quote_reference && quote.quote_reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (quote.customer.first_name && quote.customer.last_name && 
         `${quote.customer.first_name} ${quote.customer.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (quote.customer.email && quote.customer.email.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
      
      // Customer name filter
      const matchesCustomerName = filters.customerName === '' ||
        (quote.customer.first_name && quote.customer.last_name && 
         `${quote.customer.first_name} ${quote.customer.last_name}`.toLowerCase().includes(filters.customerName.toLowerCase()));
      
      // Price range filter
      const matchesPriceRange = 
        (filters.priceRange.min === '' || quote.total_price >= parseFloat(filters.priceRange.min)) &&
        (filters.priceRange.max === '' || quote.total_price <= parseFloat(filters.priceRange.max));
      
      // Created date range filter
      const quoteCreatedDate = new Date(quote.created_at).toISOString().split('T')[0];
      const matchesDateRange = 
        (filters.dateRange.start === '' || quoteCreatedDate >= filters.dateRange.start) &&
        (filters.dateRange.end === '' || quoteCreatedDate <= filters.dateRange.end);
      
      // Item types filter
      const matchesItemTypes = filters.itemTypes.length === 0 || 
        (quote.quote_items && quote.quote_items.some(item => 
          filters.itemTypes.includes(item.item_type)
        ));
      
      return matchesSearch && matchesStatus && matchesCustomerName && 
             matchesPriceRange && matchesDateRange && matchesItemTypes;
    });
  }, [processedQuotes, searchTerm, statusFilter, filters]);

  const stats = useMemo(() => {
    const totalValue = processedQuotes.reduce((sum, quote) => sum + quote.total_price, 0);
    const avgMarkup = processedQuotes.length > 0 
      ? processedQuotes.reduce((sum, quote) => sum + quote.markup, 0) / processedQuotes.length 
      : 0;

    return {
      total: processedQuotes.length,
      draft: processedQuotes.filter(q => q.status === 'Draft').length,
      sent: processedQuotes.filter(q => q.status === 'Sent').length,
      converted: processedQuotes.filter(q => q.status === 'Converted').length,
      published: processedQuotes.filter(q => q.status === 'Published').length,
      totalValue,
      avgMarkup
    };
  }, [processedQuotes]);

  const handleRefresh = () => {
    fetchQuotes(true);
  };

  const handleSendEmail = (quote: Quote) => {
    navigate(`/communications?customer=${quote.customer.id}&email=${encodeURIComponent(quote.customer.email)}&quote=${quote.id}`);
  };

  const handleFilterChange = (filterType: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleItemTypeToggle = (itemType: string) => {
    setFilters(prev => ({
      ...prev,
      itemTypes: prev.itemTypes.includes(itemType)
        ? prev.itemTypes.filter(type => type !== itemType)
        : [...prev.itemTypes, itemType]
    }));
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setFilters({
      priceRange: { min: '', max: '' },
      dateRange: { start: '', end: '' },
      customerName: '',
      itemTypes: []
    });
  };

  const hasActiveFilters = useMemo(() => {
    return searchTerm !== '' || 
           statusFilter !== 'all' || 
           filters.customerName !== '' ||
           filters.priceRange.min !== '' || 
           filters.priceRange.max !== '' ||
           filters.dateRange.start !== '' || 
           filters.dateRange.end !== '' ||
           filters.itemTypes.length > 0;
  }, [searchTerm, statusFilter, filters]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Quotes</h1>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  refreshing 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Refresh quotes"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-gray-600 text-base sm:text-lg">Manage and track your travel quotes</p>
            <p className="text-xs text-gray-400 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={() => setShowCreateTripDialog(true)}
            className="inline-flex items-center justify-center px-4 sm:px-6 py-3 border border-transparent text-sm font-semibold rounded-xl shadow-lg text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-xl"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create New Quote
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

      {/* Enhanced Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1 group">
          <div className="flex items-center">
            <div className="bg-gray-100 text-gray-600 p-2 sm:p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-300">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="ml-3 sm:ml-4 flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Quotes</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 hover:shadow-lg hover:shadow-amber-200/50 transition-all duration-300 hover:-translate-y-1 group">
          <div className="flex items-center">
            <div className="bg-amber-100 text-amber-600 p-2 sm:p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-300">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="ml-3 sm:ml-4 flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Draft</p>
              <p className="text-lg sm:text-2xl font-bold text-amber-600 tracking-tight">{stats.draft}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 hover:shadow-lg hover:shadow-blue-200/50 transition-all duration-300 hover:-translate-y-1 group">
          <div className="flex items-center">
            <div className="bg-blue-100 text-blue-600 p-2 sm:p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-300">
              <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="ml-3 sm:ml-4 flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Sent</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-600 tracking-tight">{stats.sent}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 hover:shadow-lg hover:shadow-green-200/50 transition-all duration-300 hover:-translate-y-1 group">
          <div className="flex items-center">
            <div className="bg-green-100 text-green-600 p-2 sm:p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-300">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="ml-3 sm:ml-4 flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Converted</p>
              <p className="text-lg sm:text-2xl font-bold text-green-600 tracking-tight">{stats.converted}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 hover:shadow-lg hover:shadow-emerald-200/50 transition-all duration-300 hover:-translate-y-1 group">
          <div className="flex items-center">
            <div className="bg-emerald-100 text-emerald-600 p-2 sm:p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-300">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="ml-3 sm:ml-4 flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Published</p>
              <p className="text-lg sm:text-2xl font-bold text-emerald-600 tracking-tight">{stats.published}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 hover:shadow-lg hover:shadow-purple-200/50 transition-all duration-300 hover:-translate-y-1 group">
          <div className="flex items-center">
            <div className="bg-purple-100 text-purple-600 p-2 sm:p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-300">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="ml-3 sm:ml-4 flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Value</p>
              <p className="text-lg sm:text-2xl font-bold text-purple-600 tracking-tight">
                ${stats.totalValue.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
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
                  placeholder="Search quotes, customers, or references..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full sm:w-48 pl-3 pr-10 py-3 text-sm sm:text-base border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-xl transition-all duration-200"
            >
              <option value="all">All Status</option>
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Converted">Converted</option>
              <option value="Expired">Expired</option>
              <option value="Published">Published</option>
            </select>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center px-4 py-3 border rounded-xl transition-all duration-200 ${
                showAdvancedFilters 
                  ? 'border-blue-500 bg-blue-50/80 text-blue-700 backdrop-blur-sm' 
                  : 'border-white/20 bg-white/50 text-slate-700 hover:bg-white/70'
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
                className="flex items-center px-4 py-3 border border-red-200 bg-red-50/80 text-red-700 rounded-xl hover:bg-red-100/80 transition-all duration-200 backdrop-blur-sm"
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
                {/* Customer Name Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by customer name..."
                    value={filters.customerName}
                    onChange={(e) => handleFilterChange('customerName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range ($)
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.priceRange.min}
                      onChange={(e) => handleFilterChange('priceRange', { ...filters.priceRange, min: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.priceRange.max}
                      onChange={(e) => handleFilterChange('priceRange', { ...filters.priceRange, max: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range
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

                {/* Item Types Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Types
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Flight', 'Hotel', 'Tour', 'Transfer', 'Insurance'].map((type) => (
                      <button
                        key={type}
                        onClick={() => handleItemTypeToggle(type)}
                        className={`px-3 py-1 text-xs rounded-full border transition-all duration-200 ${
                          filters.itemTypes.includes(type)
                            ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                            : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active Filters Summary */}
              {hasActiveFilters && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Showing {filteredQuotes.length} of {processedQuotes.length} quotes
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
                      {statusFilter !== 'all' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Status: {statusFilter}
                          <button
                            onClick={() => setStatusFilter('all')}
                            className="ml-1 hover:text-green-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      )}
                      {filters.itemTypes.map((type) => (
                        <span key={type} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                          {type}
                          <button
                            onClick={() => handleItemTypeToggle(type)}
                            className="ml-1 hover:text-purple-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quotes List */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 animate-spin text-indigo-600" />
              <span className="text-gray-600">Loading quotes...</span>
            </div>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No quotes found</p>
            {searchTerm || statusFilter !== 'all' ? (
              <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
            ) : (
              <p className="text-gray-400 text-sm">Create your first quote to get started</p>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredQuotes.map((quote) => (
              <li key={quote.id} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 transition-all duration-200">
                <Link to={`/quotes/${quote.id}`} className="block">
                  <div className="px-4 sm:px-6 py-4 sm:py-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-sm sm:text-lg font-medium text-indigo-600">
                                {quote.customer.first_name[0]}
                                {quote.customer.last_name[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h2 className="text-base sm:text-lg font-medium text-gray-900 truncate">
                                {quote.customer.first_name} {quote.customer.last_name}
                              </h2>
                              {/* Email stats temporarily disabled - needs proper implementation */}
                            </div>
                            <div className="mt-1 flex flex-col sm:flex-row sm:items-center text-sm text-gray-500 space-y-1 sm:space-y-0">
                              {/* Show quote reference only on desk*/}
                              <span className="hidden sm:inline truncate">{quote.quote_reference}</span>
                              <span className="hidden sm:inline mx-2">•</span>
                              <span className="font-medium text-green-600">
                                ${quote.total_price.toLocaleString('en-US', { 
                                  minimumFractionDigits: 2, 
                                  maximumFractionDigits: 2 
                                })}
                              </span>
                              {quote.markup > 0 && (
                                <>
                                  <span className="hidden sm:inline mx-2">•</span>
                                  <span className="text-xs sm:text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                    {quote.markup.toFixed(1)}% markup
                                  </span>
                                </>
                              )}
                              {quote.quote_items && quote.quote_items.length > 0 && (
                                <>
                                  <span className="hidden sm:inline mx-2">•</span>
                                  <span className="text-xs sm:text-sm text-gray-400">
                                    {quote.quote_items.length} item{quote.quote_items.length !== 1 ? 's' : ''}
                                  </span>
                                </>
                              )}
                            </div>
                            {/* Show email on mobile */}
                            <div className="mt-1 sm:hidden">
                              <span className="text-xs text-gray-400">{quote.customer.email}</span>
                              {/* Email stats temporarily disabled - needs proper implementation */}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 ml-4">
                        <div className="flex flex-col items-end sm:items-center space-y-1">
                          <span
                            className={`px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                              quote.status === 'Draft'
                                ? 'bg-amber-100 text-amber-800'
                                : quote.status === 'Sent'
                                ? 'bg-blue-100 text-blue-800'
                                : quote.status === 'Converted'
                                ? 'bg-green-100 text-green-800'
                                : quote.status === 'Published'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {quote.status}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(quote.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="hidden sm:flex space-x-2">
                          {isConnected && (
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                handleSendEmail(quote);
                              }} 
                              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Send email to customer"
                            >
                              <Mail className="h-5 w-5" />
                            </button>
                          )}
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              // Add download functionality
                            }} 
                            className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Download PDF"
                          >
                            <Download className="h-5 w-5" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              // Add calendar functionality
                            }} 
                            className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Add to calendar"
                          >
                            <Calendar className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Mobile-only quote reference and additional info */}
                    <div className="mt-2 sm:hidden space-y-1">
                      <span className="text-xs text-gray-500 block">{quote.quote_reference}</span>
                      {quote.markup > 0 && (
                        <span className="inline-block text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          {quote.markup.toFixed(1)}% markup
                        </span>
                      )}
                      {quote.quote_items && quote.quote_items.length > 0 && (
                        <span className="text-xs text-gray-400 ml-2">
                          {quote.quote_items.length} item{quote.quote_items.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create Trip Dialog */}
      <CreateTripDialog 
        isOpen={showCreateTripDialog}
        onClose={() => setShowCreateTripDialog(false)}
      />
    </div>
  );
}