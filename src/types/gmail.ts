export interface GmailOAuthTokens {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
}

export interface GmailIntegration {
  id: string;
  user_id: string;
  email: string;
  tokens: GmailOAuthTokens;
  is_connected: boolean;
  last_sync: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailMessage {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: string; // base64 encoded
  contentType: string;
}

export interface EmailThread {
  id: string;
  subject: string;
  participants: string[];
  messages: EmailThreadMessage[];
  lastUpdated: string;
}

export interface EmailThreadMessage {
  id: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  timestamp: string;
  isFromAgent: boolean;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[]; // e.g., ['customerName', 'tripDetails']
  category: 'welcome' | 'quote' | 'booking' | 'payment' | 'follow-up' | 'custom';
}

export interface AIEmailDraft {
  subject: string;
  body: string;
  confidence: number;
  suggestions: string[];
}

export interface GmailConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}