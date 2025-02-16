import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Filter, Calendar, DollarSign, CreditCard, FileText, Mail, X } from 'lucide-react';
import { BookingsList } from './BookingsList';
import { BookingStats } from './BookingStats';
import { BookingDetails } from './BookingDetails';

export type BookingStatus = 'Confirmed' | 'Cancelled' | 'Completed';
export type PaymentStatus = 'Unpaid' | 'Partial' | 'Paid';

export interface Booking {
  id: number;
  booking_reference: string;
  customer: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  status: BookingStatus;
  total_price: number;
  amount_paid: number;
  payment_status: PaymentStatus;
  travel_start_date: string;
  travel_end_date: string;
  created_at: string;
}

export function BookingsDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, dateRange]);

  async function fetchBookings() {
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          customer:customers (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .gte('travel_start_date', dateRange.start)
        .lte('travel_start_date', dateRange.end)
        .order('travel_start_date', { ascending: true });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBookings(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setLoading(false);
    }
  }

  const filteredBookings = bookings.filter(booking => {
    const searchString = searchTerm.toLowerCase();
    return (
      booking.booking_reference.toLowerCase().includes(searchString) ||
      `${booking.customer.first_name} ${booking.customer.last_name}`.toLowerCase().includes(searchString) ||
      booking.customer.email.toLowerCase().includes(searchString)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
      </div>

      <BookingStats bookings={bookings} />

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="all">All Status</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className={`flex-1 transition-all ${selectedBooking ? 'w-2/3' : 'w-full'}`}>
          <BookingsList
            bookings={filteredBookings}
            loading={loading}
            onBookingSelect={setSelectedBooking}
            selectedBookingId={selectedBooking?.id}
          />
        </div>

        {selectedBooking && (
          <div className="w-1/3 min-w-[400px]">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden sticky top-6">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">Booking Details</h3>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <BookingDetails booking={selectedBooking} onUpdate={fetchBookings} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}