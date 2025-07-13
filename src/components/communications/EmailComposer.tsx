import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '../../styles/quill-custom.css';
import { 
  X, 
  Send, 
  Search, 
  User, 
  Mail, 
  FileText,
  Eye,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { gmailApi } from '../../lib/gmailApi';
import { 
  EMAIL_TEMPLATES, 
  createEmailFromTemplate, 
  replaceTemplateVariables,
  getTemplateContent,
  htmlToPlainText
} from '../../utils/emailTemplates';
import { EmailMessage, EmailTemplate } from '../../types/gmail';

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

interface EmailComposerProps {
  onClose: () => void;
  onEmailSent: (success: boolean, message?: string) => void;
}

// Quill toolbar configuration for email-appropriate formatting
const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link'],
    ['clean']
  ],
};

const quillFormats = [
  'bold', 'italic', 'underline',
  'list', 'bullet',
  'link'
];

export function EmailComposer({ onClose, onEmailSent }: EmailComposerProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [emailFormat, setEmailFormat] = useState<'html' | 'text'>('html');

  // Template variables
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({
    agentName: 'Travel Agent', // Default value
    validityDays: '14', // Default value
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      const templateContent = getTemplateContent(selectedTemplate.id, emailFormat);
      if (templateContent) {
        setSubject(templateContent.subject);
        setBody(templateContent.body);
      }
      
      // Initialize template variables with defaults
      const defaultVars: Record<string, string> = {
        agentName: 'Travel Agent',
        validityDays: '14',
        customerName: selectedCustomers.length > 0 ? selectedCustomers[0].first_name : '',
      };
      setTemplateVars(defaultVars);
    }
  }, [selectedTemplate, selectedCustomers, emailFormat]);

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email, phone')
        .order('first_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const searchCustomers = (searchTerm: string) => {
    if (!searchTerm.trim()) return customers;
    
    const term = searchTerm.toLowerCase();
    return customers.filter(customer => 
      (customer.first_name && customer.first_name.toLowerCase().includes(term)) ||
      (customer.last_name && customer.last_name.toLowerCase().includes(term)) ||
      (customer.email && customer.email.toLowerCase().includes(term))
    );
  };

  const addCustomer = (customer: Customer) => {
    if (!selectedCustomers.find(c => c.id === customer.id)) {
      setSelectedCustomers([...selectedCustomers, customer]);
      
      // Update customerName in template variables if this is the first customer
      if (selectedCustomers.length === 0) {
        setTemplateVars(prev => ({
          ...prev,
          customerName: customer.first_name
        }));
      }
    }
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  };

  const removeCustomer = (customerId: number) => {
    const newCustomers = selectedCustomers.filter(c => c.id !== customerId);
    setSelectedCustomers(newCustomers);
    
    // Update customerName in template variables
    if (newCustomers.length > 0) {
      setTemplateVars(prev => ({
        ...prev,
        customerName: newCustomers[0].first_name
      }));
    } else {
      setTemplateVars(prev => ({
        ...prev,
        customerName: ''
      }));
    }
  };

  const updateTemplateVar = (key: string, value: string) => {
    setTemplateVars(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getProcessedContent = () => {
    const processedSubject = replaceTemplateVariables(subject, templateVars);
    const processedBody = replaceTemplateVariables(body, templateVars);
    return { processedSubject, processedBody };
  };

  const handleSendEmail = async () => {
    if (!selectedCustomers.length) {
      onEmailSent(false, 'Please select at least one recipient');
      return;
    }

    if (!subject.trim() || !body.trim()) {
      onEmailSent(false, 'Please fill in subject and body');
      return;
    }

    setIsSending(true);

    try {
      const { processedSubject, processedBody } = getProcessedContent();
      const recipients = selectedCustomers.map(c => c.email);

      const emailMessage: EmailMessage = {
        to: recipients,
        subject: processedSubject,
        body: processedBody
      };

      const result = await gmailApi.sendEmail(emailMessage);

      if (result.success) {
        // Log email to database
        for (const customer of selectedCustomers) {
          await supabase
            .from('email_communications')
            .insert({
              customer_id: customer.id,
              email_type: selectedTemplate?.category || 'custom',
              subject: processedSubject,
              body: processedBody, // Final processed content
              raw_content: body, // Original content with template variables
              template_id: selectedTemplate?.id || null, // Template reference
              content_type: selectedTemplate ? 'template' : emailFormat, // Content type (html/text/template)
              metadata: { 
                templateVars, 
                agentName: templateVars.agentName,
                customerName: customer.first_name,
                sentToCount: selectedCustomers.length,
                emailFormat: emailFormat
              }, // Additional context
              recipients: [customer.email],
              status: 'sent',
              sent_at: new Date().toISOString()
            });
        }

        onEmailSent(true, 'Email sent successfully!');
        onClose();
      } else {
        onEmailSent(false, result.error || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      onEmailSent(false, error.message || 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const filteredCustomers = searchCustomers(customerSearch);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-medium text-gray-900">Compose Email</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSending}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Template
            </label>
            <select
              value={selectedTemplate?.id || ''}
              onChange={(e) => {
                const template = EMAIL_TEMPLATES.find(t => t.id === e.target.value);
                setSelectedTemplate(template || null);
              }}
              className="w-full px-3 py-4 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 h-12"
              disabled={isSending}
            >
              <option value="">Select a template or compose custom email</option>
              {EMAIL_TEMPLATES.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Format
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="html"
                  checked={emailFormat === 'html'}
                  onChange={(e) => setEmailFormat(e.target.value as 'html' | 'text')}
                  className="form-radio h-4 w-4 text-indigo-600"
                  disabled={isSending}
                />
                <span className="ml-2 text-sm text-gray-700">Rich HTML (Recommended)</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="text"
                  checked={emailFormat === 'text'}
                  onChange={(e) => setEmailFormat(e.target.value as 'html' | 'text')}
                  className="form-radio h-4 w-4 text-indigo-600"
                  disabled={isSending}
                />
                <span className="ml-2 text-sm text-gray-700">Plain Text</span>
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {emailFormat === 'html' 
                ? 'Rich HTML format with styling, colors, and formatting'
                : 'Simple plain text format for better deliverability'
              }
            </p>
          </div>

          {/* Template Variables */}
          {selectedTemplate && selectedTemplate.variables.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Variables
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedTemplate.variables.map(variable => (
                  <div key={variable}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {variable}
                    </label>
                    <input
                      type="text"
                      value={templateVars[variable] || ''}
                      onChange={(e) => updateTemplateVar(variable, e.target.value)}
                      placeholder={`Enter ${variable}`}
                      className="w-full px-3 py-4 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm h-12"
                      disabled={isSending}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipients
            </label>
            
            {/* Selected Customers */}
            {selectedCustomers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedCustomers.map(customer => (
                  <span
                    key={customer.id}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                  >
                    {customer.first_name} {customer.last_name} ({customer.email})
                    <button
                      onClick={() => removeCustomer(customer.id)}
                      className="ml-2 text-indigo-600 hover:text-indigo-800"
                      disabled={isSending}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Customer Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers by name or email..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="w-full pl-10 pr-4 py-4 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 h-12"
                disabled={isSending}
              />
              
              {/* Customer Dropdown */}
              {showCustomerDropdown && customerSearch && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {loadingCustomers ? (
                    <div className="p-4 text-center">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      <span className="text-sm text-gray-500 mt-1">Loading customers...</span>
                    </div>
                  ) : filteredCustomers.length > 0 ? (
                    filteredCustomers.map(customer => (
                      <button
                        key={customer.id}
                        onClick={() => addCustomer(customer)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
                        disabled={selectedCustomers.find(c => c.id === customer.id) !== undefined}
                      >
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">
                            {customer.first_name} {customer.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{customer.email}</div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No customers found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject"
              className="w-full px-3 py-4 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 h-12"
              disabled={isSending}
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Body
            </label>
            {emailFormat === 'html' ? (
              <ReactQuill
                value={body}
                onChange={setBody}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Enter email content..."
                className="bg-white"
                readOnly={isSending}
                style={{ minHeight: '500px' }}
              />
            ) : (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter email content..."
                className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                rows={20}
                disabled={isSending}
                style={{ fontFamily: 'monospace', fontSize: '14px' }}
              />
            )}
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>
                {emailFormat === 'html' 
                  ? 'Use the toolbar above to format your email with rich text'
                  : 'Plain text format - no HTML styling available'
                }
              </span>
              {emailFormat === 'html' && (
                <button
                  type="button"
                  onClick={() => {
                    if (body) {
                      setEmailFormat('text');
                      setBody(htmlToPlainText(body));
                    }
                  }}
                  className="text-indigo-600 hover:text-indigo-800 underline"
                  disabled={isSending}
                >
                  Convert to plain text
                </button>
              )}
            </div>
          </div>

          {/* Preview Toggle */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsPreview(!isPreview)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              disabled={isSending}
            >
              <Eye className="h-4 w-4 mr-2" />
              {isPreview ? 'Edit' : 'Preview'}
            </button>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                disabled={isSending}
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={isSending || !selectedCustomers.length || !subject.trim() || !body.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview */}
          {isPreview && (
            <div className="border-t pt-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Email Preview</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-1">To:</div>
                  <div className="font-medium">
                    {selectedCustomers.map(c => c.email).join(', ') || 'No recipients selected'}
                  </div>
                </div>
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-1">Subject:</div>
                  <div className="font-medium">{getProcessedContent().processedSubject || 'No subject'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Body:</div>
                  {emailFormat === 'html' ? (
                    <div 
                      className="prose max-w-none"
                      dangerouslySetInnerHTML={{ 
                        __html: getProcessedContent().processedBody || 'No content' 
                      }}
                    />
                  ) : (
                    <div className="bg-white border rounded p-3 whitespace-pre-wrap font-mono text-sm">
                      {getProcessedContent().processedBody || 'No content'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}