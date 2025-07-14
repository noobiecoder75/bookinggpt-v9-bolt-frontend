#!/usr/bin/env node

/**
 * BookingGPT Stripe Webhooks Setup Script
 * 
 * This script automatically creates and configures the webhook endpoint
 * required for the BookingGPT payment system.
 * 
 * Usage: node scripts/setup-stripe-webhooks.js
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

// Validate required environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is required in .env file');
  console.error('Please add your Stripe secret key to .env file:');
  console.error('STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key');
  process.exit(1);
}

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Required webhook events
const REQUIRED_EVENTS = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'customer.subscription.trial_will_end',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'account.updated',
  'account.application.authorized',
  'account.application.deauthorized'
];

// Helper function to get webhook URL
function getWebhookUrl() {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const backendPort = process.env.PORT || '3001';
  
  // Determine base URL
  let baseUrl;
  if (frontendUrl.includes('localhost')) {
    // Development environment
    baseUrl = `http://localhost:${backendPort}`;
  } else {
    // Production environment - assume same domain
    baseUrl = frontendUrl.replace(/:\d+$/, ''); // Remove port if present
  }
  
  return `${baseUrl}/api/webhooks/stripe`;
}

// Helper function to create webhook endpoint
async function createWebhookEndpoint(url) {
  try {
    console.log(`\n📡 Creating webhook endpoint: ${url}`);
    
    const webhookEndpoint = await stripe.webhookEndpoints.create({
      url: url,
      enabled_events: REQUIRED_EVENTS,
      description: 'BookingGPT Payment System Webhook',
      metadata: {
        application: 'bookinggpt',
        created_by: 'setup-script',
        version: '1.0'
      }
    });
    
    console.log(`✅ Webhook endpoint created: ${webhookEndpoint.id}`);
    console.log(`🔐 Webhook signing secret: ${webhookEndpoint.secret}`);
    
    return webhookEndpoint;
    
  } catch (error) {
    console.error(`❌ Error creating webhook endpoint:`, error.message);
    throw error;
  }
}

// Helper function to check existing webhooks
async function checkExistingWebhooks() {
  try {
    const existingWebhooks = await stripe.webhookEndpoints.list({
      limit: 100
    });
    
    const bookingGptWebhooks = existingWebhooks.data.filter(webhook => 
      webhook.url.includes('/api/webhooks/stripe') || 
      webhook.description?.includes('BookingGPT') ||
      webhook.metadata?.application === 'bookinggpt'
    );
    
    if (bookingGptWebhooks.length > 0) {
      console.log('\n⚠️  Existing BookingGPT webhooks found:');
      bookingGptWebhooks.forEach(webhook => {
        console.log(`   - ${webhook.url} (${webhook.id})`);
        console.log(`     Status: ${webhook.status}`);
        console.log(`     Events: ${webhook.enabled_events.length}`);
      });
      
      // Ask user if they want to continue
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      return new Promise((resolve) => {
        rl.question('\nDo you want to create a new webhook anyway? (y/N): ', (answer) => {
          rl.close();
          resolve({
            continue: answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes',
            existing: bookingGptWebhooks
          });
        });
      });
    }
    
    return { continue: true, existing: [] };
  } catch (error) {
    console.error('❌ Error checking existing webhooks:', error.message);
    return { continue: false, existing: [] };
  }
}

// Helper function to test webhook endpoint
async function testWebhookEndpoint(url) {
  try {
    console.log(`\n🧪 Testing webhook endpoint: ${url}`);
    
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'test'
      },
      body: JSON.stringify({
        id: 'evt_test',
        type: 'customer.subscription.created',
        data: { object: {} }
      })
    });
    
    if (response.status === 400) {
      console.log('✅ Webhook endpoint is accessible (signature verification working)');
      return true;
    } else {
      console.log(`⚠️  Webhook endpoint returned status ${response.status}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Error testing webhook endpoint: ${error.message}`);
    return false;
  }
}

// Helper function to update .env file
async function updateEnvFile(webhookSecret) {
  try {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    // Read existing .env file if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update or add webhook secret
    const envKey = 'STRIPE_WEBHOOK_SECRET';
    const keyRegex = new RegExp(`^${envKey}=.*$`, 'm');
    
    if (keyRegex.test(envContent)) {
      // Update existing key
      envContent = envContent.replace(keyRegex, `${envKey}=${webhookSecret}`);
    } else {
      // Add new key
      envContent += `\n${envKey}=${webhookSecret}`;
    }
    
    // Write back to .env file
    fs.writeFileSync(envPath, envContent.trim() + '\n');
    console.log('\n✅ .env file updated with webhook secret');
    
  } catch (error) {
    console.error('❌ Error updating .env file:', error.message);
    console.log('\n📝 Please manually add this to your .env file:');
    console.log(`STRIPE_WEBHOOK_SECRET=${webhookSecret}`);
  }
}

// Helper function to validate webhook events
function validateWebhookEvents(webhook) {
  const missingEvents = REQUIRED_EVENTS.filter(event => 
    !webhook.enabled_events.includes(event)
  );
  
  if (missingEvents.length > 0) {
    console.log('\n⚠️  Missing required events:');
    missingEvents.forEach(event => {
      console.log(`   - ${event}`);
    });
    return false;
  }
  
  console.log('✅ All required events are configured');
  return true;
}

// Main execution function
async function main() {
  console.log('🚀 BookingGPT Stripe Webhooks Setup');
  console.log('====================================');
  
  try {
    // Test Stripe connection
    console.log('\n🔍 Testing Stripe connection...');
    await stripe.accounts.retrieve();
    console.log('✅ Stripe connection successful');
    
    // Get webhook URL
    const webhookUrl = getWebhookUrl();
    console.log(`\n🎯 Webhook URL: ${webhookUrl}`);
    
    // Test webhook endpoint accessibility
    const isAccessible = await testWebhookEndpoint(webhookUrl);
    if (!isAccessible) {
      console.log('\n⚠️  Warning: Webhook endpoint may not be accessible');
      console.log('Make sure your server is running and accessible at the configured URL');
    }
    
    // Check for existing webhooks
    const { continue: shouldContinue, existing } = await checkExistingWebhooks();
    if (!shouldContinue) {
      console.log('\n⏹️  Setup cancelled by user');
      process.exit(0);
    }
    
    // Create webhook endpoint
    const webhook = await createWebhookEndpoint(webhookUrl);
    
    // Validate events
    validateWebhookEvents(webhook);
    
    // Update .env file
    await updateEnvFile(webhook.secret);
    
    // Display summary
    console.log('\n🎉 Webhook Setup Complete!');
    console.log('===========================');
    console.log(`\n✅ Webhook Endpoint: ${webhook.url}`);
    console.log(`✅ Webhook ID: ${webhook.id}`);
    console.log(`✅ Status: ${webhook.status}`);
    console.log(`✅ Events Configured: ${webhook.enabled_events.length}`);
    
    console.log('\n📋 Configured Events:');
    webhook.enabled_events.forEach(event => {
      console.log(`   - ${event}`);
    });
    
    console.log('\n🔐 Security:');
    console.log(`   - Webhook signing secret added to .env file`);
    console.log(`   - Signature verification enabled`);
    
    console.log('\n📝 Next Steps:');
    console.log('1. Verify the webhook secret has been added to your .env file');
    console.log('2. Restart your server to load the new environment variable');
    console.log('3. Test webhook handling with: node scripts/verify-stripe-setup.js');
    console.log('4. Monitor webhook events in your Stripe dashboard');
    
    console.log('\n💡 Tip: You can view and manage webhooks in your Stripe dashboard at:');
    console.log('https://dashboard.stripe.com/webhooks');
    
    // Show existing webhooks if any
    if (existing.length > 0) {
      console.log('\n📊 All BookingGPT Webhooks:');
      existing.concat([webhook]).forEach((wh, index) => {
        console.log(`   ${index + 1}. ${wh.url} (${wh.id}) - ${wh.status}`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    
    if (error.type === 'StripeAuthenticationError') {
      console.error('\n🔑 Authentication Error:');
      console.error('Please check your STRIPE_SECRET_KEY in the .env file');
      console.error('Make sure you\'re using the correct key for your environment (test/live)');
    } else if (error.type === 'StripePermissionError') {
      console.error('\n🚫 Permission Error:');
      console.error('Your Stripe account doesn\'t have permission to create webhooks');
      console.error('Please check your account settings or contact Stripe support');
    } else if (error.code === 'ENOTFOUND') {
      console.error('\n🌐 Network Error:');
      console.error('Unable to connect to Stripe. Please check your internet connection');
    } else if (error.message.includes('url')) {
      console.error('\n🔗 URL Error:');
      console.error('Invalid webhook URL. Please check your FRONTEND_URL in .env file');
      console.error('Make sure your server is accessible at the configured URL');
    }
    
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { createWebhookEndpoint, REQUIRED_EVENTS };