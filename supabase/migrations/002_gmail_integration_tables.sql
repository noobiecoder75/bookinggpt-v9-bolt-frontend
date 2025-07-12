-- Gmail Integration Tables Migration
-- Creates tables needed for Gmail OAuth and email tracking

-- User Integrations Table (for storing OAuth tokens)
CREATE TABLE IF NOT EXISTS user_integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    integration_type VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    tokens JSONB,
    is_connected BOOLEAN DEFAULT false,
    last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Communications Table (for tracking sent emails)
CREATE TABLE IF NOT EXISTS email_communications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    quote_id VARCHAR(50),
    email_type VARCHAR(100) NOT NULL,
    subject TEXT NOT NULL,
    recipients TEXT[] NOT NULL,
    status VARCHAR(20) DEFAULT 'sent',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    opened_at TIMESTAMP WITH TIME ZONE,
    bounced_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer Events Table (for activity tracking)
CREATE TABLE IF NOT EXISTS customer_events (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    quote_id INTEGER,
    booking_id INTEGER,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_type ON user_integrations(integration_type);
CREATE INDEX IF NOT EXISTS idx_email_communications_customer_id ON email_communications(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_communications_sent_at ON email_communications(sent_at);
CREATE INDEX IF NOT EXISTS idx_customer_events_customer_id ON customer_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_events_created_at ON customer_events(created_at);