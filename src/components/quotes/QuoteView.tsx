import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plane, Building, Calendar, DollarSign, Mail, Download, Clock, Users, MapPin, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';

interface Quote {
  id: string;
  customer_id: number;
  status: 'Draft' | 'Sent' | 'Expired' | 'Converted';
  total_price: number;
  markup: number;
  discount: number;
  notes: string;
  origin: string;
  destination: string;
  expiry_date: string;
  created_at: string;
  customer: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  quote_items: Array<{
    id: number;
    item_type: 'Flight' | 'Hotel' | 'Tour';
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
    };
  }>;
}

export function QuoteView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<number[]>([]);
  const [isEditingMarkup, setIsEditingMarkup] = useState(false);
  const [newMarkup, setNewMarkup] = useState<number>(0);

  useEffect(() => {
    fetchQuoteDetails();
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
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleDayExpansion = (dayIndex: number) => {
    setExpandedDays(prev =>
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'Flight':
        return <Plane className="h-5 w-5 text-blue-500" />;
      case 'Hotel':
        return <Building className="h-5 w-5 text-indigo-500" />;
      case 'Tour':
        return <Calendar className="h-5 w-5 text-green-500" />;
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

  const calculateDayTotal = (items: Quote['quote_items']) => {
    return items.reduce((total, item) => {
      const itemTotal = item.cost * item.quantity;
      const markup = item.markup_type === 'percentage'
        ? itemTotal * (item.markup / 100)
        : item.markup;
      return total + (itemTotal + markup);
    }, 0);
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
            origin: quote.origin,
            destination: quote.destination,
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
      const { error } = await supabase
        .from('quotes')
        .update({ markup: newMarkup })
        .eq('id', quote.id);

      if (error) throw error;

      setQuote(prev => prev ? { ...prev, markup: newMarkup } : null);
      setIsEditingMarkup(false);
    } catch (error) {
      console.error('Error updating markup:', error);
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

  // Group items by day
  const itemsByDay = quote.quote_items.reduce((acc, item) => {
    // Handle both old and new data structures
    const dayIndex = item.details.day_index ?? item.details.day?.index ?? 0;
    const dayName = item.details.day?.name ?? `Day ${dayIndex + 1}`;
    
    if (!acc[dayIndex]) {
      acc[dayIndex] = {
        name: dayName,
        items: []
      };
    }
    acc[dayIndex].items.push(item);
    return acc;
  }, {} as Record<number, { name: string; items: Quote['quote_items'] }>);

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
          </div>
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              quote.status === 'Draft'
                ? 'bg-amber-100 text-amber-800'
                : quote.status === 'Sent'
                ? 'bg-blue-100 text-blue-800'
                : quote.status === 'Converted'
                ? 'bg-green-100 text-green-800'
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
            <button
              onClick={() => window.open(`/quote-preview.html?id=${quote.id}`, '_blank')}
              className="inline-flex items-center px-3 py-2 border border-indigo-600 text-indigo-700 bg-white hover:bg-indigo-50 shadow-sm text-sm font-medium rounded-md"
            >
              Preview
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-500">
              <Mail className="h-5 w-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-500">
              <Download className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

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
                <p className="text-sm text-gray-500">Route</p>
                <p className="text-sm font-medium text-gray-900">
                  {quote.origin} → {quote.destination}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <Users className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Travelers</p>
                <p className="text-sm font-medium text-gray-900">
                  {quote.quote_items[0]?.details?.travelers?.adults || 0} Adults,{' '}
                  {quote.quote_items[0]?.details?.travelers?.children || 0} Children,{' '}
                  {quote.quote_items[0]?.details?.travelers?.seniors || 0} Seniors
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

      {/* Day-wise Itinerary */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Day-wise Itinerary</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {Object.entries(itemsByDay).map(([dayIndex, { name, items }]) => (
              <div key={dayIndex} className="border rounded-lg overflow-hidden">
                <div
                  className="px-4 py-3 bg-gray-50 flex items-center justify-between cursor-pointer"
                  onClick={() => toggleDayExpansion(parseInt(dayIndex))}
                >
                  <h3 className="text-sm font-medium text-gray-900">{name}</h3>
                  <div className="flex items-center space-x-4">
                    <p className="text-sm font-medium text-gray-900">
                      ${calculateDayTotal(items).toFixed(2)}
                    </p>
                    {expandedDays.includes(parseInt(dayIndex)) ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
                
                {expandedDays.includes(parseInt(dayIndex)) && (
                  <div className="px-4 py-3 space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start space-x-3">
                          {getItemIcon(item.item_type)}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.item_name}</p>
                            {item.details.description && (
                              <p className="text-sm text-gray-500">{item.details.description}</p>
                            )}
                            {(item.details.startTime || item.details.endTime) && (
                              <p className="text-xs text-gray-400">
                                {item.details.startTime && formatDateTime(item.details.startTime)}
                                {item.details.endTime && ` - ${formatDateTime(item.details.endTime)}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            ${item.cost.toFixed(2)}
                          </p>
                          {item.markup > 0 && (
                            <p className="text-xs text-gray-500">
                              +{item.markup}{item.markup_type === 'percentage' ? '%' : '$'} markup
                            </p>
                          )}
                          {item.quantity > 1 && (
                            <p className="text-xs text-gray-500">
                              Quantity: {item.quantity}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
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
                    <span>Markup ({quote.markup}%)</span>
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
                ${(quote.quote_items.reduce((total, item) => total + item.cost * item.quantity, 0) * (quote.markup / 100)).toFixed(2)}
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
                  ${quote.total_price.toFixed(2)}
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
    </div>
  );
} 