#!/usr/bin/env node

/**
 * BookingGPT Stripe Environment Setup Helper
 * 
 * This interactive script helps you set up your Stripe environment variables
 * by guiding you through the process and validating your API keys.
 * 
 * Usage: node scripts/setup-stripe-env.js
 */

import readline from 'readline';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Get current directory (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load existing environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask questions
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Helper function to validate Stripe API key
async function validateStripeKey(key, keyType) {
  try {
    if (!key) {
      return { valid: false, error: 'Key is required' };
    }
    
    // Check key format
    const expectedPrefix = keyType === 'secret' ? 'sk_' : 'pk_';
    if (!key.startsWith(expectedPrefix)) {
      return { valid: false, error: `Key should start with ${expectedPrefix}` };
    }
    
    // For secret keys, test API connection
    if (keyType === 'secret') {
      const stripe = new Stripe(key);
      const account = await stripe.accounts.retrieve();
      
      return { 
        valid: true, 
        account: account,
        environment: key.includes('_test_') ? 'test' : 'live'
      };
    }
    
    // For publishable keys, just check format
    return { 
      valid: true, 
      environment: key.includes('_test_') ? 'test' : 'live'
    };
    
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Helper function to check if Connect is enabled
async function checkConnectEnabled(stripe) {
  try {
    // Try to create a test account (this will fail if Connect is not enabled)
    const testAccount = await stripe.accounts.create({
      type: 'express',
      email: 'test@example.com',
      metadata: { test: 'true' }
    });
    
    // Delete the test account
    await stripe.accounts.del(testAccount.id);
    
    return { enabled: true };
  } catch (error) {
    if (error.message.includes('Connect')) {
      return { enabled: false, error: 'Stripe Connect is not enabled on your account' };
    }
    return { enabled: true }; // Other errors might be normal
  }
}

// Helper function to update .env file
function updateEnvFile(envUpdates) {
  try {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    // Read existing .env file if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update or add each environment variable
    Object.entries(envUpdates).forEach(([key, value]) => {
      if (value) {
        const keyRegex = new RegExp(`^${key}=.*$`, 'm');
        if (keyRegex.test(envContent)) {
          // Update existing key
          envContent = envContent.replace(keyRegex, `${key}=${value}`);
        } else {
          // Add new key
          envContent += `\n${key}=${value}`;
        }
      }
    });
    
    // Write back to .env file
    fs.writeFileSync(envPath, envContent.trim() + '\n');
    console.log('\n✅ .env file updated successfully');
    
  } catch (error) {
    console.error('❌ Error updating .env file:', error.message);
    console.log('\n📝 Please manually add these to your .env file:');
    Object.entries(envUpdates).forEach(([key, value]) => {
      if (value) {
        console.log(`${key}=${value}`);
      }
    });
  }
}

// Helper function to display environment summary
function displayEnvironmentSummary(config) {
  console.log('\n📋 Environment Summary:');
  console.log('======================');
  console.log(`Environment: ${config.environment}`);
  console.log(`Account: ${config.account?.business_profile?.name || config.account?.email || 'N/A'}`);
  console.log(`Country: ${config.account?.country || 'N/A'}`);
  console.log(`Connect Enabled: ${config.connectEnabled ? '✅' : '❌'}`);
  console.log(`Webhooks Configured: ${config.hasWebhookSecret ? '✅' : '❌'}`);
  console.log(`Products Configured: ${config.hasProductIds ? '✅' : '❌'}`);
}

// Main setup function
async function main() {
  console.log('🚀 BookingGPT Stripe Environment Setup');
  console.log('=======================================');
  console.log('\nThis script will help you configure your Stripe environment variables.');
  console.log('You\'ll need your Stripe API keys from: https://dashboard.stripe.com/apikeys\n');
  
  const config = {
    environment: null,
    account: null,
    connectEnabled: false,
    hasWebhookSecret: false,
    hasProductIds: false
  };
  
  const envUpdates = {};
  
  try {
    // Step 1: Get Stripe Secret Key
    console.log('🔑 Step 1: Stripe Secret Key');
    console.log('──────────────────────────');
    
    let secretKey = process.env.STRIPE_SECRET_KEY;
    if (secretKey) {
      console.log(`Current secret key: ${secretKey.substring(0, 10)}...`);
      const keepCurrent = await askQuestion('Do you want to keep the current secret key? (Y/n): ');
      if (keepCurrent.toLowerCase() === 'n' || keepCurrent.toLowerCase() === 'no') {
        secretKey = null;
      }
    }
    
    while (!secretKey) {
      secretKey = await askQuestion('Enter your Stripe secret key (sk_test_... or sk_live_...): ');
      
      console.log('🔍 Validating secret key...');
      const validation = await validateStripeKey(secretKey, 'secret');
      
      if (validation.valid) {
        console.log('✅ Secret key is valid');
        config.environment = validation.environment;
        config.account = validation.account;
        envUpdates.STRIPE_SECRET_KEY = secretKey;
        break;
      } else {
        console.log(`❌ Invalid secret key: ${validation.error}`);
        secretKey = null;
      }
    }
    
    // Step 2: Get Stripe Publishable Key
    console.log('\n🔑 Step 2: Stripe Publishable Key');
    console.log('──────────────────────────────');
    
    let publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    if (publishableKey) {
      console.log(`Current publishable key: ${publishableKey.substring(0, 10)}...`);
      const keepCurrent = await askQuestion('Do you want to keep the current publishable key? (Y/n): ');
      if (keepCurrent.toLowerCase() === 'n' || keepCurrent.toLowerCase() === 'no') {
        publishableKey = null;
      }
    }
    
    while (!publishableKey) {
      publishableKey = await askQuestion('Enter your Stripe publishable key (pk_test_... or pk_live_...): ');
      
      const validation = await validateStripeKey(publishableKey, 'publishable');
      
      if (validation.valid) {
        if (validation.environment === config.environment) {
          console.log('✅ Publishable key is valid and matches environment');
          envUpdates.STRIPE_PUBLISHABLE_KEY = publishableKey;
          break;
        } else {
          console.log(`❌ Environment mismatch: Secret key is ${config.environment} but publishable key is ${validation.environment}`);
          publishableKey = null;
        }
      } else {
        console.log(`❌ Invalid publishable key: ${validation.error}`);
        publishableKey = null;
      }
    }
    
    // Step 3: Check Stripe Connect
    console.log('\n🔗 Step 3: Stripe Connect');
    console.log('─────────────────────────');
    
    const stripe = new Stripe(secretKey);
    console.log('🔍 Checking if Stripe Connect is enabled...');
    
    const connectCheck = await checkConnectEnabled(stripe);
    config.connectEnabled = connectCheck.enabled;
    
    if (connectCheck.enabled) {
      console.log('✅ Stripe Connect is enabled');
    } else {
      console.log('❌ Stripe Connect is not enabled');
      console.log('Please enable Connect in your Stripe dashboard:');
      console.log('https://dashboard.stripe.com/connect/accounts/overview');
      
      const continueAnyway = await askQuestion('Do you want to continue anyway? (y/N): ');
      if (continueAnyway.toLowerCase() !== 'y' && continueAnyway.toLowerCase() !== 'yes') {
        console.log('⏹️  Setup cancelled. Please enable Stripe Connect first.');
        process.exit(0);
      }
    }
    
    // Step 4: Check Webhook Secret
    console.log('\n🪝 Step 4: Webhook Secret');
    console.log('────────────────────────');
    
    const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;
    config.hasWebhookSecret = hasWebhookSecret;
    
    if (hasWebhookSecret) {
      console.log('✅ Webhook secret is configured');
    } else {
      console.log('❌ Webhook secret is not configured');
      console.log('You can set this up later by running: node scripts/setup-stripe-webhooks.js');
    }
    
    // Step 5: Check Product IDs
    console.log('\n📦 Step 5: Product IDs');
    console.log('─────────────────────────');
    
    const hasBasic = !!process.env.STRIPE_BASIC_PRICE_ID;
    const hasProfessional = !!process.env.STRIPE_PROFESSIONAL_PRICE_ID;
    const hasEnterprise = !!process.env.STRIPE_ENTERPRISE_PRICE_ID;
    
    config.hasProductIds = hasBasic && hasProfessional && hasEnterprise;
    
    if (config.hasProductIds) {
      console.log('✅ All product IDs are configured');
    } else {
      console.log('❌ Product IDs are missing:');
      if (!hasBasic) console.log('   - STRIPE_BASIC_PRICE_ID');
      if (!hasProfessional) console.log('   - STRIPE_PROFESSIONAL_PRICE_ID');
      if (!hasEnterprise) console.log('   - STRIPE_ENTERPRISE_PRICE_ID');
      console.log('You can set these up by running: node scripts/create-stripe-products.js');
    }
    
    // Step 6: Configure URLs
    console.log('\n🌐 Step 6: Application URLs');
    console.log('──────────────────────────');
    
    let frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      frontendUrl = await askQuestion('Enter your frontend URL (e.g., http://localhost:5173): ');
      envUpdates.FRONTEND_URL = frontendUrl;
    } else {
      console.log(`Current frontend URL: ${frontendUrl}`);
    }
    
    let backendPort = process.env.PORT;
    if (!backendPort) {
      backendPort = await askQuestion('Enter your backend port (default: 3001): ') || '3001';
      envUpdates.PORT = backendPort;
    } else {
      console.log(`Current backend port: ${backendPort}`);
    }
    
    // Step 7: Update .env file
    console.log('\n💾 Step 7: Save Configuration');
    console.log('────────────────────────────');
    
    if (Object.keys(envUpdates).length > 0) {
      updateEnvFile(envUpdates);
    } else {
      console.log('✅ No changes needed - all configurations are already set');
    }
    
    // Step 8: Display summary
    displayEnvironmentSummary(config);
    
    // Final recommendations
    console.log('\n📝 Next Steps:');
    console.log('==============');
    
    if (!config.hasProductIds) {
      console.log('1. Create Stripe products: node scripts/create-stripe-products.js');
    }
    
    if (!config.hasWebhookSecret) {
      console.log('2. Set up webhooks: node scripts/setup-stripe-webhooks.js');
    }
    
    if (!config.connectEnabled) {
      console.log('3. Enable Stripe Connect in your dashboard');
    }
    
    console.log('4. Test your setup: node scripts/verify-stripe-setup.js');
    console.log('5. Start your application: npm run dev:full');
    
    console.log('\n🎉 Environment setup complete!');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { validateStripeKey, checkConnectEnabled };