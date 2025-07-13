import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plane, Building, Calendar, DollarSign, Mail, Download, Clock, Users, MapPin, ChevronDown, ChevronUp, Edit2, Car, Trash2, Move, CreditCard, Send, FileText, Check, CheckCircle, Copy, ExternalLink, Eye, X } from 'lucide-react';
import { PaymentModal } from './PaymentModal';
import { useGoogleOAuth } from '../../hooks/useGoogleOAuth';
import { 
  calculateQuoteTotal, 
  calculateItemPrice, 
  calculateDayTotal as calculateUnifiedDayTotal,
  calculateAverageMarkup,
  determineMarkupStrategy,
  getItemDisplayPrice,
  DEFAULT_PRICING_OPTIONS,
  type PricingQuote,
  type PricingItem,
  type MarkupStrategy
} from '../../utils/pricingUtils';
import { validateMarkup, getAgentMarkupSettings } from '../../utils/markupUtils';

interface Quote {
  id: string;
  quote_reference?: string;
  customer_id: number;
  status: 'Draft' | 'Sent' | 'Expired' | 'Converted' | 'Published';
  total_price: number;
  markup: number;
  discount: number;
  markup_strategy: MarkupStrategy;
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
      // For linked flight items (return flights)
      linkedItemId?: string;
      isReturnFlight?: boolean;
      flightDirection?: 'outbound' | 'return';
    };
  }>;
}

export function QuoteView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingMarkup, setIsEditingMarkup] = useState(false);
  const [newMarkup, setNewMarkup] = useState<number>(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessingBooking, setIsProcessingBooking] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [isSendingQuote, setIsSendingQuote] = useState(false);
  const [sendStep, setSendStep] = useState<'confirm' | 'generating' | 'sending' | 'success'>('confirm');
  const [emails, setEmails] = useState<any[]>([]);
  const [showEmailHistory, setShowEmailHistory] = useState(false);
  const { isConnected } = useGoogleOAuth();

  useEffect(() => {
    fetchQuoteDetails();
  }, [id]);

  // Set up real-time subscription for quote updates
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel('quote-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          fetchQuoteDetails();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quote_items',
          filter: `quote_id=eq.${id}`,
        },
        (payload) => {
          fetchQuoteDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

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
        .eq('id', id)
        .single();

      if (error) throw error;
      setQuote(data);
      
      // Fetch email communications for this quote
      if (data) {
        await fetchEmailHistory(data.customer_id, data.id);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailHistory = async (customerId: number, quoteId: string) => {
    try {
      const { data: emailData, error } = await supabase
        .from('email_communications')
        .select('*')
        .eq('customer_id', customerId)
        .or(`quote_id.eq.${quoteId},quote_id.is.null`)
        .order('sent_at', { ascending: false });
      
      if (error) throw error;
      setEmails(emailData || []);
    } catch (error) {
      console.error('Error fetching email history:', error);
    }
  };



  const getItemIcon = (type: string) => {
    switch (type) {
      case 'Flight':
        return <Plane className="h-5 w-5 text-blue-500" />;
      case 'Hotel':
        return <Building className="h-5 w-5 text-indigo-500" />;
      case 'Tour':
        return <Calendar className="h-5 w-5 text-green-500" />;
      case 'Transfer':
        return <Car className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const formatTime = (time: string) => {
    return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };



  const calculateItemTotal = (item: Quote['quote_items'][0]) => {
    if (!quote) return 0;
    
    // Convert to pricing format
    const pricingItem: PricingItem = {
      id: item.id,
      cost: item.cost,
      markup: item.markup || 0,
      markup_type: item.markup_type || 'percentage',
      quantity: item.quantity || 1,
      item_type: item.item_type,
      details: item.details
    };

    const pricingQuote: PricingQuote = {
      id: quote.id,
      markup: quote.markup || 0,
      discount: quote.discount || 0,
      markup_strategy: quote.markup_strategy || 'global'
    };

    // Use unified pricing calculation with dynamic markup strategy
    const pricingOptions = {
      ...DEFAULT_PRICING_OPTIONS,
      markupStrategy: quote.markup_strategy || determineMarkupStrategy(pricingQuote)
    };

    return calculateItemPrice(pricingItem, pricingQuote, pricingOptions);
  };

  // Helper function to check if an item is part of a return flight
  const isPartOfReturnFlight = (item: Quote['quote_items'][0]): boolean => {
    return item.item_type === 'Flight' && (item.details.isReturnFlight || !!item.details.linkedItemId);
  };

  // Helper function to get flight direction display
  const getFlightDirectionDisplay = (item: Quote['quote_items'][0]): string => {
    if (!isPartOfReturnFlight(item)) return '';
    return item.details.flightDirection === 'outbound' ? ' (Departure)' : ' (Return)';
  };

  const handleEditQuote = async () => {
    if (!quote) return;

    if (quote.status === 'Draft') {
      // For draft quotes, navigate directly to trip overview edit mode
      navigate(`/trips/${quote.id}`);
    } else {
      // For sent quotes, create a copy
      try {
        // Create new quote with draft status
        const { data: newQuote, error: quoteError } = await supabase
          .from('quotes')
          .insert([{
            customer_id: quote.customer.id,
            status: 'Draft',
            total_price: quote.total_price,
            markup: quote.markup,
            discount: quote.discount,
            notes: quote.notes,
            trip_start_date: quote.trip_start_date,
            trip_end_date: quote.trip_end_date,
          }])
          .select()
          .single();

        if (quoteError) throw quoteError;

        // Copy all quote items
        const { error: itemsError } = await supabase
          .from('quote_items')
          .insert(
            quote.quote_items.map(item => ({
              quote_id: newQuote.id,
              item_type: item.item_type,
              item_name: item.item_name,
              cost: item.cost,
              markup: item.markup,
              markup_type: item.markup_type,
              quantity: item.quantity,
              details: item.details,
            }))
          );

        if (itemsError) throw itemsError;

        // Navigate to trip overview with new quote ID
        navigate(`/trips/${newQuote.id}`);
      } catch (error) {
        console.error('Error copying quote:', error);
      }
    }
  };

  const handleMarkupUpdate = async () => {
    if (!quote) return;

    try {
      // Validate global markup against minimum requirements for all item types
      const globalSettings = await getAgentMarkupSettings();
      const itemTypes = [...new Set(quote.quote_items.map(item => item.item_type))];
      
      // Check if the new global markup meets minimum requirements for all item types
      const validationErrors = [];
      
      for (const itemType of itemTypes) {
        const validation = await validateMarkup(itemType, newMarkup, 'percentage');
        if (!validation.isValid) {
          validationErrors.push(`${itemType}: minimum ${validation.minimumMarkup}%`);
        }
      }
      
      if (validationErrors.length > 0) {
        alert(`Global markup of ${newMarkup}% is below minimum requirements:\n\n${validationErrors.join('\n')}\n\nPlease set a higher markup or update your global settings.`);
        return;
      }

      const { error } = await supabase
        .from('quotes')
        .update({ markup: newMarkup })
        .eq('id', quote.id);

      if (error) throw error;

      setQuote(prev => prev ? { ...prev, markup: newMarkup } : null);
      setIsEditingMarkup(false);
    } catch (error) {
      console.error('Error updating markup:', error);
      alert('Failed to update markup. Please try again.');
    }
  };



  const handlePaymentSuccess = async (paymentRef: string) => {
    if (!quote) return;

    try {
      setIsProcessingBooking(true);
      setShowPaymentModal(false);


      // Call booking API to create booking and process all items
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/bookings/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteId: quote.id,
          paymentReference: paymentRef,
          customerInfo: quote.customer
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create booking');
      }


      // Refresh quote data to show updated status
      await fetchQuoteDetails();
      
      // Show detailed booking confirmation
      const confirmationMessage = `Payment successful! Reference: ${paymentRef}\n\n` +
        `Booking Reference: ${result.booking.booking_reference}\n` +
        `Booking ID: ${result.booking.id}\n\n` +
        `Confirmations:\n${result.confirmations.map((conf: any) => 
          `• ${conf.item_type}: ${conf.status} (${conf.confirmation_number})`
        ).join('\n')}\n\n` +
        `Your booking has been processed and confirmation details have been saved.`;
        
      alert(confirmationMessage);
      
    } catch (error) {
      console.error('Error processing booking:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Payment was successful (Ref: ${paymentRef}) but there was an error creating the booking:\n\n${errorMessage}\n\nPlease contact support for assistance.`);
    } finally {
      setIsProcessingBooking(false);
    }
  };

  // Helper functions to extract trip information from quote items
  const getTripDestinations = () => {
    const flights = quote?.quote_items.filter(item => item.item_type === 'Flight') || [];
    if (flights.length === 0) return 'Not specified';
    
    // Try to extract destinations from flight names or details
    const destinations = new Set<string>();
    flights.forEach(flight => {
      // Extract destinations from flight names like "NYC → Paris" or "New York to London"
      const flightName = flight.item_name;
      const arrowMatch = flightName.match(/(.+?)\s*[→→]\s*(.+)/);
      const toMatch = flightName.match(/(.+?)\s+to\s+(.+)/i);
      
      if (arrowMatch) {
        destinations.add(arrowMatch[1].trim());
        destinations.add(arrowMatch[2].trim());
      } else if (toMatch) {
        destinations.add(toMatch[1].trim());
        destinations.add(toMatch[2].trim());
      }
    });
    
    const destArray = Array.from(destinations);
    if (destArray.length >= 2) {
      return `${destArray[0]} → ${destArray[1]}`;
    } else if (destArray.length === 1) {
      return destArray[0];
    }
    
    return 'Multiple destinations';
  };

  const getTotalTravelers = () => {
    // Get traveler info from the first item that has it
    const itemWithTravelers = quote?.quote_items.find(item => item.details?.travelers);
    if (itemWithTravelers?.details?.travelers) {
      const travelers = itemWithTravelers.details.travelers;
      return {
        adults: travelers.adults || 0,
        children: travelers.children || 0,
        seniors: travelers.seniors || 0,
        total: (travelers.adults || 0) + (travelers.children || 0) + (travelers.seniors || 0)
      };
    }
    return { adults: 0, children: 0, seniors: 0, total: 0 };
  };

  const getTripDuration = () => {
    if (!quote?.trip_start_date || !quote?.trip_end_date) return 'Not specified';
    
    const start = new Date(quote.trip_start_date + 'T00:00:00');
    const end = new Date(quote.trip_end_date + 'T00:00:00');
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return `${days} day${days !== 1 ? 's' : ''}`;
  };



  const handleSendQuote = async () => {
    if (!quote) return;
    
    setIsSendingQuote(true);
    setSendStep('generating');
    
    try {
      // Step 1: Generate PDF (dummy implementation)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 2: Update quote status to 'Sent'
      const quoteRef = quote.quote_reference || `Q-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      const { data, error } = await supabase
        .from('quotes')
        .update({ 
          status: 'Sent',
          quote_reference: quoteRef,
          updated_at: new Date().toISOString()
        })
        .eq('id', quote.id)
        .select();

      if (error) throw error;

      setSendStep('success');
      
      // Generate client portal link
      const clientPortalLink = `${window.location.origin}/client/${quote.id}`;
      
      // In a real implementation, this would send an email with the client portal link
      
      // Wait a moment to show success, then refresh quote data
      setTimeout(async () => {
        await fetchQuoteDetails();
        setShowSendModal(false);
        setIsSendingQuote(false);
        setSendStep('confirm');
        
        // Show client portal link to agent
        alert(`Quote sent successfully!\n\nClient Portal Link: ${clientPortalLink}\n\nThis link has been sent to ${quote.customer.email}`);
      }, 2000);

    } catch (error) {
      console.error('Error sending quote:', error);
      alert(`Failed to send quote: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
      setShowSendModal(false);
      setIsSendingQuote(false);
      setSendStep('confirm');
    }
  };

  const copyClientPortalLink = async () => {
    if (!quote) return;
    
    const clientPortalLink = `${window.location.origin}/client/${quote.id}`;
    
    try {
      await navigator.clipboard.writeText(clientPortalLink);
      alert('Client portal link copied to clipboard!');
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = clientPortalLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Client portal link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700">Error loading quote: {error}</p>
        </div>
      </div>
    );
  }



  // Send Quote Modal Component
  const SendQuoteModal = () => (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => !isSendingQuote && setShowSendModal(false)} />
        
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          {sendStep === 'confirm' && (
            <>
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Send className="h-6 w-6 text-blue-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Send Quote to Customer
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      This will generate a PDF quote and send it to <strong>{quote?.customer.email}</strong>.
                      The quote status will be updated to "Sent" after successful delivery.
                    </p>
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">What will happen:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li className="flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-gray-400" />
                          Generate professional PDF quote
                        </li>
                        <li className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          Send email with quote attachment
                        </li>
                        <li className="flex items-center">
                          <Check className="h-4 w-4 mr-2 text-gray-400" />
                          Update status to "Sent"
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleSendQuote}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Send Quote
                </button>
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {sendStep === 'generating' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Generating PDF...</p>
            </div>
          )}

          {sendStep === 'success' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Quote Sent Successfully!</h3>
              <p className="text-gray-600">The quote status has been updated to 'Sent'.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Quote for {quote.customer.first_name} {quote.customer.last_name}
            </h1>
            <p className="mt-2 text-sm text-gray-500">Created on {formatDate(quote.created_at)}</p>
            {quote.trip_start_date && quote.trip_end_date && (
              <p className="mt-1 text-sm text-gray-600">
                Trip: {formatDate(quote.trip_start_date)} - {formatDate(quote.trip_end_date)}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              quote.status === 'Draft'
                ? 'bg-amber-100 text-amber-800'
                : quote.status === 'Sent'
                ? 'bg-blue-100 text-blue-800'
                : quote.status === 'Converted'
                ? 'bg-green-100 text-green-800'
                : quote.status === 'Published'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {quote.status}
            </span>
            <button
              onClick={handleEditQuote}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              {quote.status === 'Draft' ? 'Edit Quote' : 'Edit as Copy'}
            </button>
            {quote.status === 'Draft' && (
              <button
                onClick={() => setShowSendModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Quote
              </button>
            )}
            {quote.status === 'Sent' && (
              <button
                onClick={() => setShowPaymentModal(true)}
                disabled={isProcessingBooking}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {isProcessingBooking ? 'Processing...' : 'Proceed to Booking'}
              </button>
            )}
            <button
              onClick={() => window.open(`/client/${quote.id}`, '_blank')}
              className="inline-flex items-center px-3 py-2 border border-indigo-600 text-indigo-700 bg-white hover:bg-indigo-50 shadow-sm text-sm font-medium rounded-md"
              title="Open customer-facing client portal"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Client Portal
            </button>
            <button
              onClick={copyClientPortalLink}
              className="inline-flex items-center px-3 py-2 border border-green-600 text-green-700 bg-white hover:bg-green-50 shadow-sm text-sm font-medium rounded-md"
              title="Copy client portal link to share with customer"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </button>
            {isConnected && (
              <button 
                onClick={() => navigate(`/communications?customer=${quote.customer_id}&email=${encodeURIComponent(quote.customer.email)}&quote=${quote.id}`)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                title="Send email to customer"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email Customer
              </button>
            )}
            {emails.length > 0 && (
              <button 
                onClick={() => setShowEmailHistory(!showEmailHistory)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                title="View email history"
              >
                <Eye className="h-4 w-4 mr-2" />
                Email History ({emails.length})
              </button>
            )}
            <button className="p-2 text-gray-400 hover:text-gray-500">
              <Download className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Client Portal Link Section - Show when quote is sent */}
      {(quote.status === 'Sent' || quote.status === 'Published') && (
        <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-blue-900 mb-2">Client Portal Active</h3>
              <p className="text-blue-700 text-sm">
                Your customer can view their quote and proceed with booking using this secure link:
              </p>
              <div className="mt-3 flex items-center gap-3">
                <code className="px-3 py-2 bg-white border border-blue-200 rounded-md text-sm text-blue-800 font-mono">
                  {`${window.location.origin}/client/${quote.id}`}
                </code>
                <button
                  onClick={copyClientPortalLink}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </button>
                <button
                  onClick={() => window.open(`/client/${quote.id}`, '_blank')}
                  className="inline-flex items-center px-3 py-2 border border-blue-600 text-blue-700 bg-white text-sm font-medium rounded-md hover:bg-blue-50"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email History Section */}
      {showEmailHistory && emails.length > 0 && (
        <div className="mb-8 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Email History</h3>
              <button
                onClick={() => setShowEmailHistory(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="p-6 space-y-4">
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
        </div>
      )}

      {/* Customer & Trip Details */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h2>
          <div className="space-y-3">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {quote.customer.first_name} {quote.customer.last_name}
                </p>
                <p className="text-sm text-gray-500">{quote.customer.email}</p>
                <p className="text-sm text-gray-500">{quote.customer.phone}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Trip Details</h2>
          <div className="space-y-3">
            <div className="flex items-center">
              <MapPin className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Destinations</p>
                <p className="text-sm font-medium text-gray-900">
                  {getTripDestinations()}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="text-sm font-medium text-gray-900">
                  {getTripDuration()}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <Users className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Travelers</p>
                <p className="text-sm font-medium text-gray-900">
                  {getTotalTravelers().total > 0 
                    ? `${getTotalTravelers().adults} Adults, ${getTotalTravelers().children} Children, ${getTotalTravelers().seniors} Seniors`
                    : 'Not specified'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Quote Valid Until</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(quote.expiry_date)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Itemized Quote Details - Simplified */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Quote Items</h2>
          <p className="text-sm text-gray-600 mt-1">All items included in this quote</p>
        </div>
        
        <div className="p-6">
          {quote.quote_items.length > 0 ? (
            <div className="space-y-4">
              {quote.quote_items.map((item) => (
                <div key={item.id} className={`flex items-start justify-between p-4 rounded-lg border ${
                  isPartOfReturnFlight(item) 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-start space-x-3">
                    {getItemIcon(item.item_type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          item.item_type === 'Flight' ? 'bg-blue-100 text-blue-800' :
                          item.item_type === 'Hotel' ? 'bg-green-100 text-green-800' :
                          item.item_type === 'Transfer' ? 'bg-yellow-100 text-yellow-800' :
                          item.item_type === 'Tour' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.item_type}
                        </span>
                        {isPartOfReturnFlight(item) && (
                          <span className="px-2 py-1 text-xs rounded-full font-medium bg-blue-200 text-blue-900">
                            Linked Flight
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {item.item_name}{getFlightDirectionDisplay(item)}
                      </p>
                      {item.details.description && (
                        <p className="text-sm text-gray-600 mb-1">{item.details.description}</p>
                      )}
                      <div className="flex items-center text-xs text-gray-500 space-x-4">
                        {(item.details.startTime || item.details.endTime) && (
                          <span>
                            {item.details.startTime && formatTime(item.details.startTime)}
                            {item.details.startTime && item.details.endTime && ' - '}
                            {item.details.endTime && formatTime(item.details.endTime)}
                          </span>
                        )}
                        {item.quantity > 1 && (
                          <span>Quantity: {item.quantity}</span>
                        )}
                        {item.details.day_index !== undefined && (
                          <span>Day {item.details.day_index + 1}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      ${(() => {
                        const pricingItem: PricingItem = {
                          id: item.id,
                          cost: item.cost,
                          markup: item.markup || 0,
                          markup_type: item.markup_type || 'percentage',
                          quantity: item.quantity || 1,
                          item_type: item.item_type,
                          details: item.details || {}
                        };
                        
                        const pricingQuote: PricingQuote = {
                          id: quote?.id || 'temp-quote',
                          markup: quote?.markup || 0,
                          discount: quote?.discount || 0,
                          markup_strategy: quote?.markup_strategy || 'individual'
                        };
                        
                        return getItemDisplayPrice(pricingItem, pricingQuote, DEFAULT_PRICING_OPTIONS).toFixed(2);
                      })()}
                      {item.item_type === 'Hotel' && item.quantity > 1 && (
                        <span className="text-xs text-gray-500 block">per night</span>
                      )}
                    </p>
                    {item.markup > 0 && (
                      <p className="text-xs text-green-600 mb-1">
                        +{item.markup}{item.markup_type === 'percentage' ? '%' : '$'} markup
                      </p>
                    )}
                    <p className="text-sm font-semibold text-indigo-600">
                      Total: ${calculateItemTotal(item).toFixed(2)}
                      {item.item_type === 'Hotel' && item.quantity > 1 && (
                        <span className="block text-xs text-gray-500">
                          ({item.quantity} {item.quantity === 1 ? 'day' : 'days'})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Items Added</h3>
              <p className="text-sm">This quote doesn't have any items yet.</p>
              <button
                onClick={handleEditQuote}
                className="mt-4 inline-flex items-center px-4 py-2 border border-indigo-600 text-indigo-700 bg-white hover:bg-indigo-50 shadow-sm text-sm font-medium rounded-md"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Add Items to Quote
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pricing Summary with editable markup for draft quotes */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Pricing Summary</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium text-gray-900">
                ${quote.quote_items.reduce((total, item) => total + item.cost * item.quantity, 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-500">
                {quote.status === 'Draft' && isEditingMarkup ? (
                  <div className="flex items-center space-x-2">
                    <span>Markup</span>
                    <input
                      type="number"
                      value={newMarkup}
                      onChange={(e) => setNewMarkup(Number(e.target.value))}
                      className="w-20 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <span>%</span>
                    <button
                      onClick={handleMarkupUpdate}
                      className="px-2 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingMarkup(false)}
                      className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Markup ({(() => {
                      // Check if items have individual markups
                      const hasIndividualMarkups = quote.quote_items.some(item => item.markup && item.markup > 0);
                      
                      if (hasIndividualMarkups) {
                        // Calculate weighted average of individual markups
                        let totalCost = 0;
                        let totalMarkup = 0;
                        
                        quote.quote_items.forEach(item => {
                          const itemCost = item.cost * (item.quantity || 1);
                          totalCost += itemCost;
                          totalMarkup += itemCost * ((item.markup || 0) / 100);
                        });
                        
                        const avgMarkup = totalCost > 0 ? (totalMarkup / totalCost) * 100 : 0;
                        return Math.max(avgMarkup, 0).toFixed(1);
                      }
                      
                      // Fall back to global markup if no individual markups
                      return Math.max(quote.markup || 0, 0).toFixed(1);
                    })()}%)</span>
                    {quote.status === 'Draft' && (
                      <button
                        onClick={() => {
                          setNewMarkup(quote.markup);
                          setIsEditingMarkup(true);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-500"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </span>
              <span className="font-medium text-gray-900">
                ${(() => {
                  // Calculate markup using unified pricing utility
                  const pricingQuote: PricingQuote = {
                    id: quote.id,
                    markup: quote.markup || 0,
                    discount: 0, // Don't include discount in markup calculation
                    markup_strategy: quote.markup_strategy || 'global',
                    quote_items: quote.quote_items.map(item => ({
                      id: item.id,
                      cost: item.cost,
                      markup: item.markup || 0,
                      markup_type: item.markup_type || 'percentage',
                      quantity: item.quantity || 1,
                      item_type: item.item_type,
                      details: item.details
                    }))
                  };
                  
                  const pricingOptions = {
                    ...DEFAULT_PRICING_OPTIONS,
                    markupStrategy: quote.markup_strategy || determineMarkupStrategy(pricingQuote)
                  };
                  
                  const totalWithMarkup = calculateQuoteTotal(pricingQuote, pricingOptions);
                  const totalWithoutMarkup = quote.quote_items.reduce((total, item) => total + (item.cost * item.quantity), 0);
                  
                  return (totalWithMarkup - totalWithoutMarkup).toFixed(2);
                })()}
              </span>
            </div>
            {quote.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount ({quote.discount}%)</span>
                <span className="font-medium">
                  -${(quote.total_price * (quote.discount / 100)).toFixed(2)}
                </span>
              </div>
            )}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between">
                <span className="text-base font-medium text-gray-900">Total</span>
                <span className="text-base font-medium text-gray-900">
                  ${(() => {
                    // Calculate total using unified pricing utility to ensure consistency
                    const pricingQuote: PricingQuote = {
                      id: quote.id,
                      markup: quote.markup || 0,
                      discount: quote.discount || 0,
                      markup_strategy: quote.markup_strategy || 'global',
                      quote_items: quote.quote_items.map(item => ({
                        id: item.id,
                        cost: item.cost,
                        markup: item.markup || 0,
                        markup_type: item.markup_type || 'percentage',
                        quantity: item.quantity || 1,
                        item_type: item.item_type,
                        details: item.details
                      }))
                    };
                    
                    const pricingOptions = {
                      ...DEFAULT_PRICING_OPTIONS,
                      markupStrategy: quote.markup_strategy || determineMarkupStrategy(pricingQuote)
                    };
                    
                    return calculateQuoteTotal(pricingQuote, pricingOptions).toFixed(2);
                  })()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {quote.notes && (
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Additional Notes</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{quote.notes}</p>
          </div>
        </div>
      )}

      {/* Send Quote Modal */}
      {showSendModal && <SendQuoteModal />}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        quote={quote}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
} 