import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  Search, 
  Filter, 
  Plus, 
  Clock, 
  Eye, 
  Reply, 
  TrendingUp,
  Users,
  FileText,
  Calendar,
  RefreshCw,
  Settings,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  X,
  Zap
} from 'lucide-react';
import { useGoogleOAuth } from '../../hooks/useGoogleOAuth';
import { supabase } from '../../lib/supabase';
import { EmailComposer } from './EmailComposer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import TemplateGallery from '../email/TemplateGallery';
import TemplateEditor from '../email/TemplateEditor';
import { useEmailTemplates } from '../../hooks/useEmailTemplates';

interface EmailCommunication {
  id: string;
  customer_id: number;
  quote_id?: string;
  email_type: string;
  subject: string;
  recipients: string[];
  status: 'sent' | 'failed' | 'bounced' | 'opened';
  sent_at: string;
  opened_at?: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface EmailStats {
  totalSent: number;
  totalOpened: number;
  totalReplies: number;
  openRate: number;
  responseRate: number;
  todaySent: number;
}

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

export function CommunicationsDashboard() {
  const [emails, setEmails] = useState<EmailCommunication[]>([]);
  const [stats, setStats] = useState<EmailStats>({
    totalSent: 0,
    totalOpened: 0,
    totalReplies: 0,
    openRate: 0,
    responseRate: 0,
    todaySent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showComposer, setShowComposer] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Template management state
  const [activeTab, setActiveTab] = useState('communications');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [templateNotification, setTemplateNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const { isConnected, isLoading: gmailLoading, connect, checkConnection } = useGoogleOAuth();
  
  // Email templates hook
  const {
    templates,
    automationRules,
    loading: templatesLoading,
    error: templatesError,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    previewTemplate
  } = useEmailTemplates();

  useEffect(() => {
    // Check Gmail connection for sending capabilities
    checkConnection();
    // Always fetch email data regardless of Gmail connection
    fetchEmailData();
  }, [checkConnection]);

  const fetchEmailData = async () => {
    try {
      setLoading(true);
      
      // Fetch email communications with customer data
      const { data: emailData, error } = await supabase
        .from('email_communications')
        .select(`
          *,
          customer:customers(first_name, last_name, email)
        `)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setEmails(emailData || []);

      // Calculate stats
      const totalSent = emailData?.length || 0;
      const totalOpened = emailData?.filter(email => email.opened_at).length || 0;
      const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
      
      const today = new Date().toISOString().split('T')[0];
      const todaySent = emailData?.filter(email => 
        email.sent_at.startsWith(today)
      ).length || 0;

      setStats({
        totalSent,
        totalOpened,
        totalReplies: 0, // This would need additional tracking
        openRate,
        responseRate: 0, // This would need additional tracking
        todaySent,
      });

    } catch (error) {
      console.error('Error fetching email data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmails = emails.filter(email => {
    const matchesSearch = email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.customer?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.customer?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || email.email_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const handleEmailSent = (success: boolean, message?: string) => {
    setEmailFeedback({
      type: success ? 'success' : 'error',
      message: message || (success ? 'Email sent successfully!' : 'Failed to send email')
    });
    
    if (success) {
      // Refresh email data to show the new email
      fetchEmailData();
    }
    
    // Clear feedback after 5 seconds
    setTimeout(() => {
      setEmailFeedback(null);
    }, 5000);
  };
  
  // Template management functions
  const showTemplateNotification = (type: 'success' | 'error', message: string) => {
    setTemplateNotification({ type, message });
    setTimeout(() => setTemplateNotification(null), 5000);
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
        showTemplateNotification('success', 'Template updated successfully!');
      } else {
        await createTemplate(template);
        showTemplateNotification('success', 'Template created successfully!');
      }
      setIsEditorOpen(false);
      setSelectedTemplate(null);
    } catch (error) {
      showTemplateNotification('error', 'Failed to save template. Please try again.');
    }
  };

  const handleDuplicateTemplate = async (template: EmailTemplate) => {
    try {
      if (template.id) {
        await duplicateTemplate(template.id);
        showTemplateNotification('success', 'Template duplicated successfully!');
      }
    } catch (error) {
      showTemplateNotification('error', 'Failed to duplicate template. Please try again.');
    }
  };

  const handleDeleteTemplate = async (template: EmailTemplate) => {
    if (!window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      if (template.id) {
        await deleteTemplate(template.id);
        showTemplateNotification('success', 'Template deleted successfully!');
      }
    } catch (error) {
      showTemplateNotification('error', 'Failed to delete template. Please try again.');
    }
  };

  const handlePreviewTemplate = async (template: EmailTemplate) => {
    try {
      if (template.id) {
        const previewVariables = {
          customerName: 'John Doe',
          agentName: 'Jane Smith',
          bookingReference: 'BK123456',
          destination: 'Paris, France'
        };
        
        const preview = await previewTemplate(template.id, previewVariables);
        
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
      showTemplateNotification('error', 'Failed to preview template. Please try again.');
    }
  };
  
  const getTemplateStats = () => {
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
  
  const templateStats = getTemplateStats();

  // Show loading while checking Gmail connection
  if (gmailLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-white rounded-lg shadow-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Checking Gmail Connection...</h2>
          <p className="text-gray-600">Please wait while we verify your Gmail integration.</p>
        </div>
      </div>
    );
  }

  // Gmail connection notice (but don't block the dashboard)
  const gmailNotice = !isConnected && (
    <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center">
        <Mail className="h-5 w-5 text-yellow-600 mr-2" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800">Gmail Not Connected</h3>
          <p className="text-sm text-yellow-700 mt-1">
            Connect Gmail to send new emails. You can still view existing email communications below.
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => connect()}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-800 bg-yellow-100 hover:bg-yellow-200"
          >
            Connect Gmail
          </button>
          <button
            onClick={() => window.location.href = '/settings'}
            className="inline-flex items-center px-3 py-1.5 border border-yellow-300 text-xs font-medium rounded text-yellow-800 bg-white hover:bg-yellow-50"
          >
            Settings
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Template Notifications */}
      {templateNotification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center p-4 rounded-md shadow-lg ${
          templateNotification.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {templateNotification.type === 'success' ? (
            <CheckCircle className="h-5 w-5 mr-2" />
          ) : (
            <AlertTriangle className="h-5 w-5 mr-2" />
          )}
          {templateNotification.message}
        </div>
      )}
      
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Gmail Connection Notice */}
        {gmailNotice}

        {/* Email Feedback */}
        {emailFeedback && (
          <div className={`mb-6 border rounded-lg p-4 ${
            emailFeedback.type === 'success' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center">
              {emailFeedback.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  emailFeedback.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {emailFeedback.message}
                </p>
              </div>
              <button
                onClick={() => setEmailFeedback(null)}
                className={`text-xs ${
                  emailFeedback.type === 'success' ? 'text-green-600' : 'text-red-600'
                } hover:opacity-75`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start border-b bg-transparent p-0 mb-8">
            <TabsTrigger 
              value="communications" 
              className="flex items-center px-6 py-3 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
            >
              <Mail className="h-4 w-4 mr-2" />
              Communications
              <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                {stats.totalSent}
              </span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="templates"
              className="flex items-center px-6 py-3 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
            >
              <FileText className="h-4 w-4 mr-2" />
              Templates
              <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                {templateStats.totalTemplates}
              </span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="automation"
              className="flex items-center px-6 py-3 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
            >
              <Zap className="h-4 w-4 mr-2" />
              Automation
              <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                {templateStats.totalAutomation}
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

          <TabsContent value="communications" className="mt-0">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Email Communications</h1>
                  <p className="text-gray-600">Manage email communications with your customers</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={fetchEmailData}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </button>
                  <button
                    onClick={() => setShowComposer(true)}
                    disabled={!isConnected}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
                      isConnected 
                        ? 'text-white bg-indigo-600 hover:bg-indigo-700' 
                        : 'text-gray-400 bg-gray-300 cursor-not-allowed'
                    }`}
                    title={!isConnected ? 'Connect Gmail to compose emails' : 'Compose new email'}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Compose Email
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Send className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Sent</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalSent}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Eye className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Opened</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalOpened}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Open Rate</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.openRate.toFixed(1)}%</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Today</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.todaySent}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Reply className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Responses</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalReplies}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
            </div>

            {/* Filters and Search */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Email Activity</h3>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search emails..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Types</option>
                  <option value="welcome">Welcome</option>
                  <option value="quote">Quote</option>
                  <option value="booking">Booking</option>
                  <option value="payment">Payment</option>
                  <option value="follow-up">Follow-up</option>
                </select>
              </div>
            </div>
          </div>

          {/* Email List */}
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-6 text-center">
                <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 mx-auto mb-2" />
                <p className="text-gray-600">Loading email communications...</p>
              </div>
            ) : filteredEmails.length > 0 ? (
              filteredEmails.map((email) => (
                <div key={email.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          email.status === 'opened' ? 'bg-green-500' :
                          email.status === 'sent' ? 'bg-blue-500' :
                          email.status === 'failed' ? 'bg-red-500' :
                          'bg-gray-400'
                        }`} />
                        <h4 className="text-sm font-medium text-gray-900">{email.subject}</h4>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {email.email_type}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <span>To: {email.customer?.first_name} {email.customer?.last_name}</span>
                        <span>{email.recipients.join(', ')}</span>
                        <span>{new Date(email.sent_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {email.opened_at && (
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                          Opened
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(email.sent_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No emails found</h3>
                <p className="text-gray-600">
                  {searchTerm || filterType !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'Start by composing your first email'
                  }
                </p>
              </div>
            )}
            </div>
          </div>
          </TabsContent>

          <TabsContent value="templates" className="mt-0">
            <TemplateGallery
              templates={templates}
              onCreateTemplate={handleCreateTemplate}
              onEditTemplate={handleEditTemplate}
              onDuplicateTemplate={handleDuplicateTemplate}
              onDeleteTemplate={handleDeleteTemplate}
              onPreviewTemplate={handlePreviewTemplate}
              loading={templatesLoading}
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
                      <p className="text-2xl font-bold text-gray-900">{templateStats.activeAutomation}</p>
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
                      <p className="text-2xl font-bold text-gray-900">{templateStats.totalAutomation}</p>
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
                      <p className="text-2xl font-bold text-gray-900">{stats.todaySent}</p>
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

        {/* Email Composer Modal */}
        {showComposer && (
          <EmailComposer
            onClose={() => setShowComposer(false)}
            onEmailSent={handleEmailSent}
          />
        )}
        
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
    </div>
  );
}