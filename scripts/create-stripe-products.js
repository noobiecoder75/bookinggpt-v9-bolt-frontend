#!/usr/bin/env node

/**
 * BookingGPT Stripe Products Creation Script
 * 
 * This script automatically creates the three subscription products
 * required for the BookingGPT payment system.
 * 
 * Usage: node scripts/create-stripe-products.js
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

// Product configurations
const products = [
  {
    name: 'BookingGPT Basic',
    description: 'Basic plan for individual travel agents - up to 100 quotes per month with essential features',
    price: 9900, // $99.00 in cents
    nickname: 'Basic Monthly',
    envKey: 'STRIPE_BASIC_PRICE_ID',
    features: [
      'Up to 100 quotes per month',
      'Basic customer management',
      'AI-powered quote generation',
      'Email support',
      'Standard reporting'
    ]
  },
  {
    name: 'BookingGPT Professional',
    description: 'Professional plan for small agencies - up to 500 quotes per month with advanced features',
    price: 29900, // $299.00 in cents
    nickname: 'Professional Monthly',
    envKey: 'STRIPE_PROFESSIONAL_PRICE_ID',
    features: [
      'Up to 500 quotes per month',
      'Advanced customer management',
      'Team collaboration tools',
      'Priority support',
      'Advanced analytics',
      'Custom branding'
    ]
  },
  {
    name: 'BookingGPT Enterprise',
    description: 'Enterprise plan for large agencies - unlimited quotes with full feature access',
    price: 99900, // $999.00 in cents
    nickname: 'Enterprise Monthly',
    envKey: 'STRIPE_ENTERPRISE_PRICE_ID',
    features: [
      'Unlimited quotes',
      'Full team management',
      'Custom integrations',
      'Dedicated account manager',
      'White-label options',
      'SLA guarantees'
    ]
  }
];

// Helper function to create a product and price
async function createProduct(productConfig) {
  try {
    console.log(`\n📦 Creating product: ${productConfig.name}`);
    
    // Create the product
    const product = await stripe.products.create({
      name: productConfig.name,
      description: productConfig.description,
      type: 'service',
      metadata: {
        plan_type: productConfig.nickname.toLowerCase().replace(' ', '_'),
        features: productConfig.features.join(', ')
      }
    });
    
    console.log(`✅ Product created: ${product.id}`);
    
    // Create the price
    console.log(`💰 Creating price for ${productConfig.name}...`);
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: productConfig.price,
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      nickname: productConfig.nickname,
      metadata: {
        plan_type: productConfig.nickname.toLowerCase().replace(' ', '_')
      }
    });
    
    console.log(`✅ Price created: ${price.id}`);
    
    return {
      product,
      price,
      envKey: productConfig.envKey,
      name: productConfig.name,
      amount: productConfig.price / 100
    };
    
  } catch (error) {
    console.error(`❌ Error creating ${productConfig.name}:`, error.message);
    throw error;
  }
}

// Helper function to check if products already exist
async function checkExistingProducts() {
  try {
    const existingProducts = await stripe.products.list({
      limit: 100
    });
    
    const bookingGptProducts = existingProducts.data.filter(product => 
      product.name.includes('BookingGPT')
    );
    
    if (bookingGptProducts.length > 0) {
      console.log('\n⚠️  Existing BookingGPT products found:');
      bookingGptProducts.forEach(product => {
        console.log(`   - ${product.name} (${product.id})`);
      });
      
      // Ask user if they want to continue
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      return new Promise((resolve) => {
        readline.question('\nDo you want to create new products anyway? (y/N): ', (answer) => {
          readline.close();
          resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error checking existing products:', error.message);
    return false;
  }
}

// Helper function to update .env file
async function updateEnvFile(results) {
  try {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    // Read existing .env file if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update or add each price ID
    results.forEach(result => {
      const envKey = result.envKey;
      const priceId = result.price.id;
      
      // Check if key already exists
      const keyRegex = new RegExp(`^${envKey}=.*$`, 'm');
      if (keyRegex.test(envContent)) {
        // Update existing key
        envContent = envContent.replace(keyRegex, `${envKey}=${priceId}`);
      } else {
        // Add new key
        envContent += `\n${envKey}=${priceId}`;
      }
    });
    
    // Write back to .env file
    fs.writeFileSync(envPath, envContent.trim() + '\n');
    console.log('\n✅ .env file updated with new price IDs');
    
  } catch (error) {
    console.error('❌ Error updating .env file:', error.message);
    console.log('\n📝 Please manually add these to your .env file:');
    results.forEach(result => {
      console.log(`${result.envKey}=${result.price.id}`);
    });
  }
}

// Main execution function
async function main() {
  console.log('🚀 BookingGPT Stripe Products Setup');
  console.log('====================================');
  
  try {
    // Test Stripe connection
    console.log('\n🔍 Testing Stripe connection...');
    await stripe.accounts.retrieve();
    console.log('✅ Stripe connection successful');
    
    // Check for existing products
    const shouldContinue = await checkExistingProducts();
    if (!shouldContinue) {
      console.log('\n⏹️  Setup cancelled by user');
      process.exit(0);
    }
    
    // Create all products
    console.log('\n🏗️  Creating products...');
    const results = [];
    
    for (const productConfig of products) {
      const result = await createProduct(productConfig);
      results.push(result);
    }
    
    // Update .env file
    await updateEnvFile(results);
    
    // Display summary
    console.log('\n🎉 Setup Complete!');
    console.log('==================');
    console.log('\nCreated Products:');
    results.forEach(result => {
      console.log(`✅ ${result.name}: $${result.amount}/month`);
      console.log(`   Product ID: ${result.product.id}`);
      console.log(`   Price ID: ${result.price.id}`);
      console.log(`   Environment Variable: ${result.envKey}`);
      console.log('');
    });
    
    console.log('📝 Next Steps:');
    console.log('1. Verify the price IDs have been added to your .env file');
    console.log('2. Set up webhooks using: node scripts/setup-stripe-webhooks.js');
    console.log('3. Test the subscription flow on your application');
    console.log('4. Configure Stripe Connect for agent payments');
    
    console.log('\n💡 Tip: You can view these products in your Stripe dashboard at:');
    console.log('https://dashboard.stripe.com/products');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    
    if (error.type === 'StripeAuthenticationError') {
      console.error('\n🔑 Authentication Error:');
      console.error('Please check your STRIPE_SECRET_KEY in the .env file');
      console.error('Make sure you\'re using the correct key for your environment (test/live)');
    } else if (error.type === 'StripePermissionError') {
      console.error('\n🚫 Permission Error:');
      console.error('Your Stripe account doesn\'t have permission to create products');
      console.error('Please check your account settings or contact Stripe support');
    } else if (error.code === 'ENOTFOUND') {
      console.error('\n🌐 Network Error:');
      console.error('Unable to connect to Stripe. Please check your internet connection');
    }
    
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { createProduct, products };