export type BookingStatus = 
  | 'Confirmed' 
  | 'Cancelled' 
  | 'Completed'
  | 'Pending_Change'
  | 'Change_Requested'
  | 'Rescheduled'
  | 'Processing';

export type PaymentStatus = 'Unpaid' | 'Partial' | 'Paid';

export type OperationType = 
  | 'airline_change'
  | 'customer_change' 
  | 'cancellation'
  | 'rebook';

export type OperationStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export type WorkflowStep = 
  | 'itinerary_created'
  | 'itinerary_sent'
  | 'feedback_received'
  | 'changes_made'
  | 'approved'
  | 'payment_received'
  | 'booking_confirmed'
  | 'flights_booked'
  | 'hotels_booked'
  | 'confirmations_sent';

export type NotificationType = 
  | 'schedule_change'
  | 'cancellation'
  | 'payment_due'
  | 'confirmation'
  | 'change_request';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface BookingOperation {
  id: number;
  booking_id: number;
  operation_type: OperationType;
  operation_status: OperationStatus;
  original_details?: any;
  new_details?: any;
  reason: string;
  change_fee: number;
  refund_amount: number;
  supplier_reference?: string;
  created_by?: string;
  created_at: string;
  completed_at?: string;
  notes?: string;
  booking?: {
    booking_reference: string;
    customer: {
      first_name: string;
      last_name: string;
      email: string;
    };
    travel_start_date: string;
  };
}

export interface BookingNotification {
  id: number;
  booking_id: number;
  notification_type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  read_at?: string;
  created_at: string;
  metadata?: any;
  booking?: {
    booking_reference: string;
    customer: {
      first_name: string;
      last_name: string;
      email: string;
    };
  };
}

export interface BookingWorkflowState {
  id: number;
  booking_id: number;
  workflow_step: WorkflowStep;
  status: 'pending' | 'completed' | 'failed' | 'skipped';
  started_at: string;
  completed_at?: string;
  metadata?: any;
  notes?: string;
}

export interface EnhancedBooking {
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
  workflow_states?: BookingWorkflowState[];
  operations?: BookingOperation[];
  notifications?: BookingNotification[];
} 