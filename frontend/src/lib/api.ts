import type { AuthTokens, User } from "@/types/auth";
import { saveTokens, getAccessToken, getRefreshToken, clearTokens, isTokenExpired } from "@/lib/token";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

// Mutex to prevent multiple simultaneous refresh calls
let refreshPromise: Promise<AuthTokens> | null = null;

/**
 * Perform token refresh with deduplication
 * If a refresh is already in progress, wait for it instead of starting a new one
 */
async function doRefresh(): Promise<boolean> {
  // Deduplicate: if a refresh is already in progress, wait for it
  if (refreshPromise) {
    try {
      await refreshPromise;
      return true;
    } catch {
      return false;
    }
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  refreshPromise = refreshTokens(); // existing function
  try {
    await refreshPromise;
    return true;
  } catch {
    return false;
  } finally {
    refreshPromise = null;
  }
}

/**
 * Centralized fetch wrapper with automatic token refresh on 401
 * - Proactively refreshes expired tokens before making requests
 * - Handles 401 responses by refreshing and retrying once
 * - Deduplicates concurrent refresh requests
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let token = getAccessToken();

  // Proactive check: if token is expired, refresh BEFORE making the request
  if (isTokenExpired() && getRefreshToken()) {
    await doRefresh();
    token = getAccessToken();
  }

  // Make the request
  let res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  // If 401, try refresh once and retry
  if (res.status === 401) {
    const refreshed = await doRefresh();
    if (refreshed) {
      token = getAccessToken();
      res = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });
    } else {
      // Refresh failed — session is dead
      clearTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/signin";
      }
    }
  }

  return res;
}

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

export interface CheckEmailResponse {
  available: boolean;
  institution?: {
    name: string;
    shortName: string | null;
    slug: string;
  };
}

export async function checkEmail(email: string): Promise<CheckEmailResponse> {
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
    return res.json();
  }
  await delay(400);
  return { available: true };
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
    referralCode?: string;
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
        referralCode: payload.referralCode,
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
    const res = await apiFetch(`${API_BASE}/api/auth/me?t=${Date.now()}`, {
      headers: { 
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
  if (!getAccessToken()) throw new Error("Not authenticated");
  const res = await apiFetch(`${API_BASE}/api/auth/storage-retry`, {
    method: "POST",
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
    storageUid: string | null;
    storageQuotaGb: number;
    storageProvisioningStatus: string | null;
    storageProvisioningError: string | null;
  };
  storage: {
    quotaGb: number;
    usedGb: number;
    status: string;
    healthStatus?: string | null; // 'live' | 'unreachable' | null
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
    storageAllocatedGb: number;
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
  spendLimitEnabled: boolean;
  dailySpend: number;
  currentSpendRate: number;
  runway: number | null; // Hours of runway remaining
  gpus: number;
  gpuVramMb: number;
  vcpus: number;
  memoryMb: number;
  endpoints: number;
  storageAllocatedGb: number;
  storageUsedGb: number;
  storageUsagePercent: number;
  hourlyData: HourlySpendData[];
  // Storage billing fields (from backend Task 13)
  storageBurnRateCentsPerHour?: number;
  storageMonthlyEstimateCents?: number;
}

export interface HourlySpendData {
  hour: string;
  cumulativeSpend: number;
  hourlyRate: number;
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
  if (!getAccessToken()) return null;

  if (API_BASE) {
    const res = await apiFetch(`${API_BASE}/api/dashboard/home`);
    if (!res.ok) return null;
    return res.json();
  }
  return null;
}

export async function getBillingData(): Promise<BillingData | null> {
  if (!getAccessToken()) return null;

  if (API_BASE) {
    const res = await apiFetch(`${API_BASE}/api/dashboard/billing`);
    if (!res.ok) return null;
    return res.json();
  }
  return null;
}

// Platform Health API Types
export interface PlatformHealth {
  overall: 'operational' | 'degraded' | 'outage';
  services: {
    name: string;
    status: 'healthy' | 'unhealthy';
    message: string;
  }[];
}

export async function getPlatformHealth(): Promise<PlatformHealth | null> {
  if (!getAccessToken()) return null;

  try {
    const res = await apiFetch(`${API_BASE}/api/dashboard/health`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Storage API Types
export interface StorageVolume {
  id: string;
  name: string;
  storageUid: string;
  quotaGb: number;
  usedGb: number;
  status: string;
  allocationType: string;
  provisionedAt: string | null;
  createdAt: string;
}

export interface NameCheckResult {
  available: boolean;
  error?: string;
}

// Storage API Functions
async function storageFetch(endpoint: string, options: RequestInit = {}) {
  if (!getAccessToken()) {
    throw new Error('Not authenticated');
  }

  const res = await apiFetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = Array.isArray(data.message) ? data.message[0] : data.message;
    throw new Error(msg || `Request failed: ${res.status}`);
  }

  return res.json();
}

export async function getStorageVolumes(): Promise<StorageVolume[]> {
  if (API_BASE) {
    return storageFetch('/api/storage/volumes');
  }
  // Mock data for development
  return [];
}

export async function checkStorageName(name: string): Promise<NameCheckResult> {
  if (API_BASE) {
    const res = await apiFetch(
      `${API_BASE}/api/storage/volumes/check-name/${encodeURIComponent(name)}`,
      {
        method: 'GET',
      },
    );
    if (!res.ok) {
      return { available: false, error: 'Failed to check name availability' };
    }
    return res.json();
  }
  // Mock for development - always available
  return { available: true };
}

export async function createStorageVolume(
  name: string,
  quotaGb: number,
): Promise<StorageVolume> {
  if (API_BASE) {
    return storageFetch('/api/storage/volumes', {
      method: 'POST',
      body: JSON.stringify({ name, quotaGb }),
    });
  }
  // Mock for development
  return {
    id: `mock-${Date.now()}`,
    name,
    storageUid: `u_${Date.now().toString(16)}`,
    quotaGb,
    usedGb: 0,
    status: 'active',
    allocationType: 'user_created',
    provisionedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

export async function deleteStorageVolume(id: string): Promise<void> {
  if (API_BASE) {
    await storageFetch(`/api/storage/volumes/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({}),
    });
  }
  // Mock for development
}

// Delete user's file store (no ID needed - backend determines from auth)
export async function deleteUserFileStore(): Promise<{ ok: boolean; message?: string }> {
  if (API_BASE) {
    return storageFetch('/api/storage/volumes', { method: 'DELETE', body: JSON.stringify({}) });
  }
  // Mock for development
  return { ok: true, message: 'Mock delete successful' };
}

// Active session check types
export interface ActiveSession {
  id: string;
  instanceName: string;
  status: string;
}

export interface ActiveSessionsCheck {
  hasActiveSessions: boolean;
  sessionCount: number;
  sessions: ActiveSession[];
}

// Check if user has active sessions (blocks storage operations)
export async function checkActiveSessions(): Promise<ActiveSessionsCheck> {
  if (API_BASE) {
    return storageFetch('/api/storage/volumes/active-sessions-check');
  }
  // Mock for development
  return { hasActiveSessions: false, sessionCount: 0, sessions: [] };
}

// Check host available storage space
export async function checkHostSpace(): Promise<{ availableGb: number; totalGb: number; availableBytes: number }> {
  if (API_BASE) {
    return storageFetch('/api/storage/volumes/host-space-check');
  }
  // Mock for development
  return { availableGb: 45.2, totalGb: 100, availableBytes: 48534556672 };
}

// Storage upgrade response type
export interface StorageVolumeUpgrade {
  id: string;
  name: string;
  storageUid: string;
  quotaGb: number;
  usedGb: number;
  status: string;
  allocationType: string;
  previousQuotaGb: number;
  monthlyEstimate: number;
  hourlyRate: number;
}

// Upgrade storage volume
export async function upgradeStorageVolume(
  volumeId: string,
  newQuotaGb: number,
): Promise<StorageVolumeUpgrade> {
  if (API_BASE) {
    return storageFetch(`/api/storage/volumes/${volumeId}`, {
      method: 'PATCH',
      body: JSON.stringify({ newQuotaGb }),
    });
  }
  // Mock for development
  return {
    id: `mock-${Date.now()}`,
    name: 'fs1',
    storageUid: `u_${Date.now().toString(16)}`,
    quotaGb: newQuotaGb,
    usedGb: 2.5,
    status: 'active',
    allocationType: 'user_created',
    previousQuotaGb: 5,
    monthlyEstimate: newQuotaGb * 7.0,
    hourlyRate: (newQuotaGb * 700) / 730 / 100,
  };
}

// Storage status types
export interface StorageStatus {
  hasStorage: boolean;
  reachable: boolean;
  serviceHealthy: boolean;
  datasetExists?: boolean;
}

export async function getStorageStatus(): Promise<StorageStatus> {
  if (API_BASE) {
    return storageFetch('/api/storage/status');
  }
  // Mock for development
  return { hasStorage: false, reachable: false, serviceHealthy: false };
}

// File listing types
export interface FileItem {
  name: string;
  type: 'file' | 'folder';
  size: number | null;
  updatedAt: string;
}

export async function getStorageFiles(path?: string): Promise<FileItem[]> {
  if (!getAccessToken()) {
    throw new Error('Not authenticated');
  }

  if (API_BASE) {
    const queryParam = path && path !== '/' ? `?path=${encodeURIComponent(path)}` : '';
    const res = await apiFetch(`${API_BASE}/api/storage/files${queryParam}`);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = Array.isArray(data.message) ? data.message[0] : data.message;
      throw new Error(msg || 'Failed to fetch files');
    }

    return res.json();
  }

  // Mock for development - return empty array
  return [];
}

// Create folder in storage
export async function createStorageFolder(
  path: string,
  folderName: string,
): Promise<{ success: boolean }> {
  if (!getAccessToken()) throw new Error('Not authenticated');

  if (API_BASE) {
    const res = await apiFetch(`${API_BASE}/api/storage/files/mkdir`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path, folderName }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = Array.isArray(data.message) ? data.message[0] : data.message;
      throw new Error(msg || 'Failed to create folder');
    }

    return res.json();
  }

  return { success: true };
}

// Upload files to storage
// NOTE: Do NOT set Content-Type header - browser auto-sets multipart boundary
export async function uploadStorageFiles(
  path: string,
  files: File[],
): Promise<{ success: boolean; uploaded: string[] }> {
  if (!getAccessToken()) throw new Error('Not authenticated');

  if (API_BASE) {
    const formData = new FormData();
    formData.append('path', path);
    files.forEach((file) => formData.append('files', file));

    const res = await apiFetch(`${API_BASE}/api/storage/files/upload`, {
      method: 'POST',
      // Note: Do NOT set Content-Type - browser auto-sets with boundary for multipart
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = Array.isArray(data.message) ? data.message[0] : data.message;
      throw new Error(msg || 'Upload failed');
    }

    return res.json();
  }

  return { success: true, uploaded: files.map((f) => f.name) };
}

// Download file from storage - triggers browser download
export async function downloadStorageFile(filePath: string): Promise<void> {
  if (!getAccessToken()) throw new Error('Not authenticated');

  if (API_BASE) {
    const res = await apiFetch(
      `${API_BASE}/api/storage/files/download?file=${encodeURIComponent(filePath)}`,
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = Array.isArray(data.message) ? data.message[0] : data.message;
      throw new Error(msg || 'Download failed');
    }

    // Create download link from blob
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath.split('/').pop() || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Delete file or folder from storage
export async function deleteStorageFile(
  filePath: string,
): Promise<{ success: boolean }> {
  if (!getAccessToken()) throw new Error('Not authenticated');

  if (API_BASE) {
    const res = await apiFetch(
      `${API_BASE}/api/storage/files?file=${encodeURIComponent(filePath)}`,
      {
        method: 'DELETE',
      },
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = Array.isArray(data.message) ? data.message[0] : data.message;
      throw new Error(msg || 'Delete failed');
    }

    return res.json();
  }

  return { success: true };
}

// Activity Log API Types
export interface ActivityLogEntry {
  id: string;
  action: string;
  category: string;
  status: string;
  details: Record<string, any> | null;
  ipAddress: string | null;
  createdAt: string;
}

export async function getRecentActivity(days: number = 30): Promise<ActivityLogEntry[]> {
  if (!getAccessToken()) return [];

  if (API_BASE) {
    try {
      const res = await apiFetch(`${API_BASE}/api/dashboard/activity?days=${days}`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }
  return [];
}

// Compute API Types
export interface ComputeConfigResponse {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tier: string | null;
  sessionType: string;
  vcpu: number;
  memoryMb: number;
  gpuVramMb: number;
  gpuModel: string | null;
  hamiSmPercent: number | null;
  basePricePerHourCents: number;
  currency: string;
  bestFor: string | null;
  sortOrder: number;
  available: boolean;
  maxLaunchable: number;
}

export interface ResourceValues {
  vramMb: number;
  vcpu: number;
  ramMb: number;
}

export interface ResourceSummary {
  total: ResourceValues;
  used: ResourceValues;
  available: ResourceValues;
}

export interface ComputeConfigsResponse {
  configs: ComputeConfigResponse[];
  resources: ResourceSummary;
  runningInstances: number;
}

export interface LaunchSessionRequest {
  computeConfigId: string;
  instanceName: string;
  interfaceMode: 'gui' | 'cli';
  storageType: 'stateful' | 'ephemeral';
}

export interface LaunchSessionResponse {
  sessionId: string;
  containerName: string | null;
  status: string;
  instanceName: string | null;
}

// Compute API Functions
export async function getComputeConfigs(): Promise<ComputeConfigsResponse | null> {
  if (!getAccessToken()) return null;

  if (API_BASE) {
    try {
      const res = await apiFetch(`${API_BASE}/api/compute/configs`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }
  return null;
}

export async function launchComputeSession(
  data: LaunchSessionRequest
): Promise<LaunchSessionResponse> {
  if (!getAccessToken()) throw new Error('Not authenticated');

  const res = await apiFetch(`${API_BASE}/api/compute/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const msg = Array.isArray(errData.message) ? errData.message[0] : errData.message;
    throw new Error(msg || 'Failed to launch instance');
  }

  return res.json();
}

// Payment API Types
export interface CreateOrderResponse {
  orderId: string;
  amount: number;       // in paise
  currency: string;
  keyId: string;
  transactionId: string;
}

export interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  newBalance: number;
}

export interface PaymentTransactionItem {
  id: string;
  gateway: string;
  gatewayTxnId: string | null;
  gatewayOrderId: string | null;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  description?: string | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    totalCents: number;
    status: string;
    paidAt: string | null;
    description?: string | null;
  } | null;
}

// Alias for backward compatibility
export type PaymentTransaction = PaymentTransactionItem;

export interface PaginatedTransactions {
  data: PaymentTransactionItem[];
  transactions: PaymentTransactionItem[];  // Alias for backward compat
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  // Direct access for convenience
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TransactionDetail extends PaymentTransactionItem {
  gatewayResponse: any;
  completedAt?: string | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    periodStart: string;
    periodEnd: string;
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
    currency: string;
    status: string;
    issuedAt: string | null;
    paidAt: string | null;
    description?: string | null;
    invoiceLineItems: {
      id: string;
      description: string;
      quantity: number;
      unitPriceCents: number;
      totalCents: number;
    }[];
  } | null;
}

// Payment API Functions
export async function createPaymentOrder(amountInRupees: number): Promise<CreateOrderResponse> {
  if (!getAccessToken()) throw new Error('Not authenticated');

  const res = await apiFetch(`${API_BASE}/api/payment/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amountInRupees }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = Array.isArray(data.message) ? data.message[0] : data.message;
    throw new Error(msg || 'Failed to create payment order');
  }

  return res.json();
}

export async function verifyPayment(data: VerifyPaymentRequest): Promise<VerifyPaymentResponse> {
  if (!getAccessToken()) throw new Error('Not authenticated');

  const res = await apiFetch(`${API_BASE}/api/payment/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = Array.isArray(data.message) ? data.message[0] : data.message;
    throw new Error(msg || 'Payment verification failed');
  }

  return res.json();
}

export async function getPaymentTransactions(page = 1, limit = 10): Promise<PaginatedTransactions> {
  if (!getAccessToken()) throw new Error('Not authenticated');

  if (API_BASE) {
    const res = await apiFetch(`${API_BASE}/api/payment/transactions?page=${page}&limit=${limit}`);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = Array.isArray(data.message) ? data.message[0] : data.message;
      throw new Error(msg || 'Failed to fetch transactions');
    }

    return res.json();
  }

  // Mock data for development
  return {
    data: [],
    transactions: [],
    meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  };
}

export async function getTransactionDetail(id: string): Promise<TransactionDetail> {
  if (!getAccessToken()) throw new Error('Not authenticated');

  if (API_BASE) {
    const res = await apiFetch(`${API_BASE}/api/payment/transactions/${id}`);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = Array.isArray(data.message) ? data.message[0] : data.message;
      throw new Error(msg || 'Failed to fetch transaction details');
    }

    return res.json();
  }

  throw new Error('No API configured');
}

export async function downloadInvoice(transactionId: string): Promise<Blob> {
  if (!getAccessToken()) throw new Error('Not authenticated');

  if (API_BASE) {
    const res = await apiFetch(`${API_BASE}/api/payment/invoice/${transactionId}/download`);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = Array.isArray(data.message) ? data.message[0] : data.message;
      throw new Error(msg || 'Failed to download invoice');
    }

    return res.blob();
  }

  throw new Error('No API configured');
}

// Onboarding API Types
export interface OnboardingProfileData {
  profession?: string;
  expertiseLevel?: string;
  yearsOfExperience?: number;
  operationalDomains?: string[];
  useCasePurposes?: string[];
  useCaseOther?: string;
  country?: string;
}

export interface SaveOnboardingResponse {
  success: boolean;
  profileId: string;
  onboardingComplete: boolean;
}

export interface OnboardingStatusResponse {
  isOnboardingComplete: boolean;
  hasProfession: boolean;
  hasExpertiseLevel: boolean;
  hasYearsOfExperience: boolean;
  hasOperationalDomains: boolean;
  hasUseCasePurposes: boolean;
  hasCountry: boolean;
}

// Onboarding API Functions
export async function saveOnboardingProfile(
  data: OnboardingProfileData
): Promise<SaveOnboardingResponse> {
  if (!getAccessToken()) throw new Error("Not authenticated");

  if (API_BASE) {
    const res = await apiFetch(`${API_BASE}/api/user/onboarding`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = Array.isArray(data.message) ? data.message[0] : data.message;
      throw new Error(msg || "Failed to save onboarding profile");
    }
    return res.json();
  }
  // Mock for development
  await delay(800);
  return {
    success: true,
    profileId: `profile-${Date.now()}`,
    onboardingComplete: true,
  };
}

export async function getOnboardingStatus(): Promise<OnboardingStatusResponse | null> {
  if (!getAccessToken()) return null;

  if (API_BASE) {
    const res = await apiFetch(`${API_BASE}/api/user/onboarding-status`);
    if (!res.ok) return null;
    return res.json();
  }
  // Mock for development
  return {
    isOnboardingComplete: false,
    hasProfession: false,
    hasExpertiseLevel: false,
    hasYearsOfExperience: false,
    hasOperationalDomains: false,
    hasUseCasePurposes: false,
    hasCountry: false,
  };
}

// Spend Limit API Types
export interface SpendLimitSettings {
  enabled: boolean;
  limitAmountRupees: number | null;
  period: string | null;
  startDate: string | null;
  endDate: string | null;
  consentedAt: string | null;
  currentPeriodSpendRupees: number;
}

// Spend Limit API Functions
export async function getSpendLimitSettings(): Promise<SpendLimitSettings | null> {
  if (!getAccessToken() || !API_BASE) return null;
  const res = await apiFetch(`${API_BASE}/api/billing/spend-limit`);
  if (!res.ok) return null;
  return res.json();
}

// Support Ticket API Types
export interface SupportTicketRequest {
  category: string;
  subject: string;
  description: string;
}

export interface SupportTicketResponse {
  ticketId: string;
  status: string;
  createdAt: string;
}

export interface SupportTicketListItem {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

// Support Ticket API Functions
export async function submitSupportTicket(
  data: SupportTicketRequest
): Promise<SupportTicketResponse> {
  if (!getAccessToken()) throw new Error('Not authenticated');

  const res = await apiFetch(`${API_BASE}/api/support/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const msg = Array.isArray(errData.message) ? errData.message[0] : errData.message;
    throw new Error(msg || 'Failed to submit support ticket');
  }

  return res.json();
}

export async function getSupportTickets(): Promise<SupportTicketListItem[]> {
  if (!getAccessToken()) return [];

  if (API_BASE) {
    const res = await apiFetch(`${API_BASE}/api/support/tickets/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) return [];
    return res.json();
  }
  return [];
}

export async function updateSpendLimit(data: {
  enabled: boolean;
  limitAmountRupees?: number;
  period?: string;
  startDate?: string;
  endDate?: string;
  consentAcknowledged: boolean;
}): Promise<{ success: boolean; error?: string }> {
  if (!getAccessToken() || !API_BASE) return { success: false, error: 'Not authenticated' };
  const res = await apiFetch(`${API_BASE}/api/billing/spend-limit`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to update spend limit' }));
    return { success: false, error: err.message };
  }
  return { success: true };
}

// Compute Recommendation APIs

export async function extractDocument(file: File): Promise<{ text: string; wordCount: number }> {
  const token = getAccessToken();
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/compute/extract-document`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to extract document');
  }
  return res.json();
}

export async function analyzeWorkload(description: string, primaryGoal?: string): Promise<{
  detectedGoal: string;
  detectedFrameworks: string[];
  estimatedVramNeedGb: number;
  estimatedComputeIntensity: 'low' | 'medium' | 'high' | 'very_high';
  datasetSizeCategory: string;
  keyInsights: string[];
  confidence: number;
  inputQuality: 'sufficient' | 'insufficient';
  missingCategories: string[];
  suggestions: string;
  fieldConfidence: { goal: number; vram: number; intensity: number };
}> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}/api/compute/analyze-workload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ description, primaryGoal }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to analyze workload');
  }
  return res.json();
}

export async function createRecommendationSession(data: {
  workloadDescription?: string;
  documentFileName?: string;
  documentExtractedText?: string;
  analysisResult?: any;
  analysisQuality?: string;
  analysisConfidence?: number;
  detectedGoal?: string;
  detectedVramGb?: number;
  detectedIntensity?: string;
  detectedFrameworks?: string[];
}): Promise<{ id: string }> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}/api/compute/recommendation-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create recommendation session');
  return res.json();
}

export async function updateRecommendationSession(id: string, data: {
  selectedGoal?: string;
  selectedDatasetSize?: string;
  selectedIntensity?: number;
  selectedBudgetType?: string;
  selectedBudgetAmount?: number;
  selectedDuration?: string;
  goalAutoSelected?: boolean;
  datasetAutoSelected?: boolean;
  intensityAutoSelected?: boolean;
  recommendations?: any;
  selectedConfigSlug?: string;
  completedAt?: string;
}): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}/api/compute/recommendation-session/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update recommendation session');
}

export async function generateExplanation(
  configSlug: string,
  configSpecs: Record<string, any>,
  userGoal: string,
  userContext: string
): Promise<{ explanation: string; bullets?: string[] }> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}/api/compute/generate-explanation`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ configSlug, configSpecs, userGoal, userContext }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to generate explanation');
  }
  return res.json();
}
