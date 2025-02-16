import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, DollarSign, Mail, Phone, MapPin, CreditCard } from 'lucide-react';
import type { Booking } from './BookingsDashboard';

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