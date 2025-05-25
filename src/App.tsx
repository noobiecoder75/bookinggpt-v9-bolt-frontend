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
import { KanbanBoard } from './components/quotes/KanbanBoard';

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
  <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-300 hover:-translate-y-1 group">
    <Link to={link} className="block px-6 py-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors duration-200">{title}</h3>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">{description}</p>
        </div>
        <div className="ml-4 flex-shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg flex items-center justify-center group-hover:from-indigo-500 group-hover:to-indigo-600 transition-all duration-300">
            <span className="text-indigo-600 group-hover:text-white transition-colors duration-300 text-lg font-bold">→</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center text-sm font-medium text-indigo-600 group-hover:text-indigo-700">
        <span>Get started</span>
        <span className="ml-2 transform group-hover:translate-x-1 transition-transform duration-200">→</span>
      </div>
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
    <div className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1 group">
      <div className="flex items-center">
        <div className={`${bgColor} ${color} p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-300`}>
          {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="mt-4 h-1 bg-gradient-to-r from-gray-100 to-gray-50 rounded-full">
        <div className={`h-full w-3/4 ${bgColor.replace('bg-', 'bg-gradient-to-r from-').replace('-100', '-400 to-').replace('-100', '-300')} rounded-full transition-all duration-500 group-hover:w-full`}></div>
      </div>
    </div>
  );
}

const kanbanStageToStatus = (stage: string) => {
  switch (stage) {
    case 'Draft':
      return 'Draft';
    case 'Sent':
      return 'Sent';
    case 'Converted':
      return 'Converted';
    case 'Expired':
      return 'Expired';
    default:
      return 'Draft';
  }
};

const App: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalCustomers: 0,
    activeQuotes: 0,
    confirmedBookings: 0,
    conversionRate: 0,
  });
  const [kanbanQuotes, setKanbanQuotes] = useState<any[]>([]);

  // Function to fetch quotes
  const fetchQuotes = async () => {
    const { data, error } = await supabase
      .from('quotes')
      .select(`*, customer:customers (id, first_name, last_name, email), quote_items (id, item_type, item_name, cost, markup, markup_type)`)
      .order('created_at', { ascending: false });
    if (!error && data) setKanbanQuotes(data);
  };

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
    fetchQuotes();
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <Navbar />
        <main className="pl-0 md:pl-64 transition-all duration-300">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="sm:px-0">
              <Routes>
                <Route 
                  path="/" 
                  element={
                    <>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-8">
                        <div>
                          <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Welcome to BookingGPT
                          </h1>
                          <p className="text-gray-600 text-lg">Manage your travel bookings with AI-powered efficiency</p>
                        </div>
                        <Link
                          to="/quotes/new"
                          className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-semibold rounded-xl shadow-lg text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform hover:-translate-y-0.5"
                        >
                          <Plus className="h-5 w-5 mr-2" />
                          Create New Quote
                        </Link>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-10">
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

                      {/* Kanban Board */}
                      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
                          <div className="flex items-center justify-between">
                            <div>
                              <h2 className="text-xl font-bold text-gray-900">Quote Pipeline</h2>
                              <p className="text-sm text-gray-600 mt-1">Track your quotes through the sales process</p>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-white/80 backdrop-blur-sm text-indigo-700 border border-white/50 shadow-sm">
                                {kanbanQuotes.length} Total Quotes
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="p-6">
                          <KanbanBoard 
                            quotes={kanbanQuotes} 
                            onMoveStage={(quoteId, newStage) => {
                              setKanbanQuotes(prev => 
                                prev.map(quote => 
                                  quote.id === quoteId 
                                    ? { ...quote, status: kanbanStageToStatus(newStage) }
                                    : quote
                                )
                              );
                            }}
                            onQuoteUpdate={fetchQuotes}
                          />
                        </div>
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