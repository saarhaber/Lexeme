/**
 * Centralized API configuration
 * Uses REACT_APP_API_URL environment variable in production
 * Falls back to localhost for development
 */
const getApiBaseUrl = (): string => {
  let apiUrl: string;
  
  // Check if we're in production (Vercel sets this)
  if (process.env.NODE_ENV === 'production') {
    // Use environment variable if set, otherwise use relative path
    apiUrl = process.env.REACT_APP_API_URL || '/api';
  } else {
    // Development: use localhost or environment variable
    apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
  }
  
  // If URL doesn't start with http:// or https://, and it's not a relative path, add https://
  if (apiUrl && !apiUrl.startsWith('http://') && !apiUrl.startsWith('https://') && !apiUrl.startsWith('/')) {
    apiUrl = `https://${apiUrl}`;
  }
  
  // Ensure URL ends with /api if it's a full domain (not relative path)
  // Also handle cases where /auth/register or other paths are incorrectly included
  if (apiUrl.startsWith('http')) {
    // Remove any incorrect paths like /auth/register, /auth/login-json, etc.
    const urlObj = new URL(apiUrl);
    const pathParts = urlObj.pathname.split('/').filter(p => p);
    
    // If path contains 'auth' or other API paths, reset to just /api
    if (pathParts.length > 0 && (pathParts.includes('auth') || pathParts.length > 1)) {
      urlObj.pathname = '/api';
      apiUrl = urlObj.toString();
    } else if (!apiUrl.endsWith('/api') && !apiUrl.endsWith('/api/')) {
      // Remove trailing slash if present, then add /api
      apiUrl = apiUrl.replace(/\/$/, '') + '/api';
    }
  }
  
  return apiUrl;
};

export const API_BASE_URL = getApiBaseUrl();

// Log the API URL in production for debugging
if (process.env.NODE_ENV === 'production') {
  console.log('API Base URL:', API_BASE_URL);
}

// Log the API URL in development for debugging
if (process.env.NODE_ENV === 'development') {
  console.log('API Base URL:', API_BASE_URL);
}

