import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, User, Building2, Phone, UserPlus, Check, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { GoogleSignInButton } from './GoogleSignInButton';
import { SignupFormData } from '../../types/auth';

interface SignupFormProps {
  onSwitchToLogin?: () => void;
}

interface PasswordStrength {
  score: number;
  feedback: string[];
  isValid: boolean;
}

export function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    company: '',
    phone: '',
    role: 'admin', // Default to admin
    inviteToken: ''
  });
  
  const [inviteInfo, setInviteInfo] = useState<{
    email: string;
    role: 'admin' | 'regular';
    invitedBy: string;
  } | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const { signUp, error: authError, loading: authLoading } = useAuth();

  // Check for invite token in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('invite');
    
    if (token) {
      setFormData(prev => ({ ...prev, inviteToken: token }));
      // Validate invite token (in a real app, this would be an API call)
      // For now, we'll just set some mock data
      setInviteInfo({
        email: 'invited@example.com',
        role: 'regular',
        invitedBy: 'Admin User'
      });
    }
  }, []);

  const validatePassword = (password: string): PasswordStrength => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('At least 8 characters');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('One uppercase letter');
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('One lowercase letter');
    }

    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('One number');
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
    } else {
      feedback.push('One special character');
    }

    return {
      score,
      feedback,
      isValid: score >= 4
    };
  };

  const handleInputChange = (field: keyof SignupFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLocalError(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    const passwordStrength = validatePassword(formData.password);
    if (!passwordStrength.isValid) {
      setLocalError('Password does not meet requirements');
      setIsLoading(false);
      return;
    }

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setLocalError('First name and last name are required');
      setIsLoading(false);
      return;
    }

    try {
      // Determine final role - invite token overrides default selection
      const finalRole = inviteInfo ? inviteInfo.role : formData.role;
      
      // Include additional profile data in user metadata
      const metadata = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        company: formData.company,
        phone: formData.phone,
        role: finalRole,
        full_name: `${formData.firstName} ${formData.lastName}`.trim(),
        invite_token: formData.inviteToken || null
      };

      await signUp(formData.email, formData.password, metadata);
      
    } catch (error: any) {
      setLocalError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = validatePassword(formData.password);
  const isFormLoading = isLoading || authLoading;
  const displayError = localError || authError;

  const getPasswordStrengthColor = (score: number) => {
    if (score <= 1) return 'bg-red-500';
    if (score <= 2) return 'bg-orange-500';
    if (score <= 3) return 'bg-yellow-500';
    if (score <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = (score: number) => {
    if (score <= 1) return 'Very Weak';
    if (score <= 2) return 'Weak';
    if (score <= 3) return 'Fair';
    if (score <= 4) return 'Good';
    return 'Strong';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Account</h1>
          <p className="text-gray-600">Join BookingGPT to manage your travel needs</p>
        </div>

        <div className="bg-white shadow-xl rounded-2xl p-8">
          {/* Google Sign In Button */}
          <div className="mb-6">
            <GoogleSignInButton disabled={isFormLoading} />
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or sign up with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="John"
                    required
                    disabled={isFormLoading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Doe"
                    required
                    disabled={isFormLoading}
                  />
                </div>
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="john@company.com"
                  required
                  disabled={isFormLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Create a strong password"
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
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength.score)}`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium text-gray-600">
                      {getPasswordStrengthText(passwordStrength.score)}
                    </span>
                  </div>
                  
                  {passwordStrength.feedback.length > 0 && (
                    <div className="text-xs text-gray-600">
                      <p className="mb-1">Password needs:</p>
                      <ul className="space-y-1">
                        {passwordStrength.feedback.map((item, index) => (
                          <li key={index} className="flex items-center">
                            <X className="h-3 w-3 text-red-500 mr-1" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={`block w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    touched.confirmPassword && formData.confirmPassword && formData.password !== formData.confirmPassword
                      ? 'border-red-300'
                      : 'border-gray-300'
                  }`}
                  placeholder="Confirm your password"
                  required
                  disabled={isFormLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 hover:text-gray-600"
                  disabled={isFormLoading}
                >
                  {showConfirmPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
              
              {touched.confirmPassword && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <X className="h-4 w-4 mr-1" />
                  Passwords do not match
                </p>
              )}
              
              {touched.confirmPassword && formData.confirmPassword && formData.password === formData.confirmPassword && (
                <p className="mt-1 text-sm text-green-600 flex items-center">
                  <Check className="h-4 w-4 mr-1" />
                  Passwords match
                </p>
              )}
            </div>

            {/* Optional Fields */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                  Company/Organization
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="company"
                    type="text"
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Your Company"
                    disabled={isFormLoading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="+1 (555) 123-4567"
                    disabled={isFormLoading}
                  />
                </div>
              </div>
            </div>

            {/* Invite Info Display */}
            {inviteInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">You've been invited!</h3>
                <p className="text-sm text-blue-700">
                  {inviteInfo.invitedBy} has invited you to join as a {inviteInfo.role === 'admin' ? 'Administrator' : 'Team Member'}.
                </p>
              </div>
            )}

            {/* User Role - only show if not invited */}
            {!inviteInfo && (
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                  Account Type
                </label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value as 'admin' | 'regular')}
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={isFormLoading}
                >
                  <option value="admin">Administrator</option>
                  <option value="regular">Team Member</option>
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Administrators have full access to all features and settings.
                </p>
              </div>
            )}

            {/* Error Message */}
            {displayError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{displayError}</p>
              </div>
            )}

            {/* Sign Up Button */}
            <button
              type="submit"
              disabled={isFormLoading || !passwordStrength.isValid || formData.password !== formData.confirmPassword}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFormLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              ) : (
                <UserPlus className="h-5 w-5 mr-2" />
              )}
              {isFormLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Login Link */}
          {onSwitchToLogin && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  onClick={onSwitchToLogin}
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                  disabled={isFormLoading}
                >
                  Sign in
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}