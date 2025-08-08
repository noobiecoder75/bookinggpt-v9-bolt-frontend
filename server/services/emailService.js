import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  async initializeTransporter() {
    // Initialize default SMTP transporter
    // Can be replaced with Gmail API when user has integration
    this.transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }

  // Send email using template
  async sendTemplateEmail(userId, templateId, recipients, variables = {}) {
    try {
      // Get template
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .eq('user_id', userId)
        .single();

      if (templateError || !template) {
        throw new Error('Template not found');
      }

      // Replace variables in template
      let subject = this.replaceVariables(template.subject, variables);
      let bodyHtml = this.replaceVariables(template.body_html, variables);
      let bodyText = template.body_text ? this.replaceVariables(template.body_text, variables) : null;

      // Send email
      const result = await this.sendEmail({
        to: recipients,
        subject,
        html: bodyHtml,
        text: bodyText
      });

      // Log communication
      await this.logEmailCommunication(userId, {
        template_id: templateId,
        recipients,
        subject,
        body: bodyHtml,
        status: result.success ? 'sent' : 'failed',
        message_id: result.messageId,
        error_message: result.error
      });

      return result;
    } catch (error) {
      console.error('Error sending template email:', error);
      throw error;
    }
  }

  // Send raw email
  async sendEmail(options) {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
        subject: options.subject,
        text: options.text,
        html: options.html
      });

      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Replace template variables
  replaceVariables(template, variables) {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value || '');
    });
    return result;
  }

  // Log email communication
  async logEmailCommunication(userId, data) {
    try {
      const { error } = await supabase
        .from('email_communications')
        .insert({
          user_id: userId,
          customer_id: data.customer_id,
          quote_id: data.quote_id,
          email_type: data.email_type || 'custom',
          subject: data.subject,
          body: data.body,
          recipients: data.recipients,
          cc: data.cc,
          bcc: data.bcc,
          status: data.status,
          message_id: data.message_id,
          error_message: data.error_message
        });

      if (error) {
        console.error('Error logging email communication:', error);
      }

      // Track email event
      if (data.communication_id) {
        await this.trackEmailEvent(data.communication_id, 'sent', {
          message_id: data.message_id
        });
      }
    } catch (error) {
      console.error('Error logging email communication:', error);
    }
  }

  // Track email event (open, click, bounce, etc.)
  async trackEmailEvent(communicationId, eventType, eventData = {}) {
    try {
      const { error } = await supabase
        .from('email_tracking')
        .insert({
          communication_id: communicationId,
          event_type: eventType,
          event_data: eventData,
          ip_address: eventData.ip_address,
          user_agent: eventData.user_agent
        });

      if (error) {
        console.error('Error tracking email event:', error);
      }

      // Update communication status if needed
      if (eventType === 'opened') {
        await supabase
          .from('email_communications')
          .update({ 
            status: 'opened',
            opened_at: new Date().toISOString()
          })
          .eq('id', communicationId);
      } else if (eventType === 'bounced') {
        await supabase
          .from('email_communications')
          .update({ status: 'bounced' })
          .eq('id', communicationId);
      }
    } catch (error) {
      console.error('Error tracking email event:', error);
    }
  }

  // Process automation triggers
  async processAutomationTrigger(userId, triggerEvent, context = {}) {
    try {
      // Get active automation rules for this trigger
      const { data: rules, error } = await supabase
        .from('email_automation_rules')
        .select('*, email_templates(*)')
        .eq('user_id', userId)
        .eq('trigger_event', triggerEvent)
        .eq('is_active', true);

      if (error || !rules || rules.length === 0) {
        return;
      }

      for (const rule of rules) {
        // Check conditions
        if (rule.conditions && Object.keys(rule.conditions).length > 0) {
          if (!this.evaluateConditions(rule.conditions, context)) {
            continue;
          }
        }

        // Schedule or send email
        if (rule.delay_minutes > 0) {
          await this.scheduleEmail(userId, rule, context);
        } else {
          await this.sendAutomatedEmail(userId, rule, context);
        }

        // Update last triggered
        await supabase
          .from('email_automation_rules')
          .update({ last_triggered_at: new Date().toISOString() })
          .eq('id', rule.id);
      }
    } catch (error) {
      console.error('Error processing automation trigger:', error);
    }
  }

  // Evaluate automation conditions
  evaluateConditions(conditions, context) {
    // Simple condition evaluation
    // Can be expanded for more complex conditions
    for (const [key, value] of Object.entries(conditions)) {
      if (context[key] !== value) {
        return false;
      }
    }
    return true;
  }

  // Schedule email for later
  async scheduleEmail(userId, rule, context) {
    try {
      const scheduledFor = new Date();
      scheduledFor.setMinutes(scheduledFor.getMinutes() + rule.delay_minutes);

      const { error } = await supabase
        .from('email_queue')
        .insert({
          user_id: userId,
          template_id: rule.template_id,
          recipients: context.recipients || [],
          subject: rule.email_templates.subject,
          body_html: rule.email_templates.body_html,
          body_text: rule.email_templates.body_text,
          variables: context.variables || {},
          scheduled_for: scheduledFor.toISOString(),
          metadata: {
            automation_rule_id: rule.id,
            trigger_event: rule.trigger_event,
            context
          }
        });

      if (error) {
        console.error('Error scheduling email:', error);
      }
    } catch (error) {
      console.error('Error scheduling email:', error);
    }
  }

  // Send automated email immediately
  async sendAutomatedEmail(userId, rule, context) {
    try {
      if (!rule.template_id || !context.recipients) {
        return;
      }

      await this.sendTemplateEmail(
        userId,
        rule.template_id,
        context.recipients,
        context.variables || {}
      );
    } catch (error) {
      console.error('Error sending automated email:', error);
    }
  }

  // Process email queue
  async processEmailQueue() {
    try {
      // Get pending emails that are due
      const { data: emails, error } = await supabase
        .from('email_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .limit(10);

      if (error || !emails || emails.length === 0) {
        return;
      }

      for (const email of emails) {
        // Update status to processing
        await supabase
          .from('email_queue')
          .update({ 
            status: 'processing',
            attempts: email.attempts + 1
          })
          .eq('id', email.id);

        try {
          // Send email
          const result = await this.sendEmail({
            to: email.recipients,
            cc: email.cc,
            bcc: email.bcc,
            subject: this.replaceVariables(email.subject, email.variables),
            html: this.replaceVariables(email.body_html, email.variables),
            text: email.body_text ? this.replaceVariables(email.body_text, email.variables) : null
          });

          // Update status
          await supabase
            .from('email_queue')
            .update({
              status: result.success ? 'sent' : 'failed',
              processed_at: new Date().toISOString(),
              error_message: result.error
            })
            .eq('id', email.id);

          // Log communication
          if (result.success) {
            await this.logEmailCommunication(email.user_id, {
              recipients: email.recipients,
              cc: email.cc,
              bcc: email.bcc,
              subject: email.subject,
              body: email.body_html,
              status: 'sent',
              message_id: result.messageId
            });
          }
        } catch (error) {
          console.error('Error processing queued email:', error);
          
          // Update status with error
          await supabase
            .from('email_queue')
            .update({
              status: email.attempts >= 3 ? 'failed' : 'pending',
              error_message: error.message
            })
            .eq('id', email.id);
        }
      }
    } catch (error) {
      console.error('Error processing email queue:', error);
    }
  }

  // Get email statistics
  async getEmailStatistics(userId, startDate, endDate) {
    try {
      const { data: communications, error } = await supabase
        .from('email_communications')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (error) throw error;

      const stats = {
        total_sent: communications.length,
        delivered: communications.filter(c => c.status === 'sent').length,
        opened: communications.filter(c => c.status === 'opened').length,
        bounced: communications.filter(c => c.status === 'bounced').length,
        failed: communications.filter(c => c.status === 'failed').length,
        open_rate: 0,
        bounce_rate: 0
      };

      if (stats.delivered > 0) {
        stats.open_rate = (stats.opened / stats.delivered) * 100;
        stats.bounce_rate = (stats.bounced / stats.total_sent) * 100;
      }

      return stats;
    } catch (error) {
      console.error('Error getting email statistics:', error);
      throw error;
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

// Set up cron job for processing email queue
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    emailService.processEmailQueue();
  }, 60000); // Process every minute
}

export default emailService;