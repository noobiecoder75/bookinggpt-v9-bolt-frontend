import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  Search, 
  Filter, 
  Plus, 
  Clock, 
  Eye, 
  Reply, 
  TrendingUp,
  Users,
  FileText,
  Calendar,
  RefreshCw,
  Settings,
  BarChart3
} from 'lucide-react';
import { useGoogleOAuth } from '../../hooks/useGoogleOAuth';
import { supabase } from '../../lib/supabase';

interface EmailCommunication {
  id: string;
  customer_id: number;
  quote_id?: string;
  email_type: string;
  subject: string;
  recipients: string[];
  status: 'sent' | 'failed' | 'bounced' | 'opened';
  sent_at: string;
  opened_at?: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface EmailStats {
  totalSent: number;
  totalOpened: number;
  totalReplies: number;
  openRate: number;
  responseRate: number;
  todaySent: number;
}

export function CommunicationsDashboard() {
  const [emails, setEmails] = useState<EmailCommunication[]>([]);
  const [stats, setStats] = useState<EmailStats>({
    totalSent: 0,
    totalOpened: 0,
    totalReplies: 0,
    openRate: 0,
    responseRate: 0,
    todaySent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showComposer, setShowComposer] = useState(false);

  const { isConnected, isLoading: gmailLoading, connect, checkConnection } = useGoogleOAuth();

  useEffect(() => {
    // Check Gmail connection for sending capabilities
    checkConnection();
    // Always fetch email data regardless of Gmail connection
    fetchEmailData();
  }, [checkConnection]);

  const fetchEmailData = async () => {
    try {
      setLoading(true);
      
      // Fetch email communications with customer data
      const { data: emailData, error } = await supabase
        .from('email_communications')
        .select(`
          *,
          customer:customers(first_name, last_name, email)
        `)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setEmails(emailData || []);

      // Calculate stats
      const totalSent = emailData?.length || 0;
      const totalOpened = emailData?.filter(email => email.opened_at).length || 0;
      const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
      
      const today = new Date().toISOString().split('T')[0];
      const todaySent = emailData?.filter(email => 
        email.sent_at.startsWith(today)
      ).length || 0;

      setStats({
        totalSent,
        totalOpened,
        totalReplies: 0, // This would need additional tracking
        openRate,
        responseRate: 0, // This would need additional tracking
        todaySent,
      });

    } catch (error) {
      console.error('Error fetching email data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmails = emails.filter(email => {
    const matchesSearch = email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.customer?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.customer?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || email.email_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  // Show loading while checking Gmail connection
  if (gmailLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-white rounded-lg shadow-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Checking Gmail Connection...</h2>
          <p className="text-gray-600">Please wait while we verify your Gmail integration.</p>
        </div>
      </div>
    );
  }

  // Gmail connection notice (but don't block the dashboard)
  const gmailNotice = !isConnected && (
    <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center">
        <Mail className="h-5 w-5 text-yellow-600 mr-2" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800">Gmail Not Connected</h3>
          <p className="text-sm text-yellow-700 mt-1">
            Connect Gmail to send new emails. You can still view existing email communications below.
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => connect()}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-800 bg-yellow-100 hover:bg-yellow-200"
          >
            Connect Gmail
          </button>
          <button
            onClick={() => window.location.href = '/settings'}
            className="inline-flex items-center px-3 py-1.5 border border-yellow-300 text-xs font-medium rounded text-yellow-800 bg-white hover:bg-yellow-50"
          >
            Settings
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Gmail Connection Notice */}
        {gmailNotice}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Communications</h1>
              <p className="text-gray-600">Manage email communications with your customers</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchEmailData}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={() => setShowComposer(true)}
                disabled={!isConnected}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
                  isConnected 
                    ? 'text-white bg-indigo-600 hover:bg-indigo-700' 
                    : 'text-gray-400 bg-gray-300 cursor-not-allowed'
                }`}
                title={!isConnected ? 'Connect Gmail to compose emails' : 'Compose new email'}
              >
                <Plus className="h-4 w-4 mr-2" />
                Compose Email
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Send className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Sent</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalSent}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Eye className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Opened</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalOpened}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Open Rate</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.openRate.toFixed(1)}%</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Today</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.todaySent}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Reply className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Responses</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalReplies}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Email Activity</h3>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search emails..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Types</option>
                  <option value="welcome">Welcome</option>
                  <option value="quote">Quote</option>
                  <option value="booking">Booking</option>
                  <option value="payment">Payment</option>
                  <option value="follow-up">Follow-up</option>
                </select>
              </div>
            </div>
          </div>

          {/* Email List */}
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-6 text-center">
                <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 mx-auto mb-2" />
                <p className="text-gray-600">Loading email communications...</p>
              </div>
            ) : filteredEmails.length > 0 ? (
              filteredEmails.map((email) => (
                <div key={email.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          email.status === 'opened' ? 'bg-green-500' :
                          email.status === 'sent' ? 'bg-blue-500' :
                          email.status === 'failed' ? 'bg-red-500' :
                          'bg-gray-400'
                        }`} />
                        <h4 className="text-sm font-medium text-gray-900">{email.subject}</h4>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {email.email_type}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <span>To: {email.customer?.first_name} {email.customer?.last_name}</span>
                        <span>{email.recipients.join(', ')}</span>
                        <span>{new Date(email.sent_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {email.opened_at && (
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                          Opened
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(email.sent_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No emails found</h3>
                <p className="text-gray-600">
                  {searchTerm || filterType !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'Start by composing your first email'
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Email Composer Modal - Placeholder */}
        {showComposer && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Compose Email</h3>
                  <button
                    onClick={() => setShowComposer(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Email Composer</h4>
                  <p className="text-gray-600">
                    Email composition interface will be integrated here.
                    This will include template selection, recipient management, and email sending capabilities.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}