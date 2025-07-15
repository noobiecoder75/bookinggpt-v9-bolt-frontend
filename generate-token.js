#!/usr/bin/env node

/**
 * Generate a Supabase access token for testing
 * Usage: node generate-token.js [email] [password]
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// Get credentials from command line or use defaults
const email = process.argv[2] || 'info@bookinggpt.ca';
const password = process.argv[3] || 'admin123';

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('VITE_SUPABASE_URL:', SUPABASE_URL ? '✓' : '❌');
  console.error('VITE_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✓' : '❌');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function generateToken() {
  try {
    console.log(`🔐 Generating token for: ${email}`);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('❌ Authentication failed:', error.message);
      process.exit(1);
    }
    
    if (!data.session) {
      console.error('❌ No session returned from authentication');
      process.exit(1);
    }
    
    console.log('✅ Token generated successfully');
    console.log('📧 User:', data.user.email);
    console.log('🆔 User ID:', data.user.id);
    console.log('🔑 Token length:', data.session.access_token.length);
    console.log('⏰ Expires at:', new Date(data.session.expires_at * 1000).toISOString());
    console.log('');
    console.log('🔗 Token (copy to use in API calls):');
    console.log(data.session.access_token);
    
  } catch (error) {
    console.error('❌ Error generating token:', error.message);
    process.exit(1);
  }
}

generateToken();