-- Create user_integrations table for storing OAuth tokens and integration data
CREATE TABLE IF NOT EXISTS user_integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    integration_type VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    tokens JSONB,
    is_connected BOOLEAN DEFAULT false,
    last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, integration_type)
);

-- Create email_communications table for tracking sent emails
CREATE TABLE IF NOT EXISTS email_communications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    quote_id VARCHAR(255) REFERENCES quotes(id) ON DELETE SET NULL,
    email_type VARCHAR(50) NOT NULL, -- 'welcome', 'quote', 'booking', 'payment', 'follow-up', 'custom'
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    recipients TEXT[] NOT NULL,
    cc TEXT[],
    bcc TEXT[],
    status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'failed', 'bounced', 'opened'
    message_id VARCHAR(255),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    opened_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_threads table for organizing email conversations
CREATE TABLE IF NOT EXISTS email_threads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    quote_id VARCHAR(255) REFERENCES quotes(id) ON DELETE SET NULL,
    thread_subject TEXT NOT NULL,
    participants TEXT[] NOT NULL,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_messages table for individual messages within threads
CREATE TABLE IF NOT EXISTS email_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
    message_id VARCHAR(255), -- Gmail message ID
    from_email VARCHAR(255) NOT NULL,
    to_emails TEXT[] NOT NULL,
    cc_emails TEXT[],
    bcc_emails TEXT[],
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    is_from_agent BOOLEAN DEFAULT false,
    message_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_type ON user_integrations(integration_type);
CREATE INDEX IF NOT EXISTS idx_email_communications_user_id ON email_communications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_communications_customer_id ON email_communications(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_communications_quote_id ON email_communications(quote_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_user_id ON email_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_customer_id ON email_threads(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_thread_id ON email_messages(thread_id);

-- Create update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_integrations_updated_at 
    BEFORE UPDATE ON user_integrations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_threads_updated_at 
    BEFORE UPDATE ON email_threads 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own integrations" ON user_integrations
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own email communications" ON email_communications
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own email threads" ON email_threads
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view messages in their threads" ON email_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM email_threads 
            WHERE email_threads.id = email_messages.thread_id 
            AND email_threads.user_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT ALL ON user_integrations TO authenticated;
GRANT ALL ON email_communications TO authenticated;
GRANT ALL ON email_threads TO authenticated;
GRANT ALL ON email_messages TO authenticated;