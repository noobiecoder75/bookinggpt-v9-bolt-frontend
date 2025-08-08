-- Create email_templates table for storing customizable email templates
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_key VARCHAR(100) NOT NULL, -- 'welcome', 'quote-ready', 'booking-confirmed', etc.
    name VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT, -- Plain text version
    variables JSONB NOT NULL DEFAULT '[]', -- ['customerName', 'agentName', etc.]
    category VARCHAR(50) NOT NULL, -- 'welcome', 'quote', 'booking', 'payment', 'follow-up', 'custom'
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false, -- System default template
    version INTEGER DEFAULT 1,
    parent_template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL, -- For version control
    metadata JSONB DEFAULT '{}', -- Additional settings like format, tags, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, template_key, version)
);

-- Create email_template_history table for version control
CREATE TABLE IF NOT EXISTS email_template_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    variables JSONB NOT NULL,
    change_description TEXT,
    changed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_automation_rules table for automated email triggers
CREATE TABLE IF NOT EXISTS email_automation_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_event VARCHAR(100) NOT NULL, -- 'quote_created', 'booking_confirmed', 'payment_received', etc.
    template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
    conditions JSONB DEFAULT '{}', -- Additional conditions for triggering
    delay_minutes INTEGER DEFAULT 0, -- Delay before sending (0 = immediate)
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_tracking table for enhanced tracking
CREATE TABLE IF NOT EXISTS email_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    communication_id UUID NOT NULL REFERENCES email_communications(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'
    event_data JSONB DEFAULT '{}', -- Additional event details
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_queue table for scheduled/delayed emails
CREATE TABLE IF NOT EXISTS email_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
    recipients TEXT[] NOT NULL,
    cc TEXT[],
    bcc TEXT[],
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    variables JSONB DEFAULT '{}',
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed', 'cancelled'
    attempts INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_template_key ON email_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_active ON email_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_email_template_history_template_id ON email_template_history(template_id);
CREATE INDEX IF NOT EXISTS idx_email_automation_rules_user_id ON email_automation_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_email_automation_rules_trigger_event ON email_automation_rules(trigger_event);
CREATE INDEX IF NOT EXISTS idx_email_tracking_communication_id ON email_tracking(communication_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_event_type ON email_tracking(event_type);
CREATE INDEX IF NOT EXISTS idx_email_queue_user_id ON email_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled_for ON email_queue(scheduled_for);

-- Update triggers for updated_at columns
CREATE TRIGGER update_email_templates_updated_at 
    BEFORE UPDATE ON email_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_automation_rules_updated_at 
    BEFORE UPDATE ON email_automation_rules 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_template_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own email templates" ON email_templates
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their template history" ON email_template_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their automation rules" ON email_automation_rules
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view tracking for their emails" ON email_tracking
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM email_communications ec 
            WHERE ec.id = email_tracking.communication_id 
            AND ec.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their email queue" ON email_queue
    FOR ALL USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON email_templates TO authenticated;
GRANT ALL ON email_template_history TO authenticated;
GRANT ALL ON email_automation_rules TO authenticated;
GRANT ALL ON email_tracking TO authenticated;
GRANT ALL ON email_queue TO authenticated;

-- Function to create template history entry on update
CREATE OR REPLACE FUNCTION create_template_history()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.subject != NEW.subject OR OLD.body_html != NEW.body_html OR OLD.body_text != NEW.body_text THEN
        INSERT INTO email_template_history (
            template_id,
            user_id,
            version,
            subject,
            body_html,
            body_text,
            variables,
            changed_by
        ) VALUES (
            OLD.id,
            OLD.user_id,
            OLD.version,
            OLD.subject,
            OLD.body_html,
            OLD.body_text,
            OLD.variables,
            auth.uid()
        );
        
        NEW.version = OLD.version + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_template_version_trigger
    BEFORE UPDATE ON email_templates
    FOR EACH ROW
    EXECUTE FUNCTION create_template_history();

-- Insert default templates (migrating from hardcoded templates)
INSERT INTO email_templates (user_id, template_key, name, subject, body_html, body_text, variables, category, is_default) 
SELECT 
    auth.uid(),
    'welcome',
    'Welcome Email',
    'Welcome {{customerName}}! Your travel planning journey begins',
    '<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><div style="max-width: 600px; margin: 0 auto; padding: 20px;"><h2 style="color: #2563eb;">Welcome to Your Travel Journey!</h2><p>Dear {{customerName}},</p><p>Thank you for choosing us for your travel planning needs. I''m {{agentName}}, and I''ll be your dedicated travel agent throughout this exciting journey.</p><p>Here''s what you can expect:</p><ul><li>Personalized trip recommendations</li><li>Real-time updates on your bookings</li><li>24/7 support during your travels</li><li>Access to your dedicated client portal</li></ul><p>I''ll be in touch soon with your customized travel options. In the meantime, feel free to reach out if you have any questions.</p><p>Best regards,<br>{{agentName}}</p></div></body></html>',
    'Welcome to Your Travel Journey!\n\nDear {{customerName}},\n\nThank you for choosing us for your travel planning needs. I''m {{agentName}}, and I''ll be your dedicated travel agent throughout this exciting journey.\n\nHere''s what you can expect:\n• Personalized trip recommendations\n• Real-time updates on your bookings\n• 24/7 support during your travels\n• Access to your dedicated client portal\n\nI''ll be in touch soon with your customized travel options. In the meantime, feel free to reach out if you have any questions.\n\nBest regards,\n{{agentName}}',
    '["customerName", "agentName"]'::jsonb,
    'welcome',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM email_templates WHERE template_key = 'welcome' AND is_default = true
);