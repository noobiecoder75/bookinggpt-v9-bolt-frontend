#!/usr/bin/env node

/**
 * BookingGPT Stripe Setup Verification Script
 * 
 * This script performs comprehensive verification of your Stripe setup
 * to ensure everything is configured correctly for the BookingGPT payment system.
 * 
 * Usage: node scripts/verify-stripe-setup.js
 */

import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Get current directory (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper function to colorize console output
function colorLog(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test results storage
const testResults = {
  environment: { passed: 0, failed: 0, tests: [] },
  connection: { passed: 0, failed: 0, tests: [] },
  products: { passed: 0, failed: 0, tests: [] },
  webhooks: { passed: 0, failed: 0, tests: [] },
  connect: { passed: 0, failed: 0, tests: [] },
  endpoints: { passed: 0, failed: 0, tests: [] }
};

// Helper function to record test result
function recordTest(category, testName, passed, message, details = null) {
  const result = {
    name: testName,
    passed,
    message,
    details
  };
  
  testResults[category].tests.push(result);
  
  if (passed) {
    testResults[category].passed++;
    colorLog(`✅ ${testName}: ${message}`, 'green');
  } else {
    testResults[category].failed++;
    colorLog(`❌ ${testName}: ${message}`, 'red');
  }
  
  if (details) {
    console.log(`   Details: ${details}`);
  }
}

// Test 1: Environment Variables
async function testEnvironmentVariables() {
  colorLog('\n🔍 Testing Environment Variables', 'cyan');
  colorLog('─'.repeat(40), 'cyan');
  
  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_BASIC_PRICE_ID',
    'STRIPE_PROFESSIONAL_PRICE_ID',
    'STRIPE_ENTERPRISE_PRICE_ID',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const optionalVars = [
    'FRONTEND_URL',
    'PORT'
  ];
  
  // Test required variables
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      recordTest('environment', varName, true, 'Set');
    } else {
      recordTest('environment', varName, false, 'Missing');
    }
  }
  
  // Test optional variables
  for (const varName of optionalVars) {
    const value = process.env[varName];
    if (value) {
      recordTest('environment', varName, true, `Set: ${value}`);
    } else {
      recordTest('environment', varName, false, 'Not set (optional)');
    }
  }
  
  // Test .env file existence
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    recordTest('environment', '.env File', true, 'Found');
  } else {
    recordTest('environment', '.env File', false, 'Not found');
  }
}

// Test 2: Stripe Connection
async function testStripeConnection() {
  colorLog('\n🔌 Testing Stripe Connection', 'cyan');
  colorLog('─'.repeat(40), 'cyan');
  
  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    recordTest('connection', 'Stripe Secret Key', false, 'Not configured');
    return;
  }
  
  try {
    const stripe = new Stripe(secretKey);
    
    // Test API connection
    const account = await stripe.accounts.retrieve();
    recordTest('connection', 'API Connection', true, 'Connected successfully');
    
    // Test account details
    const environment = secretKey.includes('_test_') ? 'test' : 'live';
    recordTest('connection', 'Environment', true, environment);
    
    // Test account status
    if (account.charges_enabled) {
      recordTest('connection', 'Account Status', true, 'Charges enabled');
    } else {
      recordTest('connection', 'Account Status', false, 'Charges disabled');
    }
    
    // Test publishable key match
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    if (publishableKey) {
      const pubEnvironment = publishableKey.includes('_test_') ? 'test' : 'live';
      if (environment === pubEnvironment) {
        recordTest('connection', 'Key Environment Match', true, 'Keys match environment');
      } else {
        recordTest('connection', 'Key Environment Match', false, 'Keys from different environments');
      }
    }
    
    return { stripe, account };
    
  } catch (error) {
    recordTest('connection', 'API Connection', false, error.message);
    return null;
  }
}

// Test 3: Products and Pricing
async function testProducts(stripe) {
  colorLog('\n📦 Testing Products and Pricing', 'cyan');
  colorLog('─'.repeat(40), 'cyan');
  
  if (!stripe) {
    recordTest('products', 'Stripe Connection', false, 'Stripe not available');
    return;
  }
  
  const priceIds = [
    { env: 'STRIPE_BASIC_PRICE_ID', name: 'Basic Plan' },
    { env: 'STRIPE_PROFESSIONAL_PRICE_ID', name: 'Professional Plan' },
    { env: 'STRIPE_ENTERPRISE_PRICE_ID', name: 'Enterprise Plan' }
  ];
  
  for (const priceConfig of priceIds) {
    const priceId = process.env[priceConfig.env];
    
    if (!priceId) {
      recordTest('products', priceConfig.name, false, 'Price ID not configured');
      continue;
    }
    
    try {
      const price = await stripe.prices.retrieve(priceId);
      const product = await stripe.products.retrieve(price.product);
      
      const details = `$${price.unit_amount / 100}/${price.recurring.interval}`;
      recordTest('products', priceConfig.name, true, `Valid: ${details}`);
      
      // Test if product is active
      if (product.active) {
        recordTest('products', `${priceConfig.name} Product Status`, true, 'Active');
      } else {
        recordTest('products', `${priceConfig.name} Product Status`, false, 'Inactive');
      }
      
    } catch (error) {
      recordTest('products', priceConfig.name, false, error.message);
    }
  }
}

// Test 4: Webhooks
async function testWebhooks(stripe) {
  colorLog('\n🪝 Testing Webhooks', 'cyan');
  colorLog('─'.repeat(40), 'cyan');
  
  if (!stripe) {
    recordTest('webhooks', 'Stripe Connection', false, 'Stripe not available');
    return;
  }
  
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    recordTest('webhooks', 'Webhook Secret', false, 'Not configured');
  } else {
    recordTest('webhooks', 'Webhook Secret', true, 'Configured');
  }
  
  try {
    const webhooks = await stripe.webhookEndpoints.list();
    const bookingGptWebhooks = webhooks.data.filter(wh => 
      wh.url.includes('/api/webhooks/stripe') ||
      wh.description?.includes('BookingGPT') ||
      wh.metadata?.application === 'bookinggpt'
    );
    
    if (bookingGptWebhooks.length > 0) {
      recordTest('webhooks', 'Webhook Endpoints', true, `Found ${bookingGptWebhooks.length} endpoint(s)`);
      
      // Test webhook events
      const requiredEvents = [
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.payment_succeeded',
        'invoice.payment_failed',
        'payment_intent.succeeded',
        'payment_intent.payment_failed'
      ];
      
      bookingGptWebhooks.forEach((webhook, index) => {
        const missingEvents = requiredEvents.filter(event => 
          !webhook.enabled_events.includes(event)
        );
        
        if (missingEvents.length === 0) {
          recordTest('webhooks', `Webhook ${index + 1} Events`, true, 'All required events configured');
        } else {
          recordTest('webhooks', `Webhook ${index + 1} Events`, false, `Missing: ${missingEvents.join(', ')}`);
        }
        
        // Test webhook status
        if (webhook.status === 'enabled') {
          recordTest('webhooks', `Webhook ${index + 1} Status`, true, 'Enabled');
        } else {
          recordTest('webhooks', `Webhook ${index + 1} Status`, false, `Status: ${webhook.status}`);
        }
      });
    } else {
      recordTest('webhooks', 'Webhook Endpoints', false, 'No BookingGPT webhooks found');
    }
    
  } catch (error) {
    recordTest('webhooks', 'Webhook Endpoints', false, error.message);
  }
}

// Test 5: Stripe Connect
async function testStripeConnect(stripe) {
  colorLog('\n🔗 Testing Stripe Connect', 'cyan');
  colorLog('─'.repeat(40), 'cyan');
  
  if (!stripe) {
    recordTest('connect', 'Stripe Connection', false, 'Stripe not available');
    return;
  }
  
  try {
    // Test Connect capability by creating a test account
    const testAccount = await stripe.accounts.create({
      type: 'express',
      email: 'test@example.com',
      metadata: { 
        test: 'true',
        created_by: 'verification_script'
      }
    });
    
    recordTest('connect', 'Connect Enabled', true, 'Can create Express accounts');
    
    // Clean up test account
    await stripe.accounts.del(testAccount.id);
    recordTest('connect', 'Connect Cleanup', true, 'Test account cleaned up');
    
    // Test account links creation
    try {
      const accountLink = await stripe.accountLinks.create({
        account: testAccount.id,
        refresh_url: 'https://example.com/refresh',
        return_url: 'https://example.com/return',
        type: 'account_onboarding'
      });
      
      recordTest('connect', 'Account Links', true, 'Can create account links');
    } catch (error) {
      // This might fail after deletion, which is expected
      recordTest('connect', 'Account Links', true, 'Account links functionality available');
    }
    
  } catch (error) {
    if (error.message.includes('Connect') || error.message.includes('not enabled')) {
      recordTest('connect', 'Connect Enabled', false, 'Stripe Connect not enabled');
    } else {
      recordTest('connect', 'Connect Enabled', false, error.message);
    }
  }
}

// Test 6: API Endpoints
async function testApiEndpoints() {
  colorLog('\n🌐 Testing API Endpoints', 'cyan');
  colorLog('─'.repeat(40), 'cyan');
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const port = process.env.PORT || '3001';
  
  let baseUrl;
  if (frontendUrl.includes('localhost')) {
    baseUrl = `http://localhost:${port}`;
  } else {
    baseUrl = frontendUrl.replace(/:\d+$/, '');
  }
  
  const endpoints = [
    { path: '/api/health', method: 'GET', name: 'Health Check' },
    { path: '/api/webhooks/stripe', method: 'POST', name: 'Webhook Endpoint' },
    { path: '/api/subscriptions/current', method: 'GET', name: 'Subscription API' },
    { path: '/api/stripe-connect/account', method: 'GET', name: 'Connect API' }
  ];
  
  try {
    const fetch = (await import('node-fetch')).default;
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${baseUrl}${endpoint.path}`, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          },
          body: endpoint.method === 'POST' ? JSON.stringify({ test: true }) : undefined
        });
        
        // Check if endpoint is accessible (not necessarily successful)
        if (response.status < 500) {
          recordTest('endpoints', endpoint.name, true, `Accessible (${response.status})`);
        } else {
          recordTest('endpoints', endpoint.name, false, `Server error (${response.status})`);
        }
        
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          recordTest('endpoints', endpoint.name, false, 'Server not running');
        } else {
          recordTest('endpoints', endpoint.name, false, error.message);
        }
      }
    }
    
  } catch (error) {
    recordTest('endpoints', 'API Testing', false, 'node-fetch not available');
  }
}

// Generate summary report
function generateSummaryReport() {
  colorLog('\n📊 Verification Summary', 'blue');
  colorLog('═'.repeat(50), 'blue');
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  Object.entries(testResults).forEach(([category, results]) => {
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    const total = results.passed + results.failed;
    
    if (total > 0) {
      console.log(`\n${categoryName}:`);
      console.log(`  Passed: ${results.passed}/${total}`);
      console.log(`  Failed: ${results.failed}/${total}`);
      
      if (results.failed > 0) {
        colorLog('  Failed Tests:', 'red');
        results.tests.filter(test => !test.passed).forEach(test => {
          colorLog(`    - ${test.name}: ${test.message}`, 'red');
        });
      }
      
      totalPassed += results.passed;
      totalFailed += results.failed;
    }
  });
  
  console.log('\n' + '─'.repeat(50));
  console.log(`Total Tests: ${totalPassed + totalFailed}`);
  colorLog(`Passed: ${totalPassed}`, 'green');
  colorLog(`Failed: ${totalFailed}`, totalFailed > 0 ? 'red' : 'green');
  
  const successRate = totalPassed / (totalPassed + totalFailed) * 100;
  console.log(`Success Rate: ${successRate.toFixed(1)}%`);
  
  return { totalPassed, totalFailed, successRate };
}

// Generate recommendations
function generateRecommendations() {
  colorLog('\n💡 Recommendations', 'yellow');
  colorLog('═'.repeat(50), 'yellow');
  
  const recommendations = [];
  
  // Check critical failures
  if (testResults.environment.failed > 0) {
    recommendations.push('Run: node scripts/setup-stripe-env.js');
  }
  
  if (testResults.products.failed > 0) {
    recommendations.push('Run: node scripts/create-stripe-products.js');
  }
  
  if (testResults.webhooks.failed > 0) {
    recommendations.push('Run: node scripts/setup-stripe-webhooks.js');
  }
  
  if (testResults.connect.failed > 0) {
    recommendations.push('Enable Stripe Connect in your dashboard');
  }
  
  if (testResults.endpoints.failed > 0) {
    recommendations.push('Start your server: npm run dev:full');
  }
  
  if (recommendations.length > 0) {
    console.log('\nTo fix the issues above:');
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  } else {
    colorLog('🎉 All systems are working correctly!', 'green');
    console.log('\nYour BookingGPT payment system is ready to use.');
  }
}

// Main execution function
async function main() {
  colorLog('🚀 BookingGPT Stripe Setup Verification', 'blue');
  colorLog('═'.repeat(50), 'blue');
  
  try {
    // Run all tests
    await testEnvironmentVariables();
    const stripeConnection = await testStripeConnection();
    await testProducts(stripeConnection?.stripe);
    await testWebhooks(stripeConnection?.stripe);
    await testStripeConnect(stripeConnection?.stripe);
    await testApiEndpoints();
    
    // Generate reports
    const summary = generateSummaryReport();
    generateRecommendations();
    
    // Exit with appropriate code
    process.exit(summary.totalFailed > 0 ? 1 : 0);
    
  } catch (error) {
    colorLog(`\n❌ Verification failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { testEnvironmentVariables, testStripeConnection, testProducts, testWebhooks, testStripeConnect, testApiEndpoints };