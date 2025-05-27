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
    <div className="space-y-6 sm:space-y-8">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Bookings</h1>
            <p className="text-gray-600 text-base sm:text-lg">Manage and track your travel bookings</p>
          </div>
        </div>
      </div>

      <BookingStats bookings={bookings} />

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-sm sm:text-base"
              placeholder="Search bookings by reference, customer, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full sm:w-40 pl-3 pr-10 py-3 text-sm sm:text-base border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-xl transition-all duration-200"
            >
              <option value="all">All Status</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <span className="text-sm font-medium text-gray-700">Date Range:</span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="block w-full sm:w-40 pl-3 pr-3 py-3 text-sm border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-xl transition-all duration-200"
                />
                <span className="text-gray-500 text-sm">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="block w-full sm:w-40 pl-3 pr-3 py-3 text-sm border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-xl transition-all duration-200"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className={`transition-all ${selectedBooking ? 'lg:w-2/3' : 'w-full'}`}>
          <BookingsList
            bookings={filteredBookings}
            loading={loading}
            onBookingSelect={setSelectedBooking}
            selectedBookingId={selectedBooking?.id}
          />
        </div>

        {selectedBooking && (
          <div className="lg:w-1/3 lg:min-w-[400px]">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden lg:sticky lg:top-6">
              <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Booking Details</h3>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
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