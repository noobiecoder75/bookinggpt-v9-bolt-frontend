import React from 'react';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Plane, 
  MapPin, 
  Calendar,
  CreditCard,
  FileText,
  Bell,
  ExternalLink,
  Truck,
  Users,
  Building,
  Camera
} from 'lucide-react';

// Helper function to generate status updates from real database data
function generateStatusUpdates(
  quote: Quote,
  booking?: Booking | null,
  bookingConfirmations: BookingConfirmation[] = [],
  bookingOperations: BookingOperation[] = [],
  customerEvents: CustomerEvent[] = []
): StatusUpdate[] {
  const updates: StatusUpdate[] = [];

  // Add updates from customer events
  customerEvents.forEach((event, index) => {
    let title = '';
    let description = '';
    let status: 'success' | 'info' | 'warning' | 'error' = 'info';
    let icon = <FileText className="w-4 h-4" />;

    switch (event.event_type) {
      case 'QUOTE_CREATED':
        title = 'Quote Created';
        description = 'Your travel quote has been prepared by our expert team.';
        status = 'success';
        icon = <FileText className="w-4 h-4" />;
        break;
      case 'QUOTE_SENT':
        title = 'Quote Sent';
        description = 'Your personalized travel quote has been sent to your email.';
        status = 'success';
        icon = <FileText className="w-4 h-4" />;
        break;
      case 'QUOTE_CONVERTED':
        title = 'Quote Accepted';
        description = 'Thank you for accepting our quote! Your booking is being processed.';
        status = 'success';
        icon = <CheckCircle className="w-4 h-4" />;
        break;
      case 'PAYMENT_RECEIVED':
        title = 'Payment Received';
        description = `Payment has been successfully processed. Thank you!`;
        status = 'success';
        icon = <CreditCard className="w-4 h-4" />;
        break;
      case 'BOOKING_CREATED':
        title = 'Booking Created';
        description = 'Your booking has been created and is being confirmed with suppliers.';
        status = 'info';
        icon = <Calendar className="w-4 h-4" />;
        break;
      case 'BOOKING_CONFIRMED':
        title = 'Booking Confirmed';
        description = 'All your reservations have been confirmed! Your trip is ready.';
        status = 'success';
        icon = <CheckCircle className="w-4 h-4" />;
        break;
      default:
        return; // Skip unknown event types
    }

    updates.push({
      id: event.id,
      title,
      description,
      timestamp: new Date(event.created_at),
      status,
      icon
    });
  });

  // Add booking-specific updates
  if (booking) {
    switch (booking.status) {
      case 'Pending':
        updates.push({
          id: `booking-${booking.id}-pending`,
          title: 'Booking Processing',
          description: 'We are processing your booking and confirming with suppliers.',
          timestamp: new Date(booking.created_at),
          status: 'info',
          icon: <Clock className="w-4 h-4" />
        });
        break;
      case 'Processing':
        updates.push({
          id: `booking-${booking.id}-processing`,
          title: 'Confirming Reservations',
          description: 'We are confirming your reservations with hotels, airlines, and other suppliers.',
          timestamp: new Date(booking.updated_at),
          status: 'info',
          icon: <Clock className="w-4 h-4" />
        });
        break;
      case 'Confirmed':
        updates.push({
          id: `booking-${booking.id}-confirmed`,
          title: 'All Reservations Confirmed',
          description: 'Great news! All your reservations have been confirmed and your trip is ready.',
          timestamp: new Date(booking.updated_at),
          status: 'success',
          icon: <CheckCircle className="w-4 h-4" />
        });
        break;
      case 'Failed':
        updates.push({
          id: `booking-${booking.id}-failed`,
          title: 'Booking Issue',
          description: 'We encountered an issue with your booking. Our team is working to resolve it.',
          timestamp: new Date(booking.updated_at),
          status: 'error',
          icon: <AlertCircle className="w-4 h-4" />
        });
        break;
    }

    // Add payment status updates
    switch (booking.payment_status) {
      case 'Paid':
        updates.push({
          id: `payment-${booking.id}-paid`,
          title: 'Payment Complete',
          description: `Full payment of $${booking.amount_paid.toFixed(2)} has been received.`,
          timestamp: new Date(booking.updated_at),
          status: 'success',
          icon: <CreditCard className="w-4 h-4" />
        });
        break;
      case 'Partial':
        updates.push({
          id: `payment-${booking.id}-partial`,
          title: 'Deposit Received',
          description: `Deposit of $${booking.amount_paid.toFixed(2)} received. Remaining balance: $${(booking.total_price - booking.amount_paid).toFixed(2)}`,
          timestamp: new Date(booking.updated_at),
          status: 'info',
          icon: <CreditCard className="w-4 h-4" />
        });
        break;
    }
  }

  // Add confirmation-specific updates
  bookingConfirmations.forEach((confirmation) => {
    if (confirmation.status === 'confirmed' && confirmation.confirmed_at) {
      updates.push({
        id: `confirmation-${confirmation.id}`,
        title: `${confirmation.provider} Confirmation`,
        description: `Your ${confirmation.provider} booking has been confirmed.${confirmation.confirmation_number ? ` Confirmation: ${confirmation.confirmation_number}` : ''}`,
        timestamp: new Date(confirmation.confirmed_at),
        status: 'success',
        icon: <CheckCircle className="w-4 h-4" />
      });
    } else if (confirmation.status === 'failed') {
      updates.push({
        id: `confirmation-failed-${confirmation.id}`,
        title: `${confirmation.provider} Booking Issue`,
        description: `There was an issue confirming your ${confirmation.provider} booking. Our team is working on it.`,
        timestamp: new Date(confirmation.updated_at),
        status: 'error',
        icon: <AlertCircle className="w-4 h-4" />
      });
    }
  });

  // Sort by timestamp (most recent first)
  return updates.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

// Helper function to generate booking items from quote items and confirmations
function generateBookingItems(
  quote: Quote,
  bookingConfirmations: BookingConfirmation[] = []
): BookingItem[] {
  return quote.quote_items.map((item) => {
    // Find corresponding confirmation
    const confirmation = bookingConfirmations.find(c => c.quote_item_id === item.id);
    
    let status: 'confirmed' | 'pending' | 'cancelled' = 'pending';
    let confirmationNumber: string | undefined;

    if (confirmation) {
      switch (confirmation.status) {
        case 'confirmed':
          status = 'confirmed';
          confirmationNumber = confirmation.confirmation_number || confirmation.provider_booking_id;
          break;
        case 'cancelled':
          status = 'cancelled';
          break;
        case 'failed':
          status = 'cancelled'; // Treat failed as cancelled for display
          break;
        default:
          status = 'pending';
      }
    }

    // Generate details based on item type and data
    let details = item.item_name;
    if (item.details?.description) {
      details = item.details.description;
    } else {
      // Generate details from item data
      switch (item.item_type) {
        case 'Flight':
          if (item.details?.departure && item.details?.arrival) {
            const depTime = new Date(item.details.departure).toLocaleString();
            const arrTime = new Date(item.details.arrival).toLocaleString();
            details = `Departure: ${depTime}, Arrival: ${arrTime}`;
          }
          break;
        case 'Hotel':
          if (item.details?.check_in && item.details?.check_out) {
            const checkIn = new Date(item.details.check_in).toLocaleDateString();
            const checkOut = new Date(item.details.check_out).toLocaleDateString();
            const nights = item.details?.nights || 'Multiple';
            details = `${checkIn} - ${checkOut}, ${nights} nights`;
          }
          break;
        case 'Tour':
          if (item.details?.date) {
            const date = new Date(item.details.date).toLocaleDateString();
            details = `Date: ${date}`;
            if (item.details?.duration) {
              details += `, Duration: ${item.details.duration}`;
            }
          }
          break;
        case 'Transfer':
          if (item.details?.date) {
            const date = new Date(item.details.date).toLocaleDateString();
            details = `Date: ${date}`;
          }
          break;
      }
    }

    // Get appropriate icon
    let icon: React.ReactNode;
    switch (item.item_type) {
      case 'Flight':
        icon = <Plane className="w-4 h-4" />;
        break;
      case 'Hotel':
        icon = <Building className="w-4 h-4" />;
        break;
      case 'Tour':
        icon = <Camera className="w-4 h-4" />;
        break;
      case 'Transfer':
        icon = <Truck className="w-4 h-4" />;
        break;
      default:
        icon = <MapPin className="w-4 h-4" />;
    }

    return {
      id: item.id.toString(),
      type: item.item_type.toLowerCase() as 'flight' | 'hotel' | 'transfer' | 'activity',
      name: item.item_name,
      status,
      confirmationNumber,
      details,
      icon
    };
  });
}

interface Quote {
  id: string;
  quote_reference?: string;
  status: string;
  total_price: number;
  trip_start_date?: string;
  trip_end_date?: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
  };
  quote_items: Array<{
    id: number;
    item_type: 'Flight' | 'Hotel' | 'Tour' | 'Transfer';
    item_name: string;
    details: any;
  }>;
}

interface Booking {
  id: string;
  booking_reference: string;
  quote_id: string;
  status: 'Pending' | 'Processing' | 'Confirmed' | 'Failed' | 'Cancelled' | 'Completed';
  payment_status: 'Unpaid' | 'Partial' | 'Paid';
  total_price: number;
  amount_paid: number;
  payment_reference?: string;
  travel_start_date: string;
  travel_end_date: string;
  created_at: string;
  updated_at: string;
}

interface BookingConfirmation {
  id: string;
  booking_id: string;
  quote_item_id: number;
  provider: string;
  provider_booking_id?: string;
  confirmation_number?: string;
  booking_reference?: string;
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled';
  booking_details?: any;
  amount?: number;
  currency?: string;
  confirmed_at?: string;
  created_at: string;
  updated_at: string;
}

interface BookingOperation {
  id: string;
  booking_id: string;
  operation_type: string;
  operation_status: 'pending' | 'processing' | 'completed' | 'failed';
  description?: string;
  created_at: string;
  updated_at: string;
}

interface CustomerEvent {
  id: string;
  customer_id: number;
  event_type: string;
  event_data: any;
  created_at: string;
}

interface ClientStatusProps {
  quote: Quote;
  booking?: Booking | null;
  bookingConfirmations?: BookingConfirmation[];
  bookingOperations?: BookingOperation[];
  customerEvents?: CustomerEvent[];
}

interface StatusUpdate {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  status: 'success' | 'info' | 'warning' | 'error';
  icon: React.ReactNode;
}

interface BookingItem {
  id: string;
  type: 'flight' | 'hotel' | 'transfer' | 'activity';
  name: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  confirmationNumber?: string;
  details: string;
  icon: React.ReactNode;
}

export function ClientStatus({ 
  quote, 
  booking, 
  bookingConfirmations = [], 
  bookingOperations = [], 
  customerEvents = [] 
}: ClientStatusProps) {
  
  // Generate status updates from real data
  const statusUpdates: StatusUpdate[] = generateStatusUpdates(
    quote, 
    booking, 
    bookingConfirmations, 
    bookingOperations, 
    customerEvents
  );

  // Generate booking items from real data
  const bookingItems: BookingItem[] = generateBookingItems(quote, bookingConfirmations);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'info':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'pending':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'cancelled':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTripCountdown = () => {
    if (!quote.trip_start_date) return null;
    
    const startDate = new Date(quote.trip_start_date);
    const today = new Date();
    const diffTime = startDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Trip has started!';
    if (diffDays === 0) return 'Trip starts today!';
    if (diffDays === 1) return 'Trip starts tomorrow!';
    return `${diffDays} days until your trip`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Trip Countdown */}
      {quote.trip_start_date && (
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl shadow-lg p-6 text-white text-center">
          <h2 className="text-2xl font-bold mb-2">Your Adventure Awaits!</h2>
          <p className="text-white/80 text-lg mb-4">{getTripCountdown()}</p>
          {quote.trip_start_date && quote.trip_end_date && (
            <div className="flex items-center justify-center gap-4 text-white/80">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">{formatDate(quote.trip_start_date)}</span>
              </div>
              <span>→</span>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">{formatDate(quote.trip_end_date)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Booking Status Overview */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl"></div>
        <div className="relative z-10">
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Booking Status</h2>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-slate-600">Quote: {quote.quote_reference}</p>
                  {booking && (
                    <p className="text-slate-600">Booking: {booking.booking_reference}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                {booking ? (
                  <div className="space-y-2">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                      booking.status === 'Confirmed' 
                        ? 'text-green-600 bg-green-50 border-green-200'
                        : booking.status === 'Failed' || booking.status === 'Cancelled'
                        ? 'text-red-600 bg-red-50 border-red-200'
                        : 'text-blue-600 bg-blue-50 border-blue-200'
                    }`}>
                      {booking.status === 'Confirmed' ? (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      ) : booking.status === 'Failed' || booking.status === 'Cancelled' ? (
                        <AlertCircle className="w-4 h-4 mr-2" />
                      ) : (
                        <Clock className="w-4 h-4 mr-2" />
                      )}
                      {booking.status}
                    </div>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                      booking.payment_status === 'Paid' 
                        ? 'text-green-600 bg-green-50 border-green-200'
                        : booking.payment_status === 'Partial'
                        ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
                        : 'text-gray-600 bg-gray-50 border-gray-200'
                    }`}>
                      <CreditCard className="w-3 h-3 mr-1" />
                      {booking.payment_status}
                    </div>
                  </div>
                ) : (
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                    quote.status === 'Converted' 
                      ? 'text-green-600 bg-green-50 border-green-200'
                      : 'text-blue-600 bg-blue-50 border-blue-200'
                  }`}>
                    {quote.status === 'Converted' ? (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    ) : (
                      <Clock className="w-4 h-4 mr-2" />
                    )}
                    {quote.status === 'Converted' ? 'Quote Accepted' : quote.status}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {bookingItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      item.status === 'confirmed' ? 'bg-green-100' :
                      item.status === 'pending' ? 'bg-blue-100' :
                      'bg-red-100'
                    }`}>
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{item.name}</h3>
                      <p className="text-xs text-slate-600">{item.details}</p>
                      {item.confirmationNumber && (
                        <p className="text-xs text-slate-500 mt-1">
                          Confirmation: {item.confirmationNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getBookingStatusColor(item.status)}`}>
                    {item.status === 'confirmed' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                    {item.status === 'pending' && <Clock className="w-3 h-3 inline mr-1" />}
                    {item.status === 'cancelled' && <AlertCircle className="w-3 h-3 inline mr-1" />}
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl"></div>
        <div className="relative z-10">
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
            <h2 className="text-xl font-bold text-slate-900">Recent Updates</h2>
            <p className="text-slate-600 mt-1">Track the progress of your booking</p>
          </div>
          
          <div className="p-6">
            <div className="space-y-6">
              {statusUpdates.map((update, index) => (
                <div key={update.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    {getStatusIcon(update.status)}
                    {index < statusUpdates.length - 1 && (
                      <div className="w-px h-12 bg-gray-200 mt-2"></div>
                    )}
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-slate-900">{update.title}</h3>
                      <span className="text-xs text-slate-500">
                        {update.timestamp.toLocaleDateString()} {update.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{update.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Contact Support */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl"></div>
        <div className="relative z-10">
          <div className="text-center">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Need Help?</h3>
            <p className="text-slate-600 mb-6">
              Our travel experts are here to assist you every step of the way
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-2xl hover:bg-indigo-700 transition-colors">
                <Users className="w-4 h-4 mr-2" />
                Chat with Agent
              </button>
              <button className="inline-flex items-center justify-center px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-2xl hover:bg-slate-50 transition-colors">
                <Bell className="w-4 h-4 mr-2" />
                Email Updates
              </button>
              <button className="inline-flex items-center justify-center px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-2xl hover:bg-slate-50 transition-colors">
                <ExternalLink className="w-4 h-4 mr-2" />
                Help Center
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}