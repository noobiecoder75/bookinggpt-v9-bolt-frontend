import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface LoginFormProps {
  onSwitchToSignup?: () => void;
}

export function LoginForm({ onSwitchToSignup }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { signIn, signInAsAdmin, error: authError, loading: authLoading } = useAuth();

  // 🔐 Console debugging for login form
  console.log('🔐 LoginForm state:', {
    email: email.substring(0, 10) + '...',
    hasPassword: !!password,
    isLoading: isLoading || authLoading,
    authError,
    localError,
    timestamp: new Date().toISOString()
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔐 Login form submitted', { email, timestamp: new Date().toISOString() });
    
    setIsLoading(true);
    setLocalError(null);

    try {
      await signIn(email, password);
      console.log('✅ Login successful from form', { timestamp: new Date().toISOString() });
    } catch (error: any) {
      console.error('🚨 Login failed from form:', error);
      setLocalError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    console.log('🔐 Admin login clicked', { timestamp: new Date().toISOString() });
    
    setIsLoading(true);
    setLocalError(null);

    try {
      await signInAsAdmin();
      console.log('✅ Admin login successful from form', { timestamp: new Date().toISOString() });
    } catch (error: any) {
      console.error('🚨 Admin login failed from form:', error);
      setLocalError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fillAdminCredentials = () => {
    console.log('🔧 Filling admin credentials', { timestamp: new Date().toISOString() });
    setEmail('admin@bookinggpt.ca');
    setPassword('admin123');
  };

  const isFormLoading = isLoading || authLoading;
  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to BookingGPT</h1>
          <p className="text-gray-600">Sign in to access your travel management dashboard</p>
        </div>

        <div className="bg-white shadow-xl rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your email"
                  required
                  disabled={isFormLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your password"
                  required
                  disabled={isFormLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 hover:text-gray-600"
                  disabled={isFormLoading}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {displayError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{displayError}</p>
              </div>
            )}

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isFormLoading}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFormLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              ) : (
                <LogIn className="h-5 w-5 mr-2" />
              )}
              {isFormLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Development Helper Buttons */}
          {import.meta.env.VITE_DEV_MODE === 'true' && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-3 text-center">Development Mode</p>
              <div className="space-y-2">
                <button
                  onClick={fillAdminCredentials}
                  className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
                  disabled={isFormLoading}
                >
                  Fill Admin Credentials
                </button>
                <button
                  onClick={handleAdminLogin}
                  disabled={isFormLoading}
                  className="w-full px-4 py-2 text-sm border border-indigo-300 rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50"
                >
                  Quick Admin Login
                </button>
              </div>
            </div>
          )}

          {/* Signup Link */}
          {onSwitchToSignup && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <button
                  onClick={onSwitchToSignup}
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                  disabled={isFormLoading}
                >
                  Sign up
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Debug Info in Development */}
        {import.meta.env.VITE_DEV_MODE === 'true' && (
          <div className="bg-gray-100 rounded-lg p-4 text-xs">
            <p className="font-medium text-gray-700 mb-2">Debug Info:</p>
            <p>Dev Mode: {import.meta.env.VITE_DEV_MODE}</p>
            <p>Form Loading: {isFormLoading.toString()}</p>
            <p>Has Error: {!!displayError}</p>
            <p>Timestamp: {new Date().toLocaleTimeString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}