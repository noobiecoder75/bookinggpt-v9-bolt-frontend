import React from 'react';
import { 
  FileText, 
  Send, 
  MessageSquare, 
  Edit3, 
  CheckCircle, 
  CreditCard, 
  Plane, 
  Building, 
  Mail,
  Clock,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { WorkflowStep, BookingWorkflowState } from '../../types/booking';

interface BookingWorkflowTrackerProps {
  bookingId: number;
  workflowStates: BookingWorkflowState[];
  onStepClick?: (step: WorkflowStep) => void;
}

interface WorkflowStepInfo {
  key: WorkflowStep;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const WORKFLOW_STEPS: WorkflowStepInfo[] = [
  {
    key: 'itinerary_created',
    label: 'Itinerary Created',
    description: 'Initial itinerary has been created',
    icon: <FileText className="h-5 w-5" />
  },
  {
    key: 'itinerary_sent',
    label: 'Itinerary Sent',
    description: 'Itinerary has been sent to customer',
    icon: <Send className="h-5 w-5" />
  },
  {
    key: 'feedback_received',
    label: 'Feedback Received',
    description: 'Customer feedback has been received',
    icon: <MessageSquare className="h-5 w-5" />
  },
  {
    key: 'changes_made',
    label: 'Changes Made',
    description: 'Itinerary has been updated based on feedback',
    icon: <Edit3 className="h-5 w-5" />
  },
  {
    key: 'approved',
    label: 'Approved',
    description: 'Customer has approved the itinerary',
    icon: <CheckCircle className="h-5 w-5" />
  },
  {
    key: 'payment_received',
    label: 'Payment Received',
    description: 'Payment has been processed',
    icon: <CreditCard className="h-5 w-5" />
  },
  {
    key: 'booking_confirmed',
    label: 'Booking Confirmed',
    description: 'Booking has been confirmed',
    icon: <CheckCircle className="h-5 w-5" />
  },
  {
    key: 'flights_booked',
    label: 'Flights Booked',
    description: 'Flight reservations have been made',
    icon: <Plane className="h-5 w-5" />
  },
  {
    key: 'hotels_booked',
    label: 'Hotels Booked',
    description: 'Hotel reservations have been made',
    icon: <Building className="h-5 w-5" />
  },
  {
    key: 'confirmations_sent',
    label: 'Confirmations Sent',
    description: 'Confirmation documents have been sent',
    icon: <Mail className="h-5 w-5" />
  }
];

export function BookingWorkflowTracker({ 
  bookingId, 
  workflowStates, 
  onStepClick 
}: BookingWorkflowTrackerProps) {
  
  const getStepState = (stepKey: WorkflowStep) => {
    return workflowStates.find(state => state.workflow_step === stepKey);
  };

  const getStepStatus = (stepKey: WorkflowStep): 'pending' | 'completed' | 'failed' | 'skipped' => {
    const state = getStepState(stepKey);
    return state?.status || 'pending';
  };

  const getStepIcon = (step: WorkflowStepInfo, status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'skipped':
        return <AlertTriangle className="h-5 w-5 text-gray-400" />;
      default:
        return step.icon;
    }
  };

  const getStepClasses = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'failed':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'pending':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'skipped':
        return 'bg-gray-50 border-gray-200 text-gray-500';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-600';
    }
  };

  const getCurrentStep = () => {
    const completedSteps = workflowStates.filter(state => state.status === 'completed');
    return completedSteps.length;
  };

  const totalSteps = WORKFLOW_STEPS.length;
  const currentStep = getCurrentStep();
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Booking Workflow Progress</h3>
        <div className="flex items-center space-x-4">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <span className="text-sm font-medium text-gray-700">
            {currentStep} of {totalSteps} completed
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {WORKFLOW_STEPS.map((step, index) => {
          const status = getStepStatus(step.key);
          const state = getStepState(step.key);
          const isClickable = onStepClick && status !== 'pending';

          return (
            <div
              key={step.key}
              className={`flex items-start space-x-4 p-4 rounded-lg border transition-all duration-200 ${
                getStepClasses(status)
              } ${isClickable ? 'cursor-pointer hover:shadow-md' : ''}`}
              onClick={isClickable ? () => onStepClick(step.key) : undefined}
            >
              <div className="flex-shrink-0 mt-1">
                {getStepIcon(step, status)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium truncate">
                    {step.label}
                  </h4>
                  <span className="text-xs px-2 py-1 rounded-full bg-white/70">
                    {status}
                  </span>
                </div>
                
                <p className="text-xs mt-1 opacity-75">
                  {step.description}
                </p>
                
                {state && (
                  <div className="mt-2 text-xs opacity-60">
                    {state.completed_at ? (
                      <span>Completed: {new Date(state.completed_at).toLocaleDateString()}</span>
                    ) : (
                      <span>Started: {new Date(state.started_at).toLocaleDateString()}</span>
                    )}
                    {state.notes && (
                      <span className="ml-2">• {state.notes}</span>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex-shrink-0 text-xs text-gray-500">
                {index + 1}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 