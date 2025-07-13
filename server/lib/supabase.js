import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the project root (.env file)
// Go up two levels: server/lib -> server -> project root
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Authentication middleware for server routes
 * Verifies JWT token and extracts user context
 */
export async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please provide a valid Bearer token' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Authentication error:', error);
      return res.status(401).json({ 
        error: 'Invalid authentication token',
        message: 'Please log in again' 
      });
    }

    // Add user context to request
    req.user = {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata
    };

    console.log('Authenticated user:', { 
      id: user.id, 
      email: user.email,
      endpoint: req.path 
    });

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication service error',
      message: 'Please try again later' 
    });
  }
}

/**
 * Verify that the authenticated user has access to a specific quote
 */
export async function verifyQuoteAccess(userId, quoteId) {
  const { data: quote, error } = await supabase
    .from('quotes')
    .select('id, agent_id')
    .eq('id', quoteId)
    .eq('agent_id', userId)
    .single();

  if (error || !quote) {
    throw new Error('Quote not found or access denied');
  }

  return quote;
}

/**
 * Verify that the authenticated user has access to a specific booking
 */
export async function verifyBookingAccess(userId, bookingId) {
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('id, agent_id')
    .eq('id', bookingId)
    .eq('agent_id', userId)
    .single();

  if (error || !booking) {
    throw new Error('Booking not found or access denied');
  }

  return booking;
}

/**
 * Verify that the authenticated user has access to a specific customer
 */
export async function verifyCustomerAccess(userId, customerId) {
  // Check if user has access to this customer through quotes or bookings
  const { data: access, error } = await supabase
    .from('customers')
    .select(`
      id,
      quotes!inner(agent_id),
      bookings!inner(agent_id)
    `)
    .eq('id', customerId)
    .or(`quotes.agent_id.eq.${userId},bookings.agent_id.eq.${userId}`)
    .single();

  if (error || !access) {
    throw new Error('Customer not found or access denied');
  }

  return access;
}

/**
 * Create a Supabase client with user context for RLS
 */
export function createUserClient(userToken) {
  return createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
} 