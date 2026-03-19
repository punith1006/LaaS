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
