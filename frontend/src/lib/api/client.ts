/**
 * API Client for MCD-Agencia.
 *
 * This module provides a centralized HTTP client for API calls.
 * Features:
 *   - Automatic token management
 *   - Request/response interceptors
 *   - Error handling
 *   - TypeScript support
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

interface ApiError {
  message: string;
  status: number;
  data?: Record<string, unknown>;
}

/**
 * Get stored access token.
 */
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

/**
 * Get stored refresh token.
 */
function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

/**
 * Store tokens in localStorage.
 */
export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

/**
 * Clear stored tokens.
 */
export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

/**
 * Refresh access token using refresh token.
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      return null;
    }

    const data = await response.json();
    localStorage.setItem('accessToken', data.access);
    return data.access;
  } catch {
    clearTokens();
    return null;
  }
}

/**
 * Build URL with query parameters.
 */
function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}

/**
 * Make an API request.
 */
async function request<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { params, headers, ...restConfig } = config;

  const url = buildUrl(endpoint, params);
  let accessToken = getAccessToken();

  // Build headers
  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (accessToken) {
    (requestHeaders as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }

  // Make request
  let response = await fetch(url, {
    ...restConfig,
    headers: requestHeaders,
  });

  // If 401, try to refresh token and retry
  if (response.status === 401 && accessToken) {
    const newToken = await refreshAccessToken();

    if (newToken) {
      (requestHeaders as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, {
        ...restConfig,
        headers: requestHeaders,
      });
    }
  }

  // Handle non-OK responses
  if (!response.ok) {
    let errorData: Record<string, unknown> | undefined;

    try {
      errorData = await response.json();
    } catch {
      // Response body is not JSON
    }

    const error: ApiError = {
      message: (errorData?.detail as string) || (errorData?.message as string) || 'An error occurred',
      status: response.status,
      data: errorData,
    };

    throw error;
  }

  // Handle empty responses
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

/**
 * API client with HTTP method helpers.
 */
export const apiClient = {
  get: <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};

export default apiClient;
