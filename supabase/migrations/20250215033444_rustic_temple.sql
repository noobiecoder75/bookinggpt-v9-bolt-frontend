/*
  # Seed Data for B2B Travel Application

  This migration adds interconnected demo data across all tables to showcase the relationships
  and functionality of the system.

  1. Data Creation Order:
    - Auth Users (in auth schema)
    - Application Users
    - Customers
    - Quotes and Quote Items
    - Bookings and Booking Items
    - Payments
    - Rates
    - Templates
    - Settings and Notifications
*/

-- First, create the auth.users entries
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
VALUES
  ('d7bed82f-accb-4bb1-96da-1d59c8725e5c', 'sarah@travelcrm.com', now(), now(), now()),
  ('e9b9f3c6-8661-4c3f-99a9-3a1ac5c30f14', 'michael@travelcrm.com', now(), now(), now()),
  ('f4a33c7b-9b6e-4f6d-8bee-3c0e77689c8f', 'emma@travelcrm.com', now(), now(), now());

-- Now we can safely insert the application users
INSERT INTO users (id, role_id, first_name, last_name, email) VALUES
  ('d7bed82f-accb-4bb1-96da-1d59c8725e5c', (SELECT id FROM roles WHERE name = 'agent'), 'Sarah', 'Johnson', 'sarah@travelcrm.com'),
  ('e9b9f3c6-8661-4c3f-99a9-3a1ac5c30f14', (SELECT id FROM roles WHERE name = 'agent'), 'Michael', 'Chen', 'michael@travelcrm.com'),
  ('f4a33c7b-9b6e-4f6d-8bee-3c0e77689c8f', (SELECT id FROM roles WHERE name = 'manager'), 'Emma', 'Rodriguez', 'emma@travelcrm.com');

-- Insert demo customers
INSERT INTO customers (first_name, last_name, email, phone, passport_number, passport_expiry, nationality, date_of_birth) VALUES
  ('John', 'Smith', 'john.smith@email.com', '+1-555-0123', 'US123456', '2027-06-15', 'USA', '1985-03-12'),
  ('Maria', 'Garcia', 'maria.g@email.com', '+1-555-0124', 'ES789012', '2026-08-20', 'Spain', '1990-07-25'),
  ('James', 'Wilson', 'james.w@email.com', '+1-555-0125', 'UK345678', '2028-01-10', 'UK', '1988-11-30'),
  ('Yuki', 'Tanaka', 'yuki.t@email.com', '+1-555-0126', 'JP901234', '2026-12-05', 'Japan', '1992-04-18');

-- Insert demo quotes
INSERT INTO quotes (customer_id, agent_id, status, total_price, markup, discount, expiry_date) VALUES
  ((SELECT id FROM customers WHERE email = 'john.smith@email.com'),
   'e9b9f3c6-8661-4c3f-99a9-3a1ac5c30f14',
   'Sent', 2500.00, 250.00, 100.00, now() + interval '30 days'),
  ((SELECT id FROM customers WHERE email = 'maria.g@email.com'),
   'd7bed82f-accb-4bb1-96da-1d59c8725e5c',
   'Converted', 3800.00, 380.00, 150.00, now() + interval '30 days'),
  ((SELECT id FROM customers WHERE email = 'yuki.t@email.com'),
   'd7bed82f-accb-4bb1-96da-1d59c8725e5c',
   'Draft', 1500.00, 150.00, 0.00, now() + interval '30 days');

-- Insert demo quote items
INSERT INTO quote_items (quote_id, item_type, item_name, cost, quantity, details) VALUES
  ((SELECT id FROM quotes WHERE customer_id = (SELECT id FROM customers WHERE email = 'john.smith@email.com')),
   'Flight', 'NYC to Paris - Air France', 800.00, 2,
   '{"departure": "2025-07-15T10:00:00Z", "arrival": "2025-07-15T22:30:00Z", "class": "Economy"}'),
  ((SELECT id FROM quotes WHERE customer_id = (SELECT id FROM customers WHERE email = 'john.smith@email.com')),
   'Hotel', 'Paris Luxury Hotel', 900.00, 1,
   '{"check_in": "2025-07-15", "check_out": "2025-07-20", "room_type": "Deluxe"}'),
  ((SELECT id FROM quotes WHERE customer_id = (SELECT id FROM customers WHERE email = 'maria.g@email.com')),
   'Tour', 'Tokyo City Tour', 200.00, 2,
   '{"date": "2025-08-10", "duration": "8 hours", "includes_lunch": true}');

-- Insert demo bookings
INSERT INTO bookings (quote_id, customer_id, agent_id, status, total_price, amount_paid, payment_status,
                     travel_start_date, travel_end_date) VALUES
  ((SELECT id FROM quotes WHERE customer_id = (SELECT id FROM customers WHERE email = 'maria.g@email.com')),
   (SELECT id FROM customers WHERE email = 'maria.g@email.com'),
   'd7bed82f-accb-4bb1-96da-1d59c8725e5c',
   'Confirmed', 3800.00, 2000.00, 'Partial',
   '2025-08-10', '2025-08-17');

-- Insert demo booking items
INSERT INTO booking_items (booking_id, item_type, item_name, cost, quantity, details) VALUES
  ((SELECT id FROM bookings WHERE customer_id = (SELECT id FROM customers WHERE email = 'maria.g@email.com')),
   'Flight', 'LAX to Tokyo - JAL', 1500.00, 2,
   '{"departure": "2025-08-10T08:00:00Z", "arrival": "2025-08-11T12:30:00Z", "class": "Economy"}'),
  ((SELECT id FROM bookings WHERE customer_id = (SELECT id FROM customers WHERE email = 'maria.g@email.com')),
   'Hotel', 'Tokyo Luxury Hotel', 800.00, 1,
   '{"check_in": "2025-08-11", "check_out": "2025-08-17", "room_type": "Suite"}');

-- Insert demo payments
INSERT INTO payments (booking_id, amount, payment_method, transaction_reference, notes) VALUES
  ((SELECT id FROM bookings WHERE customer_id = (SELECT id FROM customers WHERE email = 'maria.g@email.com')),
   1000.00, 'CreditCard', 'TXN-001', 'Initial deposit'),
  ((SELECT id FROM bookings WHERE customer_id = (SELECT id FROM customers WHERE email = 'maria.g@email.com')),
   1000.00, 'BankTransfer', 'TXN-002', 'Second payment');

-- Insert demo rates
INSERT INTO rates (agent_id, rate_type, description, cost, currency, valid_start, valid_end, details) VALUES
  ('d7bed82f-accb-4bb1-96da-1d59c8725e5c', 'Hotel',
   'Luxury Hotels Group - Premium Rate', 200.00, 'USD',
   '2025-01-01', '2025-12-31',
   '{"chain": "Luxury Hotels Group", "min_nights": 3, "includes_breakfast": true}'),
  ('e9b9f3c6-8661-4c3f-99a9-3a1ac5c30f14', 'Flight',
   'Star Alliance - Corporate Rate', 0.85, 'USD',
   '2025-01-01', '2025-12-31',
   '{"alliance": "Star Alliance", "discount_type": "percentage", "discount_value": 15}');

-- Insert demo templates
INSERT INTO templates (template_name, template_type, content_html, agent_id) VALUES
  ('Luxury Quote Template', 'QuoteEmail',
   '<h1>Your Luxury Travel Quote</h1>{{quote_details}}',
   'd7bed82f-accb-4bb1-96da-1d59c8725e5c'),
  ('Booking Confirmation', 'BookingEmail',
   '<h1>Your Booking is Confirmed!</h1>{{booking_details}}',
   null);

-- Insert demo notifications
INSERT INTO notifications (user_id, message) VALUES
  ('d7bed82f-accb-4bb1-96da-1d59c8725e5c', 'New quote request from John Smith'),
  ('e9b9f3c6-8661-4c3f-99a9-3a1ac5c30f14', 'Payment received for booking B-2025-0001');

-- Insert demo user settings
INSERT INTO user_settings (user_id, setting_key, setting_value) VALUES
  ('d7bed82f-accb-4bb1-96da-1d59c8725e5c', 'currency_preference',
   '{"display": "USD", "exchange_rates": true}'),
  ('e9b9f3c6-8661-4c3f-99a9-3a1ac5c30f14', 'notification_preferences',
   '{"email": true, "push": false, "sms": false}');