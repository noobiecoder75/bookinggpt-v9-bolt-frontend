import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseStatus() {
  console.log('🔍 Checking database status...');
  
  // Check if subscriptions table exists (this should always exist)
  try {
    const { data: tableData, error: tableError } = await supabase
      .from('subscriptions')
      .select('id')
      .limit(1);
    
    if (tableError) {
      console.log('❌ subscriptions table check failed:', tableError.message);
      return false;
    }
    
    console.log('✅ subscriptions table exists');
  } catch (error) {
    console.log('❌ Could not check subscriptions table');
    return false;
  }
  
  return true;
}

async function checkUserSubscription(email) {
  console.log(`🔍 Checking subscription for ${email}...`);
  
  // Get user ID first from auth.users
  const { data: users, error: userError } = await supabase
    .from('auth.users')
    .select('id')
    .eq('email', email)
    .limit(1);
  
  if (userError) {
    console.log('❌ Error fetching user:', userError.message);
    return null;
  }
  
  if (!users || users.length === 0) {
    console.log('❌ User not found in auth.users');
    return null;
  }
  
  const userId = users[0].id;
  console.log(`✅ Found user ID: ${userId}`);
  
  // Check for existing subscription
  const { data: subscriptions, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId);
  
  if (subError) {
    console.log('❌ Error fetching subscriptions:', subError.message);
    return null;
  }
  
  if (!subscriptions || subscriptions.length === 0) {
    console.log('❌ No subscription found for user');
    return { userId, subscription: null };
  }
  
  console.log('✅ Found subscription:', subscriptions[0]);
  return { userId, subscription: subscriptions[0] };
}

async function createTrialSubscription(email, userId) {
  console.log(`🔄 Creating trial subscription for ${email}...`);
  
  try {
    // Call the backend API to create trial subscription
    const response = await fetch('http://localhost:3001/api/subscriptions/create-trial', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}` // Use service key for admin access
      },
      body: JSON.stringify({
        userId: userId,
        email: email,
        tier: 'basic'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Trial creation failed:', errorText);
      return false;
    }
    
    const result = await response.json();
    console.log('✅ Trial subscription created:', result);
    return true;
  } catch (error) {
    console.log('❌ Error creating trial subscription:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting user subscription fix...');
  
  const targetEmail = 'tejtandon@gmail.com';
  const targetUserId = '5ee4440a-de31-4ccb-817a-26918c9a79de'; // Known user ID
  
  // 1. Check database status
  const dbStatus = await checkDatabaseStatus();
  if (!dbStatus) {
    console.log('❌ Database appears to be inaccessible');
    return;
  }
  
  // 2. Check for existing subscription
  console.log(`🔍 Checking subscription for ${targetEmail}...`);
  const { data: subscriptions, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', targetUserId);
  
  if (subError) {
    console.log('❌ Error fetching subscriptions:', subError.message);
    return;
  }
  
  // 3. Create trial subscription if needed
  if (!subscriptions || subscriptions.length === 0) {
    console.log('📝 User has no subscription, creating trial...');
    const success = await createTrialSubscription(targetEmail, targetUserId);
    if (success) {
      console.log('✅ Trial subscription created successfully!');
    } else {
      console.log('❌ Failed to create trial subscription');
    }
  } else {
    console.log('✅ User already has a subscription:', subscriptions[0]);
  }
  
  console.log('🎉 Fix complete!');
}

main().catch(console.error);