import React from 'react';
import { Calendar, CreditCard, MessageCircle, MapPin, Clock, Phone, Mail, Star, FileText, BarChart, Route } from 'lucide-react';

interface Quote {
  id: string;
  quote_reference?: string;
  status: string;
  total_price: number;
  expiry_date: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
  };
  trip_start_date?: string;
  trip_end_date?: string;
}

interface ClientPortalLayoutProps {
  quote: Quote;
  currentSection: 'quote' | 'itinerary' | 'payment' | 'chat' | 'documents' | 'status';
  onSectionChange: (section: 'quote' | 'itinerary' | 'payment' | 'chat' | 'documents' | 'status') => void;
  children: React.ReactNode;
}

export function ClientPortalLayout({ 
  quote, 
  currentSection, 
  onSectionChange, 
  children 
}: ClientPortalLayoutProps) {
  
  // Calculate days until expiry
  const getDaysUntilExpiry = () => {
    const expiryDate = new Date(quote.expiry_date);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilExpiry = getDaysUntilExpiry();
  const isExpiringSoon = daysUntilExpiry <= 7;
  const isExpired = daysUntilExpiry < 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header with Agent Info */}
      <header className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 shadow-xl">
        <div className="max-w-7xl mx-auto">
          {/* Agent Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 border-b border-white/20">
            <div className="flex items-center gap-4">
              <img 
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&w=256&h=256&q=80" 
                alt="Travel Agent" 
                className="w-16 h-16 rounded-full border-4 border-white shadow-lg"
              />
              <div className="text-center sm:text-left">
                <h2 className="text-xl font-bold text-white">Sarah Johnson</h2>
                <p className="text-blue-100">Senior Travel Consultant</p>
                <div className="flex items-center gap-4 mt-2">
                  <a 
                    href="mailto:sarah.johnson@bookinggpt.com" 
                    className="text-white/80 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">sarah@bookinggpt.com</span>
                  </a>
                  <a 
                    href="tel:+15551234567" 
                    className="text-white/80 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">+1 (555) 123-4567</span>
                  </a>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
                <Star className="w-3 h-3 mr-1" />
                4.9/5 Rating
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
                ✈️ 500+ Trips Planned
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="px-6 py-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">
                  Your Dream Trip Awaits, {quote.customer.first_name}!
                </h1>
                <p className="text-blue-100 text-sm">
                  Quote {quote.quote_reference} • Created for your adventure
                </p>
              </div>
              
              {/* Quote Status & Urgency */}
              <div className="text-right">
                <div className="text-2xl font-bold text-white mb-1">
                  ${quote.total_price.toLocaleString()}
                </div>
                <div className="flex flex-col gap-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    quote.status === 'Sent' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {quote.status}
                  </span>
                  {!isExpired && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      isExpiringSoon 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-white/20 text-white'
                    }`}>
                      {isExpiringSoon && <Clock className="w-3 h-3 inline mr-1" />}
                      {daysUntilExpiry} days left
                    </span>
                  )}
                  {isExpired && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Quote Expired
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Section Navigation */}
            <div className="flex flex-wrap gap-1 mt-4 bg-white/10 backdrop-blur-sm rounded-2xl p-2 border border-white/20">
              <button
                onClick={() => onSectionChange('quote')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  currentSection === 'quote'
                    ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">Overview</span>
                <span className="sm:hidden">Overview</span>
              </button>
              <button
                onClick={() => onSectionChange('itinerary')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  currentSection === 'itinerary'
                    ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Route className="w-4 h-4" />
                <span className="hidden sm:inline">Itinerary</span>
                <span className="sm:hidden">Timeline</span>
              </button>
              <button
                onClick={() => onSectionChange('payment')}
                disabled={isExpired}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  currentSection === 'payment'
                    ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm'
                    : isExpired
                    ? 'text-white/30 cursor-not-allowed'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Payment</span>
                <span className="sm:hidden">Pay</span>
              </button>
              <button
                onClick={() => onSectionChange('documents')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  currentSection === 'documents'
                    ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Documents</span>
                <span className="sm:hidden">Docs</span>
              </button>
              <button
                onClick={() => onSectionChange('status')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  currentSection === 'status'
                    ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <BarChart className="w-4 h-4" />
                <span className="hidden sm:inline">Status</span>
                <span className="sm:hidden">Status</span>
              </button>
              <button
                onClick={() => onSectionChange('chat')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  currentSection === 'chat'
                    ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Chat</span>
                <span className="sm:hidden">Chat</span>
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-md border-t border-white/20 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="flex justify-center items-center gap-2 mb-4">
              <Calendar className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent">
                BookingGPT
              </span>
            </div>
            <p className="text-slate-600 text-sm mb-4">
              Your trusted travel partner • Making dream trips a reality
            </p>
            <div className="flex justify-center gap-6 text-sm text-slate-500">
              <span>📞 24/7 Support Available</span>
              <span>🔒 Secure Payment Processing</span>
              <span>✈️ IATA Certified Agency</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}