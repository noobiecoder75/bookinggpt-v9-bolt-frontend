import React, { useState } from 'react';
import { Settings as SettingsIcon, User, DollarSign, Mail, Database, Menu, X } from 'lucide-react';
import { ProfileSettings } from './ProfileSettings';
import { RateSettings } from './RateSettings';
import { TemplateSettings } from './TemplateSettings';
import { NotificationSettings } from './NotificationSettings';
import { TeamSettings } from './TeamSettings';
import { GeneralSettings } from './GeneralSettings';
import { SecuritySettings } from './SecuritySettings';
import { IntegrationSettings } from './IntegrationSettings';

type SettingsTab = 'general' | 'business' | 'communication' | 'integrations';

const tabs: { id: SettingsTab; name: string; icon: React.ReactNode; description: string }[] = [
  { 
    id: 'general', 
    name: 'General', 
    icon: <User className="w-5 h-5" />, 
    description: 'Profile, account settings, and security'
  },
  { 
    id: 'business', 
    name: 'Business', 
    icon: <DollarSign className="w-5 h-5" />, 
    description: 'Rate management and team settings'
  },
  { 
    id: 'communication', 
    name: 'Communication', 
    icon: <Mail className="w-5 h-5" />, 
    description: 'Email templates and notifications'
  },
  { 
    id: 'integrations', 
    name: 'Integrations', 
    icon: <Database className="w-5 h-5" />, 
    description: 'Third-party services and APIs'
  },
];

export function SettingsDashboard() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent mb-6">General Settings</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">Profile & Account</h3>
                  <ProfileSettings />
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">System Settings</h3>
                  <GeneralSettings />
                </div>
              </div>
              <div className="mt-8">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">Security</h3>
                  <SecuritySettings />
                </div>
              </div>
            </div>
          </div>
        );
      case 'business':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent mb-6">Business Settings</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">Rate Management</h3>
                  <RateSettings />
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">Team Management</h3>
                  <TeamSettings />
                </div>
              </div>
            </div>
          </div>
        );
      case 'communication':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent mb-6">Communication Settings</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">Email Templates</h3>
                  <TemplateSettings />
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">Notifications</h3>
                  <NotificationSettings />
                </div>
              </div>
            </div>
          </div>
        );
      case 'integrations':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent mb-6">Integration Settings</h2>
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                <IntegrationSettings />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const currentTab = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-sky-100">
      <div className="max-w-7xl mx-auto py-4 sm:py-6">
        <div className="flex items-center mb-6 sm:mb-8 px-4 sm:px-0">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 shadow-lg mr-3">
            <SettingsIcon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 bg-clip-text text-transparent">Settings</h1>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 mx-4 sm:mx-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-cyan-500/3 to-indigo-500/5 rounded-3xl"></div>
          <div className="relative z-10">
          {/* Mobile Header */}
          <div className="lg:hidden border-b border-white/20 px-4 py-3 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white/20 transition-all duration-200"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center">
              {currentTab?.icon}
              <span className="ml-2">{currentTab?.name}</span>
            </h2>
            <div className="w-10" />
          </div>

          {/* Mobile Sidebar Backdrop */}
          {isMobileSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}

          <div className="lg:grid lg:grid-cols-12 min-h-[600px]">
            {/* Sidebar */}
            <div className={`${
              isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } fixed inset-y-0 left-0 z-50 w-80 bg-white/95 backdrop-blur-md border-r border-white/20 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:col-span-3`}>
              <nav className="space-y-3 p-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-start p-4 text-left rounded-2xl transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'text-blue-600 bg-blue-50/80 backdrop-blur-sm border-2 border-blue-200 shadow-lg'
                        : 'text-slate-600 hover:text-blue-600 hover:bg-white/50 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {tab.icon}
                    </div>
                    <div className="ml-3">
                      <div className="font-medium text-sm">{tab.name}</div>
                      <div className="text-xs text-slate-500 mt-1">{tab.description}</div>
                    </div>
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="lg:col-span-9 p-6 sm:p-8">{renderContent()}</div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}