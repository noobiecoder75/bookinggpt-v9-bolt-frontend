import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import TemplateGallery from '../components/email/TemplateGallery';
import TemplateEditor from '../components/email/TemplateEditor';
import { useEmailTemplates } from '../hooks/useEmailTemplates';
import { 
  Mail, 
  Zap, 
  BarChart3, 
  Settings,
  AlertCircle,
  CheckCircle 
} from 'lucide-react';

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
  version?: number;
  created_at?: string;
  updated_at?: string;
  metadata?: any;
}

export default function EmailManagement() {
  const [activeTab, setActiveTab] = useState('templates');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const {
    templates,
    automationRules,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    previewTemplate
  } = useEmailTemplates();

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setIsEditorOpen(true);
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsEditorOpen(true);
  };

  const handleSaveTemplate = async (template: EmailTemplate) => {
    try {
      if (selectedTemplate?.id) {
        await updateTemplate(selectedTemplate.id, template);
        showNotification('success', 'Template updated successfully!');
      } else {
        await createTemplate(template);
        showNotification('success', 'Template created successfully!');
      }
      setIsEditorOpen(false);
      setSelectedTemplate(null);
    } catch (error) {
      showNotification('error', 'Failed to save template. Please try again.');
    }
  };

  const handleDuplicateTemplate = async (template: EmailTemplate) => {
    try {
      if (template.id) {
        await duplicateTemplate(template.id);
        showNotification('success', 'Template duplicated successfully!');
      }
    } catch (error) {
      showNotification('error', 'Failed to duplicate template. Please try again.');
    }
  };

  const handleDeleteTemplate = async (template: EmailTemplate) => {
    if (!window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      if (template.id) {
        await deleteTemplate(template.id);
        showNotification('success', 'Template deleted successfully!');
      }
    } catch (error) {
      showNotification('error', 'Failed to delete template. Please try again.');
    }
  };

  const handlePreviewTemplate = async (template: EmailTemplate) => {
    try {
      if (template.id) {
        // Use default preview variables for now
        const previewVariables = {
          customerName: 'John Doe',
          agentName: 'Jane Smith',
          bookingReference: 'BK123456',
          destination: 'Paris, France'
        };
        
        const preview = await previewTemplate(template.id, previewVariables);
        
        // Open preview in new window
        const previewWindow = window.open('', '_blank', 'width=800,height=600');
        if (previewWindow) {
          previewWindow.document.write(`
            <html>
              <head>
                <title>Email Preview: ${preview.subject}</title>
                <style>
                  body { font-family: Arial, sans-serif; margin: 20px; }
                  .preview-header { border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 20px; }
                  .subject { font-weight: bold; font-size: 16px; margin-bottom: 10px; }
                </style>
              </head>
              <body>
                <div class="preview-header">
                  <div class="subject">Subject: ${preview.subject}</div>
                  <div style="font-size: 12px; color: #666;">Preview with sample data</div>
                </div>
                ${preview.body_html}
              </body>
            </html>
          `);
          previewWindow.document.close();
        }
      }
    } catch (error) {
      showNotification('error', 'Failed to preview template. Please try again.');
    }
  };

  const getStats = () => {
    const totalTemplates = templates.length;
    const activeTemplates = templates.filter(t => t.is_active).length;
    const totalAutomation = automationRules.length;
    const activeAutomation = automationRules.filter(r => r.is_active).length;

    return {
      totalTemplates,
      activeTemplates,
      totalAutomation,
      activeAutomation
    };
  };

  const stats = getStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center p-4 rounded-md shadow-lg ${
          notification.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle className="h-5 w-5 mr-2" />
          ) : (
            <AlertCircle className="h-5 w-5 mr-2" />
          )}
          {notification.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start border-b bg-transparent p-0">
            <TabsTrigger 
              value="templates" 
              className="flex items-center px-6 py-3 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
            >
              <Mail className="h-4 w-4 mr-2" />
              Templates
              <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                {stats.totalTemplates}
              </span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="automation"
              className="flex items-center px-6 py-3 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
            >
              <Zap className="h-4 w-4 mr-2" />
              Automation
              <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                {stats.totalAutomation}
              </span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="analytics"
              className="flex items-center px-6 py-3 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            
            <TabsTrigger 
              value="settings"
              className="flex items-center px-6 py-3 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-0">
            <TemplateGallery
              templates={templates}
              onCreateTemplate={handleCreateTemplate}
              onEditTemplate={handleEditTemplate}
              onDuplicateTemplate={handleDuplicateTemplate}
              onDeleteTemplate={handleDeleteTemplate}
              onPreviewTemplate={handlePreviewTemplate}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="automation" className="mt-0">
            <div className="p-6">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Automation</h1>
                <p className="text-gray-600">Set up automated email sequences based on triggers</p>
              </div>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg border">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg mr-4">
                      <Zap className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Active Rules</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.activeAutomation}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg border">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg mr-4">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Rules</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalAutomation}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg border">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg mr-4">
                      <Mail className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Emails Sent Today</p>
                      <p className="text-2xl font-bold text-gray-900">0</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border p-6">
                <p className="text-gray-600 text-center py-8">
                  Automation rules management coming soon...
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <div className="p-6">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Analytics</h1>
                <p className="text-gray-600">Track email performance and engagement</p>
              </div>
              
              <div className="bg-white rounded-lg border p-6">
                <p className="text-gray-600 text-center py-8">
                  Analytics dashboard coming soon...
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <div className="p-6">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Settings</h1>
                <p className="text-gray-600">Configure email preferences and integrations</p>
              </div>
              
              <div className="bg-white rounded-lg border p-6">
                <p className="text-gray-600 text-center py-8">
                  Email settings coming soon...
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Template Editor Modal */}
      <TemplateEditor
        template={selectedTemplate}
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setSelectedTemplate(null);
        }}
        onSave={handleSaveTemplate}
        onPreview={handlePreviewTemplate}
      />
    </div>
  );
}