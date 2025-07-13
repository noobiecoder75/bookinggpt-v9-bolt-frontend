import React, { useState, useEffect } from 'react';
import { X, Mail, Calendar, Tag, User, Eye, Loader2 } from 'lucide-react';

interface EmailCommunication {
  id: string;
  customer_id: number;
  quote_id?: string;
  email_type: string;
  subject: string;
  body?: string;
  raw_content?: string;
  template_id?: string;
  content_type?: string;
  metadata?: any;
  recipients: string[];
  status: 'sent' | 'failed' | 'bounced' | 'opened';
  sent_at: string;
  opened_at?: string;
}

interface EmailDetailModalProps {
  email: EmailCommunication | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EmailDetailModal({ email, isOpen, onClose }: EmailDetailModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (isOpen && email) {
      console.log('EmailDetailModal rendering with email:', email);
      // Simulate brief loading for better UX
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, email]);
  
  if (!isOpen || !email) return null;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      sent: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Sent' },
      opened: { bg: 'bg-green-100', text: 'text-green-800', label: 'Opened' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
      bounced: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Bounced' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.sent;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getTemplateInfo = () => {
    if (email.template_id && email.metadata?.templateVars) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <Tag className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Template Email</span>
          </div>
          <div className="text-sm text-blue-700">
            <div><strong>Template ID:</strong> {email.template_id}</div>
            <div><strong>Type:</strong> {email.email_type}</div>
            {email.metadata.agentName && (
              <div><strong>Agent:</strong> {email.metadata.agentName}</div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const sanitizeAndRenderHTML = (htmlContent: string) => {
    // Basic HTML sanitization - in production, consider using DOMPurify
    const sanitized = htmlContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '');
    
    return { __html: sanitized };
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Mail className="h-6 w-6 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 flex-1">
                    {email.subject}
                  </h3>
                  {getStatusBadge(email.status)}
                </div>
                
                {/* Email metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span><strong>To:</strong> {email.recipients.join(', ')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span><strong>Sent:</strong> {new Date(email.sent_at).toLocaleString()}</span>
                  </div>
                  {email.opened_at && (
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">
                        <strong>Opened:</strong> {new Date(email.opened_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Tag className="h-4 w-4" />
                    <span><strong>Type:</strong> {email.content_type || 'html'}</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="ml-4 bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <span className="ml-3 text-gray-600">Loading email content...</span>
              </div>
            ) : (
              <>
                {/* Template info */}
                {getTemplateInfo()}
            
            {/* Email body */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Email Content</h4>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                {email.body ? (
                  <div 
                    className="prose max-w-none text-sm"
                    dangerouslySetInnerHTML={sanitizeAndRenderHTML(email.body)}
                  />
                ) : email.raw_content ? (
                  <div className="text-sm text-gray-700">
                    <div className="mb-2 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                      Showing raw template content (processed content not available)
                    </div>
                    <div dangerouslySetInnerHTML={sanitizeAndRenderHTML(email.raw_content)} />
                  </div>
                ) : (
                  <div className="text-gray-500 italic text-sm">
                    No email content available
                  </div>
                )}
              </div>
            </div>

            {/* Raw content (for debugging/template viewing) */}
            {email.raw_content && email.raw_content !== email.body && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Original Template Content</h4>
                <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                    {email.raw_content}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}