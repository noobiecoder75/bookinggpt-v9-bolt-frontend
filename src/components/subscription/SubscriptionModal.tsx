import React, { useState } from 'react';
import { X, CheckCircle, CreditCard, Loader2 } from 'lucide-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTier: 'basic' | 'professional' | 'enterprise';
  onSuccess: () => void;
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
    ]
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
    ]
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
    ]
  }
};

export function SubscriptionModal({ isOpen, onClose, selectedTier, onSuccess }: SubscriptionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'plan' | 'payment' | 'processing'>('plan');
  const [error, setError] = useState<string | null>(null);
  
  const tier = tierDetails[selectedTier];

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get auth token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Please sign in to subscribe');
      }

      // Create subscription
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tier: selectedTier,
          trialDays: 14
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create subscription');
      }

      // If we have a client secret, we need to handle payment
      if (data.clientSecret) {
        // For now, we'll simulate payment processing
        // In production, this would integrate with Stripe Elements
        setStep('processing');
        
        // Simulate payment processing
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        // Trial subscription created successfully
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {step === 'plan' ? 'Confirm Your Plan' : 
             step === 'payment' ? 'Payment Details' : 
             'Setting Up Your Account'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'plan' && (
            <div className="space-y-6">
              {/* Plan Summary */}
              <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-indigo-600">${tier.price}</div>
                    <div className="text-sm text-gray-600">/month</div>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">{tier.description}</p>
                
                {/* Features */}
                <ul className="space-y-2">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Trial Information */}
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <div>
                    <p className="font-semibold text-green-900">14-Day Free Trial</p>
                    <p className="text-sm text-green-700">
                      Start your trial today. No credit card required.
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubscribe}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Starting Trial...
                    </>
                  ) : (
                    'Start Free Trial'
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-6">
              <div className="text-center">
                <CreditCard className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Payment Details
                </h3>
                <p className="text-gray-600">
                  Your trial will end on {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </p>
              </div>

              {/* Payment Form Placeholder */}
              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <p className="text-gray-600">
                  Payment form will be integrated here with Stripe Elements
                </p>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-8">
              <Loader2 className="h-16 w-16 text-indigo-600 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Setting Up Your Account
              </h3>
              <p className="text-gray-600">
                Please wait while we create your trial account...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}