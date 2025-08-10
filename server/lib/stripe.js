import Stripe from 'stripe';

// Initialize Stripe with secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey || stripeSecretKey === 'sk_test_placeholder_for_demo') {
  console.warn('Missing or placeholder STRIPE_SECRET_KEY - Stripe features will be disabled');
}

const stripe = stripeSecretKey && stripeSecretKey !== 'sk_test_placeholder_for_demo' 
  ? new Stripe(stripeSecretKey)
  : null;

export default stripe;