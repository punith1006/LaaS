import type { AuthTokens } from "@/types/auth";

const ACCESS_KEY = "laas_access_token";
const REFRESH_KEY = "laas_refresh_token";
const ID_TOKEN_KEY = "laas_id_token";

export function saveTokens(tokens: AuthTokens & { idToken?: string }): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  if (tokens.idToken) {
    localStorage.setItem(ID_TOKEN_KEY, tokens.idToken);
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function getIdToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ID_TOKEN_KEY);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ID_TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

/**
 * Decode JWT payload without verification (for client-side expiration check only)
 * Returns the payload object or null if decoding fails
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Decode base64 payload
    const payload = parts[1];
    // Handle base64url encoding (replace - with + and _ with /)
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Decode and parse JSON
    const decoded = atob(base64);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Get milliseconds until token expiration
 * Returns null if no token, invalid token, or no expiration claim
 */
export function getTokenExpiresIn(): number | null {
  const token = getAccessToken();
  if (!token) return null;
  
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return null;
  
  // JWT exp is in seconds since epoch
  const expiresAtMs = payload.exp * 1000;
  const nowMs = Date.now();
  const expiresInMs = expiresAtMs - nowMs;
  
  return expiresInMs > 0 ? expiresInMs : 0;
}

/**
 * Check if the current access token is expired or will expire soon
 * Returns true if token is expired or will expire in less than 30 seconds
 */
export function isTokenExpired(): boolean {
  const expiresIn = getTokenExpiresIn();
  // If no token or invalid, consider it expired
  if (expiresIn === null) return true;
  // If expired or will expire in less than 30 seconds, consider it expired
  return expiresIn < 30000;
}
