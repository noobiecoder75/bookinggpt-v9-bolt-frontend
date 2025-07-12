import React, { useState, useEffect } from 'react';
import { Mail, Send, RefreshCw, MessageCircle, Clock, User, Bot, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Quote {
  id: string;
  customer: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface EmailCommunication {
  id: string;
  customer_id: number;
  quote_id: string;
  email_type: string;
  subject: string;
  recipients: string[];
  status: 'sent' | 'delivered' | 'opened' | 'bounced' | 'failed';
  sent_at: string;
  opened_at?: string;
  bounced_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

interface ClientEmailProps {
  quote: Quote;
}

export function ClientEmail({ quote }: ClientEmailProps) {
  const [emailCommunications, setEmailCommunications] = useState<EmailCommunication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<EmailCommunication | null>(null);

  useEffect(() => {
    fetchEmailCommunications();
  }, [quote.id]);

  const fetchEmailCommunications = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_communications')
        .select('*')
        .eq('customer_id', quote.customer.id)
        .order('sent_at', { ascending: false });

      if (error) {
        console.error('Error fetching email communications:', error);
        return;
      }

      setEmailCommunications(data || []);
    } catch (error) {
      console.error('Error fetching email communications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Send className="h-4 w-4 text-blue-500" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'opened':
        return <Mail className="h-4 w-4 text-green-600" />;
      case 'bounced':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'opened':
        return 'bg-green-100 text-green-800';
      case 'bounced':
        return 'bg-red-100 text-red-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 mr-2" />
        <span className="text-gray-600">Loading email communications...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Email Communications List */}
      <div className="w-1/3 border-r border-gray-200 bg-gray-50">
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Email Communications</h3>
            <button
              onClick={fetchEmailCommunications}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {emailCommunications.length === 0 ? (
            <div className="p-6 text-center">
              <Mail className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                No email communications yet. Email history will appear here once emails are sent.
              </p>
            </div>
          ) : (
            emailCommunications.map((email) => (
              <div
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                className={`p-4 cursor-pointer hover:bg-white transition-colors ${
                  selectedEmail?.id === email.id ? 'bg-white border-r-2 border-indigo-500' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {email.subject}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {email.email_type}
                    </p>
                    <div className="flex items-center mt-2">
                      {getStatusIcon(email.status)}
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(email.status)}`}>
                        {email.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-gray-400 ml-2">
                    <Clock className="h-3 w-3 mr-1" />
                    {new Date(email.sent_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Email Details View */}
      <div className="flex-1 flex flex-col">
        {selectedEmail ? (
          <>
            {/* Email Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-medium text-gray-900">{selectedEmail.subject}</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    To: {selectedEmail.recipients.join(', ')}
                  </p>
                  <p className="text-sm text-gray-500">
                    Type: {selectedEmail.email_type}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(selectedEmail.status)}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedEmail.status)}`}>
                    {selectedEmail.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Email Details */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sent Date
                      </label>
                      <p className="text-sm text-gray-900">
                        {new Date(selectedEmail.sent_at).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <div className="flex items-center">
                        {getStatusIcon(selectedEmail.status)}
                        <span className="ml-2 text-sm text-gray-900 capitalize">
                          {selectedEmail.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedEmail.opened_at && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Opened Date
                      </label>
                      <p className="text-sm text-gray-900">
                        {new Date(selectedEmail.opened_at).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {selectedEmail.bounced_at && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bounced Date
                      </label>
                      <p className="text-sm text-gray-900">
                        {new Date(selectedEmail.bounced_at).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {selectedEmail.error_message && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Error Message
                      </label>
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <p className="text-sm text-red-800">{selectedEmail.error_message}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recipients
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedEmail.recipients.map((recipient, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {recipient}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select an email
              </h3>
              <p className="text-sm text-gray-500">
                Choose an email from the sidebar to view its details and delivery status.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}