import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { DollarSign, Users, FileText, TrendingUp, Loader } from 'lucide-react';

interface AgentStats {
  totalCustomers: number;
  totalRevenue: number;
  conversionRate: number;
  averageBookingValue: number;
  totalQuotes: number;
  convertedQuotes: number;
  totalBookings: number;
}

interface Props {
  dateRange: { start: Date; end: Date };
}

export function AgentPerformance({ dateRange }: Props) {
  const [stats, setStats] = useState<AgentStats>({
    totalCustomers: 0,
    totalRevenue: 0,
    conversionRate: 0,
    averageBookingValue: 0,
    totalQuotes: 0,
    convertedQuotes: 0,
    totalBookings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      
      try {
        // Format dates for SQL queries
        const startDate = dateRange.start.toISOString();
        const endDate = dateRange.end.toISOString();

        // Fetch all data in parallel
        const [
          customersResult,
          bookingsResult,
          quotesResult,
          convertedQuotesResult,
        ] = await Promise.all([
          // Get unique customers count
          supabase
            .from('customers')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', startDate)
            .lte('created_at', endDate),
          
          // Get bookings data
          supabase
            .from('bookings')
            .select('total_price, created_at')
            .gte('created_at', startDate)
            .lte('created_at', endDate),
          
          // Get total quotes count
          supabase
            .from('quotes')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', startDate)
            .lte('created_at', endDate),
          
          // Get converted quotes count
          supabase
            .from('quotes')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'Converted')
            .gte('created_at', startDate)
            .lte('created_at', endDate),
        ]);

        // Check for errors
        if (customersResult.error) throw customersResult.error;
        if (bookingsResult.error) throw bookingsResult.error;
        if (quotesResult.error) throw quotesResult.error;
        if (convertedQuotesResult.error) throw convertedQuotesResult.error;

        // Calculate stats
        const totalCustomers = customersResult.count || 0;
        const totalBookings = bookingsResult.data?.length || 0;
        const totalRevenue = bookingsResult.data?.reduce((sum, booking) => sum + Number(booking.total_price || 0), 0) || 0;
        const totalQuotes = quotesResult.count || 0;
        const convertedQuotes = convertedQuotesResult.count || 0;
        const conversionRate = totalQuotes > 0 ? (convertedQuotes / totalQuotes) * 100 : 0;
        const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

        setStats({
          totalCustomers,
          totalRevenue,
          conversionRate,
          averageBookingValue,
          totalQuotes,
          convertedQuotes,
          totalBookings,
        });
      } catch (err: any) {
        console.error('Error fetching agent performance stats:', err);
        setError(err.message || 'Failed to load performance data');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Performance Overview</h2>
        <div className="flex items-center justify-center py-8">
          <Loader className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Performance Overview</h2>
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Performance Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<DollarSign />}
          color="text-emerald-600"
          bgColor="bg-emerald-100"
          subtitle={`${stats.totalBookings} bookings`}
        />
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers.toString()}
          icon={<Users />}
          color="text-blue-600"
          bgColor="bg-blue-100"
          subtitle="New customers"
        />
        <StatCard
          title="Conversion Rate"
          value={`${stats.conversionRate.toFixed(1)}%`}
          icon={<TrendingUp />}
          color="text-purple-600"
          bgColor="bg-purple-100"
          subtitle={`${stats.convertedQuotes}/${stats.totalQuotes} quotes`}
        />
        <StatCard
          title="Avg. Booking Value"
          value={`$${stats.averageBookingValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<FileText />}
          color="text-amber-600"
          bgColor="bg-amber-100"
          subtitle="Per booking"
        />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
  bgColor,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center">
        <div className={`${bgColor} ${color} p-3 rounded-lg`}>
          {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}