/**
 * API utility functions with automatic auth token injection
 */
import { useAuth } from '../contexts/AuthContext';

import { API_BASE_URL } from '../config/api';

export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<Response> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  return response;
};

export const apiGet = async (endpoint: string, token?: string | null) => {
  return apiRequest(endpoint, { method: 'GET' }, token);
};

export const apiPost = async (endpoint: string, data: any, token?: string | null) => {
  return apiRequest(
    endpoint,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token
  );
};

export const apiPut = async (endpoint: string, data: any, token?: string | null) => {
  return apiRequest(
    endpoint,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
    token
  );
};

export const apiDelete = async (endpoint: string, token?: string | null) => {
  return apiRequest(endpoint, { method: 'DELETE' }, token);
};

