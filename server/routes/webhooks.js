import express from 'express';
import stripe from '../lib/stripe.js';
import { supabase } from '../lib/supabase.js';
import subscriptionService from '../services/subscriptionService.js';

const router = express.Router();

// Middleware to verify Stripe webhook signature
const verifyWebhookSignature = (req, res, next) => {
  if (!stripe) {
    return res.status(501).json({ error: 'Stripe webhooks not configured' });
  }
  
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!sig || !endpointSecret) {
    return res.status(400).json({ error: 'Missing signature or secret' });
  }
  
  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    req.stripeEvent = event;
    next();
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }
};

// Log webhook event
const logWebhookEvent = async (event) => {
  try {
    const { data, error } = await supabase
      .from('payment_webhooks')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        payload: event,
        processed: false
      });
    
    if (error) {
      console.error('Error logging webhook event:', error);
    }
  } catch (error) {
    console.error('Error logging webhook event:', error);
  }
};

// Mark webhook as processed
const markWebhookProcessed = async (eventId, success = true, errorMessage = null) => {
  try {
    const { error } = await supabase
      .from('payment_webhooks')
      .update({
        processed: success,
        error_message: errorMessage,
        processed_at: new Date().toISOString()
      })
      .eq('stripe_event_id', eventId);
    
    if (error) {
      console.error('Error marking webhook as processed:', error);
    }
  } catch (error) {
    console.error('Error marking webhook as processed:', error);
  }
};

// Main webhook handler
router.post('/stripe', express.raw({type: 'application/json'}), verifyWebhookSignature, async (req, res) => {
  const event = req.stripeEvent;
  
  try {
    // Log the event
    await logWebhookEvent(event);
    
    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;
        
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event);
        break;
        
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event);
        break;
        
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event);
        break;
        
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    // Mark as processed
    await markWebhookProcessed(event.id, true);
    
    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Mark as failed
    await markWebhookProcessed(event.id, false, error.message);
    
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Handle subscription created
const handleSubscriptionCreated = async (event) => {
  const subscription = event.data.object;
  const userId = subscription.metadata.user_id;
  const tier = subscription.metadata.tier;
  
  if (userId && tier) {
    await subscriptionService.storeSubscription(userId, subscription, tier);
  }
};

// Handle subscription updated
const handleSubscriptionUpdated = async (event) => {
  const subscription = event.data.object;
  const userId = subscription.metadata.user_id;
  
  if (userId) {
    await subscriptionService.updateSubscriptionStatus(userId, subscription);
  }
};

// Handle subscription deleted
const handleSubscriptionDeleted = async (event) => {
  const subscription = event.data.object;
  const userId = subscription.metadata.user_id;
  
  if (userId) {
    await subscriptionService.updateSubscriptionStatus(userId, subscription);
  }
};

// Handle successful invoice payment
const handleInvoicePaymentSucceeded = async (event) => {
  const invoice = event.data.object;
  const subscriptionId = invoice.subscription;
  
  if (subscriptionId) {
    // Update subscription status
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata.user_id;
    
    if (userId) {
      await subscriptionService.updateSubscriptionStatus(userId, subscription);
    }
    
    // Send success notification
    await sendPaymentSuccessNotification(userId, invoice);
  }
};

// Handle failed invoice payment
const handleInvoicePaymentFailed = async (event) => {
  const invoice = event.data.object;
  const subscriptionId = invoice.subscription;
  
  if (subscriptionId) {
    // Update subscription status
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata.user_id;
    
    if (userId) {
      await subscriptionService.updateSubscriptionStatus(userId, subscription);
    }
    
    // Send failure notification
    await sendPaymentFailureNotification(userId, invoice);
  }
};

// Handle trial ending soon
const handleTrialWillEnd = async (event) => {
  const subscription = event.data.object;
  const userId = subscription.metadata.user_id;
  
  if (userId) {
    await sendTrialEndingNotification(userId, subscription);
  }
};

// Handle payment intent succeeded (for customer payments)
const handlePaymentIntentSucceeded = async (event) => {
  const paymentIntent = event.data.object;
  
  // Update customer payment status
  const { error } = await supabase
    .from('customer_payments')
    .update({
      status: 'succeeded',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);
  
  if (error) {
    console.error('Error updating customer payment status:', error);
  }
};

// Handle payment intent failed (for customer payments)
const handlePaymentIntentFailed = async (event) => {
  const paymentIntent = event.data.object;
  
  // Update customer payment status
  const { error } = await supabase
    .from('customer_payments')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);
  
  if (error) {
    console.error('Error updating customer payment status:', error);
  }
};

// Send payment success notification
const sendPaymentSuccessNotification = async (userId, invoice) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        message: `Payment successful for ${invoice.amount_paid / 100} ${invoice.currency.toUpperCase()}`,
        is_read: false
      });
    
    if (error) {
      console.error('Error sending payment success notification:', error);
    }
  } catch (error) {
    console.error('Error sending payment success notification:', error);
  }
};

// Send payment failure notification
const sendPaymentFailureNotification = async (userId, invoice) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        message: `Payment failed for ${invoice.amount_due / 100} ${invoice.currency.toUpperCase()}. Please update your payment method.`,
        is_read: false
      });
    
    if (error) {
      console.error('Error sending payment failure notification:', error);
    }
  } catch (error) {
    console.error('Error sending payment failure notification:', error);
  }
};

// Send trial ending notification
const sendTrialEndingNotification = async (userId, subscription) => {
  try {
    const trialEndDate = new Date(subscription.trial_end * 1000);
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        message: `Your trial ends on ${trialEndDate.toDateString()}. Please update your payment method to continue.`,
        is_read: false
      });
    
    if (error) {
      console.error('Error sending trial ending notification:', error);
    }
  } catch (error) {
    console.error('Error sending trial ending notification:', error);
  }
};

export default router;