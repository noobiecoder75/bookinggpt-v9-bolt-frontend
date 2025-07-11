import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ClientPortalLayout } from './ClientPortalLayout';
import { ClientQuoteView } from './ClientQuoteView';
import { ClientPayment } from './ClientPayment';
import { ClientChat } from './ClientChat';
import { ClientDocuments } from './ClientDocuments';
import { ClientStatus } from './ClientStatus';
import { ClientOnboardingTimeline } from './ClientOnboardingTimeline';
import { ClientItinerary } from './ClientItinerary';

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

interface Quote {
  id: string;
  quote_reference?: string;
  customer_id: number;
  status: 'Draft' | 'Sent' | 'Expired' | 'Converted' | 'Published';
  total_price: number;
  markup: number;
  discount: number;
  notes: string;
  expiry_date: string;
  created_at: string;
  trip_start_date?: string;
  trip_end_date?: string;
  customer: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  quote_items: Array<{
    id: number;
    item_type: 'Flight' | 'Hotel' | 'Tour' | 'Transfer';
    item_name: string;
    cost: number;
    markup: number;
    markup_type: 'percentage' | 'fixed';
    quantity: number;
    details: {
      description?: string;
      startTime?: string;
      endTime?: string;
      day_index?: number;
      day?: {
        name: string;
        index: number;
      };
      travelers?: {
        adults: number;
        children: number;
        seniors: number;
        total: number;
      };
      linkedItemId?: string;
      isReturnFlight?: boolean;
      flightDirection?: 'outbound' | 'return';
      checkInDate?: string;
      checkOutDate?: string;
      nights?: number;
    };
  }>;
}

interface ClientPortalProps {
  activeSection?: 'quote' | 'itinerary' | 'payment' | 'chat' | 'documents' | 'status';
}

export function ClientPortal({ activeSection = 'quote' }: ClientPortalProps) {
  const { quoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [bookingConfirmations, setBookingConfirmations] = useState<BookingConfirmation[]>([]);
  const [bookingOperations, setBookingOperations] = useState<BookingOperation[]>([]);
  const [customerEvents, setCustomerEvents] = useState<CustomerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState(activeSection);

  useEffect(() => {
    if (activeSection) {
      setCurrentSection(activeSection);
    }
  }, [activeSection]);

  useEffect(() => {
    fetchQuoteDetails();
  }, [quoteId]);

  // Set up real-time subscription for quote and booking updates
  useEffect(() => {
    if (!quoteId) return;

    const channel = supabase
      .channel('client-portal-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes',
          filter: `id=eq.${quoteId}`,
        },
        (payload) => {
          console.log('Quote updated:', payload);
          fetchQuoteDetails();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quote_items',
          filter: `quote_id=eq.${quoteId}`,
        },
        (payload) => {
          console.log('Quote items updated:', payload);
          fetchQuoteDetails();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `quote_id=eq.${quoteId}`,
        },
        (payload) => {
          console.log('Booking updated:', payload);
          if (quote) fetchBookingData(quote.id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_confirmations',
        },
        (payload) => {
          console.log('Booking confirmation updated:', payload);
          if (booking && (payload.new as any)?.booking_id === booking.id) {
            fetchBookingData(quote!.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_events',
          filter: `customer_id=eq.${quote?.customer_id}`,
        },
        (payload) => {
          console.log('Customer event updated:', payload);
          if (quote) fetchBookingData(quote.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [quoteId, quote?.customer_id, booking?.id]);

  const fetchQuoteDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          customer:customers (
            id,
            first_name,
            last_name,
            email,
            phone
          ),
          quote_items (
            id,
            item_type,
            item_name,
            cost,
            markup,
            markup_type,
            quantity,
            details
          )
        `)
        .eq('id', quoteId)
        .single();

      if (error) throw error;
      
      // Only show quotes that are 'Sent' or 'Published' to customers
      if (data.status !== 'Sent' && data.status !== 'Published') {
        setError('This quote is not available for viewing yet.');
        return;
      }
      
      setQuote(data);
      
      // If quote is converted, fetch booking data
      if (data.status === 'Converted') {
        await fetchBookingData(data.id);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingData = async (quoteId: string) => {
    try {
      // Fetch booking data
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('quote_id', quoteId)
        .single();

      if (bookingError && bookingError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.warn('Booking not found:', bookingError);
        return;
      }

      if (bookingData) {
        setBooking(bookingData);

        // Fetch booking confirmations
        const { data: confirmations, error: confirmError } = await supabase
          .from('booking_confirmations')
          .select('*')
          .eq('booking_id', bookingData.id)
          .order('created_at', { ascending: false });

        if (confirmError) {
          console.warn('Error fetching confirmations:', confirmError);
        } else {
          setBookingConfirmations(confirmations || []);
        }

        // Fetch booking operations
        const { data: operations, error: operationsError } = await supabase
          .from('booking_operations')
          .select('*')
          .eq('booking_id', bookingData.id)
          .order('created_at', { ascending: false });

        if (operationsError) {
          console.warn('Error fetching operations:', operationsError);
        } else {
          setBookingOperations(operations || []);
        }
      }

      // Fetch customer events for this quote/booking
      const { data: events, error: eventsError } = await supabase
        .from('customer_events')
        .select('*')
        .eq('customer_id', quote?.customer_id)
        .in('event_type', [
          'QUOTE_CREATED', 'QUOTE_SENT', 'QUOTE_CONVERTED', 
          'BOOKING_CREATED', 'BOOKING_CONFIRMED', 'PAYMENT_RECEIVED'
        ])
        .order('created_at', { ascending: false })
        .limit(20);

      if (eventsError) {
        console.warn('Error fetching customer events:', eventsError);
      } else {
        setCustomerEvents(events || []);
      }
    } catch (error) {
      console.error('Error fetching booking data:', error);
    }
  };

  // Calculate customer-facing price (without markup visibility)
  const calculateCustomerPrice = (item: Quote['quote_items'][0]) => {
    const itemTotal = item.cost * item.quantity;
    const markup = item.markup_type === 'percentage'
      ? itemTotal * (item.markup / 100)
      : item.markup;
    return itemTotal + markup;
  };

  const handleSectionChange = (section: 'quote' | 'itinerary' | 'payment' | 'chat' | 'documents' | 'status') => {
    setCurrentSection(section);
    // Update URL without page reload
    const newPath = section === 'quote' 
      ? `/client/${quoteId}` 
      : `/client/${quoteId}/${section}`;
    window.history.pushState({}, '', newPath);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-sky-100 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 text-center">Loading your trip details...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-sky-100 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Unable to Load Quote</h2>
          <p className="text-slate-600 mb-6">{error || 'Quote not found'}</p>
          <p className="text-sm text-slate-500">
            Please check the link or contact your travel agent for assistance.
          </p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentSection) {
      case 'itinerary':
        return <ClientItinerary quote={quote} calculateCustomerPrice={calculateCustomerPrice} />;
      case 'payment':
        return <ClientPayment quote={quote} onSuccess={() => fetchQuoteDetails()} />;
      case 'chat':
        return <ClientChat quote={quote} />;
      case 'documents':
        return <ClientDocuments quote={quote} />;
      case 'status':
        return (
          <ClientStatus 
            quote={quote} 
            booking={booking}
            bookingConfirmations={bookingConfirmations}
            bookingOperations={bookingOperations}
            customerEvents={customerEvents}
          />
        );
      default:
        return (
          <div className="space-y-8">
            <ClientOnboardingTimeline 
              quote={quote} 
              booking={booking}
              currentSection={currentSection}
              onSectionChange={handleSectionChange}
            />
            <ClientQuoteView quote={quote} calculateCustomerPrice={calculateCustomerPrice} />
          </div>
        );
    }
  };

  return (
    <ClientPortalLayout 
      quote={quote}
      currentSection={currentSection}
      onSectionChange={handleSectionChange}
    >
      {renderContent()}
    </ClientPortalLayout>
  );
}