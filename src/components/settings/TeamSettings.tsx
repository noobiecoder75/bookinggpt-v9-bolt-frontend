import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { UserPlus, Mail, Shield } from 'lucide-react';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: 'active' | 'pending' | 'inactive';
}

export function TeamSettings() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  async function fetchTeamMembers() {
    const { data } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        roles (
          name
        )
      `);
    
    if (data) {
      setMembers(
        data.map((user: any) => ({
          ...user,
          role: user.roles?.name || 'agent',
          status: 'active',
        }))
      );
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900">Team Management</h2>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Invite Team Member
        </button>
      </div>

      {/* Team Members List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <ul className="divide-y divide-gray-200">
          {members.map((member) => (
            <li key={member.id} className="px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-lg font-medium text-indigo-600">
                        {member.first_name?.[0] || '?'}
                        {member.last_name?.[0] || '?'}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {member.first_name || 'Unknown'} {member.last_name || 'Member'}
                    </h3>
                    <div className="flex items-center mt-1">
                      <Mail className="h-4 w-4 text-gray-400 mr-2" />
                      <p className="text-sm text-gray-600">{member.email || 'No email'}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-gray-400 mr-2" />
                  <p className="text-sm text-gray-600">{member.role}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Invite Modal (Placeholder) */}
      {showInviteModal && (
        <div className="mt-6 p-4 bg-white shadow rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Invite Team Member</h3>
          {/* Modal content would go here */}
          <p className="text-sm text-gray-600">Modal content goes here.</p>
          <button
            onClick={() => setShowInviteModal(false)}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}