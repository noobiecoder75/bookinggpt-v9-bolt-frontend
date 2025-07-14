const stripe = require('../lib/stripe');
const { supabase } = require('../lib/supabase');

class StripeConnectService {
  
  // Create Stripe Connect Express account for agent
  async createConnectAccount(userId, email, businessInfo) {
    try {
      // Create Express account
      const account = await stripe.accounts.create({
        type: 'express',
        email: email,
        business_type: businessInfo.business_type || 'individual',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        },
        business_profile: {
          name: businessInfo.business_name,
          product_description: 'Travel booking and consultation services',
          support_email: email,
          url: businessInfo.website || null
        },
        metadata: {
          user_id: userId,
          business_name: businessInfo.business_name
        }
      });

      // Store account in database
      await this.storeConnectAccount(userId, account);

      return {
        success: true,
        account_id: account.id,
        account: account
      };
    } catch (error) {
      console.error('Error creating Stripe Connect account:', error);
      throw error;
    }
  }

  // Store Connect account in database
  async storeConnectAccount(userId, stripeAccount) {
    try {
      const { data, error } = await supabase
        .from('agent_payment_accounts')
        .upsert({
          agent_id: userId,
          stripe_account_id: stripeAccount.id,
          onboarding_completed: false,
          charges_enabled: stripeAccount.charges_enabled,
          payouts_enabled: stripeAccount.payouts_enabled,
          country: stripeAccount.country,
          currency: stripeAccount.default_currency,
          business_type: stripeAccount.business_type,
          business_name: stripeAccount.business_profile?.name
        }, {
          onConflict: 'agent_id'
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error storing Connect account:', error);
      throw error;
    }
  }

  // Create account link for onboarding
  async createAccountLink(accountId, userId) {
    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${process.env.FRONTEND_URL}/settings/payment-setup?refresh=true`,
        return_url: `${process.env.FRONTEND_URL}/settings/payment-setup?success=true`,
        type: 'account_onboarding'
      });

      return {
        success: true,
        onboarding_url: accountLink.url
      };
    } catch (error) {
      console.error('Error creating account link:', error);
      throw error;
    }
  }

  // Get account details
  async getConnectAccount(userId) {
    try {
      // Get from database
      const { data: accountData, error } = await supabase
        .from('agent_payment_accounts')
        .select('*')
        .eq('agent_id', userId)
        .single();

      if (error) throw error;

      if (accountData) {
        // Get latest data from Stripe
        const stripeAccount = await stripe.accounts.retrieve(accountData.stripe_account_id);
        
        // Update local record if status changed
        if (stripeAccount.charges_enabled !== accountData.charges_enabled ||
            stripeAccount.payouts_enabled !== accountData.payouts_enabled) {
          await this.updateAccountStatus(userId, stripeAccount);
        }

        return {
          ...accountData,
          stripe_data: stripeAccount,
          onboarding_completed: stripeAccount.details_submitted && stripeAccount.charges_enabled
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting Connect account:', error);
      throw error;
    }
  }

  // Update account status
  async updateAccountStatus(userId, stripeAccount) {
    try {
      const { data, error } = await supabase
        .from('agent_payment_accounts')
        .update({
          charges_enabled: stripeAccount.charges_enabled,
          payouts_enabled: stripeAccount.payouts_enabled,
          onboarding_completed: stripeAccount.details_submitted && stripeAccount.charges_enabled,
          updated_at: new Date().toISOString()
        })
        .eq('agent_id', userId);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating account status:', error);
      throw error;
    }
  }

  // Create login link for existing account
  async createLoginLink(accountId) {
    try {
      const loginLink = await stripe.accounts.createLoginLink(accountId);
      
      return {
        success: true,
        login_url: loginLink.url
      };
    } catch (error) {
      console.error('Error creating login link:', error);
      throw error;
    }
  }

  // Create payment intent for customer payment
  async createPaymentIntent(agentId, customerId, amount, currency = 'usd', description, metadata = {}) {
    try {
      // Get agent's Connect account
      const account = await this.getConnectAccount(agentId);
      if (!account || !account.charges_enabled) {
        throw new Error('Agent payment account not set up or not enabled');
      }

      // Calculate platform fee (2.5% of amount)
      const platformFee = Math.round(amount * 0.025);

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: currency,
        description: description,
        metadata: {
          agent_id: agentId,
          customer_id: customerId,
          ...metadata
        },
        application_fee_amount: platformFee,
        transfer_data: {
          destination: account.stripe_account_id
        }
      });

      // Store payment in database
      await this.storeCustomerPayment(agentId, customerId, paymentIntent, platformFee, description);

      return {
        success: true,
        payment_intent: paymentIntent,
        client_secret: paymentIntent.client_secret
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  // Store customer payment in database
  async storeCustomerPayment(agentId, customerId, paymentIntent, platformFee, description) {
    try {
      const { data, error } = await supabase
        .from('customer_payments')
        .insert({
          agent_id: agentId,
          customer_id: customerId,
          stripe_payment_intent_id: paymentIntent.id,
          amount: paymentIntent.amount / 100, // Convert from cents
          currency: paymentIntent.currency,
          payment_type: 'full', // or 'deposit', 'final', etc.
          status: paymentIntent.status,
          platform_fee: platformFee / 100, // Convert from cents
          agent_fee: (paymentIntent.amount - platformFee) / 100, // Convert from cents
          description: description,
          metadata: paymentIntent.metadata
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error storing customer payment:', error);
      throw error;
    }
  }

  // Get payment history for agent
  async getPaymentHistory(agentId, limit = 50, offset = 0) {
    try {
      const { data: payments, error } = await supabase
        .from('customer_payments')
        .select(`
          *,
          customers:customer_id(first_name, last_name, email)
        `)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return payments;
    } catch (error) {
      console.error('Error getting payment history:', error);
      throw error;
    }
  }

  // Get payment statistics for agent
  async getPaymentStats(agentId) {
    try {
      const { data: stats, error } = await supabase
        .from('customer_payments')
        .select('amount, agent_fee, platform_fee, status, created_at')
        .eq('agent_id', agentId);

      if (error) throw error;

      // Calculate statistics
      const totalPayments = stats.length;
      const successfulPayments = stats.filter(p => p.status === 'succeeded');
      const totalRevenue = successfulPayments.reduce((sum, p) => sum + p.agent_fee, 0);
      const totalVolume = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalFees = successfulPayments.reduce((sum, p) => sum + p.platform_fee, 0);

      // Get current month stats
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const currentMonthPayments = successfulPayments.filter(p => 
        p.created_at.startsWith(currentMonth)
      );
      const currentMonthRevenue = currentMonthPayments.reduce((sum, p) => sum + p.agent_fee, 0);

      return {
        total_payments: totalPayments,
        successful_payments: successfulPayments.length,
        total_revenue: totalRevenue,
        total_volume: totalVolume,
        total_fees: totalFees,
        current_month_payments: currentMonthPayments.length,
        current_month_revenue: currentMonthRevenue,
        conversion_rate: totalPayments > 0 ? (successfulPayments.length / totalPayments) * 100 : 0
      };
    } catch (error) {
      console.error('Error getting payment stats:', error);
      throw error;
    }
  }

  // Create refund for payment
  async createRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
    try {
      // Get payment from database
      const { data: payment, error } = await supabase
        .from('customer_payments')
        .select('*')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single();

      if (error) throw error;
      if (!payment) throw new Error('Payment not found');

      // Create refund in Stripe
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined, // Convert to cents
        reason: reason,
        metadata: {
          agent_id: payment.agent_id,
          customer_id: payment.customer_id
        }
      });

      // Update payment status
      const refundAmount = refund.amount / 100; // Convert from cents
      const newStatus = refundAmount >= payment.amount ? 'refunded' : 'partially_refunded';

      await supabase
        .from('customer_payments')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_payment_intent_id', paymentIntentId);

      return {
        success: true,
        refund: refund
      };
    } catch (error) {
      console.error('Error creating refund:', error);
      throw error;
    }
  }

  // Get account balance
  async getAccountBalance(accountId) {
    try {
      const balance = await stripe.balance.retrieve({
        stripeAccount: accountId
      });

      return {
        success: true,
        balance: balance
      };
    } catch (error) {
      console.error('Error getting account balance:', error);
      throw error;
    }
  }

  // Get payout history
  async getPayoutHistory(accountId, limit = 10) {
    try {
      const payouts = await stripe.payouts.list({
        limit: limit
      }, {
        stripeAccount: accountId
      });

      return {
        success: true,
        payouts: payouts.data
      };
    } catch (error) {
      console.error('Error getting payout history:', error);
      throw error;
    }
  }
}

module.exports = new StripeConnectService();