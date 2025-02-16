/*
  # Base Schema for B2B Travel Application

  1. New Tables
    - `users` - Core user table with RLS
    - `roles` - User roles (admin, agent, etc.)
    - `customers` - Customer information and passport details
    - `templates` - Email and document templates
    - `notifications` - User notifications
    - `user_settings` - User preferences

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create roles table
CREATE TABLE roles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create users table (extending Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  role_id BIGINT REFERENCES roles(id),
  first_name VARCHAR,
  last_name VARCHAR,
  email VARCHAR UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create customers table
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  email VARCHAR UNIQUE,
  phone VARCHAR,
  passport_number VARCHAR,
  passport_expiry DATE,
  nationality VARCHAR,
  date_of_birth DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create templates table
CREATE TABLE templates (
  id BIGSERIAL PRIMARY KEY,
  template_name VARCHAR NOT NULL,
  template_type VARCHAR NOT NULL,
  content_html TEXT,
  agent_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create notifications table
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message VARCHAR NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_settings table
CREATE TABLE user_settings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  setting_key VARCHAR NOT NULL,
  setting_value JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, setting_key)
);

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all roles"
  ON roles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can view their own data"
  ON users FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can view customers"
  ON customers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can manage their notifications"
  ON notifications FOR ALL TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their settings"
  ON user_settings FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Create enum types
CREATE TYPE template_type AS ENUM ('QuoteEmail', 'BookingEmail', 'Invoice');

-- Insert default roles
INSERT INTO roles (name, description) VALUES
  ('admin', 'System administrator'),
  ('agent', 'Travel agent'),
  ('manager', 'Team manager');