import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTrialSubscriptionDirect(userId, email, tier = 'basic', trialDays = 14) {
  try {
    console.log(`🔄 Creating trial subscription for ${email}...`);
    
    // Calculate trial end date
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + trialDays);
    
    const currentDate = new Date();
    
    // Create subscription record
    const subscriptionData = {
      id: randomUUID(),
      user_id: userId,
      stripe_subscription_id: `trial_${userId}`,
      stripe_customer_id: `trial_customer_${userId}`,
      tier: tier,
      status: 'trialing',
      trial_start: currentDate.toISOString(),
      trial_end: trialEndDate.toISOString(),
      current_period_start: currentDate.toISOString(),
      current_period_end: trialEndDate.toISOString(),
      created_at: currentDate.toISOString(),
      updated_at: currentDate.toISOString()
    };
    
    const { data, error } = await supabase
      .from('subscriptions')
      .insert([subscriptionData])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating subscription:', error);
      throw error;
    }
    
    console.log('✅ Trial subscription created successfully:', data);
    return {
      success: true,
      subscription: data
    };
    
  } catch (error) {
    console.error('❌ Error in createTrialSubscriptionDirect:', error);
    throw error;
  }
}

async function main() {
  const targetEmail = 'tejtandon@gmail.com';
  const targetUserId = '5ee4440a-de31-4ccb-817a-26918c9a79de';
  
  try {
    // Check if user already has a subscription
    const { data: existingSubscriptions, error: checkError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', targetUserId);
    
    if (checkError) {
      console.error('❌ Error checking existing subscriptions:', checkError);
      return;
    }
    
    if (existingSubscriptions && existingSubscriptions.length > 0) {
      console.log('✅ User already has a subscription:', existingSubscriptions[0]);
      return;
    }
    
    // Create trial subscription
    const result = await createTrialSubscriptionDirect(targetUserId, targetEmail);
    console.log('🎉 Trial subscription created successfully!');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

main();