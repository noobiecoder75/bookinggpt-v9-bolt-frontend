import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import {
  Home,
  FileText,
  Calendar,
  Users,
  Settings,
  Mail,
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
  const { user, signOut } = useAuthContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsUserMenuOpen(false);
      // Redirect to main screen after successful sign out
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 border-b border-blue-800/50 shadow-xl backdrop-blur-lg z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left Side - Logo and Brand */}
            <div className="flex items-center flex-shrink-0">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 shadow-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <span className="ml-3 text-xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">BookingGPT</span>
            </div>

            {/* Center - Desktop Navigation Links */}
            <div className="hidden lg:flex items-center justify-center flex-1 max-w-2xl mx-8">
              <div className="flex items-center space-x-1 bg-white/10 backdrop-blur-sm rounded-2xl p-2 border border-white/20">
                <NavLink to="/" icon={<Home className="w-4 h-4" />}>
                  Dashboard
                </NavLink>
                <NavLink to="/customers" icon={<Users className="w-4 h-4" />}>
                  Customers
                </NavLink>
                <NavLink to="/quotes" icon={<FileText className="w-4 h-4" />}>
                  Quotes
                </NavLink>
                <NavLink to="/bookings" icon={<Calendar className="w-4 h-4" />}>
                  Bookings
                </NavLink>
                <NavLink to="/communications" icon={<Mail className="w-4 h-4" />}>
                  Communications
                </NavLink>
                <NavLink to="/settings" icon={<Settings className="w-4 h-4" />}>
                  Settings
                </NavLink>
              </div>
            </div>

            {/* Right Side - Create Quote, Notifications and User Menu */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              {/* Prominent Create Quote Button */}
              <button
                onClick={onCreateTrip}
                className="flex items-center px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 text-slate-900 bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 hover:from-cyan-300 hover:via-blue-300 hover:to-indigo-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 hover:scale-105"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                New Quote
              </button>
              
              {/* Notifications */}
              <button className="relative p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 backdrop-blur-sm">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-gradient-to-r from-red-400 to-pink-400 ring-2 ring-white/20 shadow-lg"></span>
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={toggleUserMenu}
                  className="flex items-center space-x-3 p-2 text-white hover:bg-white/10 rounded-xl transition-all duration-200 backdrop-blur-sm"
                >
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-white">{user?.email || 'User'}</p>
                    <p className="text-xs text-white/70">Travel Agent</p>
                  </div>
                  <img
                    className="h-8 w-8 rounded-full ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900 shadow-lg"
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                    alt="User avatar"
                  />
                  <ChevronDown className="w-4 h-4 text-white/70" />
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-white/20 py-1 z-50">
                    <button
                      onClick={() => {
                        navigate('/settings/profile');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
                    >
                      <p className="text-sm font-medium text-gray-900">{user?.email || 'User'}</p>
                      <p className="text-xs text-gray-500">{user?.email || 'user@bookinggpt.com'}</p>
                    </button>
                    <hr className="my-1" />
                    <button 
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                onClick={toggleMobileMenu}
                className="lg:hidden p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 backdrop-blur-sm"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-white/20 bg-gradient-to-b from-slate-900 to-blue-900 backdrop-blur-lg">
            <div className="px-4 pt-4 pb-3 space-y-2">
              {/* Prominent Mobile Create Quote Button */}
              <button
                onClick={() => {
                  onCreateTrip?.();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center px-4 py-3 text-base font-bold rounded-xl transition-all duration-200 text-slate-900 bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 hover:from-cyan-300 hover:via-blue-300 hover:to-indigo-300 shadow-lg mb-3 w-full transform hover:scale-105"
              >
                <PlusCircle className="w-6 h-6 mr-3" />
                New Quote
              </button>
              
              <MobileNavLink to="/" icon={<Home className="w-5 h-5" />} onClick={() => setIsMobileMenuOpen(false)}>
                Dashboard
              </MobileNavLink>
              <MobileNavLink to="/customers" icon={<Users className="w-5 h-5" />} onClick={() => setIsMobileMenuOpen(false)}>
                Customers
              </MobileNavLink>
              <MobileNavLink to="/quotes" icon={<FileText className="w-5 h-5" />} onClick={() => setIsMobileMenuOpen(false)}>
                Quotes
              </MobileNavLink>
              <MobileNavLink to="/bookings" icon={<Calendar className="w-5 h-5" />} onClick={() => setIsMobileMenuOpen(false)}>
                Bookings
              </MobileNavLink>
              <MobileNavLink to="/communications" icon={<Mail className="w-5 h-5" />} onClick={() => setIsMobileMenuOpen(false)}>
                Communications
              </MobileNavLink>
              <MobileNavLink to="/settings" icon={<Settings className="w-5 h-5" />} onClick={() => setIsMobileMenuOpen(false)}>
                Settings
              </MobileNavLink>
            </div>
            
            {/* Mobile User Info */}
            <div className="border-t border-white/20 pt-4 pb-3">
              <button
                onClick={() => {
                  navigate('/settings/profile');
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center px-4 w-full hover:bg-white/10 transition-colors text-left rounded-xl mx-2"
              >
                <img
                  className="h-10 w-10 rounded-full ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900 shadow-lg"
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  alt="User avatar"
                />
                <div className="ml-3">
                  <div className="text-base font-medium text-white">{user?.email || 'User'}</div>
                  <div className="text-sm text-white/70">Travel Agent</div>
                  <div className="text-sm text-white/70">{user?.email || 'user@bookinggpt.com'}</div>
                </div>
              </button>
              <div className="mt-3 px-2 space-y-1">
                <button 
                  onClick={handleSignOut}
                  className="flex items-center w-full px-3 py-2 text-base font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
                >
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
      className={`flex items-center px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
        isActive
          ? 'text-white bg-white/20 backdrop-blur-sm shadow-lg'
          : 'text-white/70 hover:text-white hover:bg-white/10'
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
      className={`flex items-center px-3 py-2 text-base font-medium rounded-xl transition-all duration-200 ${
        isActive
          ? 'text-white bg-white/20 backdrop-blur-sm shadow-lg'
          : 'text-white/70 hover:text-white hover:bg-white/10'
      }`}
    >
      {icon}
      <span className="ml-3">{children}</span>
    </Link>
  );
}