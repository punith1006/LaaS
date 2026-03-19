import type { AuthTokens, User } from "@/types/auth";
import { saveTokens, getAccessToken, getRefreshToken, clearTokens } from "@/lib/token";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function signIn(
  email: string,
  password: string,
): Promise<AuthTokens> {
  if (API_BASE) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = Array.isArray(data.message) ? data.message[0] : data.message;
      throw new Error(msg || "Sign in failed");
    }
    const tokens: AuthTokens = await res.json();
    saveTokens(tokens);
    return tokens;
  }
  await delay(1200);
  const mock: AuthTokens = {
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
    expiresIn: 900,
  };
  saveTokens(mock);
  return mock;
}

export async function checkEmail(email: string): Promise<void> {
  if (API_BASE) {
    const res = await fetch(`${API_BASE}/api/auth/check-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = Array.isArray(data.message) ? data.message[0] : data.message;
      throw new Error(msg || "Email validation failed");
    }
    return;
  }
  await delay(400);
}

export async function sendOtp(email: string): Promise<void> {
  if (API_BASE) {
    const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = Array.isArray(data.message) ? data.message[0] : data.message;
      throw new Error(msg || "Failed to send code");
    }
    return;
  }
  await delay(600);
}

export async function resendOtp(email: string): Promise<void> {
  if (API_BASE) {
    const res = await fetch(`${API_BASE}/api/auth/resend-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = Array.isArray(data.message) ? data.message[0] : data.message;
      throw new Error(msg || "Resend failed");
    }
    return;
  }
  await delay(600);
}

export async function verifyOtp(
  email: string,
  code: string,
  payload?: {
    password: string;
    firstName: string;
    lastName: string;
    agreedPolicies: string[];
  },
): Promise<AuthTokens> {
  if (API_BASE && payload) {
    const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        code,
        password: payload.password,
        firstName: payload.firstName,
        lastName: payload.lastName,
        agreedPolicies: payload.agreedPolicies,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = Array.isArray(data.message) ? data.message[0] : data.message;
      throw new Error(msg || "Verification failed");
    }
    const tokens: AuthTokens = await res.json();
    saveTokens(tokens);
    return tokens;
  }
  await delay(1500);
  const mock: AuthTokens = {
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
    expiresIn: 900,
  };
  saveTokens(mock);
  return mock;
}

export async function refreshTokens(): Promise<AuthTokens> {
  const token = getRefreshToken();
  if (!token) throw new Error("No refresh token");

  if (API_BASE) {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: token }),
    });
    if (!res.ok) {
      clearTokens();
      throw new Error("Session expired");
    }
    const tokens: AuthTokens = await res.json();
    saveTokens(tokens);
    return tokens;
  }
  throw new Error("No API configured");
}

export async function getMe(): Promise<User | null> {
  const token = getAccessToken();
  if (!token) return null;

  if (API_BASE) {
    // Add cache-busting timestamp to prevent stale user data
    const res = await fetch(`${API_BASE}/api/auth/me?t=${Date.now()}`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
    if (!res.ok) return null;
    return res.json();
  }
  return null;
}

export async function forgotPassword(email: string): Promise<void> {
  if (API_BASE) {
    await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  }
}

export function logout(): void {
  clearTokens();
}

export async function retryStorageProvisioning(): Promise<{
  status: string;
  error?: string;
}> {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${API_BASE}/api/auth/storage-retry`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = Array.isArray(data.message) ? data.message[0] : data.message;
    throw new Error(msg || "Storage retry failed");
  }
  return res.json();
}

// Dashboard API Types
export interface HomeDashboardData {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    authType: string;
    storageQuotaGb: number;
    storageProvisioningStatus: string | null;
    storageProvisioningError: string | null;
  };
  storage: {
    quotaGb: number;
    usedGb: number;
    status: string;
  };
  quickStats: {
    totalSessions: number;
    activeSessions: number;
    totalDatasets: number;
    totalNotebooks: number;
  };
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'session' | 'dataset' | 'notebook' | 'storage';
  action: string;
  description: string;
  timestamp: string;
}

export interface BillingData {
  plan: {
    type: string;
    name: string;
    description: string;
  };
  usage: {
    storageQuotaGb: number;
    storageUsedGb: number;
    computeHoursUsed: number;
    billingCycle: string;
  };
  paymentMethod: {
    type: string;
    description: string;
  } | null;
  billingHistory: BillingHistoryItem[];
  // Lambda.ai style billing fields
  creditBalance: number;
  spendRate: number;
  spendLimit: number;
  dailySpend: number;
  currentSpendRate: number;
  gpus: number;
  vcpus: number;
  endpoints: number;
}

export interface BillingHistoryItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: string;
}

// Dashboard API Functions
export async function getHomeDashboardData(): Promise<HomeDashboardData | null> {
  const token = getAccessToken();
  if (!token) return null;

  if (API_BASE) {
    const res = await fetch(`${API_BASE}/api/dashboard/home`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  }
  return null;
}

export async function getBillingData(): Promise<BillingData | null> {
  const token = getAccessToken();
  if (!token) return null;

  if (API_BASE) {
    const res = await fetch(`${API_BASE}/api/dashboard/billing`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  }
  return null;
}
