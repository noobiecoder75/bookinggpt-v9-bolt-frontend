import React, { useState } from 'react';
import { Mail, Send, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useEmailTemplates } from '../../hooks/useEmailTemplates';

interface SendEmailButtonProps {
  recipientEmails: string[];
  context: {
    customerId?: number;
    quoteId?: string;
    bookingId?: string;
    customerName?: string;
    agentName?: string;
    // Add other contextual data as needed
    [key: string]: any;
  };
  suggestedTemplate?: string; // Template category to suggest
  buttonVariant?: 'primary' | 'secondary' | 'icon';
  buttonText?: string;
  className?: string;
}

interface EmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  recipientEmails: string[];
  context: any;
  suggestedTemplate?: string;
}

function EmailComposer({ isOpen, onClose, recipientEmails, context, suggestedTemplate }: EmailComposerProps) {
  const { templates } = useEmailTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const suggestedTemplates = templates.filter(t => 
    suggestedTemplate ? t.category === suggestedTemplate : t.is_active
  );

  const replaceVariables = (content: string, variables: Record<string, any>) => {
    let result = content;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, value || '');
    });
    return result;
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setSubject(replaceVariables(template.subject, context));
      setBody(replaceVariables(template.body_html, context));
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setNotification({
        type: 'error',
        message: 'Please fill in both subject and message'
      });
      return;
    }

    setSending(true);
    try {
      // This would be replaced with actual email sending logic
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          to: recipientEmails,
          subject,
          body,
          context
        })
      });

      if (response.ok) {
        setNotification({
          type: 'success',
          message: 'Email sent successfully!'
        });
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to send email. Please try again.'
      });
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Send Email</h2>
            <p className="text-sm text-gray-600 mt-1">
              To: {recipientEmails.join(', ')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`mx-6 mt-4 p-3 rounded-md flex items-center ${
            notification.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle className="h-4 w-4 mr-2" />
            ) : (
              <AlertCircle className="h-4 w-4 mr-2" />
            )}
            {notification.message}
          </div>
        )}

        <div className="flex-1 p-6 overflow-y-auto">
          {/* Template Selection */}
          {suggestedTemplates.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Use Template (Optional)
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a template...</option>
                {suggestedTemplates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.category})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Subject */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter email subject"
            />
          </div>

          {/* Message */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message *
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your message"
            />
          </div>

          {/* Context Info */}
          {Object.keys(context).length > 0 && (
            <div className="bg-gray-50 p-3 rounded-md">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Context Information</h4>
              <div className="text-xs text-gray-600 space-y-1">
                {Object.entries(context).map(([key, value]) => (
                  value && (
                    <div key={key}>
                      <span className="font-medium">{key}:</span> {value}
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t bg-gray-50 space-x-3">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !body.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SendEmailButton({
  recipientEmails,
  context,
  suggestedTemplate,
  buttonVariant = 'primary',
  buttonText = 'Send Email',
  className = ''
}: SendEmailButtonProps) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  if (recipientEmails.length === 0) {
    return null; // Don't render if no recipients
  }

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50';
    
    switch (buttonVariant) {
      case 'primary':
        return `${baseClasses} px-4 py-2 bg-blue-600 text-white hover:bg-blue-700`;
      case 'secondary':
        return `${baseClasses} px-4 py-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50`;
      case 'icon':
        return `${baseClasses} p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100`;
      default:
        return `${baseClasses} px-4 py-2 bg-blue-600 text-white hover:bg-blue-700`;
    }
  };

  return (
    <>
      <button
        onClick={() => setIsComposerOpen(true)}
        className={`${getButtonClasses()} ${className}`}
        title={`Send email to ${recipientEmails.join(', ')}`}
      >
        <Mail className="h-4 w-4 mr-2" />
        {buttonVariant !== 'icon' && buttonText}
      </button>

      <EmailComposer
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        recipientEmails={recipientEmails}
        context={context}
        suggestedTemplate={suggestedTemplate}
      />
    </>
  );
}