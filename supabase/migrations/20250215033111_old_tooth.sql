/*
  # Rates and Analytics Schema for B2B Travel Application

  1. New Tables
    - `rates` - Agent-specific rates
    - `analytics_daily_summary` - Aggregated analytics data

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create rates table
CREATE TABLE rates (
  id BIGSERIAL PRIMARY KEY,
  agent_id UUID REFERENCES users(id),
  rate_type item_type NOT NULL,
  description VARCHAR NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  valid_start DATE,
  valid_end DATE,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_rate_dates CHECK (valid_end >= valid_start)
);

-- Create analytics_daily_summary table
CREATE TABLE analytics_daily_summary (
  id BIGSERIAL PRIMARY KEY,
  summary_date DATE NOT NULL,
  agent_id UUID REFERENCES users(id),
  total_quotes INTEGER DEFAULT 0,
  quotes_converted INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  flights_revenue DECIMAL(10,2) DEFAULT 0,
  hotels_revenue DECIMAL(10,2) DEFAULT 0,
  tours_revenue DECIMAL(10,2) DEFAULT 0,
  insurance_revenue DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(summary_date, agent_id)
);

-- Enable RLS
ALTER TABLE rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily_summary ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their rates"
  ON rates FOR SELECT TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Users can manage their rates"
  ON rates FOR ALL TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Users can view their analytics"
  ON analytics_daily_summary FOR SELECT TO authenticated
  USING (agent_id = auth.uid());

-- Create function to update analytics summary
CREATE OR REPLACE FUNCTION update_daily_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert analytics summary for the booking date
  INSERT INTO analytics_daily_summary (
    summary_date,
    agent_id,
    total_bookings,
    total_revenue
  )
  VALUES (
    CURRENT_DATE,
    NEW.agent_id,
    1,
    NEW.total_price
  )
  ON CONFLICT (summary_date, agent_id)
  DO UPDATE SET
    total_bookings = analytics_daily_summary.total_bookings + 1,
    total_revenue = analytics_daily_summary.total_revenue + NEW.total_price,
    created_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update analytics on new booking
CREATE TRIGGER update_analytics_on_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_analytics();