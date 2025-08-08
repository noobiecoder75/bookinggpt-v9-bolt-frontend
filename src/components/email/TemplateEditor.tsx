import React, { useState, useEffect } from 'react';
import { Eye, Save, X, RotateCcw, Copy, Clock } from 'lucide-react';

interface EmailTemplate {
  id?: string;
  template_key: string;
  name: string;
  subject: string;
  body_html: string;
  body_text?: string;
  variables: string[];
  category: string;
  is_active: boolean;
  metadata?: any;
}

interface TemplateEditorProps {
  template?: EmailTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: EmailTemplate) => void;
  onPreview?: (template: EmailTemplate, variables: Record<string, string>) => void;
}

const CATEGORIES = [
  { value: 'welcome', label: 'Welcome' },
  { value: 'quote', label: 'Quote' },
  { value: 'booking', label: 'Booking' },
  { value: 'payment', label: 'Payment' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'custom', label: 'Custom' }
];

const DEFAULT_VARIABLES = {
  customerName: 'John Doe',
  agentName: 'Jane Smith',
  bookingReference: 'BK123456',
  destination: 'Paris, France',
  travelDates: 'March 15-22, 2024',
  quoteId: 'QT789012',
  amountDue: '$2,500',
  dueDate: 'February 15, 2024',
  clientPortalUrl: 'https://example.com/portal',
  paymentUrl: 'https://example.com/payment',
  validityDays: '14'
};

export default function TemplateEditor({ 
  template, 
  isOpen, 
  onClose, 
  onSave, 
  onPreview 
}: TemplateEditorProps) {
  const [formData, setFormData] = useState<EmailTemplate>({
    template_key: '',
    name: '',
    subject: '',
    body_html: '',
    body_text: '',
    variables: [],
    category: 'custom',
    is_active: true
  });
  
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [viewMode, setViewMode] = useState<'html' | 'text'>('html');
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>(DEFAULT_VARIABLES);
  const [extractedVariables, setExtractedVariables] = useState<string[]>([]);

  useEffect(() => {
    if (template) {
      setFormData(template);
      setPreviewVariables(prev => ({ ...DEFAULT_VARIABLES, ...prev }));
    } else {
      setFormData({
        template_key: '',
        name: '',
        subject: '',
        body_html: '',
        body_text: '',
        variables: [],
        category: 'custom',
        is_active: true
      });
      setPreviewVariables(DEFAULT_VARIABLES);
    }
  }, [template]);

  // Extract variables from template content
  useEffect(() => {
    const content = `${formData.subject} ${formData.body_html} ${formData.body_text || ''}`;
    const variableMatches = content.match(/{{\s*([^}]+)\s*}}/g);
    const variables = variableMatches 
      ? [...new Set(variableMatches.map(match => match.replace(/{{\s*|\s*}}/g, '')))]
      : [];
    
    setExtractedVariables(variables);
    setFormData(prev => ({ ...prev, variables }));
  }, [formData.subject, formData.body_html, formData.body_text]);

  const handleInputChange = (field: keyof EmailTemplate, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVariableChange = (variable: string, value: string) => {
    setPreviewVariables(prev => ({ ...prev, [variable]: value }));
  };

  const replaceVariables = (content: string) => {
    let result = content;
    Object.entries(previewVariables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, value);
    });
    return result;
  };

  const generatePlainText = () => {
    // Auto-generate plain text from HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = formData.body_html;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    handleInputChange('body_text', plainText);
  };

  const handleSave = () => {
    if (!formData.name || !formData.subject || !formData.body_html) {
      alert('Please fill in all required fields');
      return;
    }

    if (!formData.template_key) {
      // Generate template key from name
      const key = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      setFormData(prev => ({ ...prev, template_key: key }));
    }

    onSave(formData);
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview(formData, previewVariables);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {template?.id ? 'Edit Template' : 'Create Template'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'editor' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('editor')}
          >
            Editor
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'preview' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('preview')}
          >
            Preview
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'editor' ? (
            <>
              {/* Editor Panel */}
              <div className="w-1/2 p-6 overflow-y-auto border-r">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter template name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={formData.is_active ? 'active' : 'inactive'}
                        onChange={(e) => handleInputChange('is_active', e.target.value === 'active')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject Line *
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter email subject"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Email Content *
                      </label>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setViewMode('html')}
                          className={`px-3 py-1 text-sm rounded ${
                            viewMode === 'html' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          HTML
                        </button>
                        <button
                          onClick={() => setViewMode('text')}
                          className={`px-3 py-1 text-sm rounded ${
                            viewMode === 'text' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          Text
                        </button>
                      </div>
                    </div>
                    
                    {viewMode === 'html' ? (
                      <textarea
                        value={formData.body_html}
                        onChange={(e) => handleInputChange('body_html', e.target.value)}
                        rows={12}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        placeholder="Enter HTML email content"
                      />
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-end">
                          <button
                            onClick={generatePlainText}
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Generate from HTML
                          </button>
                        </div>
                        <textarea
                          value={formData.body_text || ''}
                          onChange={(e) => handleInputChange('body_text', e.target.value)}
                          rows={12}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter plain text email content"
                        />
                      </div>
                    )}
                  </div>

                  {extractedVariables.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Variables Found ({extractedVariables.length})
                      </label>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="flex flex-wrap gap-2">
                          {extractedVariables.map(variable => (
                            <span
                              key={variable}
                              className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                            >
                              {variable}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Preview Panel */}
              <div className="w-1/2 p-6 overflow-y-auto bg-gray-50">
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="font-medium mb-4">Live Preview</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Subject
                      </label>
                      <div className="p-2 bg-gray-100 rounded text-sm">
                        {replaceVariables(formData.subject) || 'No subject'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Email Body
                      </label>
                      <div className="border rounded min-h-[300px]">
                        {formData.body_html ? (
                          <iframe
                            srcDoc={replaceVariables(formData.body_html)}
                            className="w-full h-[400px] border-0"
                            title="Email Preview"
                          />
                        ) : (
                          <div className="p-4 text-gray-500 text-center">
                            No content to preview
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Variable Controls */}
                    {extractedVariables.length > 0 && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">
                          Preview Variables
                        </label>
                        <div className="space-y-2">
                          {extractedVariables.map(variable => (
                            <div key={variable} className="flex items-center space-x-2">
                              <label className="text-xs w-24 flex-shrink-0">
                                {variable}:
                              </label>
                              <input
                                type="text"
                                value={previewVariables[variable] || ''}
                                onChange={(e) => handleVariableChange(variable, e.target.value)}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                                placeholder={`Enter ${variable}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            // Full Preview Panel
            <div className="w-full p-6 overflow-y-auto">
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-lg shadow">
                  <div className="border-b p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Email Preview</h3>
                      <button
                        onClick={handlePreview}
                        className="flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Full Preview
                      </button>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      Subject: {replaceVariables(formData.subject) || 'No subject'}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {formData.body_html ? (
                      <iframe
                        srcDoc={replaceVariables(formData.body_html)}
                        className="w-full h-[500px] border border-gray-200 rounded"
                        title="Full Email Preview"
                      />
                    ) : (
                      <div className="p-8 text-gray-500 text-center border-2 border-dashed border-gray-300 rounded">
                        No content to preview
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-1" />
            Auto-saved
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}