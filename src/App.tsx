import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { AuthLayout } from './components/auth/AuthLayout';
import { LandingPage } from './pages/LandingPage';
import { Navbar } from './components/Navbar';
import { NewQuoteWizard } from './components/quotes/NewQuoteWizard';
import { TripOverviewRefactored } from './components/quotes/TripOverviewRefactored';
import { CreateTripDialog } from './components/quotes/CreateTripDialog';
import { SettingsDashboard } from './components/settings/SettingsDashboard';
import { CustomerDashboard } from './components/CustomerDashboard';
import { CustomerProfileView } from './components/customers/CustomerProfileView';
import { NewCustomer } from './components/customers/NewCustomer';
import { QuotesDashboard } from './components/quotes/QuotesDashboard';
import { QuoteView } from './components/quotes/QuoteView';
import { BookingsDashboard } from './components/bookings/BookingsDashboard';
import { ClientPortal } from './components/client/ClientPortal';
import { BookingWorkflowDashboard } from './components/workflow/BookingWorkflowDashboard';
import { RecentActivity } from './components/RecentActivity';
import { CommunicationsDashboard } from './components/communications/CommunicationsDashboard';
import { OAuthCallback } from './components/oauth/OAuthCallback';
import { AuthCallback } from './pages/AuthCallback';
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
  <div className="bg-white/50 backdrop-blur-sm overflow-hidden shadow-sm rounded-2xl border border-white/20 hover:shadow-xl hover:shadow-cyan-100/50 transition-all duration-300 hover:-translate-y-1 group">
    <Link to={link} className="block px-6 py-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 group-hover:text-cyan-600 transition-colors duration-200">{title}</h3>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">{description}</p>
        </div>
        <div className="ml-4 flex-shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg flex items-center justify-center group-hover:from-cyan-500 group-hover:to-cyan-600 transition-all duration-300">
            <span className="text-cyan-600 group-hover:text-white transition-colors duration-300 text-lg font-bold">→</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center text-sm font-medium text-cyan-600 group-hover:text-cyan-700">
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

// Protected App Content Component
function AppContent() {
  const { user, loading } = useAuthContext();
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalCustomers: 0,
    activeQuotes: 0,
    confirmedBookings: 0,
    conversionRate: 0,
  });
  const [kanbanQuotes, setKanbanQuotes] = useState<any[]>([]);
  const [showCreateTripDialog, setShowCreateTripDialog] = useState(false);

  // Debug state changes
  console.log('📊 App state:', {
    stats,
    kanbanQuotesCount: kanbanQuotes.length,
    showCreateTripDialog,
    timestamp: new Date().toISOString()
  });

  // Function to fetch quotes
  const fetchQuotes = async () => {
    console.log('🔄 Fetching quotes from Supabase...');
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select(`*, customer:customers (id, first_name, last_name, email), quote_items (id, item_type, item_name, cost, markup, markup_type)`)
        .order('created_at', { ascending: false });
      
      console.log('📊 Quotes fetch result:', { 
        success: !error, 
        quotesCount: data?.length || 0, 
        error: error?.message,
        timestamp: new Date().toISOString()
      });
      
      if (!error && data) {
        setKanbanQuotes(data);
        console.log('✅ Kanban quotes updated successfully');
      } else if (error) {
        console.error('🚨 Error fetching quotes:', error);
      }
    } catch (err) {
      console.error('🚨 Exception during quotes fetch:', err);
    }
  };

  useEffect(() => {
    console.log('🎣 App useEffect hook triggered - fetching dashboard data...');
    
    async function fetchDashboardStats() {
      console.log('📈 Starting dashboard stats fetch...');
      try {
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

        console.log('📊 Dashboard stats raw data:', {
          customerCount,
          quoteCount,
          activeQuoteCount,
          bookingCount,
          bookingsData: bookings?.length || 0,
          timestamp: new Date().toISOString()
        });

        const totalRevenue = bookings?.reduce((sum, booking) => sum + Number(booking.total_price), 0) || 0;
        const conversionRate = quoteCount ? ((bookingCount || 0) / quoteCount) * 100 : 0;

        const newStats = {
          totalRevenue,
          totalCustomers: customerCount || 0,
          activeQuotes: activeQuoteCount || 0,
          confirmedBookings: bookingCount || 0,
          conversionRate,
        };

        console.log('📊 Setting dashboard stats:', newStats);
        setStats(newStats);
        console.log('✅ Dashboard stats updated successfully');
      } catch (error) {
        console.error('🚨 Error fetching dashboard stats:', error);
      }
    }

    fetchDashboardStats();
    fetchQuotes();
  }, []);

  // 🔐 Console debugging for authentication
  console.log('🔐 AppContent auth state:', {
    hasUser: !!user,
    userId: user?.id,
    email: user?.email,
    loading,
    timestamp: new Date().toISOString()
  });

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Loading BookingGPT...</h2>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Client Portal Routes - No agent navbar */}
        <Route path="/client/:quoteId" element={<ClientPortal />} />
        <Route path="/client/:quoteId/itinerary" element={<ClientPortal activeSection="itinerary" />} />
        <Route path="/client/:quoteId/payment" element={<ClientPortal activeSection="payment" />} />
        <Route path="/client/:quoteId/chat" element={<ClientPortal activeSection="chat" />} />
        <Route path="/client/:quoteId/documents" element={<ClientPortal activeSection="documents" />} />
        <Route path="/client/:quoteId/email" element={<ClientPortal activeSection="email" />} />
        <Route path="/client/:quoteId/status" element={<ClientPortal activeSection="status" />} />
        
        {/* OAuth Callback Routes - No agent navbar */}
        <Route path="/oauth/gmail/callback" element={<OAuthCallback />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        
        {/* Root Route - Marketing Landing Page for unauthenticated, Dashboard redirect for authenticated */}
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
        
        {/* Authentication Routes */}
        <Route path="/login" element={<AuthLayout defaultMode="login" />} />
        <Route path="/signup" element={<AuthLayout defaultMode="signup" />} />
        
        {/* Authenticated App Routes - With agent navbar */}
        {user && (
          <>
            <Route path="/dashboard" element={
              <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
                <Navbar onCreateTrip={() => setShowCreateTripDialog(true)} />
                <main className="transition-all duration-300">
                  <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <div className="sm:px-0">
                      <div className="mb-8">
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-8">
                          <div className="text-center">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                              Welcome to BookingGPT - Pricing Fixed! 🎉
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
                    </div>
                  </div>
                </main>
                
                {/* Create Trip Dialog */}
                <CreateTripDialog 
                  isOpen={showCreateTripDialog}
                  onClose={() => setShowCreateTripDialog(false)}
                />
              </div>
            } />
            <Route path="/trips/new" element={
              <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
                <Navbar onCreateTrip={() => setShowCreateTripDialog(true)} />
                <main className="transition-all duration-300">
                  <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <TripOverviewRefactored />
                  </div>
                </main>
              </div>
            } />
            <Route path="/trips/:tripId" element={
              <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
                <Navbar onCreateTrip={() => setShowCreateTripDialog(true)} />
                <main className="transition-all duration-300">
                  <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <TripOverviewRefactored />
                  </div>
                </main>
              </div>
            } />
            <Route path="/quotes" element={
              <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
                <Navbar onCreateTrip={() => setShowCreateTripDialog(true)} />
                <main className="transition-all duration-300">
                  <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <QuotesDashboard />
                  </div>
                </main>
              </div>
            } />
            <Route path="/quotes/new" element={
              <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
                <Navbar onCreateTrip={() => setShowCreateTripDialog(true)} />
                <main className="transition-all duration-300">
                  <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <NewQuoteWizard />
                  </div>
                </main>
              </div>
            } />
            <Route path="/quotes/:id" element={
              <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
                <Navbar onCreateTrip={() => setShowCreateTripDialog(true)} />
                <main className="transition-all duration-300">
                  <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <QuoteView />
                  </div>
                </main>
              </div>
            } />
            <Route path="/bookings" element={
              <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
                <Navbar onCreateTrip={() => setShowCreateTripDialog(true)} />
                <main className="transition-all duration-300">
                  <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <BookingsDashboard />
                  </div>
                </main>
              </div>
            } />
            <Route path="/bookings/:bookingId/workflow" element={
              <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
                <Navbar onCreateTrip={() => setShowCreateTripDialog(true)} />
                <main className="transition-all duration-300">
                  <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <BookingWorkflowDashboard />
                  </div>
                </main>
              </div>
            } />
            <Route path="/customers" element={
              <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
                <Navbar onCreateTrip={() => setShowCreateTripDialog(true)} />
                <main className="transition-all duration-300">
                  <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <CustomerDashboard />
                  </div>
                </main>
              </div>
            } />
            <Route path="/customers/new" element={
              <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
                <Navbar onCreateTrip={() => setShowCreateTripDialog(true)} />
                <main className="transition-all duration-300">
                  <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <NewCustomer />
                  </div>
                </main>
              </div>
            } />
            <Route path="/customers/:id" element={
              <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
                <Navbar onCreateTrip={() => setShowCreateTripDialog(true)} />
                <main className="transition-all duration-300">
                  <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <CustomerProfileView />
                  </div>
                </main>
              </div>
            } />
            <Route path="/communications" element={
              <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
                <Navbar onCreateTrip={() => setShowCreateTripDialog(true)} />
                <main className="transition-all duration-300">
                  <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <CommunicationsDashboard />
                  </div>
                </main>
              </div>
            } />
            <Route path="/settings/*" element={
              <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
                <Navbar onCreateTrip={() => setShowCreateTripDialog(true)} />
                <main className="transition-all duration-300">
                  <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <SettingsDashboard />
                  </div>
                </main>
              </div>
            } />
          </>
        )}
      </Routes>
    </Router>
  );
}

// Main App Component with Auth Provider
const App: React.FC = () => {
  console.log('📱 App component initializing...', { timestamp: new Date().toISOString() });
  
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;