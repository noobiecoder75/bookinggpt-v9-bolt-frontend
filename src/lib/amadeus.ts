import Amadeus from 'amadeus';

console.log('Starting Amadeus initialization...');

// Check if environment variables are present
console.log('Environment variables check:', {
  hasClientId: !!import.meta.env.VITE_AMADEUS_CLIENT_ID,
  hasClientSecret: !!import.meta.env.VITE_AMADEUS_CLIENT_SECRET,
});

// Initialize the Amadeus client with test environment settings
const amadeus = new Amadeus({
  clientId: import.meta.env.VITE_AMADEUS_CLIENT_ID,
  clientSecret: import.meta.env.VITE_AMADEUS_CLIENT_SECRET,
  hostname: 'test.api.amadeus.com',
  ssl: true
});

console.log('Amadeus client initialized');

// Add authentication state tracking
let isAuthenticated = false;

// Add logging to track authentication status
amadeus.client.on('auth', (bearer_token: string) => {
  isAuthenticated = true;
  console.log('Amadeus authentication event:', {
    status: 'success',
    tokenPrefix: bearer_token.slice(0, 10) + '...',
    timestamp: new Date().toISOString()
  });
});

amadeus.client.on('error', (error: any) => {
  isAuthenticated = false;
  console.error('Amadeus authentication error event:', {
    error,
    message: error.message,
    code: error.code,
    timestamp: new Date().toISOString()
  });
});

// Helper function to ensure authentication before making requests
const ensureAuthenticated = async () => {
  console.log('Checking authentication status:', { isAuthenticated });
  
  if (!isAuthenticated) {
    console.log('Not authenticated, requesting access token...');
    try {
      const tokenResponse = await amadeus.client.getAccessToken();
      console.log('Access token obtained:', {
        success: true,
        timestamp: new Date().toISOString()
      });
      return tokenResponse;
    } catch (error: any) {
      console.error('Authentication request failed:', {
        error,
        message: error.message,
        code: error.code,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
  
  return null;
};

export { amadeus, ensureAuthenticated }; 