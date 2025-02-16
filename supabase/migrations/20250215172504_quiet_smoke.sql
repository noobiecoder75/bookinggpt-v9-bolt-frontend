/*
  # Disable Row Level Security

  This migration disables row level security (RLS) on all tables to allow unrestricted access to data.
  
  1. Changes
    - Disables RLS on all tables
    - Drops existing RLS policies
*/

-- Disable RLS on all tables
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotes DISABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily_summary DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all roles" ON roles;
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can view customers" ON customers;
DROP POLICY IF EXISTS "Users can manage their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can manage their settings" ON user_settings;
DROP POLICY IF EXISTS "Users can view quotes they created" ON quotes;
DROP POLICY IF EXISTS "Users can manage their quotes" ON quotes;
DROP POLICY IF EXISTS "Users can view quote items for their quotes" ON quote_items;
DROP POLICY IF EXISTS "Users can manage quote items for their quotes" ON quote_items;
DROP POLICY IF EXISTS "Users can view their bookings" ON bookings;
DROP POLICY IF EXISTS "Users can manage their bookings" ON bookings;
DROP POLICY IF EXISTS "Users can view booking items for their bookings" ON booking_items;
DROP POLICY IF EXISTS "Users can manage booking items for their bookings" ON booking_items;
DROP POLICY IF EXISTS "Users can view payments for their bookings" ON payments;
DROP POLICY IF EXISTS "Users can manage payments for their bookings" ON payments;
DROP POLICY IF EXISTS "Users can view their rates" ON rates;
DROP POLICY IF EXISTS "Users can manage their rates" ON rates;
DROP POLICY IF EXISTS "Users can view their analytics" ON analytics_daily_summary;
DROP POLICY IF EXISTS "Agents can view all quotes for analytics" ON quotes;
DROP POLICY IF EXISTS "Agents can view all bookings for analytics" ON bookings;
DROP POLICY IF EXISTS "Agents can view all booking items for analytics" ON booking_items;
DROP POLICY IF EXISTS "Agents can view customer data for analytics" ON customers;
DROP POLICY IF EXISTS "Agents can view their analytics summaries" ON analytics_daily_summary;