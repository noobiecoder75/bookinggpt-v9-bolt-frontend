import express from 'express';
import stripeConnectService from '../services/stripeConnectService.js';
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

// Create Stripe Connect account
router.post('/account/create', authenticateUser, async (req, res) => {
  try {
    const { businessInfo } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;
    
    if (!businessInfo || !businessInfo.business_name) {
      return res.status(400).json({ error: 'Business information is required' });
    }
    
    const result = await stripeConnectService.createConnectAccount(userId, userEmail, businessInfo);
    
    res.json(result);
  } catch (error) {
    console.error('Error creating Connect account:', error);
    res.status(500).json({ error: 'Failed to create Connect account' });
  }
});

// Get Connect account details
router.get('/account', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const account = await stripeConnectService.getConnectAccount(userId);
    
    if (!account) {
      return res.status(404).json({ error: 'No Connect account found' });
    }
    
    res.json({ account });
  } catch (error) {
    console.error('Error getting Connect account:', error);
    res.status(500).json({ error: 'Failed to get Connect account' });
  }
});

// Create account onboarding link
router.post('/account/onboarding', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const account = await stripeConnectService.getConnectAccount(userId);
    
    if (!account) {
      return res.status(404).json({ error: 'No Connect account found' });
    }
    
    const result = await stripeConnectService.createAccountLink(account.stripe_account_id, userId);
    
    res.json(result);
  } catch (error) {
    console.error('Error creating onboarding link:', error);
    res.status(500).json({ error: 'Failed to create onboarding link' });
  }
});

// Create account login link
router.post('/account/login', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const account = await stripeConnectService.getConnectAccount(userId);
    
    if (!account) {
      return res.status(404).json({ error: 'No Connect account found' });
    }
    
    const result = await stripeConnectService.createLoginLink(account.stripe_account_id);
    
    res.json(result);
  } catch (error) {
    console.error('Error creating login link:', error);
    res.status(500).json({ error: 'Failed to create login link' });
  }
});

// Create payment intent for customer payment
router.post('/payment/create', authenticateUser, async (req, res) => {
  try {
    const { customerId, amount, currency = 'usd', description, metadata = {} } = req.body;
    const agentId = req.user.id;
    
    if (!customerId || !amount || !description) {
      return res.status(400).json({ error: 'Customer ID, amount, and description are required' });
    }
    
    if (amount < 50) { // Minimum $0.50
      return res.status(400).json({ error: 'Minimum payment amount is $0.50' });
    }
    
    const result = await stripeConnectService.createPaymentIntent(
      agentId,
      customerId,
      Math.round(amount * 100), // Convert to cents
      currency,
      description,
      metadata
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Get payment history
router.get('/payments', authenticateUser, async (req, res) => {
  try {
    const agentId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;
    
    const payments = await stripeConnectService.getPaymentHistory(
      agentId,
      parseInt(limit),
      parseInt(offset)
    );
    
    res.json({ payments });
  } catch (error) {
    console.error('Error getting payment history:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
});

// Get payment statistics
router.get('/stats', authenticateUser, async (req, res) => {
  try {
    const agentId = req.user.id;
    const stats = await stripeConnectService.getPaymentStats(agentId);
    
    res.json({ stats });
  } catch (error) {
    console.error('Error getting payment stats:', error);
    res.status(500).json({ error: 'Failed to get payment stats' });
  }
});

// Create refund
router.post('/refund', authenticateUser, async (req, res) => {
  try {
    const { paymentIntentId, amount, reason = 'requested_by_customer' } = req.body;
    const agentId = req.user.id;
    
    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Payment intent ID is required' });
    }
    
    // Verify that the payment belongs to this agent
    const { data: payment, error } = await supabase
      .from('customer_payments')
      .select('agent_id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();
    
    if (error || !payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    if (payment.agent_id !== agentId) {
      return res.status(403).json({ error: 'Unauthorized to refund this payment' });
    }
    
    const result = await stripeConnectService.createRefund(paymentIntentId, amount, reason);
    
    res.json(result);
  } catch (error) {
    console.error('Error creating refund:', error);
    res.status(500).json({ error: 'Failed to create refund' });
  }
});

// Get account balance
router.get('/balance', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const account = await stripeConnectService.getConnectAccount(userId);
    
    if (!account) {
      return res.status(404).json({ error: 'No Connect account found' });
    }
    
    const result = await stripeConnectService.getAccountBalance(account.stripe_account_id);
    
    res.json(result);
  } catch (error) {
    console.error('Error getting account balance:', error);
    res.status(500).json({ error: 'Failed to get account balance' });
  }
});

// Get payout history
router.get('/payouts', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;
    const account = await stripeConnectService.getConnectAccount(userId);
    
    if (!account) {
      return res.status(404).json({ error: 'No Connect account found' });
    }
    
    const result = await stripeConnectService.getPayoutHistory(account.stripe_account_id, parseInt(limit));
    
    res.json(result);
  } catch (error) {
    console.error('Error getting payout history:', error);
    res.status(500).json({ error: 'Failed to get payout history' });
  }
});

export default router;