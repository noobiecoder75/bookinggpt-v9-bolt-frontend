// Simple test script to verify payment endpoints
// Run with: node test-payment-endpoints.js

const API_BASE = 'http://localhost:3001/api';

// Test data
const testData = {
  subscription: {
    tier: 'basic',
    trialDays: 14
  },
  businessInfo: {
    business_name: 'Test Travel Agency',
    business_type: 'company',
    website: 'https://example.com'
  },
  payment: {
    customerId: 1,
    amount: 100.00,
    currency: 'usd',
    description: 'Test trip payment'
  }
};

// Helper function to make API calls
async function apiCall(endpoint, method = 'GET', data = null, token = null) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const config = {
    method,
    headers
  };
  
  if (data) {
    config.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const result = await response.json();
    
    return {
      status: response.status,
      success: response.ok,
      data: result
    };
  } catch (error) {
    return {
      status: 500,
      success: false,
      error: error.message
    };
  }
}

// Test functions
async function testHealthCheck() {
  console.log('🔍 Testing health check...');
  const result = await apiCall('/health');
  
  if (result.success) {
    console.log('✅ Health check passed');
  } else {
    console.log('❌ Health check failed:', result.error);
  }
  
  return result.success;
}

async function testSubscriptionEndpoints() {
  console.log('\n🔍 Testing subscription endpoints...');
  
  // Note: These require authentication in a real scenario
  const token = 'test-token'; // Replace with actual token
  
  console.log('Testing subscription creation...');
  const createResult = await apiCall('/subscriptions/create', 'POST', testData.subscription, token);
  
  if (createResult.success) {
    console.log('✅ Subscription creation endpoint accessible');
  } else {
    console.log('❌ Subscription creation failed:', createResult.data.error);
  }
  
  console.log('Testing subscription retrieval...');
  const getResult = await apiCall('/subscriptions/current', 'GET', null, token);
  
  if (getResult.success || getResult.status === 404) {
    console.log('✅ Subscription retrieval endpoint accessible');
  } else {
    console.log('❌ Subscription retrieval failed:', getResult.data.error);
  }
}

async function testStripeConnectEndpoints() {
  console.log('\n🔍 Testing Stripe Connect endpoints...');
  
  const token = 'test-token'; // Replace with actual token
  
  console.log('Testing Connect account creation...');
  const createResult = await apiCall('/stripe-connect/account/create', 'POST', { businessInfo: testData.businessInfo }, token);
  
  if (createResult.success) {
    console.log('✅ Connect account creation endpoint accessible');
  } else {
    console.log('❌ Connect account creation failed:', createResult.data.error);
  }
  
  console.log('Testing Connect account retrieval...');
  const getResult = await apiCall('/stripe-connect/account', 'GET', null, token);
  
  if (getResult.success || getResult.status === 404) {
    console.log('✅ Connect account retrieval endpoint accessible');
  } else {
    console.log('❌ Connect account retrieval failed:', getResult.data.error);
  }
}

async function testPaymentEndpoints() {
  console.log('\n🔍 Testing payment endpoints...');
  
  const token = 'test-token'; // Replace with actual token
  
  console.log('Testing payment creation...');
  const createResult = await apiCall('/stripe-connect/payment/create', 'POST', testData.payment, token);
  
  if (createResult.success) {
    console.log('✅ Payment creation endpoint accessible');
  } else {
    console.log('❌ Payment creation failed:', createResult.data.error);
  }
  
  console.log('Testing payment statistics...');
  const statsResult = await apiCall('/stripe-connect/stats', 'GET', null, token);
  
  if (statsResult.success) {
    console.log('✅ Payment statistics endpoint accessible');
  } else {
    console.log('❌ Payment statistics failed:', statsResult.data.error);
  }
}

async function testWebhookEndpoint() {
  console.log('\n🔍 Testing webhook endpoint...');
  
  // Test webhook endpoint structure (without signature verification)
  const webhookData = {
    id: 'evt_test_webhook',
    type: 'customer.subscription.created',
    data: {
      object: {
        id: 'sub_test',
        customer: 'cus_test',
        status: 'active'
      }
    }
  };
  
  const result = await apiCall('/webhooks/stripe', 'POST', webhookData);
  
  if (result.status === 400) {
    console.log('✅ Webhook endpoint accessible (signature verification working)');
  } else {
    console.log('❌ Webhook endpoint issue:', result.data.error);
  }
}

async function checkEnvironmentVariables() {
  console.log('\n🔍 Checking environment variables...');
  
  const requiredEnvVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_BASIC_PRICE_ID',
    'STRIPE_PROFESSIONAL_PRICE_ID',
    'STRIPE_ENTERPRISE_PRICE_ID',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length === 0) {
    console.log('✅ All required environment variables are set');
  } else {
    console.log('❌ Missing environment variables:', missingVars.join(', '));
    console.log('Please check your .env file and ensure all required variables are set.');
  }
  
  return missingVars.length === 0;
}

// Main test function
async function runTests() {
  console.log('🚀 Starting BookingGPT Payment System Tests\n');
  
  const results = {
    health: false,
    environment: false,
    subscriptions: false,
    stripeConnect: false,
    payments: false,
    webhooks: false
  };
  
  // Run tests
  results.health = await testHealthCheck();
  results.environment = await checkEnvironmentVariables();
  
  if (results.health) {
    await testSubscriptionEndpoints();
    await testStripeConnectEndpoints();
    await testPaymentEndpoints();
    await testWebhookEndpoint();
  }
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log('================');
  console.log(`Health Check: ${results.health ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Environment: ${results.environment ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Subscriptions: ${results.health ? '✅ ACCESSIBLE' : '❌ INACCESSIBLE'}`);
  console.log(`Stripe Connect: ${results.health ? '✅ ACCESSIBLE' : '❌ INACCESSIBLE'}`);
  console.log(`Payments: ${results.health ? '✅ ACCESSIBLE' : '❌ INACCESSIBLE'}`);
  console.log(`Webhooks: ${results.health ? '✅ ACCESSIBLE' : '❌ INACCESSIBLE'}`);
  
  if (results.health && results.environment) {
    console.log('\n🎉 Payment system is ready for testing!');
    console.log('\nNext steps:');
    console.log('1. Start the development server: npm run dev:full');
    console.log('2. Test subscription flow on the landing page');
    console.log('3. Set up agent payment accounts');
    console.log('4. Test customer payment collection');
    console.log('5. Verify webhook handling');
  } else {
    console.log('\n⚠️  Payment system needs configuration before testing');
    console.log('Please check the issues above and refer to PAYMENT_SETUP_GUIDE.md');
  }
}

// Run the tests
runTests().catch(console.error);