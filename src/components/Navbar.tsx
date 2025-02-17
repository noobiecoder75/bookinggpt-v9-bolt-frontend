import React, { useState } from 'react';
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
  Menu,
  X,
} from 'lucide-react';

export function Navbar() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex md:hidden items-center px-4 z-30">
        <button
          onClick={toggleMenu}
          className="text-gray-500 hover:text-gray-600 focus:outline-none focus:text-gray-600"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        <div className="ml-4 flex items-center">
          <Calendar className="h-8 w-8 text-indigo-600" />
          <span className="ml-2 text-xl font-bold text-gray-900">BookingGPT</span>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-20 md:hidden"
          onClick={toggleMenu}
        ></div>
      )}

      {/* Sidebar */}
      <nav className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 shadow-lg transform ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 transition-transform duration-300 ease-in-out z-30`}>
        <div className="flex flex-col h-full">
          {/* Logo - hidden on mobile as it's shown in the top bar */}
          <div className="hidden md:flex items-center h-16 px-6 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-indigo-800">
            <Calendar className="h-8 w-8 text-white" />
            <span className="ml-2 text-xl font-bold text-white">BookingGPT</span>
          </div>
          
          {/* Navigation Links */}
          <div className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            <NavLink to="/" icon={<Home className="w-5 h-5" />} onClick={() => setIsOpen(false)}>
              Dashboard
            </NavLink>
            <NavLink to="/quotes" icon={<FileText className="w-5 h-5" />} onClick={() => setIsOpen(false)}>
              Quotes
            </NavLink>
            <NavLink to="/quotes/new" icon={<PlusCircle className="w-5 h-5" />} onClick={() => setIsOpen(false)}>
              New Quote
            </NavLink>
            <NavLink to="/bookings" icon={<Calendar className="w-5 h-5" />} onClick={() => setIsOpen(false)}>
              Bookings
            </NavLink>
            <NavLink to="/customers" icon={<Users className="w-5 h-5" />} onClick={() => setIsOpen(false)}>
              Customers
            </NavLink>
            <NavLink to="/analytics" icon={<PieChart className="w-5 h-5" />} onClick={() => setIsOpen(false)}>
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
                onClick={() => {
                  navigate('/settings');
                  setIsOpen(false);
                }} 
                className="p-2 rounded-full text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                <Settings className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Add top padding to main content on mobile */}
      <div className="h-16 md:h-0"></div>
    </>
  );
}

interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}

function NavLink({ to, icon, children, onClick }: NavLinkProps) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
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