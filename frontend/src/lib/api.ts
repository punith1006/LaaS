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
  const token = getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/api/dashboard/health`, {
      headers: { Authorization: `Bearer ${token}` },
    });
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
  const token = getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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
    const res = await fetch(
      `${API_BASE}/api/storage/volumes/check-name/${encodeURIComponent(name)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
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
  const token = getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  if (API_BASE) {
    const queryParam = path && path !== '/' ? `?path=${encodeURIComponent(path)}` : '';
    const res = await fetch(`${API_BASE}/api/storage/files${queryParam}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

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
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');

  if (API_BASE) {
    const res = await fetch(`${API_BASE}/api/storage/files/mkdir`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
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
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');

  if (API_BASE) {
    const formData = new FormData();
    formData.append('path', path);
    files.forEach((file) => formData.append('files', file));

    const res = await fetch(`${API_BASE}/api/storage/files/upload`, {
      method: 'POST',
      headers: {
        // Do NOT set Content-Type - browser auto-sets with boundary for multipart
        Authorization: `Bearer ${token}`,
      },
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
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');

  if (API_BASE) {
    const res = await fetch(
      `${API_BASE}/api/storage/files/download?file=${encodeURIComponent(filePath)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
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
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');

  if (API_BASE) {
    const res = await fetch(
      `${API_BASE}/api/storage/files?file=${encodeURIComponent(filePath)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
  const token = getAccessToken();
  if (!token) return [];

  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/dashboard/activity?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
  const token = getAccessToken();
  if (!token) return null;

  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/compute/configs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/api/compute/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/api/payment/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/api/payment/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');

  if (API_BASE) {
    const res = await fetch(`${API_BASE}/api/payment/transactions?page=${page}&limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

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
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');

  if (API_BASE) {
    const res = await fetch(`${API_BASE}/api/payment/transactions/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

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
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');

  if (API_BASE) {
    const res = await fetch(`${API_BASE}/api/payment/invoice/${transactionId}/download`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = Array.isArray(data.message) ? data.message[0] : data.message;
      throw new Error(msg || 'Failed to download invoice');
    }

    return res.blob();
  }

  throw new Error('No API configured');
}
