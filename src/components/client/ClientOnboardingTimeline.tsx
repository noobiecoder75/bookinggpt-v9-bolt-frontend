import React from 'react';
import { 
  CheckCircle, 
  Clock, 
  FileText, 
  CreditCard, 
  Upload, 
  Plane, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';

interface Quote {
  id: string;
  status: string;
  total_price: number;
  expiry_date: string;
}

interface Booking {
  id: string;
  booking_reference: string;
  status: 'Pending' | 'Processing' | 'Confirmed' | 'Failed' | 'Cancelled' | 'Completed';
  payment_status: 'Unpaid' | 'Partial' | 'Paid';
  total_price: number;
  amount_paid: number;
  created_at: string;
  updated_at: string;
}

interface ClientOnboardingTimelineProps {
  quote: Quote;
  booking?: Booking | null;
  currentSection: string;
  onSectionChange: (section: 'quote' | 'itinerary' | 'payment' | 'documents' | 'status' | 'chat') => void;
}

interface TimelineStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'completed' | 'current' | 'pending' | 'blocked';
  action?: {
    text: string;
    section: 'quote' | 'itinerary' | 'payment' | 'documents' | 'status' | 'chat';
  };
}

export function ClientOnboardingTimeline({ quote, booking, currentSection, onSectionChange }: ClientOnboardingTimelineProps) {
  
  // Calculate timeline status based on quote status and current section
  const getTimelineSteps = (): TimelineStep[] => {
    const steps: TimelineStep[] = [
      {
        id: 'review',
        title: 'Quote Review',
        description: 'Review your personalized travel itinerary and pricing',
        icon: <FileText className="w-5 h-5" />,
        status: 'completed', // Always show as completed if they can access the portal
        action: {
          text: 'View Quote',
          section: 'quote'
        }
      },
      {
        id: 'payment',
        title: 'Payment',
        description: 'Secure your booking with payment',
        icon: <CreditCard className="w-5 h-5" />,
        status: (() => {
          if (booking?.payment_status === 'Paid') return 'completed';
          if (booking?.payment_status === 'Partial') return 'current';
          if (quote.status === 'Converted') return 'current';
          return 'pending';
        })(),
        action: {
          text: booking?.payment_status === 'Paid' ? 'Payment Complete' : 'Make Payment',
          section: 'payment'
        }
      },
      {
        id: 'documents',
        title: 'Documents',
        description: 'Upload required documents and receive tickets',
        icon: <Upload className="w-5 h-5" />,
        status: (() => {
          if (booking?.status === 'Confirmed' || booking?.status === 'Completed') return 'completed';
          if (booking?.payment_status === 'Paid' || booking?.payment_status === 'Partial') return 'current';
          if (quote.status === 'Converted') return 'current';
          return 'pending';
        })(),
        action: {
          text: 'Manage Documents',
          section: 'documents'
        }
      },
      {
        id: 'confirmation',
        title: 'Trip Confirmed',
        description: 'Your booking is confirmed and ready!',
        icon: <Plane className="w-5 h-5" />,
        status: (() => {
          if (booking?.status === 'Confirmed' || booking?.status === 'Completed') return 'completed';
          if (booking?.status === 'Processing') return 'current';
          if (booking?.status === 'Failed' || booking?.status === 'Cancelled') return 'blocked';
          return 'pending';
        })(),
        action: {
          text: 'View Status',
          section: 'status'
        }
      }
    ];

    return steps;
  };

  const steps = getTimelineSteps();
  const currentStepIndex = steps.findIndex(step => step.action?.section === currentSection);
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  const getStepStyles = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          container: 'bg-green-50 border-green-200',
          icon: 'bg-green-500 text-white',
          title: 'text-green-900',
          description: 'text-green-700'
        };
      case 'current':
        return {
          container: 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500 ring-opacity-50',
          icon: 'bg-indigo-600 text-white',
          title: 'text-indigo-900',
          description: 'text-indigo-700'
        };
      case 'pending':
        return {
          container: 'bg-gray-50 border-gray-200',
          icon: 'bg-gray-300 text-gray-600',
          title: 'text-gray-700',
          description: 'text-gray-500'
        };
      case 'blocked':
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'bg-red-300 text-red-600',
          title: 'text-red-700',
          description: 'text-red-500'
        };
      default:
        return {
          container: 'bg-gray-50 border-gray-200',
          icon: 'bg-gray-300 text-gray-600',
          title: 'text-gray-700',
          description: 'text-gray-500'
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl"></div>
      <div className="relative z-10">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Your Booking Journey</h2>
          <p className="text-slate-600">Follow these steps to complete your travel booking</p>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-700">Progress</span>
              <span className="text-sm font-medium text-slate-700">{Math.round(progressPercentage)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-indigo-600 to-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Timeline Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const styles = getStepStyles(step.status);
            const isClickable = step.status !== 'blocked' && step.action;
            
            return (
              <div
                key={step.id}
                className={`p-4 rounded-2xl border-2 transition-all duration-200 ${styles.container} ${
                  isClickable ? 'cursor-pointer hover:scale-105 transform' : ''
                }`}
                onClick={() => isClickable && step.action && onSectionChange(step.action.section)}
              >
                <div className="flex items-start gap-4">
                  {/* Step Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${styles.icon}`}>
                    {step.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : step.status === 'current' ? (
                      <Clock className="w-5 h-5" />
                    ) : step.status === 'blocked' ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      step.icon
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-lg font-semibold ${styles.title}`}>
                        {step.title}
                      </h3>
                      {step.status === 'completed' && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                    <p className={`text-sm mt-1 ${styles.description}`}>
                      {step.description}
                    </p>
                    
                    {/* Action Button */}
                    {isClickable && step.action && (
                      <button
                        className={`mt-3 inline-flex items-center text-sm font-medium transition-colors ${
                          step.status === 'completed' 
                            ? 'text-green-600 hover:text-green-700'
                            : step.status === 'current'
                            ? 'text-indigo-600 hover:text-indigo-700'
                            : 'text-gray-600 hover:text-gray-700'
                        }`}
                      >
                        {step.action.text}
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </button>
                    )}
                  </div>

                  {/* Step Number */}
                  <div className="text-right">
                    <span className={`text-xs font-medium ${styles.description}`}>
                      Step {index + 1}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Next Steps Call to Action */}
        <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-indigo-900">Next Step</h4>
              <p className="text-xs text-indigo-700">
                {(() => {
                  if (booking?.status === 'Confirmed' || booking?.status === 'Completed') {
                    return 'Your trip is confirmed and ready! Check your documents for travel details.';
                  }
                  if (booking?.status === 'Processing') {
                    return 'We are confirming your reservations with suppliers. This usually takes 1-2 business days.';
                  }
                  if (booking?.payment_status === 'Paid') {
                    return 'Payment received! Upload your travel documents to complete the process.';
                  }
                  if (booking?.payment_status === 'Partial') {
                    return 'Deposit received! Upload documents now, final payment due before travel.';
                  }
                  if (quote.status === 'Converted') {
                    return 'Upload your travel documents to finalize your booking';
                  }
                  return 'Complete your payment to secure your travel dates';
                })()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}