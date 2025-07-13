import React from 'react';
import { Calendar, DollarSign, User, MapPin, GitBranch, Settings, FileCheck, Eye, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Booking } from './BookingsDashboard';

interface Props {
  bookings: Booking[];
  loading: boolean;
  onBookingSelect: (booking: Booking) => void;
  selectedBookingId?: number;
  onSendEmail?: (booking: Booking) => void;
}

export function BookingsList({ bookings, loading, onBookingSelect, selectedBookingId, onSendEmail }: Props) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="spinner">Loading...</div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No bookings found</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <ul className="divide-y divide-gray-200">
        {bookings.map((booking) => {
          const isPaidOrCompleted = booking.payment_status === 'Paid' || booking.status === 'Completed' || booking.status === 'Confirmed';
          
          return (
            <li
              key={booking.id}
              className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                selectedBookingId === booking.id ? 'bg-indigo-50' : ''
              } ${isPaidOrCompleted ? 'hover:bg-indigo-50/50' : ''}`}
              onClick={() => onBookingSelect(booking)}
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                        isPaidOrCompleted ? 'bg-green-100' : 'bg-indigo-100'
                      }`}>
                        {isPaidOrCompleted ? (
                          <FileCheck className="h-6 w-6 text-green-600" />
                        ) : (
                          <User className="h-6 w-6 text-indigo-600" />
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {booking.customer?.first_name || 'Unknown'} {booking.customer?.last_name || 'Customer'}
                        </h3>
                        {booking.emailStats && booking.emailStats.totalSent > 0 && (
                          <div className="flex items-center space-x-1">
                            <Mail className="h-3 w-3 text-blue-500" />
                            <span className="text-xs text-blue-600">{booking.emailStats.totalSent}</span>
                            {booking.emailStats.hasOpened && (
                              <Eye className="h-3 w-3 text-green-500" />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <span className="truncate">{booking.booking_reference}</span>
                        {isPaidOrCompleted && (
                          <span className="ml-2 flex items-center text-green-600">
                            <Eye className="h-3 w-3 mr-1" />
                            View Confirmations
                          </span>
                        )}
                        {booking.emailStats?.lastSent && (
                          <span className="ml-2 text-xs text-gray-400">
                            Last email: {new Date(booking.emailStats.lastSent).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        ${booking.total_price.toLocaleString()}
                      </p>
                      <p className={`text-sm ${
                        booking.payment_status === 'Paid'
                          ? 'text-green-600'
                          : booking.payment_status === 'Partial'
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}>
                        {booking.payment_status}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        booking.status === 'Confirmed'
                          ? 'bg-green-100 text-green-800'
                          : booking.status === 'Completed'
                          ? 'bg-blue-100 text-blue-800'
                          : booking.status === 'Processing'
                          ? 'bg-yellow-100 text-yellow-800'
                          : booking.status === 'Pending'
                          ? 'bg-gray-100 text-gray-800'
                          : booking.status === 'Failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                      <p>
                        {new Date(booking.travel_start_date).toLocaleDateString()} - {new Date(booking.travel_end_date).toLocaleDateString()}
                      </p>
                    </div>
                    {booking.booking_confirmations && booking.booking_confirmations.length > 0 && (
                      <div className="ml-4 flex items-center text-sm text-gray-500">
                        <FileCheck className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                        <p>{booking.booking_confirmations.length} confirmation{booking.booking_confirmations.length > 1 ? 's' : ''}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 sm:mt-0 flex items-center space-x-2">
                    {onSendEmail && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSendEmail(booking);
                        }}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 hover:text-blue-700 transition-colors"
                        title="Send email to customer"
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Email
                      </button>
                    )}
                    <Link
                      to={`/bookings/${booking.id}/workflow`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                    >
                      <GitBranch className="h-3 w-3 mr-1" />
                      Workflow
                    </Link>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-full hover:bg-gray-100 hover:text-gray-700 transition-colors"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Manage
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}