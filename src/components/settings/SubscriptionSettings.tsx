import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  TrendingUp, 
  Calendar, 
  BarChart3, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle,
  Crown,
  Loader2,
  ArrowUp,
  DollarSign,
  Clock,
  Activity
} from 'lucide-react';
import { useAdminAccess } from '../../hooks/useAdminAccess';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Subscription {
  id: string;
  tier: 'basic' | 'professional' | 'enterprise';
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  current_period_start: string;
  current_period_end: string;
  trial_end?: string;
  cancel_at_period_end: boolean;
}

interface Usage {
  quotes_used: number;
  quotes_limit: number;
  period_start: string;
  period_end: string;
}

const tierDetails = {
  basic: {
    name: 'Basic',
    price: 99,
    description: 'Perfect for individual agents',
    features: [
      'Up to 100 quotes per month',
      'Basic customer management',
      'AI-powered quote generation',
      'Email support',
      'Standard reporting'
    ],
    color: 'blue'
  },
  professional: {
    name: 'Professional',
    price: 299,
    description: 'Great for small agencies',
    features: [
      'Up to 500 quotes per month',
      'Advanced customer management',
      'Team collaboration tools',
      'Priority support',
      'Advanced analytics',
      'Custom branding'
    ],
    color: 'purple'
  },
  enterprise: {
    name: 'Enterprise',
    price: 999,
    description: 'For large agencies',
    features: [
      'Unlimited quotes',
      'Full team management',
      'Custom integrations',
      'Dedicated account manager',
      'White-label options',
      'SLA guarantees'
    ],
    color: 'gold'
  }
};

export function SubscriptionSettings() {
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      fetchSubscriptionData();
    }
  }, [adminLoading, isAdmin]);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      
      // Get current session from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No active session found');
      }

      const token = session.access_token;

      // Fetch current subscription
      const subResponse = await fetch('http://localhost:3001/api/subscriptions/current', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (subResponse.ok) {
        const subData = await subResponse.json();
        setSubscription(subData.subscription);
      } else if (subResponse.status !== 404) {
        throw new Error('Failed to fetch subscription');
      }

      // Fetch usage data
      const usageResponse = await fetch('http://localhost:3001/api/subscriptions/usage', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        setUsage(usageData.usage);
      }

    } catch (err) {
      console.error('Error fetching subscription data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleBillingPortal = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No active session found');
      }

      const token = session.access_token;
      const response = await fetch('http://localhost:3001/api/subscriptions/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          returnUrl: window.location.href
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create billing portal session');
      }

      // Redirect to Stripe billing portal
      window.open(data.url, '_blank');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open billing portal');
    }
  };

  const handleUpgrade = async (newTier: 'basic' | 'professional' | 'enterprise') => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No active session found');
      }

      const token = session.access_token;
      const response = await fetch('http://localhost:3001/api/subscriptions/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tier: newTier })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update subscription');
      }

      toast.success(`Successfully upgraded to ${tierDetails[newTier].name} plan!`);
      setUpgradeModalOpen(false);
      fetchSubscriptionData(); // Refresh data
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update subscription');
    }
  };

  const handleCancelSubscription = async (immediately: boolean = false) => {
    try {
      setCancelling(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No active session found');
      }

      const token = session.access_token;
      const response = await fetch('http://localhost:3001/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ immediately })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      toast.success(immediately ? 'Subscription cancelled immediately' : 'Subscription will cancel at the end of the billing period');
      setCancelModalOpen(false);
      fetchSubscriptionData(); // Refresh data
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'trialing': return 'text-blue-600 bg-blue-50';
      case 'past_due': return 'text-orange-600 bg-orange-50';
      case 'canceled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getUsagePercentage = () => {
    if (!usage || usage.quotes_limit === -1) return 0;
    return Math.min((usage.quotes_used / usage.quotes_limit) * 100, 100);
  };

  const getUsageColor = () => {
    const percentage = getUsagePercentage();
    if (percentage >= 90) return 'text-red-600 bg-red-50';
    if (percentage >= 75) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-yellow-600 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Admin Access Required</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Only admin users can access subscription management.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-24"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error Loading Subscription</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchSubscriptionData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center">
          <CreditCard className="h-5 w-5 text-blue-600 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">No Active Subscription</h3>
            <p className="text-sm text-blue-700 mt-1">
              You don't have an active subscription. Visit the landing page to subscribe.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentTier = tierDetails[subscription.tier];

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Crown className="h-6 w-6 text-indigo-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Current Plan</h3>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
            {subscription.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">
              {currentTier.name} Plan
            </h4>
            <p className="text-gray-600 mb-4">{currentTier.description}</p>
            <div className="text-3xl font-bold text-indigo-600 mb-2">
              ${currentTier.price}
              <span className="text-lg text-gray-500 font-normal">/month</span>
            </div>
            
            {subscription.trial_end && new Date(subscription.trial_end) > new Date() && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm text-green-800">
                    Trial ends {new Date(subscription.trial_end).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <h5 className="font-medium text-gray-900 mb-3">Features included:</h5>
            <ul className="space-y-2">
              {currentTier.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Next billing: {new Date(subscription.current_period_end).toLocaleDateString()}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleBillingPortal}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Billing Portal
            </button>
            <button
              onClick={() => setUpgradeModalOpen(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <ArrowUp className="h-4 w-4 mr-2" />
              Upgrade Plan
            </button>
            {subscription.status === 'active' && !subscription.cancel_at_period_end && (
              <button
                onClick={() => setCancelModalOpen(true)}
                className="flex items-center px-4 py-2 border border-red-300 rounded-lg text-red-700 hover:bg-red-50 transition-colors"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Cancel Plan
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      {usage && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <BarChart3 className="h-6 w-6 text-indigo-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Usage This Month</h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Quotes Generated</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getUsageColor()}`}>
                  {usage.quotes_used} / {usage.quotes_limit === -1 ? 'Unlimited' : usage.quotes_limit}
                </span>
              </div>
              
              {usage.quotes_limit !== -1 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      getUsagePercentage() >= 90 ? 'bg-red-500' : 
                      getUsagePercentage() >= 75 ? 'bg-orange-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${getUsagePercentage()}%` }}
                  ></div>
                </div>
              )}
            </div>

            <div className="text-xs text-gray-500">
              Billing period: {new Date(usage.period_start).toLocaleDateString()} - {new Date(usage.period_end).toLocaleDateString()}
            </div>

            {usage.quotes_limit !== -1 && getUsagePercentage() >= 80 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-orange-600 mr-2" />
                  <span className="text-sm text-orange-800">
                    {getUsagePercentage() >= 90 
                      ? 'You\'re approaching your quote limit. Consider upgrading your plan.'
                      : 'You\'ve used most of your monthly quota.'
                    }
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {upgradeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Upgrade Your Plan</h2>
              <p className="text-gray-600 mt-1">Choose a plan that fits your needs</p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(tierDetails).map(([tierKey, tier]) => (
                  <div 
                    key={tierKey}
                    className={`border rounded-lg p-6 ${
                      tierKey === subscription.tier 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900">{tier.name}</h3>
                      <div className="mt-2">
                        <span className="text-3xl font-bold text-gray-900">${tier.price}</span>
                        <span className="text-gray-500">/month</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{tier.description}</p>
                    </div>

                    <ul className="mt-6 space-y-2">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                          <span className="text-xs text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6">
                      {tierKey === subscription.tier ? (
                        <button disabled className="w-full px-4 py-2 bg-gray-100 text-gray-500 rounded-lg">
                          Current Plan
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpgrade(tierKey as any)}
                          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          {tierDetails[tierKey].price > currentTier.price ? 'Upgrade' : 'Downgrade'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setUpgradeModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Cancel Subscription</h2>
              <p className="text-gray-600 mt-1">Are you sure you want to cancel your subscription?</p>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">What happens when you cancel:</p>
                      <ul className="mt-2 list-disc list-inside space-y-1">
                        <li>You'll lose access to premium features</li>
                        <li>Your data will be preserved for 30 days</li>
                        <li>You can reactivate anytime before deletion</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  Choose when to cancel your subscription:
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={cancelling}
              >
                Keep Subscription
              </button>
              <button
                onClick={() => handleCancelSubscription(false)}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                disabled={cancelling}
              >
                {cancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  'Cancel at Period End'
                )}
              </button>
              <button
                onClick={() => handleCancelSubscription(true)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={cancelling}
              >
                {cancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  'Cancel Immediately'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}