import React, { useState } from 'react';
import { Settings as SettingsIcon, User, DollarSign, Mail, Bell, Users, Globe, Lock, Database } from 'lucide-react';
import { ProfileSettings } from './ProfileSettings';
import { RateSettings } from './RateSettings';
import { TemplateSettings } from './TemplateSettings';
import { NotificationSettings } from './NotificationSettings';
import { TeamSettings } from './TeamSettings';
import { GeneralSettings } from './GeneralSettings';
import { SecuritySettings } from './SecuritySettings';
import { IntegrationSettings } from './IntegrationSettings';

type SettingsTab = 'profile' | 'rates' | 'templates' | 'notifications' | 'team' | 'general' | 'security' | 'integrations';

const tabs: { id: SettingsTab; name: string; icon: React.ReactNode }[] = [
  { id: 'profile', name: 'Profile & Account', icon: <User className="w-5 h-5" /> },
  { id: 'rates', name: 'Rate Management', icon: <DollarSign className="w-5 h-5" /> },
  { id: 'templates', name: 'Email Templates', icon: <Mail className="w-5 h-5" /> },
  { id: 'notifications', name: 'Notifications', icon: <Bell className="w-5 h-5" /> },
  { id: 'team', name: 'Team Management', icon: <Users className="w-5 h-5" /> },
  { id: 'general', name: 'General Settings', icon: <Globe className="w-5 h-5" /> },
  { id: 'security', name: 'Security', icon: <Lock className="w-5 h-5" /> },
  { id: 'integrations', name: 'Integrations', icon: <Database className="w-5 h-5" /> },
];

export function SettingsDashboard() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSettings />;
      case 'rates':
        return <RateSettings />;
      case 'templates':
        return <TemplateSettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'team':
        return <TeamSettings />;
      case 'general':
        return <GeneralSettings />;
      case 'security':
        return <SecuritySettings />;
      case 'integrations':
        return <IntegrationSettings />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6">
        <div className="flex items-center mb-8">
          <SettingsIcon className="h-8 w-8 text-gray-900 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="grid grid-cols-12 min-h-[600px]">
            {/* Sidebar */}
            <div className="col-span-3 border-r border-gray-200">
              <nav className="space-y-1 p-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'text-indigo-600 bg-indigo-50'
                        : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                    }`}
                  >
                    {tab.icon}
                    <span className="ml-3">{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="col-span-9 p-6">{renderContent()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}