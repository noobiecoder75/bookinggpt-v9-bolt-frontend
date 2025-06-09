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
  ChevronDown,
} from 'lucide-react';

interface NavbarProps {
  isVisible?: boolean;
  onToggleSidebar?: () => void;
  onCreateTrip?: () => void;
}

export function Navbar({ onCreateTrip }: NavbarProps) {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left Side - Logo and Brand */}
            <div className="flex items-center flex-shrink-0">
              <Calendar className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">BookingGPT</span>
            </div>

            {/* Center - Desktop Navigation Links */}
            <div className="hidden lg:flex items-center justify-center flex-1 max-w-3xl mx-8">
              <div className="flex items-center space-x-1">
                <NavLink to="/" icon={<Home className="w-4 h-4" />}>
                  Dashboard
                </NavLink>
                <NavLink to="/customers" icon={<Users className="w-4 h-4" />}>
                  Customers
                </NavLink>
                <NavLink to="/quotes" icon={<FileText className="w-4 h-4" />}>
                  Quotes
                </NavLink>
                {/* Highlighted Create Quote Button */}
                <button
                  onClick={onCreateTrip}
                  className="flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 mx-2"
                >
                  <PlusCircle className="w-5 h-5 mr-2" />
                  Quote
                </button>
                <NavLink to="/bookings" icon={<Calendar className="w-4 h-4" />}>
                  Bookings
                </NavLink>
                <NavLink to="/operations" icon={<Settings className="w-4 h-4" />}>
                  Operations
                </NavLink>
                <NavLink to="/analytics" icon={<PieChart className="w-4 h-4" />}>
                  Analytics
                </NavLink>
                <NavLink to="/settings" icon={<Settings className="w-4 h-4" />}>
                  Settings
                </NavLink>
              </div>
            </div>

            {/* Right Side - Notifications and User Menu */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              {/* Notifications */}
              <button className="relative p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={toggleUserMenu}
                  className="flex items-center space-x-3 p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900">Sarah Johnson</p>
                    <p className="text-xs text-gray-500">Travel Agent</p>
                  </div>
                  <img
                    className="h-8 w-8 rounded-full ring-2 ring-indigo-600 ring-offset-2"
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                    alt="User avatar"
                  />
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button
                      onClick={() => {
                        navigate('/settings/profile');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
                    >
                      <p className="text-sm font-medium text-gray-900">Sarah Johnson</p>
                      <p className="text-xs text-gray-500">sarah@bookinggpt.com</p>
                    </button>
                    <hr className="my-1" />
                    <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Sign out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                onClick={toggleMobileMenu}
                className="lg:hidden p-2 text-gray-500 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="px-4 pt-4 pb-3 space-y-2">
              <MobileNavLink to="/" icon={<Home className="w-5 h-5" />} onClick={() => setIsMobileMenuOpen(false)}>
                Dashboard
              </MobileNavLink>
              <MobileNavLink to="/customers" icon={<Users className="w-5 h-5" />} onClick={() => setIsMobileMenuOpen(false)}>
                Customers
              </MobileNavLink>
              <MobileNavLink to="/quotes" icon={<FileText className="w-5 h-5" />} onClick={() => setIsMobileMenuOpen(false)}>
                Quotes
              </MobileNavLink>
              
              {/* Highlighted Mobile Create Quote Button */}
              <button
                onClick={() => {
                  onCreateTrip?.();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center px-4 py-3 text-base font-semibold rounded-lg transition-all duration-200 text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-lg my-2 w-full"
              >
                <PlusCircle className="w-6 h-6 mr-3" />
                Quote
              </button>
              
              <MobileNavLink to="/bookings" icon={<Calendar className="w-5 h-5" />} onClick={() => setIsMobileMenuOpen(false)}>
                Bookings
              </MobileNavLink>
              <MobileNavLink to="/operations" icon={<Settings className="w-5 h-5" />} onClick={() => setIsMobileMenuOpen(false)}>
                Operations
              </MobileNavLink>
              <MobileNavLink to="/analytics" icon={<PieChart className="w-5 h-5" />} onClick={() => setIsMobileMenuOpen(false)}>
                Analytics
              </MobileNavLink>
              <MobileNavLink to="/settings" icon={<Settings className="w-5 h-5" />} onClick={() => setIsMobileMenuOpen(false)}>
                Settings
              </MobileNavLink>
            </div>
            
            {/* Mobile User Info */}
            <div className="border-t border-gray-200 pt-4 pb-3">
              <button
                onClick={() => {
                  navigate('/settings/profile');
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center px-4 w-full hover:bg-gray-50 transition-colors text-left"
              >
                <img
                  className="h-10 w-10 rounded-full ring-2 ring-indigo-600 ring-offset-2"
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  alt="User avatar"
                />
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">Sarah Johnson</div>
                  <div className="text-sm text-gray-500">Travel Agent</div>
                  <div className="text-sm text-gray-500">sarah@bookinggpt.com</div>
                </div>
              </button>
              <div className="mt-3 px-2 space-y-1">
                <button className="flex items-center w-full px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Backdrop for user menu */}
      {isUserMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsUserMenuOpen(false)}
        ></div>
      )}

      {/* Top padding for main content */}
      <div className="h-16"></div>
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
      className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
        isActive
          ? 'text-indigo-600 bg-indigo-50'
          : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-100'
      }`}
    >
      {icon}
      <span className="ml-2">{children}</span>
    </Link>
  );
}

function MobileNavLink({ to, icon, children, onClick }: NavLinkProps) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center px-3 py-2 text-base font-medium rounded-lg transition-all duration-200 ${
        isActive
          ? 'text-indigo-600 bg-indigo-50'
          : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-100'
      }`}
    >
      {icon}
      <span className="ml-3">{children}</span>
    </Link>
  );
}