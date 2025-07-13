import { EmailMessage, EmailTemplate, AIEmailDraft } from '../types/gmail';

// Extended template interface with plain text support
interface EnhancedEmailTemplate extends EmailTemplate {
  bodyText?: string; // Plain text version
  format?: 'html' | 'text' | 'both'; // Supported formats
}

// Email template configurations
export const EMAIL_TEMPLATES: EnhancedEmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    subject: 'Welcome {{customerName}}! Your travel planning journey begins',
    body: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Welcome to Your Travel Journey!</h2>
            <p>Dear {{customerName}},</p>
            <p>Thank you for choosing us for your travel planning needs. I'm {{agentName}}, and I'll be your dedicated travel agent throughout this exciting journey.</p>
            <p>Here's what you can expect:</p>
            <ul>
              <li>Personalized trip recommendations</li>
              <li>Real-time updates on your bookings</li>
              <li>24/7 support during your travels</li>
              <li>Access to your dedicated client portal</li>
            </ul>
            <p>I'll be in touch soon with your customized travel options. In the meantime, feel free to reach out if you have any questions.</p>
            <p>Best regards,<br>{{agentName}}</p>
          </div>
        </body>
      </html>
    `,
    bodyText: `Welcome to Your Travel Journey!

Dear {{customerName}},

Thank you for choosing us for your travel planning needs. I'm {{agentName}}, and I'll be your dedicated travel agent throughout this exciting journey.

Here's what you can expect:
• Personalized trip recommendations
• Real-time updates on your bookings
• 24/7 support during your travels
• Access to your dedicated client portal

I'll be in touch soon with your customized travel options. In the meantime, feel free to reach out if you have any questions.

Best regards,
{{agentName}}`,
    variables: ['customerName', 'agentName'],
    category: 'welcome',
    format: 'both',
  },
  {
    id: 'quote-ready',
    name: 'Quote Ready',
    subject: 'Your Travel Quote is Ready - {{quoteId}}',
    body: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Your Travel Quote is Ready!</h2>
            <p>Dear {{customerName}},</p>
            <p>Great news! I've prepared a customized travel quote based on your preferences.</p>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">View Your Quote</h3>
              <p>Click the button below to view your detailed itinerary, pricing, and booking options:</p>
              <a href="{{clientPortalUrl}}" 
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
            <p>This quote is valid for {{validityDays}} days. If you have any questions or would like to make changes, please don't hesitate to reach out.</p>
            <p>Best regards,<br>{{agentName}}</p>
          </div>
        </body>
      </html>
    `,
    bodyText: `Your Travel Quote is Ready!

Dear {{customerName}},

Great news! I've prepared a customized travel quote based on your preferences.

=== VIEW YOUR QUOTE ===
Click the link below to view your detailed itinerary, pricing, and booking options:
{{clientPortalUrl}}

Your quote includes:
• Detailed itinerary with activities
• Transparent pricing breakdown
• Flexible payment options
• Easy booking process

This quote is valid for {{validityDays}} days. If you have any questions or would like to make changes, please don't hesitate to reach out.

Best regards,
{{agentName}}`,
    variables: ['customerName', 'quoteId', 'clientPortalUrl', 'validityDays', 'agentName'],
    category: 'quote',
    format: 'both',
  },
  {
    id: 'booking-confirmed',
    name: 'Booking Confirmed',
    subject: 'Your Trip is Confirmed! - Booking {{bookingReference}}',
    body: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #16a34a;">🎉 Your Trip is Confirmed!</h2>
            <p>Dear {{customerName}},</p>
            <p>Exciting news! Your travel booking has been confirmed and you're all set for your upcoming adventure.</p>
            
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #16a34a;">Booking Details</h3>
              <p><strong>Booking Reference:</strong> {{bookingReference}}</p>
              <p><strong>Travel Dates:</strong> {{travelDates}}</p>
              <p><strong>Destination:</strong> {{destination}}</p>
            </div>

            <p>What happens next:</p>
            <ul>
              <li>You'll receive detailed confirmation documents shortly</li>
              <li>Check-in instructions will be sent 24 hours before departure</li>
              <li>Access your trip details anytime in your client portal</li>
              <li>Our 24/7 support team is here if you need anything</li>
            </ul>

            <p>We're so excited for your upcoming trip! Safe travels and have an amazing time.</p>
            <p>Best regards,<br>{{agentName}}</p>
          </div>
        </body>
      </html>
    `,
    bodyText: `🎉 Your Trip is Confirmed!

Dear {{customerName}},

Exciting news! Your travel booking has been confirmed and you're all set for your upcoming adventure.

=== BOOKING DETAILS ===
Booking Reference: {{bookingReference}}
Travel Dates: {{travelDates}}
Destination: {{destination}}

What happens next:
• You'll receive detailed confirmation documents shortly
• Check-in instructions will be sent 24 hours before departure
• Access your trip details anytime in your client portal
• Our 24/7 support team is here if you need anything

We're so excited for your upcoming trip! Safe travels and have an amazing time.

Best regards,
{{agentName}}`,
    variables: ['customerName', 'bookingReference', 'travelDates', 'destination', 'agentName'],
    category: 'booking',
    format: 'both',
  },
  {
    id: 'payment-reminder',
    name: 'Payment Reminder',
    subject: 'Payment Reminder for Your Trip - {{bookingReference}}',
    body: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #f59e0b;">Payment Reminder</h2>
            <p>Dear {{customerName}},</p>
            <p>This is a friendly reminder that a payment is due for your upcoming trip.</p>
            
            <div style="background: #fffbeb; border: 1px solid #fed7aa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #f59e0b;">Payment Details</h3>
              <p><strong>Amount Due:</strong> {{amountDue}}</p>
              <p><strong>Due Date:</strong> {{dueDate}}</p>
              <p><strong>Booking Reference:</strong> {{bookingReference}}</p>
            </div>

            <p>You can make your payment securely through your client portal:</p>
            <p style="text-align: center; margin: 20px 0;">
              <a href="{{paymentUrl}}" 
                 style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Make Payment
              </a>
            </p>

            <p>If you have any questions about your payment or need assistance, please don't hesitate to contact me.</p>
            <p>Best regards,<br>{{agentName}}</p>
          </div>
        </body>
      </html>
    `,
    bodyText: `Payment Reminder

Dear {{customerName}},

This is a friendly reminder that a payment is due for your upcoming trip.

=== PAYMENT DETAILS ===
Amount Due: {{amountDue}}
Due Date: {{dueDate}}
Booking Reference: {{bookingReference}}

You can make your payment securely through your client portal:
{{paymentUrl}}

If you have any questions about your payment or need assistance, please don't hesitate to contact me.

Best regards,
{{agentName}}`,
    variables: ['customerName', 'amountDue', 'dueDate', 'bookingReference', 'paymentUrl', 'agentName'],
    category: 'payment',
    format: 'both',
  },
  {
    id: 'follow-up',
    name: 'Post-Trip Follow-up',
    subject: 'How was your trip to {{destination}}?',
    body: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Welcome Back!</h2>
            <p>Dear {{customerName}},</p>
            <p>I hope you had an incredible time in {{destination}}! I'd love to hear about your experiences and how everything went with your trip.</p>
            
            <p>Your feedback is incredibly valuable to us and helps us continue to provide exceptional travel experiences. If you have a few minutes, I'd appreciate if you could:</p>
            <ul>
              <li>Share any highlights from your trip</li>
              <li>Let me know if everything went smoothly</li>
              <li>Suggest any improvements for future travelers</li>
              <li>Consider leaving a review of our services</li>
            </ul>

            <p>Already planning your next adventure? I'm here to help make it just as amazing as this one!</p>
            
            <p>Thank you again for choosing us for your travel needs. Looking forward to hearing from you!</p>
            <p>Best regards,<br>{{agentName}}</p>
          </div>
        </body>
      </html>
    `,
    bodyText: `Welcome Back!

Dear {{customerName}},

I hope you had an incredible time in {{destination}}! I'd love to hear about your experiences and how everything went with your trip.

Your feedback is incredibly valuable to us and helps us continue to provide exceptional travel experiences. If you have a few minutes, I'd appreciate if you could:

• Share any highlights from your trip
• Let me know if everything went smoothly
• Suggest any improvements for future travelers
• Consider leaving a review of our services

Already planning your next adventure? I'm here to help make it just as amazing as this one!

Thank you again for choosing us for your travel needs. Looking forward to hearing from you!

Best regards,
{{agentName}}`,
    variables: ['customerName', 'destination', 'agentName'],
    category: 'follow-up',
    format: 'both',
  },
];

// Helper function to replace template variables
export function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  });
  return result;
}

// Get template by ID
export function getEmailTemplate(templateId: string): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find(template => template.id === templateId);
}

// Get templates by category
export function getTemplatesByCategory(category: EmailTemplate['category']): EmailTemplate[] {
  return EMAIL_TEMPLATES.filter(template => template.category === category);
}

// Create email from template with format option
export function createEmailFromTemplate(
  templateId: string,
  variables: Record<string, string>,
  recipients: string[],
  format: 'html' | 'text' = 'html'
): EmailMessage | null {
  const template = getEmailTemplate(templateId) as EnhancedEmailTemplate;
  if (!template) return null;

  const body = format === 'text' && template.bodyText 
    ? replaceTemplateVariables(template.bodyText, variables)
    : replaceTemplateVariables(template.body, variables);

  return {
    to: recipients,
    subject: replaceTemplateVariables(template.subject, variables),
    body,
  };
}

// Auto-generate plain text from HTML (fallback)
export function htmlToPlainText(html: string): string {
  return html
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Convert common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();
}

// Get template content in specified format
export function getTemplateContent(
  templateId: string, 
  format: 'html' | 'text' = 'html'
): { subject: string; body: string } | null {
  const template = getEmailTemplate(templateId) as EnhancedEmailTemplate;
  if (!template) return null;

  const body = format === 'text' && template.bodyText
    ? template.bodyText
    : format === 'text' 
    ? htmlToPlainText(template.body)
    : template.body;

  return {
    subject: template.subject,
    body
  };
}

// AI Email Draft Generator (Stub)
export async function generateAIEmailDraft(
  context: {
    customerName: string;
    agentName: string;
    tripDetails?: any;
    previousEmails?: string[];
    intent: 'welcome' | 'quote' | 'booking' | 'payment' | 'follow-up' | 'custom';
    customPrompt?: string;
  }
): Promise<AIEmailDraft> {
  // This is a stub for future AI integration
  // In the real implementation, this would call OpenAI API
  
  console.log('AI Email Draft Request:', context);
  
  // Mock AI response based on intent
  const mockDrafts = {
    welcome: {
      subject: `Welcome ${context.customerName}! Let's plan your perfect getaway`,
      body: `Hi ${context.customerName},\n\nI'm ${context.agentName}, and I'm thrilled to help you plan your upcoming trip! I've been working with travelers for years, and there's nothing I love more than creating unforgettable experiences.\n\nI'd love to learn more about what you have in mind. What kind of adventure are you dreaming of?\n\nBest regards,\n${context.agentName}`,
      confidence: 0.85,
      suggestions: [
        'Consider adding specific destinations you specialize in',
        'Include your response time expectations',
        'Add a personal touch about your travel experience',
      ],
    },
    quote: {
      subject: `Your personalized ${context.tripDetails?.destination || 'travel'} quote is ready!`,
      body: `Hi ${context.customerName},\n\nI've put together a fantastic itinerary for your ${context.tripDetails?.destination || 'trip'} based on our conversation. I think you're going to love what I've planned!\n\nThe quote includes everything we discussed, and I've made sure to include some special touches that I think will make your trip extra memorable.\n\nTake a look and let me know what you think!\n\nExcited to help make this trip happen,\n${context.agentName}`,
      confidence: 0.80,
      suggestions: [
        'Mention specific highlights from the itinerary',
        'Include the total price range',
        'Add urgency if there are limited-time offers',
      ],
    },
    booking: {
      subject: `Great news! Your ${context.tripDetails?.destination || 'trip'} is confirmed!`,
      body: `Hi ${context.customerName},\n\nFantastic news! I've successfully booked your ${context.tripDetails?.destination || 'trip'} and everything is confirmed.\n\nYour confirmation details are attached, and I'll be sending you a detailed itinerary shortly. I'm so excited for you!\n\nIf you have any questions before your departure, don't hesitate to reach out.\n\nHappy travels,\n${context.agentName}`,
      confidence: 0.95,
      suggestions: [
        'Include confirmation numbers',
        'Add pre-trip checklist',
        'Provide emergency contact information',
      ],
    },
    payment: {
      subject: `Payment reminder for your ${context.tripDetails?.destination || 'trip'}`,
      body: `Hi ${context.customerName},\n\nI hope you're getting excited about your upcoming ${context.tripDetails?.destination || 'trip'}!\n\nThis is a friendly reminder that your payment is due. You can complete the payment through the secure link I'll send separately.\n\nOnce payment is received, I'll finalize all your bookings and send you the complete itinerary.\n\nLooking forward to making this trip amazing for you!\n\nBest regards,\n${context.agentName}`,
      confidence: 0.85,
      suggestions: [
        'Include payment deadline',
        'Add payment methods accepted',
        'Mention what happens after payment',
      ],
    },
    'follow-up': {
      subject: `How was your amazing trip to ${context.tripDetails?.destination || 'your destination'}?`,
      body: `Hi ${context.customerName},\n\nI hope you're still glowing from your recent adventure! I've been thinking about your trip and would love to hear all about it.\n\nDid everything go smoothly? Were there any unexpected highlights? I'm always looking for ways to make future trips even better for my clients.\n\nAlready thinking about your next getaway? I'm here whenever you're ready!\n\nWarm regards,\n${context.agentName}`,
      confidence: 0.90,
      suggestions: [
        'Ask about specific experiences you recommended',
        'Include a photo request for future marketing',
        'Offer a referral incentive',
      ],
    },
    custom: {
      subject: `Following up on your travel inquiry`,
      body: `Hi ${context.customerName},\n\n${context.customPrompt || 'I wanted to follow up on our recent conversation about your travel plans.'}\n\nI'm here to help make your travel dreams come true. What would you like to explore next?\n\nBest regards,\n${context.agentName}`,
      confidence: 0.70,
      suggestions: [
        'Customize based on specific customer needs',
        'Add relevant travel suggestions',
        'Include call-to-action',
      ],
    },
  };

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const draft = mockDrafts[context.intent] || mockDrafts.welcome;
  
  return {
    subject: draft.subject,
    body: draft.body,
    confidence: draft.confidence,
    suggestions: draft.suggestions,
  };
}

// Helper function to format email for display
export function formatEmailPreview(email: EmailMessage): string {
  return `To: ${email.to.join(', ')}\nSubject: ${email.subject}\n\n${email.body.replace(/<[^>]*>/g, '')}`;
}

// Validate template variables
export function validateTemplateVariables(template: EmailTemplate, variables: Record<string, string>): string[] {
  const missingVariables: string[] = [];
  
  template.variables.forEach(variable => {
    if (!variables[variable] || variables[variable].trim() === '') {
      missingVariables.push(variable);
    }
  });
  
  return missingVariables;
}