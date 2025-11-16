import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';

interface User {
  id: number;
  username: string;
  email: string;
  language_level: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  loginWithGoogle: () => void;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check for stored token on mount
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${API_BASE_URL}/auth/login-json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = 'Login failed';
        try {
          const error = await response.json();
          errorMessage = error.detail || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const { access_token, user_id, username: userUsername } = data;

      // Store token and user info
      localStorage.setItem('auth_token', access_token);
      const userData = { id: user_id, username: userUsername, email: '', language_level: 'unknown' };
      localStorage.setItem('auth_user', JSON.stringify(userData));

      setToken(access_token);
      setUser(userData);
    } catch (error) {
      console.error('Login error:', error);
      // Re-throw with better error message
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Cannot connect to server. Please check that the backend is running at ${API_BASE_URL}`);
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out. The server may be slow or unresponsive. Please try again.');
      }
      throw error;
    }
  };

  const loginWithGoogle = () => {
    // Redirect to backend Google OAuth endpoint
    window.location.href = `${API_BASE_URL}/auth/google/login`;
  };

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = 'Registration failed';
        try {
          const error = await response.json();
          errorMessage = error.detail || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Auto-login after registration
      await login(username, password);
    } catch (error) {
      console.error('Registration error:', error);
      // Re-throw with better error message for network failures
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Cannot connect to server. Please check that the backend is running at ${API_BASE_URL}`);
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out. The server may be slow or unresponsive. Please try again.');
      }
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
  };

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userId = urlParams.get('user_id');
    const username = urlParams.get('username');
    
    if (token && userId && username) {
      localStorage.setItem('auth_token', token);
      const userData = { id: parseInt(userId), username, email: '', language_level: 'unknown' };
      localStorage.setItem('auth_user', JSON.stringify(userData));
      setToken(token);
      setUser(userData);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const value: AuthContextType = {
    user,
    token,
    login,
    loginWithGoogle,
    register,
    logout,
    isAuthenticated: !!token,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

