import React from 'react';
import { DollarSign, Users, FileText, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Stats {
  totalRevenue: number;
  totalCustomers: number;
  activeQuotes: number;
  confirmedBookings: number;
}

export function DashboardStats() {
  const [stats, setStats] = React.useState<Stats>({
    totalRevenue: 0,
    totalCustomers: 0,
    activeQuotes: 0,
    confirmedBookings: 0,
  });

  React.useEffect(() => {
    async function fetchStats() {
      const [
        { count: customerCount },
        { count: quoteCount },
        { count: bookingCount },
        { data: bookings },
      ] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'Sent'),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'Confirmed'),
        supabase.from('bookings').select('total_price').eq('status', 'Confirmed'),
      ]);

      const totalRevenue = bookings?.reduce((sum, booking) => sum + Number(booking.total_price), 0) || 0;

      setStats({
        totalRevenue,
        totalCustomers: customerCount || 0,
        activeQuotes: quoteCount || 0,
        confirmedBookings: bookingCount || 0,
      });
    }

    fetchStats();
  }, []);

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Revenue"
        value={`$${stats.totalRevenue.toLocaleString()}`}
        icon={<DollarSign className="h-6 w-6 text-white" />}
        color="from-emerald-500 to-emerald-600"
      />
      <StatCard
        title="Total Customers"
        value={stats.totalCustomers.toString()}
        icon={<Users className="h-6 w-6 text-white" />}
        color="from-blue-500 to-blue-600"
      />
      <StatCard
        title="Active Quotes"
        value={stats.activeQuotes.toString()}
        icon={<FileText className="h-6 w-6 text-white" />}
        color="from-amber-500 to-amber-600"
      />
      <StatCard
        title="Confirmed Bookings"
        value={stats.confirmedBookings.toString()}
        icon={<Calendar className="h-6 w-6 text-white" />}
        color="from-purple-500 to-purple-600"
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white overflow-hidden shadow-lg rounded-xl hover:shadow-xl transition-shadow duration-300">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 rounded-lg p-3 bg-gradient-to-br ${color} shadow-lg`}>{icon}</div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate mb-1">{title}</dt>
              <dd className="text-xl font-bold text-gray-900">{value}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}