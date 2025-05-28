import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { AgentPerformance } from './analytics/AgentPerformance';
import { RevenueBreakdown } from './analytics/RevenueBreakdown';
import { ConversionFunnel } from './analytics/ConversionFunnel';
import { DateRangePicker } from './analytics/DateRangePicker';
import { RefreshCw, TrendingUp, DollarSign, Users, FileText, Calendar, Target } from 'lucide-react';

interface AnalyticsData {
  totalRevenue: number;
  totalQuotes: number;
  totalCustomers: number;
  totalBookings: number;
  conversionRate: number;
  averageQuoteValue: number;
  averageBookingValue: number;
  monthlyGrowth: number;
  topDestinations: Array<{ destination: string; count: number; revenue: number }>;
  revenueByMonth: Array<{ month: string; revenue: number; bookings: number }>;
  quotesByStatus: Array<{ status: string; count: number; value: number }>;
  customerSegments: Array<{ segment: string; count: number; value: number }>;
}

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    end: new Date(),
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchAnalyticsData = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      setError(null);

      const startDate = dateRange.start.toISOString().split('T')[0];
      const endDate = dateRange.end.toISOString().split('T')[0];

      // Fetch all necessary data in parallel
      const [
        quotesResponse,
        bookingsResponse,
        customersResponse,
        quoteItemsResponse
      ] = await Promise.all([
        supabase
          .from('quotes')
          .select(`
            *,
            customer:customers(id, first_name, last_name, created_at),
            quote_items(*)
          `)
          .gte('created_at', startDate)
          .lte('created_at', endDate + 'T23:59:59'),
        
        supabase
          .from('bookings')
          .select('*')
          .gte('created_at', startDate)
          .lte('created_at', endDate + 'T23:59:59'),
        
        supabase
          .from('customers')
          .select('*')
          .gte('created_at', startDate)
          .lte('created_at', endDate + 'T23:59:59'),
        
        supabase
          .from('quote_items')
          .select(`
            *,
            quote:quotes!inner(created_at, status)
          `)
          .gte('quote.created_at', startDate)
          .lte('quote.created_at', endDate + 'T23:59:59')
      ]);

      if (quotesResponse.error) throw quotesResponse.error;
      if (bookingsResponse.error) throw bookingsResponse.error;
      if (customersResponse.error) throw customersResponse.error;
      if (quoteItemsResponse.error) throw quoteItemsResponse.error;

      const quotes = quotesResponse.data || [];
      const bookings = bookingsResponse.data || [];
      const customers = customersResponse.data || [];
      const quoteItems = quoteItemsResponse.data || [];

      // Calculate analytics
      const totalRevenue = bookings
        .filter(b => b.status === 'Completed')
        .reduce((sum, b) => sum + Number(b.total_price || 0), 0);

      const totalQuotes = quotes.length;
      const totalCustomers = customers.length;
      const totalBookings = bookings.length;

      const convertedQuotes = quotes.filter(q => q.status === 'Converted').length;
      const conversionRate = totalQuotes > 0 ? (convertedQuotes / totalQuotes) * 100 : 0;

      const averageQuoteValue = totalQuotes > 0 
        ? quotes.reduce((sum, q) => sum + Number(q.total_price || 0), 0) / totalQuotes 
        : 0;

      const averageBookingValue = totalBookings > 0 
        ? totalRevenue / totalBookings 
        : 0;

      // Calculate monthly growth (compare with previous period)
      const previousPeriodStart = new Date(dateRange.start);
      previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
      const previousPeriodEnd = new Date(dateRange.end);
      previousPeriodEnd.setMonth(previousPeriodEnd.getMonth() - 1);

      const { data: previousBookings } = await supabase
        .from('bookings')
        .select('total_price, status')
        .gte('created_at', previousPeriodStart.toISOString().split('T')[0])
        .lte('created_at', previousPeriodEnd.toISOString().split('T')[0] + 'T23:59:59');

      const previousRevenue = (previousBookings || [])
        .filter(b => b.status === 'Completed')
        .reduce((sum, b) => sum + Number(b.total_price || 0), 0);

      const monthlyGrowth = previousRevenue > 0 
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
        : 0;

      // Top destinations analysis
      const destinationMap = new Map();
      quoteItems.forEach(item => {
        if (item.item_type === 'Flight' || item.item_type === 'Hotel' || item.item_type === 'Tour') {
          const destination = item.destination || item.item_name || 'Unknown';
          const current = destinationMap.get(destination) || { count: 0, revenue: 0 };
          destinationMap.set(destination, {
            count: current.count + 1,
            revenue: current.revenue + Number(item.cost || 0)
          });
        }
      });

      const topDestinations = Array.from(destinationMap.entries())
        .map(([destination, data]) => ({ destination, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Revenue by month
      const monthlyData = new Map();
      bookings.forEach(booking => {
        const month = new Date(booking.created_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
        const current = monthlyData.get(month) || { revenue: 0, bookings: 0 };
        monthlyData.set(month, {
          revenue: current.revenue + Number(booking.total_price || 0),
          bookings: current.bookings + 1
        });
      });

      const revenueByMonth = Array.from(monthlyData.entries())
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

      // Quotes by status
      const statusMap = new Map();
      quotes.forEach(quote => {
        const current = statusMap.get(quote.status) || { count: 0, value: 0 };
        statusMap.set(quote.status, {
          count: current.count + 1,
          value: current.value + Number(quote.total_price || 0)
        });
      });

      const quotesByStatus = Array.from(statusMap.entries())
        .map(([status, data]) => ({ status, ...data }));

      // Customer segments (by lifetime value)
      const customerSegments = [
        { segment: 'High Value (>$10k)', count: 0, value: 0 },
        { segment: 'Medium Value ($5k-$10k)', count: 0, value: 0 },
        { segment: 'Low Value (<$5k)', count: 0, value: 0 }
      ];

      // This would need customer lifetime value calculation
      // For now, using placeholder logic
      customers.forEach(customer => {
        const customerBookings = bookings.filter(b => b.customer_id === customer.id);
        const customerValue = customerBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0);
        
        if (customerValue > 10000) {
          customerSegments[0].count++;
          customerSegments[0].value += customerValue;
        } else if (customerValue > 5000) {
          customerSegments[1].count++;
          customerSegments[1].value += customerValue;
        } else {
          customerSegments[2].count++;
          customerSegments[2].value += customerValue;
        }
      });

      setAnalyticsData({
        totalRevenue,
        totalQuotes,
        totalCustomers,
        totalBookings,
        conversionRate,
        averageQuoteValue,
        averageBookingValue,
        monthlyGrowth,
        topDestinations,
        revenueByMonth,
        quotesByStatus,
        customerSegments
      });

      setLastUpdated(new Date());
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch analytics data');
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  // Initial data fetch and date range changes
  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Set up real-time subscriptions
  useEffect(() => {
    const quotesSubscription = supabase
      .channel('analytics_quotes_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'quotes' },
        () => fetchAnalyticsData()
      )
      .subscribe();

    const bookingsSubscription = supabase
      .channel('analytics_bookings_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => fetchAnalyticsData()
      )
      .subscribe();

    const customersSubscription = supabase
      .channel('analytics_customers_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        () => fetchAnalyticsData()
      )
      .subscribe();

    // Auto-refresh every 10 minutes
    const autoRefreshInterval = setInterval(() => {
      fetchAnalyticsData();
    }, 10 * 60 * 1000);

    return () => {
      quotesSubscription.unsubscribe();
      bookingsSubscription.unsubscribe();
      customersSubscription.unsubscribe();
      clearInterval(autoRefreshInterval);
    };
  }, [fetchAnalyticsData]);

  const handleRefresh = () => {
    fetchAnalyticsData(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Analytics Dashboard</h1>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  refreshing 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Refresh analytics"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-gray-600 text-base sm:text-lg">Insights and performance metrics</p>
            <p className="text-xs text-gray-400 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <div className="w-full sm:w-auto">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-4 sm:p-6">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
                <button 
                  onClick={handleRefresh}
                  className="mt-2 text-red-700 hover:text-red-800 text-sm underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Performance Indicators */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 animate-pulse">
              <div className="flex items-center">
                <div className="bg-gray-200 p-3 rounded-xl w-12 h-12"></div>
                <div className="ml-4 flex-1">
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : analyticsData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 hover:shadow-lg hover:shadow-green-200/50 transition-all duration-300 hover:-translate-y-1 group">
            <div className="flex items-center">
              <div className="bg-green-100 text-green-600 p-2 sm:p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-300">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight">
                  {formatCurrency(analyticsData.totalRevenue)}
                </p>
                <p className={`text-xs ${analyticsData.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(analyticsData.monthlyGrowth)} vs last period
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 hover:shadow-lg hover:shadow-blue-200/50 transition-all duration-300 hover:-translate-y-1 group">
            <div className="flex items-center">
              <div className="bg-blue-100 text-blue-600 p-2 sm:p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-300">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Quotes</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight">
                  {analyticsData.totalQuotes.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  Avg: {formatCurrency(analyticsData.averageQuoteValue)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 hover:shadow-lg hover:shadow-purple-200/50 transition-all duration-300 hover:-translate-y-1 group">
            <div className="flex items-center">
              <div className="bg-purple-100 text-purple-600 p-2 sm:p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-300">
                <Users className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">New Customers</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight">
                  {analyticsData.totalCustomers.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  In selected period
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 hover:shadow-lg hover:shadow-orange-200/50 transition-all duration-300 hover:-translate-y-1 group">
            <div className="flex items-center">
              <div className="bg-orange-100 text-orange-600 p-2 sm:p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-300">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Bookings</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight">
                  {analyticsData.totalBookings.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  Avg: {formatCurrency(analyticsData.averageBookingValue)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 hover:shadow-lg hover:shadow-indigo-200/50 transition-all duration-300 hover:-translate-y-1 group">
            <div className="flex items-center">
              <div className="bg-indigo-100 text-indigo-600 p-2 sm:p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-300">
                <Target className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Conversion Rate</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight">
                  {analyticsData.conversionRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">
                  Quotes to bookings
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 hover:shadow-lg hover:shadow-teal-200/50 transition-all duration-300 hover:-translate-y-1 group">
            <div className="flex items-center">
              <div className="bg-teal-100 text-teal-600 p-2 sm:p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-300">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Growth Rate</p>
                <p className={`text-lg sm:text-2xl font-bold tracking-tight ${
                  analyticsData.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercentage(analyticsData.monthlyGrowth)}
                </p>
                <p className="text-xs text-gray-500">
                  Month over month
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 hover:shadow-lg hover:shadow-pink-200/50 transition-all duration-300 hover:-translate-y-1 group">
            <div className="flex items-center">
              <div className="bg-pink-100 text-pink-600 p-2 sm:p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-300">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Top Destination</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight truncate">
                  {analyticsData.topDestinations[0]?.destination || 'N/A'}
                </p>
                <p className="text-xs text-gray-500">
                  {analyticsData.topDestinations[0] ? formatCurrency(analyticsData.topDestinations[0].revenue) : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 hover:shadow-lg hover:shadow-cyan-200/50 transition-all duration-300 hover:-translate-y-1 group">
            <div className="flex items-center">
              <div className="bg-cyan-100 text-cyan-600 p-2 sm:p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-300">
                <Users className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">High Value Customers</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight">
                  {analyticsData.customerSegments[0]?.count || 0}
                </p>
                <p className="text-xs text-gray-500">
                  &gt;$10k lifetime value
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        <AgentPerformance dateRange={dateRange} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <RevenueBreakdown dateRange={dateRange} />
          <ConversionFunnel dateRange={dateRange} />
        </div>
        
        {/* Comprehensive Destination Analysis */}
        {analyticsData && analyticsData.topDestinations.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Top Destinations by Revenue */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Top Destinations by Revenue</h2>
                <div className="text-sm text-gray-500">
                  {analyticsData.topDestinations.length} destinations
                </div>
              </div>
              
              <div className="space-y-4">
                {analyticsData.topDestinations.slice(0, 8).map((destination, index) => {
                  const percentage = analyticsData.totalRevenue > 0 
                    ? (destination.revenue / analyticsData.totalRevenue) * 100 
                    : 0;
                  
                  const colors = [
                    'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500',
                    'bg-pink-500', 'bg-indigo-500', 'bg-red-500', 'bg-green-500'
                  ];
                  
                  return (
                    <div key={destination.destination} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full ${colors[index % colors.length]}`}></div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              {destination.destination}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {destination.count} booking{destination.count !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(destination.revenue)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {percentage.toFixed(1)}% of total
                          </p>
                        </div>
                      </div>
                      
                      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`absolute top-0 left-0 h-full ${colors[index % colors.length]} transition-all duration-500 ease-out`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>
                          Avg: {formatCurrency(destination.count > 0 ? destination.revenue / destination.count : 0)} per booking
                        </span>
                        <span>
                          Rank #{index + 1}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {analyticsData.topDestinations.length > 8 && (
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500">
                    Showing top 8 of {analyticsData.topDestinations.length} destinations
                  </p>
                </div>
              )}
            </div>

            {/* Destination Performance Summary */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Destination Insights</h2>
              
              <div className="space-y-6">
                {/* Most Popular Destination */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-gray-900">Most Popular</h3>
                  </div>
                  <p className="text-lg font-semibold text-blue-600 mb-1">
                    {analyticsData.topDestinations[0]?.destination || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {analyticsData.topDestinations[0]?.count || 0} bookings • {formatCurrency(analyticsData.topDestinations[0]?.revenue || 0)}
                  </p>
                </div>

                {/* Highest Revenue Destination */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900">Highest Revenue</h3>
                  </div>
                  <p className="text-lg font-semibold text-green-600 mb-1">
                    {analyticsData.topDestinations[0]?.destination || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {formatCurrency(analyticsData.topDestinations[0]?.revenue || 0)} total revenue
                  </p>
                </div>

                {/* Average Revenue per Destination */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900">Average Revenue</h3>
                  </div>
                  <p className="text-lg font-semibold text-purple-600 mb-1">
                    {formatCurrency(
                      analyticsData.topDestinations.length > 0 
                        ? analyticsData.topDestinations.reduce((sum, dest) => sum + dest.revenue, 0) / analyticsData.topDestinations.length
                        : 0
                    )}
                  </p>
                  <p className="text-xs text-gray-600">
                    Per destination
                  </p>
                </div>

                {/* Destination Diversity */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="bg-amber-100 p-2 rounded-lg">
                      <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-gray-900">Destinations</h3>
                  </div>
                  <p className="text-lg font-semibold text-amber-600 mb-1">
                    {analyticsData.topDestinations.length}
                  </p>
                  <p className="text-xs text-gray-600">
                    Unique destinations
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}