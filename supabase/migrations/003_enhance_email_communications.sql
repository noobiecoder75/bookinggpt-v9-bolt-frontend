-- Email Communications Enhancement Migration
-- Adds complete email content storage capabilities

-- Add new columns to email_communications table for enhanced content storage
ALTER TABLE email_communications 
ADD COLUMN IF NOT EXISTS body TEXT,
ADD COLUMN IF NOT EXISTS raw_content TEXT,
ADD COLUMN IF NOT EXISTS template_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS content_type VARCHAR(20) DEFAULT 'html',
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add performance indexes for email content searching and filtering
CREATE INDEX IF NOT EXISTS idx_email_communications_template_id ON email_communications(template_id);
CREATE INDEX IF NOT EXISTS idx_email_communications_content_type ON email_communications(content_type);
CREATE INDEX IF NOT EXISTS idx_email_communications_body_search ON email_communications USING gin(to_tsvector('english', body));

-- Add comments for documentation
COMMENT ON COLUMN email_communications.body IS 'Final processed HTML content that was sent to recipients';
COMMENT ON COLUMN email_communications.raw_content IS 'Original content with template variables before processing';
COMMENT ON COLUMN email_communications.template_id IS 'ID of email template used, if applicable';
COMMENT ON COLUMN email_communications.content_type IS 'Type of content: html, text, or template';
COMMENT ON COLUMN email_communications.metadata IS 'Additional context like template variables and agent info';

-- Update RLS policies to include new columns (if needed)
-- The existing policies should automatically cover the new columns since they're added to the same table