import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { DashboardStats } from './components/DashboardStats';
import { NewQuoteWizard } from './components/quotes/NewQuoteWizard';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { SettingsDashboard } from './components/settings/SettingsDashboard';
import { CustomerDashboard } from './components/CustomerDashboard';
import { QuotesDashboard } from './components/quotes/QuotesDashboard';
import { QuoteView } from './components/quotes/QuoteView';
import { BookingsDashboard } from './components/bookings/BookingsDashboard';

interface QuickActionCardProps {
  title: string;
  description: string;
  link: string;
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

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <main className="pl-64">
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <Routes>
                <Route 
                  path="/" 
                  element={
                    <>
                      <h1 className="text-3xl font-bold text-gray-900 mb-8">
                        Welcome to BookingGPT
                      </h1>
                      <DashboardStats />
                      <div className="mt-8">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">
                          Quick Actions
                        </h2>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                    </>
                  }
                />
                <Route path="/quotes" element={<QuotesDashboard />} />
                <Route path="/quotes/new" element={<NewQuoteWizard />} />
                <Route path="/quotes/:id" element={<QuoteView />} />
                <Route path="/bookings" element={<BookingsDashboard />} />
                <Route path="/customers" element={<CustomerDashboard />} />
                <Route path="/analytics" element={<AnalyticsDashboard />} />
                <Route path="/settings" element={<SettingsDashboard />} />
              </Routes>
            </div>
          </div>
        </main>
      </div>
    </Router>
  );
};

export default App;