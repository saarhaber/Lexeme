/**
 * Centralized API configuration
 * Uses REACT_APP_API_URL environment variable in production
 * Falls back to localhost for development
 */
const getApiBaseUrl = (): string => {
  // Check if we're in production (Vercel sets this)
  if (process.env.NODE_ENV === 'production') {
    // Use environment variable if set, otherwise use relative path
    return process.env.REACT_APP_API_URL || '/api';
  }
  
  // Development: use localhost or environment variable
  return process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
};

export const API_BASE_URL = getApiBaseUrl();

// Log the API URL in development for debugging
if (process.env.NODE_ENV === 'development') {
  console.log('API Base URL:', API_BASE_URL);
}

