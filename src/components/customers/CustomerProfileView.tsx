import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  User, Mail, Phone, Globe, Calendar, FileText, 
  DollarSign, Edit2, Save, X, ChevronDown, ChevronUp,
  Download, Send, CheckCircle, AlertCircle, Plus, Eye
} from 'lucide-react';
import { useGoogleOAuth } from '../../hooks/useGoogleOAuth';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  subtitle: string;
}

function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  return (
    <div className="bg-white overflow-hidden shadow-lg rounded-xl hover:shadow-xl transition-shadow duration-300">
      <div className="p-4 sm:p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 rounded-lg p-2 sm:p-3 bg-gradient-to-br ${color} shadow-lg`}>
            {React.cloneElement(icon as React.ReactElement, { className: 'h-5 w-5 sm:h-6 sm:w-6 text-white' })}
          </div>
          <div className="ml-3 sm:ml-5 w-0 flex-1">
            <dl>
              <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate mb-1">{title}</dt>
              <dd className="text-lg sm:text-xl font-bold text-gray-900">{value}</dd>
              <dd className="text-xs sm:text-sm text-gray-500 mt-1">{subtitle}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  passport_number: string;
  passport_expiry: string;
  nationality: string;
  date_of_birth: string;
  created_at: string;
}

interface CustomerEvent {
  id: number;
  customer_id: number;
  event_type: 'QUOTE_CREATED' | 'QUOTE_UPDATED' | 'QUOTE_SENT' | 'QUOTE_EXPIRED' | 'QUOTE_CONVERTED' |
              'BOOKING_CREATED' | 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED' | 'BOOKING_COMPLETED' |
              'PAYMENT_RECEIVED';
  quote_id?: number;
  booking_id?: number;
  description: string;
  created_at: string;
}

interface Quote {
  id: number;
  quote_reference: string;
  status: 'Draft' | 'Sent' | 'Expired' | 'Converted' | 'Published';
  total_price: number;
  created_at: string;
}

interface Booking {
  id: number;
  booking_reference: string;
  status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed';
  total_price: number;
  amount_paid: number;
  created_at: string;
}

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
}

export function CustomerProfileView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [events, setEvents] = useState<CustomerEvent[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [emails, setEmails] = useState<EmailCommunication[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCustomer, setEditedCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'quotes' | 'bookings' | 'payments' | 'emails'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isConnected } = useGoogleOAuth();

  useEffect(() => {
    if (id) {
      fetchCustomerData();
    }
  }, [id]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      
      // Fetch customer details
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);
      setEditedCustomer(customerData);

      // Fetch customer events
      const { data: eventsData, error: eventsError } = await supabase
        .from('customer_events')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;
      setEvents(eventsData);

      // Fetch quotes
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });

      if (quotesError) throw quotesError;
      setQuotes(quotesData);

      // Fetch bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;
      setBookings(bookingsData);

      // Fetch email communications
      const { data: emailsData, error: emailsError } = await supabase
        .from('email_communications')
        .select('*')
        .eq('customer_id', id)
        .order('sent_at', { ascending: false });

      if (emailsError) throw emailsError;
      setEmails(emailsData || []);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editedCustomer) return;

    try {
      const { error } = await supabase
        .from('customers')
        .update(editedCustomer)
        .eq('id', editedCustomer.id);

      if (error) throw error;

      setCustomer(editedCustomer);
      setIsEditing(false);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleCancel = () => {
    setEditedCustomer(customer);
    setIsEditing(false);
  };

  const getEventIcon = (eventType: CustomerEvent['event_type']) => {
    switch (eventType) {
      case 'QUOTE_CREATED':
      case 'QUOTE_UPDATED':
      case 'QUOTE_SENT':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'QUOTE_CONVERTED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'BOOKING_CREATED':
      case 'BOOKING_CONFIRMED':
        return <Calendar className="h-5 w-5 text-indigo-500" />;
      case 'PAYMENT_RECEIVED':
        return <DollarSign className="h-5 w-5 text-green-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleEventClick = (event: CustomerEvent) => {
    switch (event.event_type) {
      case 'QUOTE_CREATED':
      case 'QUOTE_UPDATED':
      case 'QUOTE_SENT':
      case 'QUOTE_CONVERTED':
        if (event.quote_id) {
          navigate(`/quotes/${event.quote_id}`);
        }
        break;
      case 'BOOKING_CREATED':
      case 'BOOKING_CONFIRMED':
      case 'BOOKING_CANCELLED':
      case 'BOOKING_COMPLETED':
        if (event.booking_id) {
          navigate(`/bookings/${event.booking_id}`);
        }
        break;
      case 'PAYMENT_RECEIVED':
        // Navigate to payment details when implemented
        setActiveTab('payments');
        break;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700">Error loading customer: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
          <div className="flex items-center">
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-lg sm:text-2xl font-medium text-indigo-600">
                {customer.first_name[0]}
                {customer.last_name[0]}
              </span>
            </div>
            <div className="ml-3 sm:ml-4">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                {customer.first_name} {customer.last_name}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                Customer since {new Date(customer.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => navigate(`/quotes/new?customer=${customer.id}`)}
              className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Create Quote
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 sm:mb-8">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
          {[
            { id: 'overview', name: 'Overview & Timeline' },
            { id: 'quotes', name: 'Quotes' },
            { id: 'bookings', name: 'Bookings' },
            { id: 'emails', name: `Emails ${emails.length > 0 ? `(${emails.length})` : ''}` },
            { id: 'payments', name: 'Payments' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`
                whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-4 sm:space-y-6">
        {activeTab === 'overview' && (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6 mb-4 sm:mb-6">
              <StatCard
                title="Total Quotes Value"
                value={`$${quotes.reduce((total, quote) => total + quote.total_price, 0).toLocaleString()}`}
                icon={<FileText className="h-6 w-6 text-white" />}
                color="from-blue-500 to-blue-600"
                subtitle={`${quotes.length} quotes total`}
              />
              <StatCard
                title="Active Quotes Value"
                value={`$${quotes
                  .filter(quote => quote.status === 'Sent')
                  .reduce((total, quote) => total + quote.total_price, 0)
                  .toLocaleString()}`}
                icon={<Send className="h-6 w-6 text-white" />}
                color="from-amber-500 to-amber-600"
                subtitle={`${quotes.filter(quote => quote.status === 'Sent').length} active quotes`}
              />
              <StatCard
                title="Total Bookings Value"
                value={`$${bookings.reduce((total, booking) => total + booking.total_price, 0).toLocaleString()}`}
                icon={<Calendar className="h-6 w-6 text-white" />}
                color="from-purple-500 to-purple-600"
                subtitle={`${bookings.length} bookings total`}
              />
              <StatCard
                title="Amount Paid"
                value={`$${bookings.reduce((total, booking) => total + booking.amount_paid, 0).toLocaleString()}`}
                icon={<DollarSign className="h-6 w-6 text-white" />}
                color="from-emerald-500 to-emerald-600"
                subtitle={`${((bookings.reduce((total, booking) => total + booking.amount_paid, 0) / 
                  bookings.reduce((total, booking) => total + booking.total_price, 0)) * 100 || 0).toFixed(1)}% of bookings`}
              />
            </div>

            {/* Existing grid with customer info and timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Customer Information Card */}
              <div className="lg:col-span-1">
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 space-y-2 sm:space-y-0">
                      <h2 className="text-base sm:text-lg font-medium text-gray-900">Customer Information</h2>
                      {!isEditing ? (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </button>
                      ) : (
                        <div className="flex space-x-2">
                          <button
                            onClick={handleSave}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </button>
                          <button
                            onClick={handleCancel}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        {isEditing ? (
                          <input
                            type="email"
                            value={editedCustomer?.email || ''}
                            onChange={(e) => setEditedCustomer(prev => prev ? { ...prev, email: e.target.value } : null)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        ) : (
                          <p className="mt-1 text-sm text-gray-900">{customer.email}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        {isEditing ? (
                          <input
                            type="tel"
                            value={editedCustomer?.phone || ''}
                            onChange={(e) => setEditedCustomer(prev => prev ? { ...prev, phone: e.target.value } : null)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        ) : (
                          <p className="mt-1 text-sm text-gray-900">{customer.phone}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Passport Number</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedCustomer?.passport_number || ''}
                            onChange={(e) => setEditedCustomer(prev => prev ? { ...prev, passport_number: e.target.value } : null)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        ) : (
                          <p className="mt-1 text-sm text-gray-900">{customer.passport_number || '-'}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Passport Expiry</label>
                        {isEditing ? (
                          <input
                            type="date"
                            value={editedCustomer?.passport_expiry || ''}
                            onChange={(e) => setEditedCustomer(prev => prev ? { ...prev, passport_expiry: e.target.value } : null)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        ) : (
                          <p className="mt-1 text-sm text-gray-900">
                            {customer.passport_expiry ? new Date(customer.passport_expiry).toLocaleDateString() : '-'}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Nationality</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedCustomer?.nationality || ''}
                            onChange={(e) => setEditedCustomer(prev => prev ? { ...prev, nationality: e.target.value } : null)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        ) : (
                          <p className="mt-1 text-sm text-gray-900">{customer.nationality || '-'}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                        {isEditing ? (
                          <input
                            type="date"
                            value={editedCustomer?.date_of_birth || ''}
                            onChange={(e) => setEditedCustomer(prev => prev ? { ...prev, date_of_birth: e.target.value } : null)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        ) : (
                          <p className="mt-1 text-sm text-gray-900">
                            {customer.date_of_birth ? new Date(customer.date_of_birth).toLocaleDateString() : '-'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline Card */}
              <div className="lg:col-span-2">
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-6">Activity Timeline</h2>
                    <div className="flow-root">
                      <ul className="-mb-8">
                        {events.map((event, eventIdx) => (
                          <li key={event.id}>
                            <div className="relative pb-8">
                              {eventIdx !== events.length - 1 && (
                                <span
                                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                  aria-hidden="true"
                                />
                              )}
                              <div 
                                className="relative flex space-x-3 cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors duration-150"
                                onClick={() => handleEventClick(event)}
                              >
                                <div>
                                  <span className="h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white bg-gray-50">
                                    {getEventIcon(event.event_type)}
                                  </span>
                                </div>
                                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                  <div>
                                    <p className="text-sm text-gray-500">{event.description}</p>
                                  </div>
                                  <div className="whitespace-nowrap text-right text-sm text-gray-500">
                                    <time dateTime={event.created_at}>
                                      {new Date(event.created_at).toLocaleString()}
                                    </time>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Quotes Tab */}
        {activeTab === 'quotes' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Quotes</h2>
                <button
                  onClick={() => navigate(`/quotes/new?customer=${customer.id}`)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Create Quote
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reference
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Price
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {quotes.map((quote) => (
                      <tr key={quote.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {quote.quote_reference}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            quote.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' :
                            quote.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                            quote.status === 'Converted' ? 'bg-green-100 text-green-800' :
                            quote.status === 'Published' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {quote.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${quote.total_price.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(quote.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => navigate(`/quotes/${quote.id}`)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Bookings</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reference
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Price
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount Paid
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {booking.booking_reference}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            booking.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            booking.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                            booking.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${booking.total_price.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${booking.amount_paid.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(booking.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => navigate(`/bookings/${booking.id}`)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Emails Tab */}
        {activeTab === 'emails' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Email Communications</h2>
                <div className="flex space-x-3">
                  {isConnected && (
                    <button
                      onClick={() => navigate(`/communications?customer=${customer?.id}&email=${encodeURIComponent(customer?.email || '')}`)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Send Email
                    </button>
                  )}
                  <button
                    onClick={() => navigate('/communications')}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    View All Communications
                  </button>
                </div>
              </div>
              
              {emails.length > 0 ? (
                <div className="space-y-4">
                  {emails.map((email) => (
                    <div key={email.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
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
                          <div className="text-sm text-gray-500 space-y-1">
                            <div>To: {email.recipients.join(', ')}</div>
                            <div>Sent: {new Date(email.sent_at).toLocaleString()}</div>
                            {email.opened_at && (
                              <div className="flex items-center space-x-1">
                                <Eye className="h-4 w-4 text-green-600" />
                                <span className="text-green-600">Opened: {new Date(email.opened_at).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            email.status === 'opened' ? 'bg-green-100 text-green-800' :
                            email.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                            email.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {email.status.charAt(0).toUpperCase() + email.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Mail className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No emails sent</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {isConnected 
                      ? 'Start communicating with this customer by sending an email.'
                      : 'Connect Gmail to start sending emails to customers.'
                    }
                  </p>
                  {isConnected && (
                    <div className="mt-6">
                      <button
                        onClick={() => navigate(`/communications?customer=${customer?.id}&email=${encodeURIComponent(customer?.email || '')}`)}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        <Mail className="h-5 w-5 mr-2" />
                        Send First Email
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Payments</h2>
                <button
                  onClick={() => {/* TODO: Implement payment creation */}}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Record Payment
                </button>
              </div>
              <div className="text-center py-12">
                <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No payments recorded</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by recording a payment for this customer.
                </p>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => {/* TODO: Implement payment creation */}}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Record New Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 