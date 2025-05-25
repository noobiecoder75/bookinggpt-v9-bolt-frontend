/*
  # Add Customer Events Tracking

  1. New Tables
    - `customer_events`
      - `id` (bigserial, primary key)
      - `customer_id` (references customers)
      - `event_type` (enum)
      - `quote_id` (optional, references quotes)
      - `booking_id` (optional, references bookings)
      - `description` (text)
      - `created_at` (timestamptz)

  2. Changes
    - Add event_type enum
    - Create customer_events table
    - Add triggers for quote events
    - Add triggers for booking events
    - Add triggers for payment events

  3. Security
    - Enable RLS
    - Add policies for event access
*/

-- Create event_type enum
CREATE TYPE customer_event_type AS ENUM (
  'QUOTE_CREATED',
  'QUOTE_UPDATED',
  'QUOTE_SENT',
  'QUOTE_EXPIRED',
  'QUOTE_CONVERTED',
  'BOOKING_CREATED',
  'BOOKING_CONFIRMED',
  'BOOKING_CANCELLED',
  'BOOKING_COMPLETED',
  'PAYMENT_RECEIVED'
);

-- Create customer_events table
CREATE TABLE customer_events (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT REFERENCES customers(id) ON DELETE CASCADE,
  event_type customer_event_type NOT NULL,
  quote_id BIGINT REFERENCES quotes(id) ON DELETE SET NULL,
  booking_id BIGINT REFERENCES bookings(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster customer timeline queries
CREATE INDEX customer_events_customer_id_created_at_idx 
ON customer_events(customer_id, created_at DESC);

-- Create function for quote events
CREATE OR REPLACE FUNCTION create_quote_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New quote created
    INSERT INTO customer_events (
      customer_id,
      event_type,
      quote_id,
      description
    ) VALUES (
      NEW.customer_id,
      'QUOTE_CREATED'::customer_event_type,
      NEW.id,
      'Quote ' || NEW.quote_reference || ' was created'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Quote status changed
    IF OLD.status != NEW.status THEN
      INSERT INTO customer_events (
        customer_id,
        event_type,
        quote_id,
        description
      ) VALUES (
        NEW.customer_id,
        CASE
          WHEN NEW.status = 'Sent' THEN 'QUOTE_SENT'::customer_event_type
          WHEN NEW.status = 'Expired' THEN 'QUOTE_EXPIRED'::customer_event_type
          WHEN NEW.status = 'Converted' THEN 'QUOTE_CONVERTED'::customer_event_type
          ELSE 'QUOTE_UPDATED'::customer_event_type
        END,
        NEW.id,
        'Quote ' || NEW.quote_reference || ' status changed to ' || NEW.status
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function for booking events
CREATE OR REPLACE FUNCTION create_booking_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New booking created
    INSERT INTO customer_events (
      customer_id,
      event_type,
      booking_id,
      description
    ) VALUES (
      NEW.customer_id,
      'BOOKING_CREATED'::customer_event_type,
      NEW.id,
      'Booking ' || NEW.booking_reference || ' was created'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Booking status changed
    IF OLD.status != NEW.status THEN
      INSERT INTO customer_events (
        customer_id,
        event_type,
        booking_id,
        description
      ) VALUES (
        NEW.customer_id,
        CASE
          WHEN NEW.status = 'Confirmed' THEN 'BOOKING_CONFIRMED'::customer_event_type
          WHEN NEW.status = 'Cancelled' THEN 'BOOKING_CANCELLED'::customer_event_type
          WHEN NEW.status = 'Completed' THEN 'BOOKING_COMPLETED'::customer_event_type
        END,
        NEW.id,
        'Booking ' || NEW.booking_reference || ' status changed to ' || NEW.status
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function for payment events
CREATE OR REPLACE FUNCTION create_payment_event()
RETURNS TRIGGER AS $$
DECLARE
  booking_customer_id BIGINT;
BEGIN
  -- Get customer_id from the associated booking
  SELECT customer_id INTO booking_customer_id
  FROM bookings
  WHERE id = NEW.booking_id;

  -- Create payment received event
  INSERT INTO customer_events (
    customer_id,
    event_type,
    booking_id,
    description
  ) VALUES (
    booking_customer_id,
    'PAYMENT_RECEIVED'::customer_event_type,
    NEW.booking_id,
    'Payment of $' || NEW.amount || ' received for booking #' || NEW.booking_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER on_quote_change
  AFTER INSERT OR UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION create_quote_event();

CREATE TRIGGER on_booking_change
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_booking_event();

CREATE TRIGGER on_payment_received
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION create_payment_event();

-- Enable RLS
ALTER TABLE customer_events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view customer events"
  ON customer_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = customer_events.quote_id
      AND quotes.agent_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = customer_events.booking_id
      AND bookings.agent_id = auth.uid()
    )
  );