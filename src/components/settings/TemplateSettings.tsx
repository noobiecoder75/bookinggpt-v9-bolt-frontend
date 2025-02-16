import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, FileText, CreditCard } from 'lucide-react';

interface Template {
  id: number;
  template_name: string;
  template_type: string;
  content_html: string;
}

export function TemplateSettings() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    const { data } = await supabase
      .from('templates')
      .select('*')
      .order('template_name');
    
    if (data) {
      setTemplates(data);
    }
  }

  const templateTypes = [
    { id: 'quote', name: 'Quote Templates', icon: <FileText className="w-5 h-5" /> },
    { id: 'booking', name: 'Booking Templates', icon: <Mail className="w-5 h-5" /> },
    { id: 'invoice', name: 'Invoice Templates', icon: <CreditCard className="w-5 h-5" /> },
  ];

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 mb-6">Email & Document Templates</h2>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {templateTypes.map((type) => (
          <div
            key={type.id}
            className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400"
          >
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                {type.icon}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <a href="#" className="focus:outline-none">
                <p className="text-sm font-medium text-gray-900">{type.name}</p>
                <p className="text-sm text-gray-500 truncate">
                  {templates.filter(t => t.template_type === type.id).length} templates
                </p>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Template List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {templates.map((template) => (
            <li
              key={template.id}
              className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => setSelectedTemplate(template)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    {template.template_name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Last modified: {new Date().toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {template.template_type}
                  </span>
                  <button className="ml-4 text-sm text-indigo-600 hover:text-indigo-900">
                    Edit
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Preview Section */}
      {selectedTemplate && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Template Preview</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div dangerouslySetInnerHTML={{ __html: selectedTemplate.content_html }} />
          </div>
        </div>
      )}
    </div>
  );
}