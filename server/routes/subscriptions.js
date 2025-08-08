import express from 'express';
import subscriptionService from '../services/subscriptionService.js';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// Middleware to authenticate user
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Create trial subscription for new users
router.post('/create-trial', authenticateUser, async (req, res) => {
  try {
    const { userId, email, tier = 'basic' } = req.body;
    
    // Use the provided userId or fall back to authenticated user
    const targetUserId = userId || req.user.id;
    const targetEmail = email || req.user.email;
    
    const result = await subscriptionService.createTrialSubscription(targetUserId, targetEmail, tier);
    
    res.json({
      success: true,
      subscription: result.subscription
    });
  } catch (error) {
    console.error('Error creating trial subscription:', error);
    res.status(500).json({ error: 'Failed to create trial subscription' });
  }
});

// Create new subscription
router.post('/create', authenticateUser, async (req, res) => {
  try {
    const { tier, trialDays = 14 } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;
    
    if (!tier || !['basic', 'professional', 'enterprise'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid subscription tier' });
    }
    
    const result = await subscriptionService.createSubscription(userId, userEmail, tier, trialDays);
    
    res.json({
      success: true,
      subscription: result.subscription,
      clientSecret: result.clientSecret
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Get current subscription
router.get('/current', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const subscription = await subscriptionService.getSubscription(userId);
    
    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found' });
    }
    
    res.json({ subscription });
  } catch (error) {
    console.error('Error getting subscription:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

// Cancel subscription
router.post('/cancel', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { immediately = false } = req.body;
    
    const result = await subscriptionService.cancelSubscription(userId, immediately);
    
    res.json(result);
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Create billing portal session
router.post('/portal', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { returnUrl } = req.body;
    
    if (!returnUrl) {
      return res.status(400).json({ error: 'Return URL is required' });
    }
    
    const result = await subscriptionService.createBillingPortalSession(userId, returnUrl);
    
    res.json(result);
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

// Get usage statistics
router.get('/usage', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const usage = await subscriptionService.getUsageStats(userId);
    
    res.json({ usage });
  } catch (error) {
    console.error('Error getting usage stats:', error);
    res.status(500).json({ error: 'Failed to get usage stats' });
  }
});

// Check feature access
router.post('/check-access', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { feature } = req.body;
    
    if (!feature) {
      return res.status(400).json({ error: 'Feature is required' });
    }
    
    const hasAccess = await subscriptionService.checkFeatureAccess(userId, feature);
    
    res.json({ hasAccess });
  } catch (error) {
    console.error('Error checking feature access:', error);
    res.status(500).json({ error: 'Failed to check feature access' });
  }
});

// Update subscription (upgrade/downgrade)
router.post('/update', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { tier } = req.body;
    
    if (!tier || !['basic', 'professional', 'enterprise'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid subscription tier' });
    }
    
    const subscription = await subscriptionService.getSubscription(userId);
    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found' });
    }
    
    // Get new price ID
    const newPriceId = subscriptionService.getPriceIdForTier(tier);
    
    // Update subscription in Stripe
    const { default: stripe } = await import('../lib/stripe.js');
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    
    const updatedSubscription = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      items: [{
        id: stripeSubscription.items.data[0].id,
        price: newPriceId
      }],
      proration_behavior: 'always_invoice'
    });
    
    // Update local record
    await subscriptionService.updateSubscriptionStatus(userId, updatedSubscription);
    
    // Update usage limits
    await subscriptionService.initializeUsageTracking(userId, tier);
    
    res.json({ success: true, subscription: updatedSubscription });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

export default router;