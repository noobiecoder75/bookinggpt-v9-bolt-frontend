/*
  # Payment System Database Schema
  
  This migration creates the database tables needed for the dual payment system:
  - B2B subscriptions for agents
  - B2C payment processing for customer bookings
  
  Tables:
  - subscriptions: Agent subscription data
  - agent_payment_accounts: Stripe Connect account info
  - customer_payments: Customer payment processing
  - payment_webhooks: Webhook event logging
*/

-- Create subscription status enum
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid');

-- Create subscription tier enum
CREATE TYPE subscription_tier AS ENUM ('basic', 'professional', 'enterprise');

-- Create payment status enum
CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'cancelled', 'refunded', 'partially_refunded');

-- Create payment type enum
CREATE TYPE payment_type AS ENUM ('deposit', 'final', 'installment', 'full');

-- Create subscriptions table for B2B agent subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    tier subscription_tier NOT NULL,
    status subscription_status NOT NULL,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    cancel_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create agent_payment_accounts table for Stripe Connect
CREATE TABLE agent_payment_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stripe_account_id TEXT UNIQUE NOT NULL,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    charges_enabled BOOLEAN DEFAULT FALSE,
    payouts_enabled BOOLEAN DEFAULT FALSE,
    country TEXT,
    currency TEXT DEFAULT 'USD',
    business_type TEXT,
    business_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create customer_payments table for B2C payments
CREATE TABLE customer_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id BIGINT, -- References bookings table when it exists
    customer_id BIGINT REFERENCES customers(id),
    agent_id UUID REFERENCES users(id),
    stripe_payment_intent_id TEXT UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    payment_type payment_type NOT NULL,
    status payment_status NOT NULL,
    platform_fee DECIMAL(10,2),
    agent_fee DECIMAL(10,2),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payment_webhooks table for webhook event logging
CREATE TABLE payment_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Create subscription_usage table for tracking usage limits
CREATE TABLE subscription_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    usage_type TEXT NOT NULL, -- 'quotes', 'bookings', 'api_calls', etc.
    usage_count INTEGER DEFAULT 0,
    usage_limit INTEGER,
    reset_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscriptions
CREATE POLICY "Users can view their own subscriptions"
    ON subscriptions FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own subscriptions"
    ON subscriptions FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

-- Create RLS policies for agent_payment_accounts
CREATE POLICY "Agents can view their own payment accounts"
    ON agent_payment_accounts FOR SELECT TO authenticated
    USING (agent_id = auth.uid());

CREATE POLICY "Agents can update their own payment accounts"
    ON agent_payment_accounts FOR UPDATE TO authenticated
    USING (agent_id = auth.uid());

-- Create RLS policies for customer_payments
CREATE POLICY "Agents can view their customer payments"
    ON customer_payments FOR SELECT TO authenticated
    USING (agent_id = auth.uid());

CREATE POLICY "Agents can insert customer payments"
    ON customer_payments FOR INSERT TO authenticated
    WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update their customer payments"
    ON customer_payments FOR UPDATE TO authenticated
    USING (agent_id = auth.uid());

-- Create RLS policies for payment_webhooks (admin only)
CREATE POLICY "Only authenticated users can view webhooks"
    ON payment_webhooks FOR SELECT TO authenticated
    USING (true);

-- Create RLS policies for subscription_usage
CREATE POLICY "Users can view their own subscription usage"
    ON subscription_usage FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own subscription usage"
    ON subscription_usage FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_tier ON subscriptions(tier);

CREATE INDEX idx_agent_payment_accounts_agent_id ON agent_payment_accounts(agent_id);
CREATE INDEX idx_agent_payment_accounts_stripe_account_id ON agent_payment_accounts(stripe_account_id);

CREATE INDEX idx_customer_payments_agent_id ON customer_payments(agent_id);
CREATE INDEX idx_customer_payments_customer_id ON customer_payments(customer_id);
CREATE INDEX idx_customer_payments_booking_id ON customer_payments(booking_id);
CREATE INDEX idx_customer_payments_status ON customer_payments(status);
CREATE INDEX idx_customer_payments_payment_type ON customer_payments(payment_type);
CREATE INDEX idx_customer_payments_stripe_payment_intent_id ON customer_payments(stripe_payment_intent_id);

CREATE INDEX idx_payment_webhooks_stripe_event_id ON payment_webhooks(stripe_event_id);
CREATE INDEX idx_payment_webhooks_processed ON payment_webhooks(processed);
CREATE INDEX idx_payment_webhooks_event_type ON payment_webhooks(event_type);

CREATE INDEX idx_subscription_usage_subscription_id ON subscription_usage(subscription_id);
CREATE INDEX idx_subscription_usage_user_id ON subscription_usage(user_id);
CREATE INDEX idx_subscription_usage_usage_type ON subscription_usage(usage_type);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_payment_accounts_updated_at BEFORE UPDATE ON agent_payment_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_payments_updated_at BEFORE UPDATE ON customer_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_usage_updated_at BEFORE UPDATE ON subscription_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();