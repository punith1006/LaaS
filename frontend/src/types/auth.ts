import type { PolicySlug } from "@/config/policies";

export interface SignupState {
  email: string;
  password: string;
  agreedPolicies: Record<PolicySlug, boolean>;
  firstName: string;
  lastName: string;
  currentStep: 1 | 2 | 3;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  emailVerifiedAt: string | null;
  authType?: string;
  /** For institution members: "pending" | "provisioned" | "failed" */
  storageProvisioningStatus?: string | null;
  /** Set when storageProvisioningStatus === "failed" */
  storageProvisioningError?: string | null;
  storageProvisionedAt?: string | null;
}
