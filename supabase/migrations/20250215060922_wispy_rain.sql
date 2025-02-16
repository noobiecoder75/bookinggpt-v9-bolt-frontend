/*
  # Add RLS policies for analytics access

  1. Changes
    - Add RLS policies to allow authenticated users to access:
      - quotes table
      - bookings table
      - booking_items table
      - customers table
      - analytics_daily_summary table
    - Policies are scoped to the agent's own data

  2. Security
    - Ensures agents can only see their own analytics data
    - Maintains data isolation between different agents
*/

-- Add policies for quotes analytics access
CREATE POLICY "Agents can view all quotes for analytics"
  ON quotes FOR SELECT TO authenticated
  USING (agent_id = auth.uid());

-- Add policies for bookings analytics access
CREATE POLICY "Agents can view all bookings for analytics"
  ON bookings FOR SELECT TO authenticated
  USING (agent_id = auth.uid());

-- Add policies for booking items analytics access
CREATE POLICY "Agents can view all booking items for analytics"
  ON booking_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_items.booking_id
      AND bookings.agent_id = auth.uid()
    )
  );

-- Add policies for customers analytics access
CREATE POLICY "Agents can view customer data for analytics"
  ON customers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings WHERE bookings.customer_id = customers.id AND bookings.agent_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM quotes WHERE quotes.customer_id = customers.id AND quotes.agent_id = auth.uid()
    )
  );

-- Add policies for analytics summary access
CREATE POLICY "Agents can view their analytics summaries"
  ON analytics_daily_summary FOR SELECT TO authenticated
  USING (agent_id = auth.uid());