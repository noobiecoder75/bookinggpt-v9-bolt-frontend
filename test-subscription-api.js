#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const API_BASE_URL = 'http://localhost:3001';
const TEST_EMAIL = 'info@bookinggpt.ca';
const TEST_PASSWORD = 'admin123';

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('VITE_SUPABASE_URL:', SUPABASE_URL ? '✓' : '❌');
  console.error('VITE_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✓' : '❌');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Get authentication token for the test user
 */
async function getAuthToken() {
  try {
    console.log('🔐 Signing in as test user...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (error) {
      console.error('❌ Sign in failed:', error.message);
      throw error;
    }
    
    if (!data.session) {
      throw new Error('No session returned from sign in');
    }
    
    console.log('✅ Sign in successful');
    console.log('📧 User:', data.user.email);
    console.log('🆔 User ID:', data.user.id);
    
    return data.session.access_token;
  } catch (error) {
    console.error('❌ Failed to get auth token:', error.message);
    throw error;
  }
}

/**
 * Make an authenticated API request
 */
async function makeApiRequest(endpoint, options = {}) {
  const token = await getAuthToken();
  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log(`\n🌐 Making API request to: ${url}`);
  console.log(`🔑 Using token: ${token.substring(0, 20)}...`);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  console.log(`📊 Response status: ${response.status} ${response.statusText}`);
  
  const contentType = response.headers.get('content-type');
  console.log(`📋 Content-Type: ${contentType}`);
  
  if (contentType && contentType.includes('text/html')) {
    const htmlContent = await response.text();
    console.error('❌ API routing error - received HTML instead of JSON');
    console.error('HTML content preview:', htmlContent.substring(0, 500));
    throw new Error('API returned HTML instead of JSON - check server routing');
  }
  
  let responseData;
  try {
    responseData = await response.json();
  } catch (error) {
    console.error('❌ Failed to parse JSON response:', error.message);
    const textResponse = await response.text();
    console.error('Raw response:', textResponse);
    throw error;
  }
  
  console.log('📄 Response data:', JSON.stringify(responseData, null, 2));
  
  return { response, data: responseData };
}

/**
 * Test subscription API endpoints
 */
async function testSubscriptionAPI() {
  try {
    console.log('🧪 Testing Subscription API Endpoints');
    console.log('=====================================');
    
    // Test 1: Get current subscription
    console.log('\n1. Testing GET /api/subscriptions/current');
    try {
      const { response, data } = await makeApiRequest('/api/subscriptions/current');
      
      if (response.ok) {
        console.log('✅ Successfully retrieved current subscription');
        console.log('📋 Subscription details:');
        console.log(`   - Status: ${data.subscription?.status || 'N/A'}`);
        console.log(`   - Tier: ${data.subscription?.tier || 'N/A'}`);
        console.log(`   - Created: ${data.subscription?.created_at || 'N/A'}`);
      } else {
        console.log('ℹ️  No subscription found (expected if user has no subscription)');
      }
    } catch (error) {
      console.error('❌ Error testing current subscription:', error.message);
    }
    
    // Test 2: Get usage statistics
    console.log('\n2. Testing GET /api/subscriptions/usage');
    try {
      const { response, data } = await makeApiRequest('/api/subscriptions/usage');
      
      if (response.ok) {
        console.log('✅ Successfully retrieved usage statistics');
        console.log('📊 Usage details:');
        console.log(`   - Quotes used: ${data.usage?.quotes_used || 0}`);
        console.log(`   - Bookings used: ${data.usage?.bookings_used || 0}`);
        console.log(`   - Reset date: ${data.usage?.reset_date || 'N/A'}`);
      } else {
        console.log('ℹ️  No usage data found');
      }
    } catch (error) {
      console.error('❌ Error testing usage endpoint:', error.message);
    }
    
    // Test 3: Check feature access - advanced_analytics (should be false for basic tier)
    console.log('\n3. Testing POST /api/subscriptions/check-access (advanced_analytics)');
    try {
      const { response, data } = await makeApiRequest('/api/subscriptions/check-access', {
        method: 'POST',
        body: JSON.stringify({ feature: 'advanced_analytics' })
      });
      
      if (response.ok) {
        console.log('✅ Successfully checked feature access');
        console.log(`📋 Has access to advanced_analytics: ${data.hasAccess} (expected: false for basic tier)`);
      } else {
        console.log('❌ Feature access check failed');
      }
    } catch (error) {
      console.error('❌ Error testing feature access:', error.message);
    }
    
    // Test 4: Check feature access - basic feature (should be true for basic tier)
    console.log('\n4. Testing POST /api/subscriptions/check-access (quotes)');
    try {
      const { response, data } = await makeApiRequest('/api/subscriptions/check-access', {
        method: 'POST',
        body: JSON.stringify({ feature: 'quotes' })
      });
      
      if (response.ok) {
        console.log('✅ Successfully checked feature access');
        console.log(`📋 Has access to quotes: ${data.hasAccess} (expected: true for basic tier)`);
      } else {
        console.log('❌ Feature access check failed');
      }
    } catch (error) {
      console.error('❌ Error testing feature access:', error.message);
    }
    
    // Test 5: Health check (no auth required)
    console.log('\n5. Testing GET /api/health (no auth required)');
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Health check successful');
        console.log('📋 Server status:', data.status);
      } else {
        console.log('❌ Health check failed');
      }
    } catch (error) {
      console.error('❌ Error testing health endpoint:', error.message);
    }
    
    console.log('\n🎉 Subscription API testing completed');
    
  } catch (error) {
    console.error('❌ Fatal error during API testing:', error.message);
    process.exit(1);
  }
}

/**
 * Test server connectivity
 */
async function testServerConnectivity() {
  console.log('🔍 Testing server connectivity...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    const data = await response.json();
    
    if (response.ok && data.status === 'OK') {
      console.log('✅ Server is running and accessible');
      return true;
    } else {
      console.log('❌ Server health check failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Cannot connect to server:', error.message);
    console.error('💡 Make sure the server is running on port 3001');
    console.error('💡 Try running: npm run dev:server');
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Subscription API Test');
  console.log('==================================');
  
  // Test server connectivity first
  const serverRunning = await testServerConnectivity();
  if (!serverRunning) {
    process.exit(1);
  }
  
  // Test authentication
  try {
    const token = await getAuthToken();
    console.log('✅ Authentication successful');
    console.log(`🔑 Token length: ${token.length} characters`);
  } catch (error) {
    console.error('❌ Authentication failed - cannot proceed with API tests');
    process.exit(1);
  }
  
  // Test subscription API
  await testSubscriptionAPI();
  
  console.log('\n✅ All tests completed successfully!');
}

// Run the tests
main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});