import React, { useState } from 'react';
import { Settings as SettingsIcon, User, DollarSign, Mail, Bell, Users, Globe, Lock, Database, Menu, X } from 'lucide-react';
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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

  const currentTab = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-4 sm:py-6">
        <div className="flex items-center mb-6 sm:mb-8 px-4 sm:px-0">
          <SettingsIcon className="h-6 w-6 sm:h-8 sm:w-8 text-gray-900 mr-3" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Settings</h1>
        </div>

        <div className="bg-white rounded-lg shadow mx-4 sm:mx-0">
          {/* Mobile Header */}
          <div className="lg:hidden border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              {currentTab?.icon}
              <span className="ml-2">{currentTab?.name}</span>
            </h2>
            <div className="w-10" />
          </div>

          {/* Mobile Sidebar Backdrop */}
          {isMobileSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}

          <div className="lg:grid lg:grid-cols-12 min-h-[600px]">
            {/* Sidebar */}
            <div className={`${
              isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:col-span-3`}>
              <nav className="space-y-1 p-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMobileSidebarOpen(false);
                    }}
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
            <div className="lg:col-span-9 p-4 sm:p-6">{renderContent()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}