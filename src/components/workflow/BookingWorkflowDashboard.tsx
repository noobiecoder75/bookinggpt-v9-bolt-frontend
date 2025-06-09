import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BookingWorkflowTracker } from './BookingWorkflowTracker';
import { WorkflowActions } from './WorkflowActions';
import { EnhancedBooking, BookingWorkflowState, WorkflowStep } from '../../types/booking';

export function BookingWorkflowDashboard() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<EnhancedBooking | null>(null);
  const [workflowStates, setWorkflowStates] = useState<BookingWorkflowState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bookingId) {
      fetchBookingData();
    }
  }, [bookingId]);

  const fetchBookingData = async () => {
    if (!bookingId) return;

    try {
      setLoading(true);
      
      // Fetch booking details
      const { data: bookingData, error: bookingError } = await supabase
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
        .eq('id', bookingId)
        .single();

      if (bookingError) throw bookingError;

      // Fetch workflow states
      const { data: workflowData, error: workflowError } = await supabase
        .from('booking_workflow_states')
        .select('*')
        .eq('booking_id', bookingId)
        .order('started_at', { ascending: true });

      if (workflowError) throw workflowError;

      setBooking(bookingData);
      setWorkflowStates(workflowData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStep = (): WorkflowStep => {
    const completedSteps = workflowStates.filter(state => state.status === 'completed');
    const stepOrder: WorkflowStep[] = [
      'itinerary_created',
      'itinerary_sent',
      'feedback_received',
      'changes_made',
      'approved',
      'payment_received',
      'booking_confirmed',
      'flights_booked',
      'hotels_booked',
      'confirmations_sent'
    ];

    // Find the next step that hasn't been completed
    for (const step of stepOrder) {
      const isCompleted = completedSteps.some(state => state.workflow_step === step);
      if (!isCompleted) {
        return step;
      }
    }

    return 'confirmations_sent'; // All steps completed
  };

  const handleStepComplete = async (step: WorkflowStep, notes?: string) => {
    // Refresh workflow states after completion
    await fetchBookingData();
    
    // Create notification for step completion
    try {
      await supabase
        .from('booking_notifications')
        .insert({
          booking_id: parseInt(bookingId!),
          notification_type: 'confirmation',
          title: `Step Completed: ${step.replace('_', ' ').toUpperCase()}`,
          message: `Booking workflow step "${step}" has been completed.${notes ? ` Notes: ${notes}` : ''}`,
          priority: 'normal'
        });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const handleStepClick = (step: WorkflowStep) => {
    // Handle click on completed steps (could show details, allow editing, etc.)
    console.log('Clicked on step:', step);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking workflow...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium">
            {error || 'Booking not found'}
          </div>
          <button
            onClick={() => window.history.back()}
            className="mt-4 text-indigo-600 hover:text-indigo-800"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentStep = getCurrentStep();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.history.back()}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Booking Workflow - {booking.booking_reference}
                </h1>
                <p className="text-gray-600 mt-1">
                  {booking.customer.first_name} {booking.customer.last_name} • 
                  {new Date(booking.travel_start_date).toLocaleDateString()} - 
                  {new Date(booking.travel_end_date).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                booking.status === 'Confirmed'
                  ? 'bg-green-100 text-green-800'
                  : booking.status === 'Processing'
                  ? 'bg-blue-100 text-blue-800'
                  : booking.status === 'Completed'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {booking.status}
              </span>
              
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Workflow Tracker */}
          <div className="lg:col-span-2">
            <BookingWorkflowTracker
              bookingId={parseInt(bookingId!)}
              workflowStates={workflowStates}
              onStepClick={handleStepClick}
            />
          </div>

          {/* Current Actions */}
          <div className="space-y-6">
            <WorkflowActions
              bookingId={parseInt(bookingId!)}
              currentStep={currentStep}
              onStepComplete={handleStepComplete}
            />

            {/* Booking Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Price:</span>
                  <span className="font-medium">${booking.total_price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-medium text-green-600">${booking.amount_paid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Balance:</span>
                  <span className="font-medium text-red-600">
                    ${(booking.total_price - booking.amount_paid).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Status:</span>
                  <span className={`font-medium ${
                    booking.payment_status === 'Paid'
                      ? 'text-green-600'
                      : booking.payment_status === 'Partial'
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}>
                    {booking.payment_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Contact */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Contact</h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>Email:</strong> {booking.customer.email}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Phone:</strong> {booking.customer.phone}
                </p>
              </div>
              <div className="mt-4 flex space-x-2">
                <button className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors text-sm">
                  Send Email
                </button>
                <button className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors text-sm">
                  Call Customer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 