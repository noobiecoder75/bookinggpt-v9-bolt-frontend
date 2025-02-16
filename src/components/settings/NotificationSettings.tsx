import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Bell, Mail, MessageSquare } from 'lucide-react';

interface NotificationPreference {
  type: string;
  email: boolean;
  push: boolean;
  sms: boolean;
}

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([
    {
      type: 'New Quote Requests',
      email: true,
      push: true,
      sms: false,
    },
    {
      type: 'Booking Confirmations',
      email: true,
      push: true,
      sms: true,
    },
    {
      type: 'Payment Received',
      email: true,
      push: false,
      sms: false,
    },
    {
      type: 'Quote Expiring Soon',
      email: true,
      push: true,
      sms: false,
    },
    {
      type: 'Customer Messages',
      email: true,
      push: true,
      sms: false,
    },
  ]);

  const handleToggle = (index: number, channel: 'email' | 'push' | 'sms') => {
    const newPreferences = [...preferences];
    newPreferences[index][channel] = !newPreferences[index][channel];
    setPreferences(newPreferences);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-gray-900">Notification Preferences</h2>
        <button className="text-sm text-indigo-600 hover:text-indigo-900">
          Reset to Defaults
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="col-span-2">
              <h3 className="text-sm font-medium text-gray-500">Notification Type</h3>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center">
                <Mail className="w-5 h-5 text-gray-400 mr-2" />
                <span className="text-sm font-medium text-gray-500">Email</span>
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center">
                <Bell className="w-5 h-5 text-gray-400 mr-2" />
                <span className="text-sm font-medium text-gray-500">Push</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {preferences.map((pref, index) => (
              <div key={pref.type} className="grid grid-cols-4 gap-4 py-4 border-t border-gray-200">
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-900">{pref.type}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Receive notifications when {pref.type.toLowerCase()} occur
                  </p>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => handleToggle(index, 'email')}
                    className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                      pref.email ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                        pref.email ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => handleToggle(index, 'push')}
                    className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                      pref.push ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                        pref.push ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quiet Hours</h3>
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Time</label>
                <input
                  type="time"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  defaultValue="22:00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Time</label>
                <input
                  type="time"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  defaultValue="07:00"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}