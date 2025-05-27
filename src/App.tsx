import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { NewQuoteWizard } from './components/quotes/NewQuoteWizard';
import { TripOverviewRefactored } from './components/quotes/TripOverviewRefactored';
import { CreateTripDialog } from './components/quotes/CreateTripDialog';
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
    <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1 group">
      <div className="flex items-center">
        <div className={`${bgColor} ${color} p-2 sm:p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-300`}>
          {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5 sm:w-6 sm:h-6' })}
        </div>
        <div className="ml-3 sm:ml-4 flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight truncate">{value}</p>
          {subtitle && (
            <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="mt-3 sm:mt-4 h-1 bg-gradient-to-r from-gray-100 to-gray-50 rounded-full">
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
  const [showCreateTripDialog, setShowCreateTripDialog] = useState(false);

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
        <Navbar onCreateTrip={() => setShowCreateTripDialog(true)} />

        <main className="transition-all duration-300">
          <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
            <div className="sm:px-0">
              <Routes>
                <Route 
                  path="/" 
                  element={
                    <>
                      <div className="mb-8">
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-8">
                          <div className="text-center">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                              Welcome to BookingGPT
                            </h1>
                            <p className="text-gray-600 text-base sm:text-lg lg:text-xl leading-relaxed max-w-2xl mx-auto">
                              Manage your travel bookings with AI-powered efficiency and streamlined workflows
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mb-8 sm:mb-10">
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
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                          <div className="border-b border-gray-100 pb-4 mb-4 sm:mb-6">
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Recent Activity</h2>
                            <p className="text-sm text-gray-600 mt-1">Latest updates and changes</p>
                          </div>
                          <RecentActivity />
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                          <div className="border-b border-gray-100 pb-4 mb-4 sm:mb-6">
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Quick Actions</h2>
                            <p className="text-sm text-gray-600 mt-1">Get started with common tasks</p>
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            <button
                              onClick={() => setShowCreateTripDialog(true)}
                              className="text-left p-6 border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-300 hover:-translate-y-1 group bg-white"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors duration-200">Create New Trip</h3>
                                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">Start planning a new trip with comprehensive overview</p>
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
                            </button>
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
                <Route path="/trips/new" element={<TripOverviewRefactored />} />
                <Route path="/trips/:tripId" element={<TripOverviewRefactored />} />
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

        {/* Create Trip Dialog */}
        <CreateTripDialog 
          isOpen={showCreateTripDialog}
          onClose={() => setShowCreateTripDialog(false)}
        />
      </div>
    </Router>
  );
};

export default App;