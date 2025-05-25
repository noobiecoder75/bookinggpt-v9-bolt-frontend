import React from 'react';
import { 
  Eye, 
  MapPin, 
  CheckSquare, 
  DollarSign, 
  Shield, 
  Receipt, 
  File, 
  Mail, 
  FileText, 
  StickyNote, 
  Zap, 
  Activity 
} from 'lucide-react';

interface SidebarSection {
  title: string;
  items: {
    id: string;
    label: string;
    icon: React.ReactNode;
  }[];
}

interface TripSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function TripSidebar({ activeSection, onSectionChange }: TripSidebarProps) {
  const sidebarSections: SidebarSection[] = [
    {
      title: 'General',
      items: [
        { id: 'overview', label: 'Overview', icon: <Eye className="h-4 w-4" /> },
        { id: 'itinerary', label: 'Itinerary', icon: <MapPin className="h-4 w-4" /> },
        { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="h-4 w-4" /> }
      ]
    },
    {
      title: 'Finances',
      items: [
        { id: 'pricing', label: 'Pricing', icon: <DollarSign className="h-4 w-4" /> },
        { id: 'authorization', label: 'Authorization', icon: <Shield className="h-4 w-4" /> },
        { id: 'insurance', label: 'Insurance', icon: <Shield className="h-4 w-4" /> },
        { id: 'service-fees', label: 'Service Fees', icon: <Receipt className="h-4 w-4" /> }
      ]
    },
    {
      title: 'More',
      items: [
        { id: 'documents', label: 'Documents', icon: <File className="h-4 w-4" /> },
        { id: 'emails', label: 'Emails', icon: <Mail className="h-4 w-4" /> },
        { id: 'forms', label: 'Forms', icon: <FileText className="h-4 w-4" /> },
        { id: 'notes', label: 'Notes', icon: <StickyNote className="h-4 w-4" /> },
        { id: 'automations', label: 'Automations', icon: <Zap className="h-4 w-4" /> },
        { id: 'activity', label: 'Activity', icon: <Activity className="h-4 w-4" /> }
      ]
    }
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Trip Management</h2>
      </div>
      
      <nav className="flex-1 p-4 space-y-6">
        {sidebarSections.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => onSectionChange(item.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                      activeSection === item.id
                        ? 'bg-indigo-100 text-indigo-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.icon}
                    <span className="ml-3">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
} 