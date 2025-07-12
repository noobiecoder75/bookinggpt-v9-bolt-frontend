import { createClient } from '@supabase/supabase-js';

// Debug logging for Supabase configuration
console.log('🔧 Supabase initialization...');

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug environment variables (safely)
console.log('🔑 Supabase config check:', {
  hasUrl: !!supabaseUrl,
  urlLength: supabaseUrl?.length || 0,
  urlStartsWith: supabaseUrl?.substring(0, 20) + '...',
  hasAnonKey: !!supabaseAnonKey,
  anonKeyLength: supabaseAnonKey?.length || 0,
  environment: import.meta.env.MODE,
  timestamp: new Date().toISOString()
});

// Validate configuration
if (!supabaseUrl) {
  console.error('🚨 CRITICAL: VITE_SUPABASE_URL is not set!');
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  console.error('🚨 CRITICAL: VITE_SUPABASE_ANON_KEY is not set!');
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

// URL validation
try {
  const url = new URL(supabaseUrl);
  console.log('✅ Supabase URL is valid:', {
    protocol: url.protocol,
    hostname: url.hostname,
    pathname: url.pathname
  });
} catch (error) {
  console.error('🚨 CRITICAL: Invalid Supabase URL format:', error);
  throw new Error('Invalid VITE_SUPABASE_URL format');
}

console.log('⚡ Creating Supabase client...');
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Test Supabase connection
console.log('🔌 Testing Supabase connection...');
supabase.auth.getSession()
  .then(({ data, error }) => {
    if (error) {
      console.warn('⚠️ Supabase auth session check warning:', error.message);
    } else {
      console.log('✅ Supabase connection established successfully:', {
        hasSession: !!data.session,
        sessionUser: data.session?.user?.email || 'anonymous',
        timestamp: new Date().toISOString()
      });
    }
  })
  .catch((error) => {
    console.error('🚨 Supabase connection test failed:', error);
  });

console.log('🚀 Supabase client initialized successfully');