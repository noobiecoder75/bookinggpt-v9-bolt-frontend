/*
  # Booking Confirmations Schema for External API Integration

  1. New Tables
    - `booking_confirmations` - Track confirmations from external APIs (Hotelbeds, Amadeus, etc.)

  2. Extensions
    - Add payment_reference to bookings table
    - Add new booking statuses for API integration workflow

  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Extend booking status enum to include API integration statuses
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'Pending';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'Processing';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'Failed';

-- Add payment_reference to bookings table if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'bookings' AND column_name = 'payment_reference') THEN
    ALTER TABLE bookings ADD COLUMN payment_reference VARCHAR;
  END IF;
END $$;

-- Create booking_confirmations table
CREATE TABLE IF NOT EXISTS booking_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id BIGINT REFERENCES bookings(id) ON DELETE CASCADE,
  quote_item_id BIGINT REFERENCES quote_items(id),
  provider VARCHAR(50) NOT NULL, -- 'hotelbeds', 'amadeus', 'manual', etc.
  provider_booking_id VARCHAR(255), -- External booking ID
  confirmation_number VARCHAR(255), -- Confirmation code from provider
  booking_reference VARCHAR(255), -- Provider's booking reference
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'failed', 'cancelled'
  raw_request JSONB, -- Store the original booking request
  raw_response JSONB, -- Store the API response
  error_details JSONB, -- Store error details if booking failed
  booking_details JSONB, -- Structured booking information
  amount DECIMAL(10,2), -- Amount for this specific booking
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS booking_confirmations_booking_id_idx ON booking_confirmations(booking_id);
CREATE INDEX IF NOT EXISTS booking_confirmations_provider_idx ON booking_confirmations(provider);
CREATE INDEX IF NOT EXISTS booking_confirmations_status_idx ON booking_confirmations(status);
CREATE INDEX IF NOT EXISTS booking_confirmations_confirmation_number_idx ON booking_confirmations(confirmation_number);

-- Enable RLS
ALTER TABLE booking_confirmations ENABLE ROW LEVEL SECURITY;

-- Create policies for booking_confirmations
CREATE POLICY "Users can view confirmations for their bookings"
  ON booking_confirmations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_confirmations.booking_id
      AND bookings.agent_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage confirmations for their bookings"
  ON booking_confirmations FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_confirmations.booking_id
      AND bookings.agent_id = auth.uid()
    )
  );

-- Create function to update booking confirmation timestamps
CREATE OR REPLACE FUNCTION update_booking_confirmation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  
  -- Set confirmed_at when status changes to confirmed
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    NEW.confirmed_at = now();
  END IF;
  
  -- Set cancelled_at when status changes to cancelled
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    NEW.cancelled_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking confirmation timestamp updates
DROP TRIGGER IF EXISTS update_booking_confirmation_timestamp_trigger ON booking_confirmations;
CREATE TRIGGER update_booking_confirmation_timestamp_trigger
  BEFORE UPDATE ON booking_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_confirmation_timestamp();

-- Create function to update booking status based on confirmations
CREATE OR REPLACE FUNCTION update_booking_status_from_confirmations()
RETURNS TRIGGER AS $$
DECLARE
  total_confirmations INTEGER;
  confirmed_confirmations INTEGER;
  failed_confirmations INTEGER;
  booking_record RECORD;
BEGIN
  -- Get booking details
  SELECT * INTO booking_record FROM bookings WHERE id = NEW.booking_id;
  
  -- Count confirmations for this booking
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
  INTO total_confirmations, confirmed_confirmations, failed_confirmations
  FROM booking_confirmations 
  WHERE booking_id = NEW.booking_id;
  
  -- Update booking status based on confirmation states
  IF failed_confirmations > 0 THEN
    -- If any confirmation failed, mark booking as failed
    UPDATE bookings SET status = 'Failed', updated_at = now() WHERE id = NEW.booking_id;
  ELSIF confirmed_confirmations = total_confirmations AND total_confirmations > 0 THEN
    -- If all confirmations are confirmed, mark booking as confirmed
    UPDATE bookings SET status = 'Confirmed', updated_at = now() WHERE id = NEW.booking_id;
  ELSIF total_confirmations > 0 THEN
    -- If we have confirmations but not all are confirmed, mark as processing
    UPDATE bookings SET status = 'Processing', updated_at = now() WHERE id = NEW.booking_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update booking status
DROP TRIGGER IF EXISTS update_booking_status_trigger ON booking_confirmations;
CREATE TRIGGER update_booking_status_trigger
  AFTER INSERT OR UPDATE ON booking_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_status_from_confirmations(); 