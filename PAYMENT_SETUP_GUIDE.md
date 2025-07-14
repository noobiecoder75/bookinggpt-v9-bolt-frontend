# BookingGPT Payment System Setup Guide

This guide will help you set up the complete dual payment system for BookingGPT, including B2B subscriptions and B2C customer payments.

## Overview

The payment system consists of two main components:
1. **B2B Subscriptions**: Agent subscriptions for platform access
2. **B2C Payments**: Customer payments for travel bookings via Stripe Connect

## Prerequisites

- Node.js 18+
- Supabase account and project
- Stripe account (with Connect enabled)
- BookingGPT application already set up

## Step 1: Stripe Setup

### 1.1 Create Stripe Account
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Create an account or log in
3. Complete business verification
4. Enable Stripe Connect in your dashboard

### 1.2 Create Subscription Products
In your Stripe dashboard, create the following products:

**Basic Subscription ($99/month)**
- Product name: "BookingGPT Basic"
- Description: "Basic plan for individual agents"
- Pricing: $99/month recurring
- Copy the Price ID (starts with `price_`)

**Professional Subscription ($299/month)**
- Product name: "BookingGPT Professional" 
- Description: "Professional plan for small agencies"
- Pricing: $299/month recurring
- Copy the Price ID (starts with `price_`)

**Enterprise Subscription ($999/month)**
- Product name: "BookingGPT Enterprise"
- Description: "Enterprise plan for large agencies"
- Pricing: $999/month recurring
- Copy the Price ID (starts with `price_`)

### 1.3 Configure Webhooks
1. Go to Developers → Webhooks in Stripe Dashboard
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy the webhook signing secret (starts with `whsec_`)

## Step 2: Database Setup

### 2.1 Run Migration
Execute the payment system migration:

```bash
# Navigate to your project directory
cd /path/to/bookinggpt-v9-bolt-frontend

# Run the migration in Supabase SQL editor or CLI
supabase db push
```

The migration file `20250714000001_create_payment_tables.sql` will create:
- `subscriptions` table for B2B subscriptions
- `agent_payment_accounts` table for Stripe Connect accounts
- `customer_payments` table for customer payments
- `payment_webhooks` table for webhook logging
- `subscription_usage` table for usage tracking

### 2.2 Verify Tables
In Supabase dashboard, verify these tables exist:
- ✅ subscriptions
- ✅ agent_payment_accounts  
- ✅ customer_payments
- ✅ payment_webhooks
- ✅ subscription_usage

## Step 3: Environment Configuration

### 3.1 Update Environment Variables
Copy `.env.example` to `.env` and update with your values:

```bash
cp .env.example .env
```

Edit `.env` file:
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Stripe Price IDs
STRIPE_BASIC_PRICE_ID=price_1234567890
STRIPE_PROFESSIONAL_PRICE_ID=price_1234567891
STRIPE_ENTERPRISE_PRICE_ID=price_1234567892

# Application URLs
FRONTEND_URL=http://localhost:5173
```

### 3.2 Install Dependencies
```bash
npm install stripe
```

## Step 4: Testing Setup

### 4.1 Test Stripe Connection
```bash
# Start the development server
npm run dev:full

# Test API endpoints
curl -X GET http://localhost:3001/api/health
```

### 4.2 Test Subscription Flow
1. Navigate to `http://localhost:5173`
2. Click on a subscription plan
3. Complete the test subscription flow
4. Check Stripe dashboard for test subscription

### 4.3 Test Payment Account Setup
1. Log in as an agent
2. Navigate to Settings → Payment Setup
3. Complete the Connect account setup
4. Check Stripe Connect dashboard

## Step 5: Production Deployment

### 5.1 Environment Variables
Update production environment variables:
```env
# Use live Stripe keys
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key

# Update webhook endpoint
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret

# Production URLs
FRONTEND_URL=https://yourdomain.com
```

### 5.2 Webhook Configuration
Update your Stripe webhook endpoint to production URL:
`https://yourdomain.com/api/webhooks/stripe`

### 5.3 SSL Certificate
Ensure your production domain has a valid SSL certificate for secure payments.

## Step 6: Security Checklist

### 6.1 API Security
- ✅ All payment endpoints require authentication
- ✅ Webhook signature verification enabled
- ✅ Rate limiting implemented
- ✅ Input validation on all endpoints

### 6.2 Data Protection
- ✅ No card data stored in database
- ✅ All payments processed through Stripe
- ✅ PCI compliance through Stripe
- ✅ Encrypted sensitive data

### 6.3 Error Handling
- ✅ Comprehensive error logging
- ✅ Graceful error responses
- ✅ Webhook retry logic
- ✅ Payment failure notifications

## Step 7: Testing Scenarios

### 7.1 Subscription Tests
- [ ] Create basic subscription
- [ ] Create professional subscription  
- [ ] Create enterprise subscription
- [ ] Cancel subscription
- [ ] Subscription renewal
- [ ] Failed payment handling
- [ ] Trial period expiration

### 7.2 Payment Tests
- [ ] Create Connect account
- [ ] Complete onboarding
- [ ] Create payment intent
- [ ] Process payment
- [ ] Handle refunds
- [ ] Payout processing
- [ ] Webhook handling

### 7.3 Edge Cases
- [ ] Incomplete onboarding
- [ ] Account restrictions
- [ ] Payment failures
- [ ] Webhook failures
- [ ] Network timeouts
- [ ] Rate limiting

## Step 8: Monitoring and Maintenance

### 8.1 Monitoring Setup
1. Set up Stripe webhook monitoring
2. Configure payment failure alerts
3. Monitor subscription health
4. Track payment conversion rates

### 8.2 Regular Maintenance
- Weekly webhook status check
- Monthly payment reconciliation
- Quarterly security review
- Annual PCI compliance review

## Troubleshooting

### Common Issues

**Webhook Signature Verification Failed**
- Check webhook signing secret
- Verify raw body parsing
- Ensure correct endpoint URL

**Payment Account Setup Issues**
- Verify Connect settings in Stripe
- Check account country restrictions
- Confirm business verification status

**Subscription Creation Failed**
- Verify price IDs are correct
- Check customer email format
- Confirm trial settings

### Debug Commands

```bash
# Check webhook logs
tail -f logs/webhook.log

# Test Stripe connection
curl -X GET localhost:3001/api/stripe-connect/account \
  -H "Authorization: Bearer YOUR_TOKEN"

# Verify database connections
psql -h your-db-host -U your-user -d your-db -c "SELECT COUNT(*) FROM subscriptions;"
```

## Support

For additional support:
- Check [Stripe Documentation](https://stripe.com/docs)
- Review [Supabase Documentation](https://supabase.com/docs)
- Contact BookingGPT support team

## Security Notes

⚠️ **Important Security Considerations:**
- Never expose Stripe secret keys in frontend code
- Always verify webhook signatures
- Use HTTPS in production
- Regularly rotate API keys
- Monitor for suspicious activity
- Keep dependencies updated

## Compliance

This payment system implements:
- ✅ PCI DSS compliance through Stripe
- ✅ Strong customer authentication (SCA)
- ✅ GDPR data protection
- ✅ SOX financial controls
- ✅ Anti-money laundering (AML) checks