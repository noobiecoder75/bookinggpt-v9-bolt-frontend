/**
 * API Configuration
 * Handles dynamic API URL configuration for different environments
 */

// Get API base URL based on environment
const getApiBaseUrl = (): string => {
  // If VITE_API_URL is set, use it (for production deployments)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In development, use localhost
  if (import.meta.env.DEV) {
    return 'http://localhost:3001';
  }
  
  // Fallback: assume API is proxied at same origin
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Create full API URL for an endpoint
 * @param endpoint - API endpoint path (e.g., '/api/subscriptions/current')
 * @returns Full URL for the API call
 */
export const createApiUrl = (endpoint: string): string => {
  if (!endpoint.startsWith('/')) {
    endpoint = '/' + endpoint;
  }
  
  return API_BASE_URL ? `${API_BASE_URL}${endpoint}` : endpoint;
};

/**
 * API endpoints configuration
 */
export const API_ENDPOINTS = {
  subscriptions: {
    current: '/api/subscriptions/current',
    usage: '/api/subscriptions/usage',
    portal: '/api/subscriptions/portal',
    update: '/api/subscriptions/update',
    cancel: '/api/subscriptions/cancel',
    create: '/api/subscriptions/create',
    checkAccess: '/api/subscriptions/check-access'
  }
} as const;

/**
 * Helper function to make authenticated API calls
 * @param endpoint - API endpoint
 * @param options - Fetch options
 * @returns Promise with the API response
 */
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = createApiUrl(endpoint);
  
  // Add default headers
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  return fetch(url, {
    ...options,
    headers: defaultHeaders
  });
};