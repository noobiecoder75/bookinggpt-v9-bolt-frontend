import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, DollarSign, Mail, Phone, MapPin, CreditCard, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import type { Booking, BookingConfirmation } from './BookingsDashboard';

interface BookingItem {
  id: number;
  item_type: string;
  item_name: string;
  cost: number;
  quantity: number;
  details: any;
}

interface Payment {
  id: number;
  amount: number;
  payment_method: string;
  payment_date: string;
  transaction_reference: string;
}

interface Props {
  booking: Booking;
  onUpdate: () => void;
}

export function BookingDetails({ booking, onUpdate }: Props) {
  const [items, setItems] = useState<BookingItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookingDetails();
  }, [booking.id]);

  async function fetchBookingDetails() {
    try {
      const [{ data: bookingItems }, { data: paymentRecords }] = await Promise.all([
        supabase
          .from('booking_items')
          .select('*')
          .eq('booking_id', booking.id),
        supabase
          .from('payments')
          .select('*')
          .eq('booking_id', booking.id)
          .order('payment_date', { ascending: false }),
      ]);

      if (bookingItems) setItems(bookingItems);
      if (paymentRecords) setPayments(paymentRecords);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching booking details:', error);
      setLoading(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', booking.id);

    if (!error) {
      onUpdate();
    }
  }

  function getConfirmationStatusIcon(status: string) {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  }

  function getProviderDisplayName(provider: string) {
    switch (provider) {
      case 'hotelbeds':
        return 'Hotelbeds';
      case 'amadeus':
        return 'Amadeus';
      case 'manual':
        return 'Manual';
      default:
        return provider.charAt(0).toUpperCase() + provider.slice(1);
    }
  }

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="divide-y divide-gray-200">
      {/* Customer Information */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-500">Customer Information</h4>
        </div>
        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <Mail className="h-5 w-5 text-gray-400 mr-2" />
            <span>{booking.customer.email}</span>
          </div>
          <div className="flex items-center text-sm">
            <Phone className="h-5 w-5 text-gray-400 mr-2" />
            <span>{booking.customer.phone}</span>
          </div>
        </div>
      </div>

      {/* Payment Reference */}
      {booking.payment_reference && (
        <div className="p-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Payment Reference</h4>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm font-mono text-gray-900">{booking.payment_reference}</p>
          </div>
        </div>
      )}

      {/* Booking Confirmations */}
      {booking.booking_confirmations && booking.booking_confirmations.length > 0 && (
        <div className="p-4">
          <h4 className="text-sm font-medium text-gray-500 mb-3">Booking Confirmations</h4>
          <div className="space-y-3">
            {booking.booking_confirmations.map((confirmation) => (
              <div key={confirmation.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getConfirmationStatusIcon(confirmation.status)}
                    <span className="text-sm font-medium text-gray-900">
                      {getProviderDisplayName(confirmation.provider)}
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    confirmation.status === 'confirmed'
                      ? 'bg-green-100 text-green-800'
                      : confirmation.status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {confirmation.status.charAt(0).toUpperCase() + confirmation.status.slice(1)}
                  </span>
                </div>
                
                {confirmation.confirmation_number && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500">Confirmation Number</p>
                    <p className="text-sm font-mono text-gray-900">{confirmation.confirmation_number}</p>
                  </div>
                )}
                
                {confirmation.booking_details && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500">Details</p>
                    <div className="text-sm text-gray-900">
                      {confirmation.provider === 'hotelbeds' && confirmation.booking_details.hotel_name && (
                        <p>Hotel: {confirmation.booking_details.hotel_name}</p>
                      )}
                      {confirmation.provider === 'amadeus' && confirmation.booking_details.flight_name && (
                        <p>Flight: {confirmation.booking_details.flight_name}</p>
                      )}
                      {confirmation.provider === 'manual' && confirmation.booking_details.item_name && (
                        <p>Item: {confirmation.booking_details.item_name}</p>
                      )}
                      {confirmation.booking_details.guest_name && (
                        <p>Guest: {confirmation.booking_details.guest_name}</p>
                      )}
                      {confirmation.booking_details.passenger_name && (
                        <p>Passenger: {confirmation.booking_details.passenger_name}</p>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Amount: {confirmation.currency} {confirmation.amount}</span>
                  <span>{new Date(confirmation.created_at).toLocaleDateString()}</span>
                </div>
                
                {confirmation.error_details && (
                  <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                    <p className="text-xs text-red-600">Error: {confirmation.error_details.error}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking Items */}
      <div className="p-4">
        <h4 className="text-sm font-medium text-gray-500 mb-3">Booking Items</h4>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.item_name}</p>
                <p className="text-sm text-gray-500">{item.item_type}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  ${(item.cost * item.quantity).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">
                  {item.quantity} × ${item.cost.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payments */}
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-medium text-gray-500">Payments</h4>
          <button className="text-sm text-indigo-600 hover:text-indigo-900">
            Record Payment
          </button>
        </div>
        <div className="space-y-3">
          {payments.map((payment) => (
            <div key={payment.id} className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(payment.payment_date).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-500">{payment.payment_method}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  ${payment.amount.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">{payment.transaction_reference}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-500">Total Paid</span>
            <span className="text-sm font-medium text-gray-900">
              ${payments.reduce((sum, p) => sum + Number(p.amount), 0).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-sm font-medium text-gray-500">Balance</span>
            <span className="text-sm font-medium text-gray-900">
              ${(booking.total_price - payments.reduce((sum, p) => sum + Number(p.amount), 0)).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4">
        <div className="flex space-x-3">
          <button
            onClick={() => handleStatusChange('Completed')}
            className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Mark as Completed
          </button>
          <button
            onClick={() => handleStatusChange('Cancelled')}
            className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel Booking
          </button>
        </div>
      </div>
    </div>
  );
}