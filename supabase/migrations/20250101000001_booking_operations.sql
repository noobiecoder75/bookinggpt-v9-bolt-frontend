/*
  # Enhanced Booking Operations Schema

  1. New booking statuses for workflow
  2. Operations tracking table
  3. Notifications system
  4. Booking workflow states
*/

-- Add new booking statuses for enhanced workflow
ALTER TYPE booking_status ADD VALUE 'Pending_Change';
ALTER TYPE booking_status ADD VALUE 'Change_Requested';
ALTER TYPE booking_status ADD VALUE 'Rescheduled';
ALTER TYPE booking_status ADD VALUE 'Processing';

-- Create booking operations table
CREATE TABLE booking_operations (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT REFERENCES bookings(id) ON DELETE CASCADE,
  operation_type VARCHAR NOT NULL, -- 'airline_change', 'customer_change', 'cancellation', 'rebook'
  operation_status VARCHAR DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  original_details JSONB,
  new_details JSONB,
  reason TEXT,
  change_fee DECIMAL(10,2) DEFAULT 0,
  refund_amount DECIMAL(10,2) DEFAULT 0,
  supplier_reference VARCHAR,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  notes TEXT
);

-- Create booking notifications table
CREATE TABLE booking_notifications (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT REFERENCES bookings(id) ON DELETE CASCADE,
  notification_type VARCHAR NOT NULL, -- 'schedule_change', 'cancellation', 'payment_due', 'confirmation'
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

-- Create booking workflow states table
CREATE TABLE booking_workflow_states (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT REFERENCES bookings(id) ON DELETE CASCADE,
  workflow_step VARCHAR NOT NULL, -- 'itinerary_created', 'itinerary_sent', 'approved', 'payment_received', 'booking_confirmed'
  status VARCHAR DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'skipped'
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB,
  notes TEXT
);

-- Enable RLS
ALTER TABLE booking_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_workflow_states ENABLE ROW LEVEL SECURITY;

-- Create policies for booking operations
CREATE POLICY "Users can view operations for their bookings"
  ON booking_operations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_operations.booking_id
      AND bookings.agent_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage operations for their bookings"
  ON booking_operations FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_operations.booking_id
      AND bookings.agent_id = auth.uid()
    )
  );

-- Create policies for booking notifications
CREATE POLICY "Users can view notifications for their bookings"
  ON booking_notifications FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_notifications.booking_id
      AND bookings.agent_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage notifications for their bookings"
  ON booking_notifications FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_notifications.booking_id
      AND bookings.agent_id = auth.uid()
    )
  );

-- Create policies for booking workflow states
CREATE POLICY "Users can view workflow states for their bookings"
  ON booking_workflow_states FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_workflow_states.booking_id
      AND bookings.agent_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage workflow states for their bookings"
  ON booking_workflow_states FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_workflow_states.booking_id
      AND bookings.agent_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX booking_operations_booking_id_idx ON booking_operations(booking_id);
CREATE INDEX booking_operations_status_idx ON booking_operations(operation_status);
CREATE INDEX booking_notifications_booking_id_idx ON booking_notifications(booking_id);
CREATE INDEX booking_notifications_read_idx ON booking_notifications(read_at);
CREATE INDEX booking_workflow_states_booking_id_idx ON booking_workflow_states(booking_id);
CREATE INDEX booking_workflow_states_step_idx ON booking_workflow_states(workflow_step); 