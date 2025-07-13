import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  CheckCircle, 
  Users, 
  Zap, 
  Globe, 
  CreditCard, 
  MessageCircle, 
  BarChart3,
  Shield,
  Star,
  Menu,
  X,
  Mail,
  Phone,
  DollarSign,
  Clock,
  TrendingDown,
  AlertTriangle,
  Target,
  Briefcase
} from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'individual' | 'agency'>('individual');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignIn = () => {
    navigate('/login');
  };

  const handleSignUp = () => {
    navigate('/signup');
  };

  const handleGetStarted = () => {
    navigate('/signup');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex items-center">
              <div className="text-2xl font-bold text-indigo-600">BookingGPT</div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900 transition-colors">Reviews</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900 transition-colors">Contact</a>
            </nav>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={handleSignIn}
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={handleSignUp}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Get Started
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-100">
              <div className="flex flex-col space-y-4">
                <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
                <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
                <a href="#testimonials" className="text-gray-600 hover:text-gray-900">Reviews</a>
                <a href="#contact" className="text-gray-600 hover:text-gray-900">Contact</a>
                <div className="flex flex-col space-y-2 pt-4 border-t border-gray-100">
                  <button
                    onClick={handleSignIn}
                    className="text-left text-gray-600 hover:text-gray-900 font-medium"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={handleSignUp}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 text-left"
                  >
                    Get Started
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(34,197,94,0.1),transparent_50%)]"></div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-indigo-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-16 w-16 h-16 bg-cyan-200 rounded-full opacity-30 animate-bounce delay-1000"></div>
        <div className="absolute bottom-20 left-20 w-12 h-12 bg-purple-200 rounded-full opacity-25 animate-pulse delay-500"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-gray-900 bg-clip-text text-transparent mb-6 leading-tight">
              Stop Losing $50K+ Annually to Inefficient Travel Operations
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-8 leading-relaxed">
              The Only AI-Powered Platform That Eliminates Revenue Leaks, Saves 20+ Hours/Week, and Prevents Client Churn
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
              <button
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl flex items-center justify-center shadow-lg"
              >
                Start Free Trial - No Credit Card
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
              <button
                onClick={handleSignIn}
                className="border-2 border-indigo-200 bg-white text-indigo-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-200 shadow-sm"
              >
                Access Your Account
              </button>
            </div>
            
            {/* Key Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center group">
                <div className="bg-gradient-to-br from-emerald-100 to-emerald-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 transform group-hover:scale-110 transition-all duration-300 shadow-lg">
                  <DollarSign className="h-10 w-10 text-emerald-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">Save $50K+ Annually</h3>
                <p className="text-gray-600">Eliminate pricing errors and capture missed revenue opportunities</p>
              </div>
              <div className="text-center group">
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 transform group-hover:scale-110 transition-all duration-300 shadow-lg">
                  <Clock className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">20+ Hours/Week Saved</h3>
                <p className="text-gray-600">Automated workflows eliminate manual quote creation and admin tasks</p>
              </div>
              <div className="text-center group">
                <div className="bg-gradient-to-br from-purple-100 to-purple-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 transform group-hover:scale-110 transition-all duration-300 shadow-lg">
                  <Target className="h-10 w-10 text-purple-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">40% More Conversions</h3>
                <p className="text-gray-600">Faster response times and AI-optimized pricing increase bookings</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-gradient-to-br from-red-50 via-gray-50 to-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Is Your Travel Agency Bleeding Money Every Day?
            </h2>
            <p className="text-xl text-gray-700 leading-relaxed">
              <span className="text-red-600 font-semibold">95% of travel agencies</span> lose significant revenue due to operational inefficiencies, pricing errors, and manual processes. Here's what it's really costing you:
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
                <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
                The Hidden Costs of Inefficiency:
              </h3>
              <div className="space-y-6">
                <div className="flex items-start bg-white p-6 rounded-xl shadow-lg border-l-4 border-red-400">
                  <DollarSign className="h-8 w-8 text-red-500 mt-1 mr-4 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">$50K+ Annual Revenue Loss</h4>
                    <p className="text-gray-600 mt-1">Pricing errors, missed upsells, and competitors stealing clients with faster service</p>
                  </div>
                </div>
                <div className="flex items-start bg-white p-6 rounded-xl shadow-lg border-l-4 border-orange-400">
                  <Clock className="h-8 w-8 text-orange-500 mt-1 mr-4 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">20+ Hours Weekly Waste</h4>
                    <p className="text-gray-600 mt-1">Manual quote creation, data entry, and switching between 5+ different tools</p>
                  </div>
                </div>
                <div className="flex items-start bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-400">
                  <TrendingDown className="h-8 w-8 text-purple-500 mt-1 mr-4 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">30% Client Loss Rate</h4>
                    <p className="text-gray-600 mt-1">Slow response times, communication gaps, and poor follow-up systems</p>
                  </div>
                </div>
                <div className="flex items-start bg-white p-6 rounded-xl shadow-lg border-l-4 border-red-400">
                  <Briefcase className="h-8 w-8 text-red-500 mt-1 mr-4 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">$15K+ Per Agent Turnover</h4>
                    <p className="text-gray-600 mt-1">Burnout from repetitive tasks and frustration with outdated systems</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
                <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
                BookingGPT Transforms Everything:
              </h3>
              <div className="space-y-6">
                <div className="flex items-start bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl shadow-lg border-l-4 border-green-400">
                  <DollarSign className="h-8 w-8 text-green-600 mt-1 mr-4 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">Recover Lost Revenue</h4>
                    <p className="text-gray-600 mt-1">AI-powered pricing prevents errors and captures every upsell opportunity automatically</p>
                  </div>
                </div>
                <div className="flex items-start bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-xl shadow-lg border-l-4 border-blue-400">
                  <Zap className="h-8 w-8 text-blue-600 mt-1 mr-4 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">Automate Everything</h4>
                    <p className="text-gray-600 mt-1">One-click quote generation, automated follow-ups, and integrated booking management</p>
                  </div>
                </div>
                <div className="flex items-start bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl shadow-lg border-l-4 border-purple-400">
                  <Users className="h-8 w-8 text-purple-600 mt-1 mr-4 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">Keep Clients Happy</h4>
                    <p className="text-gray-600 mt-1">Instant responses, real-time updates, and seamless communication that prevents churn</p>
                  </div>
                </div>
                <div className="flex items-start bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl shadow-lg border-l-4 border-indigo-400">
                  <BarChart3 className="h-8 w-8 text-indigo-600 mt-1 mr-4 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">Scale Your Team</h4>
                    <p className="text-gray-600 mt-1">Built-in training, performance tracking, and role-based permissions reduce turnover</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dual Value Proposition Tabs */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Built for Every Type of Travel Professional
            </h2>
            <p className="text-xl text-gray-600">
              Whether you're a solo agent or managing a team of 50+, our platform scales with your business.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-12">
            <div className="bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('individual')}
                className={`px-6 py-3 rounded-md font-semibold transition-all ${
                  activeTab === 'individual'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                For Individual Agents
              </button>
              <button
                onClick={() => setActiveTab('agency')}
                className={`px-6 py-3 rounded-md font-semibold transition-all ${
                  activeTab === 'agency'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                For Agency Teams
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'individual' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center group">
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                  <Zap className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">AI-Powered Booking</h3>
                <p className="text-gray-600 leading-relaxed">Smart quote generation with optimal pricing strategies that maximize profits</p>
              </div>
              <div className="text-center group">
                <div className="bg-gradient-to-br from-green-100 to-green-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                  <Users className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">Customer Management</h3>
                <p className="text-gray-600 leading-relaxed">Complete traveler profiles with passport tracking and preference management</p>
              </div>
              <div className="text-center group">
                <div className="bg-gradient-to-br from-purple-100 to-purple-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                  <CreditCard className="h-10 w-10 text-purple-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">Payment Processing</h3>
                <p className="text-gray-600 leading-relaxed">Secure payments with real-time commission tracking and automated invoicing</p>
              </div>
              <div className="text-center group">
                <div className="bg-gradient-to-br from-orange-100 to-orange-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                  <MessageCircle className="h-10 w-10 text-orange-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">Email Automation</h3>
                <p className="text-gray-600 leading-relaxed">Automated client communication with open tracking and follow-up sequences</p>
              </div>
            </div>
          )}

          {activeTab === 'agency' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center group">
                <div className="bg-gradient-to-br from-indigo-100 to-indigo-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                  <Users className="h-10 w-10 text-indigo-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">Team Management</h3>
                <p className="text-gray-600 leading-relaxed">Role-based permissions with real-time agent oversight and performance tracking</p>
              </div>
              <div className="text-center group">
                <div className="bg-gradient-to-br from-cyan-100 to-cyan-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                  <BarChart3 className="h-10 w-10 text-cyan-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">Performance Analytics</h3>
                <p className="text-gray-600 leading-relaxed">Comprehensive dashboards showing team performance and revenue metrics</p>
              </div>
              <div className="text-center group">
                <div className="bg-gradient-to-br from-red-100 to-red-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                  <Shield className="h-10 w-10 text-red-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">Access Control</h3>
                <p className="text-gray-600 leading-relaxed">Granular permissions and security controls for different user roles and data access</p>
              </div>
              <div className="text-center group">
                <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                  <Globe className="h-10 w-10 text-yellow-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">Shared Resources</h3>
                <p className="text-gray-600 leading-relaxed">Centralized customer database and unified pricing controls across all agents</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-900 to-purple-900 bg-clip-text text-transparent mb-6">
              Real Results From Real Agencies
            </h2>
            <p className="text-xl text-gray-700">
              Join hundreds of agencies already experiencing these measurable improvements
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-indigo-100">
              <div className="bg-gradient-to-br from-emerald-500 to-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <div className="text-5xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-2">20+</div>
              <div className="text-xl font-bold text-gray-900 mb-3">Hours Saved Per Week</div>
              <p className="text-gray-600 leading-relaxed">Automated workflows eliminate manual quote creation and administrative tasks</p>
            </div>
            <div className="text-center bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-purple-100">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingDown className="h-8 w-8 text-white" />
              </div>
              <div className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">45%</div>
              <div className="text-xl font-bold text-gray-900 mb-3">Increase in Conversions</div>
              <p className="text-gray-600 leading-relaxed">AI-powered pricing optimization and faster response times boost booking rates</p>
            </div>
            <div className="text-center bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-pink-100">
              <div className="bg-gradient-to-br from-pink-500 to-rose-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
              <div className="text-5xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent mb-2">$50K+</div>
              <div className="text-xl font-bold text-gray-900 mb-3">Annual Revenue Recovery</div>
              <p className="text-gray-600 leading-relaxed">Eliminate pricing errors and capture missed upsell opportunities automatically</p>
            </div>
          </div>
          
          {/* Additional Statistics Row */}
          <div className="mt-16 bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-indigo-600 mb-2">2 mins</div>
                <div className="text-gray-700 font-medium">Average Quote Creation</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600 mb-2">90%</div>
                <div className="text-gray-700 font-medium">Agent Satisfaction</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600 mb-2">24/7</div>
                <div className="text-gray-700 font-medium">Client Support</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-pink-600 mb-2">3x</div>
                <div className="text-gray-700 font-medium">Faster Onboarding</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that fits your business size. All plans include our core features with different team sizes and support levels.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {/* Starter Plan */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 relative">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Starter</h3>
                <p className="text-gray-600 mb-6">Perfect for individual agents</p>
                <div className="mb-8">
                  <span className="text-4xl font-bold text-gray-900">$49</span>
                  <span className="text-gray-600 ml-2">/month</span>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Up to 1 agent</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Unlimited customers</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">AI-powered booking engine</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Payment processing</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Email automation</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Basic reporting</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Email support</span>
                </li>
              </ul>
              
              <button
                onClick={handleGetStarted}
                className="w-full bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
              >
                Start Free Trial
              </button>
            </div>

            {/* Professional Plan */}
            <div className="bg-white rounded-2xl shadow-xl border-2 border-indigo-500 p-8 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-indigo-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
              
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Professional</h3>
                <p className="text-gray-600 mb-6">Great for small agencies</p>
                <div className="mb-8">
                  <span className="text-4xl font-bold text-gray-900">$149</span>
                  <span className="text-gray-600 ml-2">/month</span>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Up to 5 agents</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Everything in Starter</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Team management & permissions</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Advanced analytics</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Performance tracking</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Priority email support</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Phone support</span>
                </li>
              </ul>
              
              <button
                onClick={handleGetStarted}
                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
              >
                Start Free Trial
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 relative">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
                <p className="text-gray-600 mb-6">For large agencies</p>
                <div className="mb-8">
                  <span className="text-4xl font-bold text-gray-900">$399</span>
                  <span className="text-gray-600 ml-2">/month</span>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Unlimited agents</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Everything in Professional</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Custom integrations</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Advanced security & compliance</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">White-label options</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Dedicated account manager</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">24/7 priority support</span>
                </li>
              </ul>
              
              <button
                onClick={handleGetStarted}
                className="w-full bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
              >
                Contact Sales
              </button>
            </div>
          </div>

          {/* Pricing FAQ */}
          <div className="mt-16 text-center">
            <p className="text-gray-600 mb-4">
              All plans include a 14-day free trial. No credit card required.
            </p>
            <p className="text-sm text-gray-500">
              Need a custom plan? <a href="#contact" className="text-indigo-600 hover:text-indigo-700 underline">Contact our sales team</a>
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Trusted by Travel Professionals Worldwide
            </h2>
            <p className="text-xl text-gray-600">
              See what our customers are saying about their experience with BookingGPT
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <div className="flex items-center mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <blockquote className="text-gray-700 mb-6">
                "BookingGPT transformed our agency operations completely. We've cut our quote preparation time by 70% and our team productivity has never been higher. The AI-powered pricing is incredibly accurate."
              </blockquote>
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-indigo-600 font-semibold">SM</span>
                </div>
                <div className="ml-4">
                  <p className="font-semibold text-gray-900">Sarah Mitchell</p>
                  <p className="text-gray-600 text-sm">CEO, Adventure Travel Co.</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <div className="flex items-center mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <blockquote className="text-gray-700 mb-6">
                "The team management features are outstanding. I can finally see what all my agents are working on in real-time. Our revenue has increased by 40% since switching to BookingGPT."
              </blockquote>
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 font-semibold">MC</span>
                </div>
                <div className="ml-4">
                  <p className="font-semibold text-gray-900">Michael Chen</p>
                  <p className="text-gray-600 text-sm">Director, Global Escapes</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <div className="flex items-center mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <blockquote className="text-gray-700 mb-6">
                "As a solo agent, I was drowning in admin work. BookingGPT's automation freed up 15+ hours per week that I now spend on what I love - planning amazing trips for my clients."
              </blockquote>
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-purple-600 font-semibold">LR</span>
                </div>
                <div className="ml-4">
                  <p className="font-semibold text-gray-900">Lisa Rodriguez</p>
                  <p className="text-gray-600 text-sm">Independent Travel Agent</p>
                </div>
              </div>
            </div>
          </div>

          {/* Social Proof Stats */}
          <div className="mt-16 bg-indigo-50 rounded-2xl p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl md:text-4xl font-bold text-indigo-600 mb-2">500+</div>
                <div className="text-gray-700 font-medium">Active Agencies</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-indigo-600 mb-2">2M+</div>
                <div className="text-gray-700 font-medium">Quotes Generated</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-indigo-600 mb-2">$50M+</div>
                <div className="text-gray-700 font-medium">Revenue Processed</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-indigo-600 mb-2">4.9/5</div>
                <div className="text-gray-700 font-medium">Customer Rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-700 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.05),transparent_50%)]"></div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
            Stop Losing Money Every Day Your Agency Operates Inefficiently
          </h2>
          <p className="text-xl md:text-2xl text-indigo-100 mb-8 leading-relaxed">
            Join <span className="font-bold text-white">500+ agencies</span> already saving $50K+ annually and 20+ hours per week
          </p>
          
          {/* Urgency Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold text-white mb-1">$137</div>
              <div className="text-indigo-100 text-sm">Lost per day without optimization</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold text-white mb-1">4 hrs</div>
              <div className="text-indigo-100 text-sm">Wasted daily on manual tasks</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold text-white mb-1">30%</div>
              <div className="text-indigo-100 text-sm">Of clients likely to churn</div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={handleGetStarted}
              className="bg-white text-indigo-700 px-10 py-5 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl flex items-center justify-center shadow-xl"
            >
              Start Free Trial - See Results in 24 Hours
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
            <button
              onClick={handleSignIn}
              className="border-2 border-white/30 bg-white/10 backdrop-blur-sm text-white px-8 py-5 rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-200"
            >
              Access Your Account
            </button>
          </div>
          
          <p className="text-indigo-200 text-sm mt-6">
            ✓ No credit card required ✓ 14-day free trial ✓ Setup in under 10 minutes
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Get in Touch
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                Ready to see how BookingGPT can transform your travel business? Contact our team for a personalized demo.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-center">
                  <Mail className="h-6 w-6 text-indigo-400 mr-4" />
                  <div>
                    <p className="font-semibold">Email us</p>
                    <p className="text-gray-300">sales@bookinggpt.com</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Phone className="h-6 w-6 text-indigo-400 mr-4" />
                  <div>
                    <p className="font-semibold">Call us</p>
                    <p className="text-gray-300">+1 (555) 123-4567</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <MessageCircle className="h-6 w-6 text-indigo-400 mr-4" />
                  <div>
                    <p className="font-semibold">Live chat</p>
                    <p className="text-gray-300">Available 24/7 for support</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Request a Demo</h3>
              <form className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Email
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter your business email"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter your company name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Size
                  </label>
                  <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                    <option>Just me (1 agent)</option>
                    <option>Small team (2-5 agents)</option>
                    <option>Medium team (6-15 agents)</option>
                    <option>Large team (16-50 agents)</option>
                    <option>Enterprise (50+ agents)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message (Optional)
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Tell us about your current challenges or what you'd like to see in a demo..."
                  ></textarea>
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Schedule Demo
                </button>
                
                <p className="text-sm text-gray-500 text-center">
                  By submitting this form, you agree to our{' '}
                  <a href="#" className="text-indigo-600 hover:text-indigo-700 underline">
                    Privacy Policy
                  </a>
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold text-white mb-4">BookingGPT</div>
              <p className="text-gray-400">
                The complete AI-powered platform for travel agencies and professionals.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Training</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 BookingGPT. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}