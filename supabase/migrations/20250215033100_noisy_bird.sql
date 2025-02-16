/*
  # Bookings Schema for B2B Travel Application

  1. New Tables
    - `bookings` - Main bookings table
    - `booking_items` - Line items for bookings
    - `payments` - Payment history

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create enum types
CREATE TYPE booking_status AS ENUM ('Confirmed', 'Cancelled', 'Completed');
CREATE TYPE payment_status AS ENUM ('Unpaid', 'Partial', 'Paid');
CREATE TYPE payment_method AS ENUM ('CreditCard', 'BankTransfer', 'Cash', 'Other');

-- Create bookings table
CREATE TABLE bookings (
  id BIGSERIAL PRIMARY KEY,
  booking_reference VARCHAR UNIQUE NOT NULL,
  quote_id BIGINT REFERENCES quotes(id),
  customer_id BIGINT REFERENCES customers(id) ON DELETE RESTRICT,
  agent_id UUID REFERENCES users(id),
  status booking_status DEFAULT 'Confirmed',
  total_price DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  payment_status payment_status DEFAULT 'Unpaid',
  travel_start_date DATE NOT NULL,
  travel_end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_travel_dates CHECK (travel_end_date >= travel_start_date)
);

-- Create booking_items table
CREATE TABLE booking_items (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT REFERENCES bookings(id) ON DELETE CASCADE,
  item_type item_type NOT NULL,
  item_name VARCHAR NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create payments table
CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT REFERENCES bookings(id) ON DELETE CASCADE,
  payment_date TIMESTAMPTZ DEFAULT now(),
  amount DECIMAL(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  transaction_reference VARCHAR,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their bookings"
  ON bookings FOR SELECT TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Users can manage their bookings"
  ON bookings FOR ALL TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Users can view booking items for their bookings"
  ON booking_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_items.booking_id
      AND bookings.agent_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage booking items for their bookings"
  ON booking_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_items.booking_id
      AND bookings.agent_id = auth.uid()
    )
  );

CREATE POLICY "Users can view payments for their bookings"
  ON payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payments.booking_id
      AND bookings.agent_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage payments for their bookings"
  ON payments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payments.booking_id
      AND bookings.agent_id = auth.uid()
    )
  );

-- Create function to generate booking reference
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
  NEW.booking_reference := 'B-' || to_char(now(), 'YYYY') || '-' || 
                          LPAD(CAST(nextval('bookings_id_seq') AS TEXT), 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking reference
CREATE TRIGGER set_booking_reference
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION generate_booking_reference();