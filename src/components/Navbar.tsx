import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  FileText,
  Calendar,
  Users,
  PieChart,
  Settings,
  Bell,
  PlusCircle,
} from 'lucide-react';

export function Navbar() {
  const navigate = useNavigate();

  return (
    <nav className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 shadow-lg">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center h-16 px-6 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-indigo-800">
          <Calendar className="h-8 w-8 text-white" />
          <span className="ml-2 text-xl font-bold text-white">BookingGPT</span>
        </div>
        
        {/* Navigation Links */}
        <div className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <NavLink to="/" icon={<Home className="w-5 h-5" />}>
            Dashboard
          </NavLink>
          <NavLink to="/quotes" icon={<FileText className="w-5 h-5" />}>
            Quotes
          </NavLink>
          <NavLink to="/quotes/new" icon={<PlusCircle className="w-5 h-5" />}>
            New Quote
          </NavLink>
          <NavLink to="/bookings" icon={<Calendar className="w-5 h-5" />}>
            Bookings
          </NavLink>
          <NavLink to="/customers" icon={<Users className="w-5 h-5" />}>
            Customers
          </NavLink>
          <NavLink to="/analytics" icon={<PieChart className="w-5 h-5" />}>
            Analytics
          </NavLink>
        </div>
        
        {/* Bottom Section */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            <img
              className="h-8 w-8 rounded-full ring-2 ring-indigo-600 ring-offset-2"
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
              alt="User avatar"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Sarah Johnson</p>
              <p className="text-xs text-gray-500 truncate">Travel Agent</p>
            </div>
          </div>
          <div className="mt-4 flex justify-between">
            <button className="p-2 rounded-full text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors relative">
              <Bell className="w-6 h-6" />
              <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
            </button>
            <button 
              onClick={() => navigate('/settings')} 
              className="p-2 rounded-full text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
        isActive
          ? 'text-indigo-600 bg-indigo-50 shadow-sm'
          : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600 hover:translate-x-1'
      }`}
    >
      {icon}
      <span className="ml-2">{children}</span>
    </Link>
  );
}