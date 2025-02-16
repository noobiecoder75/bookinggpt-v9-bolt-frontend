import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { DollarSign, Users, FileText, TrendingUp } from 'lucide-react';

interface AgentStats {
  totalCustomers: number;
  totalRevenue: number;
  conversionRate: number;
  averageBookingValue: number;
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
  });

  useEffect(() => {
    async function fetchStats() {
      const [
        { count: customerCount },
        { data: bookings },
        { count: quoteCount },
        { count: convertedQuoteCount },
      ] = await Promise.all([
        supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString()),
        supabase
          .from('bookings')
          .select('total_price')
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString()),
        supabase
          .from('quotes')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString()),
        supabase
          .from('quotes')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Converted')
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString()),
      ]);

      const totalRevenue = bookings?.reduce((sum, booking) => sum + Number(booking.total_price), 0) || 0;
      const conversionRate = quoteCount ? (convertedQuoteCount / quoteCount) * 100 : 0;
      const averageBookingValue = bookings?.length ? totalRevenue / bookings.length : 0;

      setStats({
        totalCustomers: customerCount || 0,
        totalRevenue,
        conversionRate,
        averageBookingValue,
      });
    }

    fetchStats();
  }, [dateRange]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Performance Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toLocaleString()}`}
          icon={<DollarSign />}
          color="text-emerald-600"
          bgColor="bg-emerald-100"
        />
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers.toString()}
          icon={<Users />}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
        <StatCard
          title="Conversion Rate"
          value={`${stats.conversionRate.toFixed(1)}%`}
          icon={<TrendingUp />}
          color="text-purple-600"
          bgColor="bg-purple-100"
        />
        <StatCard
          title="Avg. Booking Value"
          value={`$${stats.averageBookingValue.toLocaleString()}`}
          icon={<FileText />}
          color="text-amber-600"
          bgColor="bg-amber-100"
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
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center">
        <div className={`${bgColor} ${color} p-3 rounded-lg`}>
          {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
        </div>
      </div>
    </div>
  );
}