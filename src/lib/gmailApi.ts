import { supabase } from './supabase';
import { EmailMessage, EmailSendResult, GmailIntegration } from '../types/gmail';

export class GmailApiService {
  private static instance: GmailApiService;

  static getInstance(): GmailApiService {
    if (!GmailApiService.instance) {
      GmailApiService.instance = new GmailApiService();
    }
    return GmailApiService.instance;
  }

  private async getAccessToken(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get Gmail integration from database
    const { data: integration, error } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('integration_type', 'gmail')
      .eq('is_connected', true)
      .single();

    if (error || !integration) {
      throw new Error('Gmail not connected. Please connect your Gmail account first.');
    }

    const gmailIntegration = integration as GmailIntegration;

    // Check if token is expired
    const now = Date.now() / 1000;
    if (gmailIntegration.tokens.expires_at < now) {
      // Token is expired, try to refresh
      const refreshed = await this.refreshAccessToken(gmailIntegration);
      if (!refreshed) {
        throw new Error('Gmail access token expired and could not be refreshed. Please reconnect your Gmail account.');
      }
      // Get updated integration
      const { data: updatedIntegration } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('id', integration.id)
        .single();
      
      if (updatedIntegration) {
        gmailIntegration.tokens = updatedIntegration.tokens;
      }
    }

    return gmailIntegration.tokens.access_token;
  }

  private async refreshAccessToken(integration: GmailIntegration, retryCount = 0): Promise<boolean> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    try {
      console.log(`🔄 Gmail API: Refreshing access token (attempt ${retryCount + 1}/${maxRetries + 1})...`);
      
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID!,
          client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET!,
          refresh_token: integration.tokens.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'unknown_error' }));
        const errorCode = errorData.error || 'unknown_error';
        
        console.error('❌ Gmail API: Token refresh failed:', { 
          status: response.status, 
          error: errorData,
          attempt: retryCount + 1
        });

        // Handle specific error codes
        switch (errorCode) {
          case 'invalid_grant':
            // Refresh token is revoked - don't retry
            console.error('Gmail refresh token is invalid or revoked. Re-authentication required.');
            return false;
          case 'invalid_client':
            // Client configuration error - don't retry
            console.error('OAuth client configuration error.');
            return false;
          default:
            // For other errors, check if we should retry
            if (retryCount < maxRetries) {
              const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
              console.log(`⏳ Gmail API: Retrying token refresh in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              return this.refreshAccessToken(integration, retryCount + 1);
            }
            console.error(`Failed to refresh token after ${maxRetries + 1} attempts:`, errorData);
            return false;
        }
      }

      const newTokens = await response.json();
      const updatedTokens = {
        ...integration.tokens,
        access_token: newTokens.access_token,
        expires_in: newTokens.expires_in,
        expires_at: Date.now() / 1000 + newTokens.expires_in,
      };

      // Update tokens in database
      const { error } = await supabase
        .from('user_integrations')
        .update({
          tokens: updatedTokens,
          updated_at: new Date().toISOString(),
        })
        .eq('id', integration.id);

      if (error) {
        console.error('Failed to update tokens in database:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      return false;
    }
  }

  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const accessToken = await this.getAccessToken();
      
      // Check if this is a demo token (for demo purposes)
      if (accessToken === 'demo_token') {
        console.log('🎭 Gmail API: Demo mode detected - simulating email send');
        console.log('📧 Demo Email Details:', {
          to: message.to,
          subject: message.subject,
          bodyLength: message.body.length
        });
        
        // Simulate successful send for demo purposes
        return {
          success: true,
          messageId: `demo_message_${Date.now()}`,
        };
      }
      
      // Create email content
      const emailContent = this.createEmailContent(message);
      
      // Send email using Gmail API
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: emailContent,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gmail API error: ${errorText}`);
      }

      const result = await response.json();

      if (result.id) {
        return {
          success: true,
          messageId: result.id,
        };
      } else {
        return {
          success: false,
          error: 'Failed to send email - no message ID returned',
        };
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }
  }

  private createEmailContent(message: EmailMessage): string {
    // Check if content is HTML or plain text
    const isHtml = message.body.includes('<') && message.body.includes('>');
    
    // Create headers for HTML email
    const headers = [
      `To: ${message.to.join(', ')}`,
      message.cc && message.cc.length > 0 ? `Cc: ${message.cc.join(', ')}` : '',
      message.bcc && message.bcc.length > 0 ? `Bcc: ${message.bcc.join(', ')}` : '',
      `Subject: ${message.subject}`,
      'MIME-Version: 1.0',
    ].filter(header => header !== '');

    let emailContent = '';
    
    if (message.attachments && message.attachments.length > 0) {
      // Use multipart for attachments
      const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      headers.push('');
      
      emailContent = headers.join('\r\n');
      
      // HTML/Text part
      emailContent += `--${boundary}\r\n`;
      emailContent += `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8\r\n`;
      emailContent += 'Content-Transfer-Encoding: base64\r\n\r\n';
      emailContent += btoa(unescape(encodeURIComponent(message.body)));
      emailContent += '\r\n\r\n';
      
      // Attachments
      for (const attachment of message.attachments) {
        emailContent += `--${boundary}\r\n`;
        emailContent += `Content-Type: ${attachment.contentType}\r\n`;
        emailContent += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
        emailContent += 'Content-Transfer-Encoding: base64\r\n\r\n';
        emailContent += attachment.content;
        emailContent += '\r\n\r\n';
      }
      
      emailContent += `--${boundary}--`;
    } else {
      // Simple HTML email without attachments
      headers.push(`Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8`);
      headers.push('Content-Transfer-Encoding: base64');
      headers.push('');
      
      emailContent = headers.join('\r\n');
      emailContent += btoa(unescape(encodeURIComponent(message.body)));
    }
    
    // Base64 encode the entire email for Gmail API
    return btoa(unescape(encodeURIComponent(emailContent)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private quotedPrintableEncode(text: string): string {
    // Simple quoted-printable encoding for HTML content
    return text
      .replace(/[\x80-\xFF]/g, (match) => {
        const hex = match.charCodeAt(0).toString(16).toUpperCase();
        return `=${hex.length === 1 ? '0' + hex : hex}`;
      })
      .replace(/=/g, '=3D')
      .replace(/\r\n/g, '\r\n')
      .replace(/(.{75})/g, '$1=\r\n'); // Wrap lines at 75 characters
  }

  async getEmailThreads(customerId: string, limit: number = 20): Promise<any[]> {
    try {
      const accessToken = await this.getAccessToken();
      
      // This is a placeholder for future implementation
      // You would search for emails by customer email or other criteria
      console.log('Getting email threads for customer:', customerId);
      
      // Example of how to fetch threads (when needed):
      /*
      const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=${limit}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.threads || [];
      }
      */
      
      // For now, return empty array as this is stubbed
      return [];
    } catch (error) {
      console.error('Error getting email threads:', error);
      return [];
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      
      // Check if this is a demo token (for demo purposes)
      if (accessToken === 'demo_token') {
        console.log('🎭 Gmail API: Demo mode detected - simulating successful connection test');
        // Simulate a successful connection for demo purposes
        return true;
      }
      
      // Test connection by getting user profile
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Gmail connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const gmailApi = GmailApiService.getInstance();

// Helper functions for email templates
export function createWelcomeEmail(customerName: string, agentName: string): EmailMessage {
  return {
    to: [],
    subject: `Welcome ${customerName}! Your travel planning journey begins`,
    body: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Welcome to Your Travel Journey!</h2>
            <p>Dear ${customerName},</p>
            <p>Thank you for choosing us for your travel planning needs. I'm ${agentName}, and I'll be your dedicated travel agent throughout this exciting journey.</p>
            <p>Here's what you can expect:</p>
            <ul>
              <li>Personalized trip recommendations</li>
              <li>Real-time updates on your bookings</li>
              <li>24/7 support during your travels</li>
              <li>Access to your dedicated client portal</li>
            </ul>
            <p>I'll be in touch soon with your customized travel options. In the meantime, feel free to reach out if you have any questions.</p>
            <p>Best regards,<br>${agentName}</p>
          </div>
        </body>
      </html>
    `,
  };
}

export function createQuoteEmail(customerName: string, quoteId: string, agentName: string): EmailMessage {
  const clientPortalUrl = `${window.location.origin}/client/${quoteId}`;
  
  return {
    to: [],
    subject: `Your Travel Quote is Ready - ${quoteId}`,
    body: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Your Travel Quote is Ready!</h2>
            <p>Dear ${customerName},</p>
            <p>Great news! I've prepared a customized travel quote based on your preferences.</p>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">View Your Quote</h3>
              <p>Click the button below to view your detailed itinerary, pricing, and booking options:</p>
              <a href="${clientPortalUrl}" 
                 style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                View Your Quote
              </a>
            </div>
            <p>Your quote includes:</p>
            <ul>
              <li>Detailed itinerary with activities</li>
              <li>Transparent pricing breakdown</li>
              <li>Flexible payment options</li>
              <li>Easy booking process</li>
            </ul>
            <p>This quote is valid for 14 days. If you have any questions or would like to make changes, please don't hesitate to reach out.</p>
            <p>Best regards,<br>${agentName}</p>
          </div>
        </body>
      </html>
    `,
  };
}