import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { createApiUrl, API_ENDPOINTS } from '../lib/api';

interface SubscriptionStatus {
  tier: 'basic' | 'professional' | 'enterprise';
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  trial_end?: string;
  isTrialing: boolean;
  daysRemaining?: number;
}

export function useSubscriptionStatus() {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      setLoading(true);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setSubscriptionStatus(null);
        return;
      }

      const token = session.access_token;
      const apiUrl = createApiUrl(API_ENDPOINTS.subscriptions.current);
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const subscription = data.subscription;
        
        if (subscription) {
          const isTrialing = subscription.status === 'trialing';
          let daysRemaining: number | undefined;
          
          if (isTrialing && subscription.trial_end) {
            const trialEnd = new Date(subscription.trial_end);
            const now = new Date();
            daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            daysRemaining = Math.max(0, daysRemaining);
          }
          
          setSubscriptionStatus({
            tier: subscription.tier,
            status: subscription.status,
            trial_end: subscription.trial_end,
            isTrialing,
            daysRemaining
          });
        } else {
          setSubscriptionStatus(null);
        }
      } else {
        setSubscriptionStatus(null);
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      setSubscriptionStatus(null);
    } finally {
      setLoading(false);
    }
  };

  return { subscriptionStatus, loading, refetch: fetchSubscriptionStatus };
}