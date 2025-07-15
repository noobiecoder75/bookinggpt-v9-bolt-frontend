import stripe from '../lib/stripe.js';
import { supabase } from '../lib/supabase.js';

class SubscriptionService {
  
  // Create a new subscription for an agent
  async createSubscription(userId, email, tier, trialDays = 14) {
    try {
      // First, create or get Stripe customer
      let customer = await this.getOrCreateStripeCustomer(userId, email);
      
      // Get price ID based on tier
      const priceId = this.getPriceIdForTier(tier);
      
      // Create subscription with trial period
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        trial_period_days: trialDays,
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          user_id: userId,
          tier: tier
        }
      });
      
      // Store subscription in database
      await this.storeSubscription(userId, subscription, tier);
      
      return {
        success: true,
        subscription: subscription,
        clientSecret: subscription.latest_invoice.payment_intent?.client_secret
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }
  
  // Get or create Stripe customer
  async getOrCreateStripeCustomer(userId, email) {
    try {
      // Check if customer already exists in our database
      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single();
      
      if (existingSubscription?.stripe_customer_id) {
        return await stripe.customers.retrieve(existingSubscription.stripe_customer_id);
      }
      
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: email,
        metadata: {
          user_id: userId
        }
      });
      
      return customer;
    } catch (error) {
      console.error('Error getting/creating Stripe customer:', error);
      throw error;
    }
  }
  
  // Get price ID for subscription tier
  getPriceIdForTier(tier) {
    const priceIds = {
      basic: process.env.STRIPE_BASIC_PRICE_ID,
      professional: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
      enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID
    };
    
    return priceIds[tier];
  }
  
  // Store subscription in database
  async storeSubscription(userId, stripeSubscription, tier) {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          stripe_subscription_id: stripeSubscription.id,
          stripe_customer_id: stripeSubscription.customer,
          tier: tier,
          status: stripeSubscription.status,
          current_period_start: new Date(stripeSubscription.current_period_start * 1000),
          current_period_end: new Date(stripeSubscription.current_period_end * 1000),
          trial_start: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
          trial_end: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
          cancel_at: stripeSubscription.cancel_at ? new Date(stripeSubscription.cancel_at * 1000) : null,
          canceled_at: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null
        }, {
          onConflict: 'user_id'
        });
      
      if (error) throw error;
      
      // Initialize usage tracking
      await this.initializeUsageTracking(userId, tier);
      
      return data;
    } catch (error) {
      console.error('Error storing subscription:', error);
      throw error;
    }
  }
  
  // Initialize usage tracking for new subscription
  async initializeUsageTracking(userId, tier) {
    try {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (!subscription) throw new Error('Subscription not found');
      
      // Define usage limits based on tier
      const usageLimits = {
        basic: { quotes: 100, bookings: 25, api_calls: 1000 },
        professional: { quotes: 500, bookings: 100, api_calls: 5000 },
        enterprise: { quotes: -1, bookings: -1, api_calls: -1 } // unlimited
      };
      
      const limits = usageLimits[tier];
      const resetDate = new Date();
      resetDate.setMonth(resetDate.getMonth() + 1);
      
      // Create usage tracking records
      for (const [usageType, limit] of Object.entries(limits)) {
        await supabase
          .from('subscription_usage')
          .upsert({
            subscription_id: subscription.id,
            user_id: userId,
            usage_type: usageType,
            usage_count: 0,
            usage_limit: limit,
            reset_date: resetDate
          }, {
            onConflict: 'subscription_id,usage_type'
          });
      }
    } catch (error) {
      console.error('Error initializing usage tracking:', error);
      throw error;
    }
  }
  
  // Get subscription details
  async getSubscription(userId) {
    try {
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      // Handle case where no subscription exists (PGRST116 error)
      if (error && error.code === 'PGRST116') {
        console.log('No subscription found for user:', userId);
        return null;
      }
      
      if (error) {
        console.error('Database error getting subscription:', error);
        throw error;
      }
      
      if (subscription) {
        // Skip Stripe lookup if this is a placeholder subscription
        if (subscription.stripe_subscription_id === 'sub_temp_placeholder') {
          console.log('Skipping Stripe lookup for placeholder subscription');
          return {
            ...subscription,
            stripe_data: null
          };
        }
        
        // Get latest subscription from Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
        
        // Update local record if needed
        if (stripeSubscription.status !== subscription.status) {
          await this.updateSubscriptionStatus(userId, stripeSubscription);
        }
        
        return {
          ...subscription,
          stripe_data: stripeSubscription
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting subscription:', error);
      throw error;
    }
  }
  
  // Update subscription status
  async updateSubscriptionStatus(userId, stripeSubscription) {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          status: stripeSubscription.status,
          current_period_start: new Date(stripeSubscription.current_period_start * 1000),
          current_period_end: new Date(stripeSubscription.current_period_end * 1000),
          trial_end: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
          cancel_at: stripeSubscription.cancel_at ? new Date(stripeSubscription.cancel_at * 1000) : null,
          canceled_at: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null
        })
        .eq('user_id', userId);
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating subscription status:', error);
      throw error;
    }
  }
  
  // Cancel subscription
  async cancelSubscription(userId, immediately = false) {
    try {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', userId)
        .single();
      
      if (!subscription) throw new Error('Subscription not found');
      
      // Cancel in Stripe
      const stripeSubscription = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: !immediately
      });
      
      if (immediately) {
        await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
      }
      
      // Update local record
      await this.updateSubscriptionStatus(userId, stripeSubscription);
      
      return { success: true };
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }
  
  // Create billing portal session
  async createBillingPortalSession(userId, returnUrl) {
    try {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single();
      
      if (!subscription) throw new Error('Subscription not found');
      
      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: returnUrl
      });
      
      return { url: session.url };
    } catch (error) {
      console.error('Error creating billing portal session:', error);
      throw error;
    }
  }
  
  // Get usage statistics
  async getUsageStats(userId) {
    try {
      const { data: usage, error } = await supabase
        .from('subscription_usage')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      return usage;
    } catch (error) {
      console.error('Error getting usage stats:', error);
      throw error;
    }
  }
  
  // Increment usage count
  async incrementUsage(userId, usageType, amount = 1) {
    try {
      const { data: usage, error } = await supabase
        .from('subscription_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('usage_type', usageType)
        .single();
      
      if (error) throw error;
      
      if (!usage) {
        throw new Error('Usage tracking not found');
      }
      
      // Check if usage limit is exceeded (if limit is not -1)
      if (usage.usage_limit !== -1 && usage.usage_count + amount > usage.usage_limit) {
        throw new Error(`Usage limit exceeded for ${usageType}`);
      }
      
      // Increment usage count
      const { data: updatedUsage, error: updateError } = await supabase
        .from('subscription_usage')
        .update({
          usage_count: usage.usage_count + amount
        })
        .eq('id', usage.id);
      
      if (updateError) throw updateError;
      
      return updatedUsage;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      throw error;
    }
  }
  
  // Check if user has access to feature
  async checkFeatureAccess(userId, feature) {
    try {
      const subscription = await this.getSubscription(userId);
      
      if (!subscription || subscription.status !== 'active') {
        console.log('No active subscription for user:', userId);
        return false;
      }
      
      // Define feature access based on tier
      const tierFeatures = {
        basic: ['quotes', 'bookings', 'basic_support'],
        professional: ['quotes', 'bookings', 'advanced_analytics', 'priority_support', 'api_access'],
        enterprise: ['quotes', 'bookings', 'advanced_analytics', 'priority_support', 'api_access', 'custom_branding', 'dedicated_support']
      };
      
      const hasAccess = tierFeatures[subscription.tier]?.includes(feature) || false;
      console.log('Feature access check:', { userId, feature, tier: subscription.tier, hasAccess });
      
      return hasAccess;
    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  }
}

export default new SubscriptionService();