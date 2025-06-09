import React, { useState } from 'react';
import { 
  Send, 
  MessageSquare, 
  Edit3, 
  CheckCircle, 
  CreditCard, 
  Plane, 
  Building, 
  Mail 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { WorkflowStep } from '../../types/booking';

interface WorkflowActionsProps {
  bookingId: number;
  currentStep: WorkflowStep;
  onStepComplete: (step: WorkflowStep, notes?: string) => void;
}

export function WorkflowActions({ bookingId, currentStep, onStepComplete }: WorkflowActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  const handleStepAction = async (step: WorkflowStep, requiresNotes: boolean = false) => {
    if (requiresNotes && !notes.trim()) {
      setShowNotes(true);
      return;
    }

    setIsProcessing(true);
    try {
      // Update workflow state in database
      const { error } = await supabase
        .from('booking_workflow_states')
        .insert({
          booking_id: bookingId,
          workflow_step: step,
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes: notes.trim() || undefined
        });

      if (error) throw error;

      onStepComplete(step, notes.trim() || undefined);
      setNotes('');
      setShowNotes(false);
    } catch (error) {
      console.error('Error updating workflow step:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getActionButton = (step: WorkflowStep) => {
    const actionConfig: Record<WorkflowStep, {
      label: string;
      icon: React.ReactNode;
      color: string;
      action: () => Promise<void>;
    } | undefined> = {
      'itinerary_created': {
        label: 'Send Itinerary',
        icon: <Send className="h-4 w-4" />,
        color: 'bg-blue-600 hover:bg-blue-700',
        action: () => handleStepAction('itinerary_sent')
      },
      'itinerary_sent': {
        label: 'Record Feedback',
        icon: <MessageSquare className="h-4 w-4" />,
        color: 'bg-green-600 hover:bg-green-700',
        action: () => handleStepAction('feedback_received', true)
      },
      'feedback_received': {
        label: 'Make Changes',
        icon: <Edit3 className="h-4 w-4" />,
        color: 'bg-orange-600 hover:bg-orange-700',
        action: () => handleStepAction('changes_made', true)
      },
      'changes_made': {
        label: 'Mark Approved',
        icon: <CheckCircle className="h-4 w-4" />,
        color: 'bg-green-600 hover:bg-green-700',
        action: () => handleStepAction('approved')
      },
      'approved': {
        label: 'Record Payment',
        icon: <CreditCard className="h-4 w-4" />,
        color: 'bg-indigo-600 hover:bg-indigo-700',
        action: () => handleStepAction('payment_received')
      },
      'payment_received': {
        label: 'Confirm Booking',
        icon: <CheckCircle className="h-4 w-4" />,
        color: 'bg-green-600 hover:bg-green-700',
        action: () => handleStepAction('booking_confirmed')
      },
      'booking_confirmed': {
        label: 'Book Flights',
        icon: <Plane className="h-4 w-4" />,
        color: 'bg-blue-600 hover:bg-blue-700',
        action: () => handleStepAction('flights_booked')
      },
      'flights_booked': {
        label: 'Book Hotels',
        icon: <Building className="h-4 w-4" />,
        color: 'bg-purple-600 hover:bg-purple-700',
        action: () => handleStepAction('hotels_booked')
      },
      'hotels_booked': {
        label: 'Send Confirmations',
        icon: <Mail className="h-4 w-4" />,
        color: 'bg-green-600 hover:bg-green-700',
        action: () => handleStepAction('confirmations_sent')
      },
      'confirmations_sent': undefined
    };

    return actionConfig[step];
  };

  const currentAction = getActionButton(currentStep);

  if (!currentAction) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
          <span className="text-green-800 font-medium">Workflow Complete</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h4 className="text-sm font-medium text-gray-900 mb-3">Next Action</h4>
      
      {showNotes && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Required)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Add notes about this step..."
          />
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={currentAction.action}
          disabled={isProcessing}
          className={`flex items-center space-x-2 px-4 py-2 text-white rounded-lg font-medium transition-colors ${currentAction.color} disabled:opacity-50`}
        >
          {currentAction.icon}
          <span>{isProcessing ? 'Processing...' : currentAction.label}</span>
        </button>

        {showNotes && (
          <button
            onClick={() => {
              setShowNotes(false);
              setNotes('');
            }}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        )}

        {!showNotes && currentStep !== 'itinerary_created' && (
          <button
            onClick={() => setShowNotes(true)}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Add Notes
          </button>
        )}
      </div>
    </div>
  );
} 