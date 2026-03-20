/**
 * Resolve API base URL in a deployment-safe way.
 *
 * Priority:
 * 1) NEXT_PUBLIC_API_URL (explicit env)
 * 2) Browser origin + /api/v1 (works with Next rewrites in production)
 * 3) Local backend default for non-browser contexts
 */

export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api/v1`;
  }

  return 'http://localhost:8000/api/v1';
}

export function getBackendOrigin(): string {
  const apiBaseUrl = getApiBaseUrl();
  try {
    return new URL(apiBaseUrl).origin;
  } catch {
    return 'http://localhost:8000';
  }
}
