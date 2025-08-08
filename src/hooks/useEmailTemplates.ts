import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

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

interface EmailAutomationRule {
  id?: string;
  name: string;
  description?: string;
  trigger_event: string;
  template_id: string;
  conditions?: Record<string, any>;
  delay_minutes?: number;
  is_active: boolean;
}

interface UseEmailTemplatesReturn {
  templates: EmailTemplate[];
  automationRules: EmailAutomationRule[];
  loading: boolean;
  error: string | null;
  
  // Template operations
  fetchTemplates: (category?: string) => Promise<void>;
  createTemplate: (template: EmailTemplate) => Promise<EmailTemplate>;
  updateTemplate: (id: string, template: Partial<EmailTemplate>) => Promise<EmailTemplate>;
  deleteTemplate: (id: string) => Promise<void>;
  duplicateTemplate: (id: string) => Promise<EmailTemplate>;
  previewTemplate: (id: string, variables: Record<string, string>) => Promise<{subject: string, body_html: string, body_text?: string}>;
  
  // Template history
  getTemplateHistory: (templateId: string) => Promise<any[]>;
  restoreTemplate: (templateId: string, historyId: string) => Promise<EmailTemplate>;
  
  // Automation rules
  fetchAutomationRules: () => Promise<void>;
  createAutomationRule: (rule: EmailAutomationRule) => Promise<EmailAutomationRule>;
  updateAutomationRule: (id: string, rule: Partial<EmailAutomationRule>) => Promise<EmailAutomationRule>;
  deleteAutomationRule: (id: string) => Promise<void>;
}

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3001/api';

export function useEmailTemplates(): UseEmailTemplatesReturn {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [automationRules, setAutomationRules] = useState<EmailAutomationRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();

  const makeRequest = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  };

  // Fetch templates
  const fetchTemplates = async (category?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = category ? `?category=${category}` : '';
      const data = await makeRequest(`/email-templates/templates${queryParams}`);
      
      setTemplates(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch templates';
      setError(errorMessage);
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create template
  const createTemplate = async (template: EmailTemplate): Promise<EmailTemplate> => {
    try {
      setError(null);
      const data = await makeRequest('/email-templates/templates', {
        method: 'POST',
        body: JSON.stringify(template),
      });

      setTemplates(prev => [...prev, data]);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create template';
      setError(errorMessage);
      console.error('Error creating template:', err);
      throw err;
    }
  };

  // Update template
  const updateTemplate = async (id: string, template: Partial<EmailTemplate>): Promise<EmailTemplate> => {
    try {
      setError(null);
      const data = await makeRequest(`/email-templates/templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(template),
      });

      setTemplates(prev => prev.map(t => t.id === id ? data : t));
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update template';
      setError(errorMessage);
      console.error('Error updating template:', err);
      throw err;
    }
  };

  // Delete template
  const deleteTemplate = async (id: string): Promise<void> => {
    try {
      setError(null);
      await makeRequest(`/email-templates/templates/${id}`, {
        method: 'DELETE',
      });

      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete template';
      setError(errorMessage);
      console.error('Error deleting template:', err);
      throw err;
    }
  };

  // Duplicate template
  const duplicateTemplate = async (id: string): Promise<EmailTemplate> => {
    try {
      setError(null);
      const data = await makeRequest(`/email-templates/templates/${id}/duplicate`, {
        method: 'POST',
      });

      setTemplates(prev => [...prev, data]);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate template';
      setError(errorMessage);
      console.error('Error duplicating template:', err);
      throw err;
    }
  };

  // Preview template
  const previewTemplate = async (id: string, variables: Record<string, string>) => {
    try {
      setError(null);
      return await makeRequest(`/email-templates/templates/${id}/preview`, {
        method: 'POST',
        body: JSON.stringify({ variables }),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to preview template';
      setError(errorMessage);
      console.error('Error previewing template:', err);
      throw err;
    }
  };

  // Get template history
  const getTemplateHistory = async (templateId: string) => {
    try {
      setError(null);
      return await makeRequest(`/email-templates/templates/${templateId}/history`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch template history';
      setError(errorMessage);
      console.error('Error fetching template history:', err);
      throw err;
    }
  };

  // Restore template from history
  const restoreTemplate = async (templateId: string, historyId: string): Promise<EmailTemplate> => {
    try {
      setError(null);
      const data = await makeRequest(`/email-templates/templates/${templateId}/restore/${historyId}`, {
        method: 'POST',
      });

      setTemplates(prev => prev.map(t => t.id === templateId ? data : t));
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore template';
      setError(errorMessage);
      console.error('Error restoring template:', err);
      throw err;
    }
  };

  // Fetch automation rules
  const fetchAutomationRules = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await makeRequest('/email-templates/automation/rules');
      setAutomationRules(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch automation rules';
      setError(errorMessage);
      console.error('Error fetching automation rules:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create automation rule
  const createAutomationRule = async (rule: EmailAutomationRule): Promise<EmailAutomationRule> => {
    try {
      setError(null);
      const data = await makeRequest('/email-templates/automation/rules', {
        method: 'POST',
        body: JSON.stringify(rule),
      });

      setAutomationRules(prev => [...prev, data]);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create automation rule';
      setError(errorMessage);
      console.error('Error creating automation rule:', err);
      throw err;
    }
  };

  // Update automation rule
  const updateAutomationRule = async (id: string, rule: Partial<EmailAutomationRule>): Promise<EmailAutomationRule> => {
    try {
      setError(null);
      const data = await makeRequest(`/email-templates/automation/rules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(rule),
      });

      setAutomationRules(prev => prev.map(r => r.id === id ? data : r));
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update automation rule';
      setError(errorMessage);
      console.error('Error updating automation rule:', err);
      throw err;
    }
  };

  // Delete automation rule
  const deleteAutomationRule = async (id: string): Promise<void> => {
    try {
      setError(null);
      await makeRequest(`/email-templates/automation/rules/${id}`, {
        method: 'DELETE',
      });

      setAutomationRules(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete automation rule';
      setError(errorMessage);
      console.error('Error deleting automation rule:', err);
      throw err;
    }
  };

  // Load initial data when user is available
  useEffect(() => {
    if (user) {
      fetchTemplates();
      fetchAutomationRules();
    }
  }, [user]);

  return {
    templates,
    automationRules,
    loading,
    error,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    previewTemplate,
    getTemplateHistory,
    restoreTemplate,
    fetchAutomationRules,
    createAutomationRule,
    updateAutomationRule,
    deleteAutomationRule,
  };
}