import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { NewQuoteWizard } from './components/quotes/NewQuoteWizard';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { SettingsDashboard } from './components/settings/SettingsDashboard';
import { CustomerDashboard } from './components/CustomerDashboard';
import { CustomerProfileView } from './components/customers/CustomerProfileView';
import { QuotesDashboard } from './components/quotes/QuotesDashboard';
import { QuoteView } from './components/quotes/QuoteView';
import { BookingsDashboard } from './components/bookings/BookingsDashboard';
import { RecentActivity } from './components/RecentActivity';
import { DollarSign, Users, FileText, Calendar, TrendingUp, Plus } from 'lucide-react';
import { supabase } from './lib/supabase';

interface QuickActionCardProps {
  title: string;
  description: string;
  link: string;
}

interface DashboardStats {
  totalRevenue: number;
  totalCustomers: number;
  activeQuotes: number;
  confirmedBookings: number;
  conversionRate: number;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ title, description, link }) => (
  <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200">
    <Link to={link} className="block px-4 py-5 sm:p-6">
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      <span className="mt-4 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500">
        Get started <span className="ml-1">→</span>
      </span>
    </Link>
  </div>
);

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
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center">
        <div className={`${bgColor} ${color} p-2 sm:p-3 rounded-lg`}>
          {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5 sm:w-6 sm:h-6' })}
        </div>
        <div className="ml-3 sm:ml-4">
          <p className="text-xs sm:text-sm font-medium text-gray-600">{title}</p>
          <p className="text-lg sm:text-2xl font-semibold text-gray-900 mt-0.5 sm:mt-1">{value}</p>
          {subtitle && <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

const App: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalCustomers: 0,
    activeQuotes: 0,
    confirmedBookings: 0,
    conversionRate: 0,
  });

  useEffect(() => {
    async function fetchDashboardStats() {
      const [
        { count: customerCount },
        { count: quoteCount },
        { count: activeQuoteCount },
        { count: bookingCount },
        { data: bookings },
      ] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('quotes').select('*', { count: 'exact', head: true }),
        supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'Sent'),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'Confirmed'),
        supabase.from('bookings').select('total_price').eq('status', 'Confirmed'),
      ]);

      const totalRevenue = bookings?.reduce((sum, booking) => sum + Number(booking.total_price), 0) || 0;
      const conversionRate = quoteCount ? ((bookingCount || 0) / quoteCount) * 100 : 0;

      setStats({
        totalRevenue,
        totalCustomers: customerCount || 0,
        activeQuotes: activeQuoteCount || 0,
        confirmedBookings: bookingCount || 0,
        conversionRate,
      });
    }

    fetchDashboardStats();
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <main className="pl-0 md:pl-64 transition-all duration-300">
          <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
            <div className="sm:px-0">
              <Routes>
                <Route 
                  path="/" 
                  element={
                    <>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 sm:mb-8">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                          Welcome to BookingGPT
                        </h1>
                        <Link
                          to="/quotes/new"
                          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                          <Plus className="h-5 w-5 mr-2" />
                          Create New Quote
                        </Link>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5 mb-6 sm:mb-8">
                        <StatCard
                          title="Total Revenue"
                          value={`$${stats.totalRevenue.toLocaleString()}`}
                          icon={<DollarSign />}
                          color="text-emerald-600"
                          bgColor="bg-emerald-100"
                          subtitle="From confirmed bookings"
                        />
                        <StatCard
                          title="Total Customers"
                          value={stats.totalCustomers.toString()}
                          icon={<Users />}
                          color="text-blue-600"
                          bgColor="bg-blue-100"
                          subtitle="Active customers"
                        />
                        <StatCard
                          title="Active Quotes"
                          value={stats.activeQuotes.toString()}
                          icon={<FileText />}
                          color="text-amber-600"
                          bgColor="bg-amber-100"
                          subtitle="Pending response"
                        />
                        <StatCard
                          title="Confirmed Bookings"
                          value={stats.confirmedBookings.toString()}
                          icon={<Calendar />}
                          color="text-purple-600"
                          bgColor="bg-purple-100"
                          subtitle="Ready for travel"
                        />
                        <StatCard
                          title="Conversion Rate"
                          value={`${stats.conversionRate.toFixed(1)}%`}
                          icon={<TrendingUp />}
                          color="text-indigo-600"
                          bgColor="bg-indigo-100"
                          subtitle="Quotes to bookings"
                        />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {/* Recent Activity */}
                        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
                          <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
                          <RecentActivity />
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
                          <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
                          <div className="grid grid-cols-1 gap-4">
                            <QuickActionCard
                              title="Create New Quote"
                              description="Generate a new travel quote for a customer"
                              link="/quotes/new"
                            />
                            <QuickActionCard
                              title="Add Customer"
                              description="Add a new customer to the system"
                              link="/customers/new"
                            />
                            <QuickActionCard
                              title="View Bookings"
                              description="Check your upcoming and recent bookings"
                              link="/bookings"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  }
                />
                <Route path="/quotes" element={<QuotesDashboard />} />
                <Route path="/quotes/new" element={<NewQuoteWizard />} />
                <Route path="/quotes/:id" element={<QuoteView />} />
                <Route path="/bookings" element={<BookingsDashboard />} />
                <Route path="/customers" element={<CustomerDashboard />} />
                <Route path="/customers/:id" element={<CustomerProfileView />} />
                <Route path="/analytics" element={<AnalyticsDashboard />} />
                <Route path="/settings/*" element={<SettingsDashboard />} />
              </Routes>
            </div>
          </div>
        </main>
      </div>
    </Router>
  );
};

export default App;