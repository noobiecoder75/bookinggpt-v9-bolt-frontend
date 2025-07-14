import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  Loader2, 
  DollarSign,
  Shield,
  Clock,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentAccount {
  id: string;
  stripe_account_id: string;
  onboarding_completed: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  business_name?: string;
  country?: string;
  currency?: string;
  stripe_data?: any;
}

export function PaymentSetup() {
  const [account, setAccount] = useState<PaymentAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [businessInfo, setBusinessInfo] = useState({
    business_name: '',
    business_type: 'individual',
    website: ''
  });

  useEffect(() => {
    loadPaymentAccount();
  }, []);

  const loadPaymentAccount = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/stripe-connect/account', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAccount(data.account);
      } else if (response.status !== 404) {
        // 404 is expected if no account exists yet
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to load payment account');
      }
    } catch (error) {
      console.error('Error loading payment account:', error);
      toast.error('Failed to load payment account');
    } finally {
      setLoading(false);
    }
  };

  const createPaymentAccount = async () => {
    if (!businessInfo.business_name.trim()) {
      toast.error('Business name is required');
      return;
    }

    setCreating(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/stripe-connect/account/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ businessInfo })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Payment account created successfully!');
        await loadPaymentAccount();
        await startOnboarding();
      } else {
        toast.error(data.error || 'Failed to create payment account');
      }
    } catch (error) {
      console.error('Error creating payment account:', error);
      toast.error('Failed to create payment account');
    } finally {
      setCreating(false);
    }
  };

  const startOnboarding = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/stripe-connect/account/onboarding', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to Stripe onboarding
        window.open(data.onboarding_url, '_blank');
      } else {
        toast.error(data.error || 'Failed to start onboarding');
      }
    } catch (error) {
      console.error('Error starting onboarding:', error);
      toast.error('Failed to start onboarding');
    }
  };

  const openStripeAccount = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/stripe-connect/account/login', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        window.open(data.login_url, '_blank');
      } else {
        toast.error(data.error || 'Failed to open Stripe account');
      }
    } catch (error) {
      console.error('Error opening Stripe account:', error);
      toast.error('Failed to open Stripe account');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'restricted': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (enabled: boolean) => {
    return enabled ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <AlertCircle className="h-5 w-5 text-yellow-500" />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Setup</h2>
        <p className="text-gray-600">
          Set up your payment account to collect payments from customers and receive payouts.
        </p>
      </div>

      {!account ? (
        // No account exists - show creation form
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <CreditCard className="h-8 w-8 text-indigo-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Create Payment Account</h3>
              <p className="text-gray-600">Get started by creating your Stripe Connect account</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name *
              </label>
              <input
                type="text"
                value={businessInfo.business_name}
                onChange={(e) => setBusinessInfo({ ...businessInfo, business_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your business name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Type
              </label>
              <select
                value={businessInfo.business_type}
                onChange={(e) => setBusinessInfo({ ...businessInfo, business_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="individual">Individual</option>
                <option value="company">Company</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website (Optional)
              </label>
              <input
                type="url"
                value={businessInfo.website}
                onChange={(e) => setBusinessInfo({ ...businessInfo, website: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="https://your-website.com"
              />
            </div>
          </div>

          <button
            onClick={createPaymentAccount}
            disabled={creating}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating Account...
              </>
            ) : (
              'Create Payment Account'
            )}
          </button>
        </div>
      ) : (
        // Account exists - show status and management
        <div className="space-y-6">
          {/* Account Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <CreditCard className="h-6 w-6 text-indigo-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Payment Account Status</h3>
              </div>
              <button
                onClick={loadPaymentAccount}
                className="text-indigo-600 hover:text-indigo-700 flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                {getStatusIcon(account.charges_enabled)}
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Charges</p>
                  <p className="text-sm text-gray-600">
                    {account.charges_enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>

              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                {getStatusIcon(account.payouts_enabled)}
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Payouts</p>
                  <p className="text-sm text-gray-600">
                    {account.payouts_enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>

              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                {getStatusIcon(account.onboarding_completed)}
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Setup</p>
                  <p className="text-sm text-gray-600">
                    {account.onboarding_completed ? 'Complete' : 'Pending'}
                  </p>
                </div>
              </div>
            </div>

            {account.business_name && (
              <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
                <p className="text-sm text-indigo-900">
                  <strong>Business:</strong> {account.business_name}
                </p>
                {account.country && (
                  <p className="text-sm text-indigo-900">
                    <strong>Country:</strong> {account.country.toUpperCase()}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!account.onboarding_completed && (
              <button
                onClick={startOnboarding}
                className="bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 flex items-center justify-center"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Complete Setup
              </button>
            )}

            <button
              onClick={openStripeAccount}
              className="bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 flex items-center justify-center"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage Account
            </button>
          </div>

          {/* Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center mb-2">
                <DollarSign className="h-5 w-5 text-green-500 mr-2" />
                <h4 className="font-medium text-gray-900">Platform Fee</h4>
              </div>
              <p className="text-sm text-gray-600">
                BookingGPT charges a 2.5% platform fee on all transactions
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center mb-2">
                <Clock className="h-5 w-5 text-blue-500 mr-2" />
                <h4 className="font-medium text-gray-900">Payout Schedule</h4>
              </div>
              <p className="text-sm text-gray-600">
                Funds are transferred to your bank account within 2-7 business days
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center mb-2">
                <Shield className="h-5 w-5 text-purple-500 mr-2" />
                <h4 className="font-medium text-gray-900">Security</h4>
              </div>
              <p className="text-sm text-gray-600">
                All payments are processed securely through Stripe
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}