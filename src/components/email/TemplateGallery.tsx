import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Copy, 
  Trash2, 
  MoreVertical,
  Mail,
  Calendar,
  DollarSign,
  Heart,
  Star
} from 'lucide-react';

interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  subject: string;
  body_html: string;
  body_text?: string;
  variables: string[];
  category: string;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

interface TemplateGalleryProps {
  templates: EmailTemplate[];
  onCreateTemplate: () => void;
  onEditTemplate: (template: EmailTemplate) => void;
  onDuplicateTemplate: (template: EmailTemplate) => void;
  onDeleteTemplate: (template: EmailTemplate) => void;
  onPreviewTemplate: (template: EmailTemplate) => void;
  loading?: boolean;
}

const CATEGORY_ICONS = {
  welcome: Mail,
  quote: Star,
  booking: Calendar,
  payment: DollarSign,
  'follow-up': Heart,
  custom: MoreVertical
};

const CATEGORY_COLORS = {
  welcome: 'bg-blue-100 text-blue-800',
  quote: 'bg-yellow-100 text-yellow-800',
  booking: 'bg-green-100 text-green-800',
  payment: 'bg-purple-100 text-purple-800',
  'follow-up': 'bg-pink-100 text-pink-800',
  custom: 'bg-gray-100 text-gray-800'
};

export default function TemplateGallery({
  templates,
  onCreateTemplate,
  onEditTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
  onPreviewTemplate,
  loading = false
}: TemplateGalleryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const categories = ['all', ...new Set(templates.map(t => t.category))];
  
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && template.is_active) ||
                         (statusFilter === 'inactive' && !template.is_active);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getPreviewText = (html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    return text.slice(0, 120) + (text.length > 120 ? '...' : '');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-gray-600 mt-1">
            Manage your email templates and automation
          </p>
        </div>
        <button
          onClick={onCreateTemplate}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Template Grid/List */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || selectedCategory !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first email template'
            }
          </p>
          <button
            onClick={onCreateTemplate}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Template
          </button>
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
        }>
          {filteredTemplates.map((template) => {
            const IconComponent = CATEGORY_ICONS[template.category] || MoreVertical;
            const categoryColor = CATEGORY_COLORS[template.category] || 'bg-gray-100 text-gray-800';
            
            return viewMode === 'grid' ? (
              // Card View
              <div
                key={template.id}
                className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg ${categoryColor} mr-3`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 truncate">
                          {template.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {!template.is_active && (
                        <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                          Inactive
                        </span>
                      )}
                      <div className="relative group">
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <MoreVertical className="h-4 w-4 text-gray-400" />
                        </button>
                        <div className="absolute right-0 top-8 w-48 bg-white border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                          <button
                            onClick={() => onPreviewTemplate(template)}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </button>
                          <button
                            onClick={() => onEditTemplate(template)}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </button>
                          <button
                            onClick={() => onDuplicateTemplate(template)}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </button>
                          <button
                            onClick={() => onDeleteTemplate(template)}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-900 truncate mb-1">
                      {template.subject}
                    </p>
                    <p className="text-xs text-gray-600 line-clamp-3">
                      {getPreviewText(template.body_html)}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Updated {formatDate(template.updated_at)}</span>
                    <span>v{template.version}</span>
                  </div>
                </div>
              </div>
            ) : (
              // List View
              <div
                key={template.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <div className={`p-2 rounded-lg ${categoryColor} mr-4`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <h3 className="font-medium text-gray-900 mr-2">
                          {template.name}
                        </h3>
                        {!template.is_active && (
                          <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 mb-1">{template.subject}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <span className="mr-4">{template.category.charAt(0).toUpperCase() + template.category.slice(1)}</span>
                        <span className="mr-4">Updated {formatDate(template.updated_at)}</span>
                        <span>v{template.version}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => onPreviewTemplate(template)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEditTemplate(template)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDuplicateTemplate(template)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDeleteTemplate(template)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}