import type { PolicySlug } from "@/config/policies";

export interface ProfileData {
  // Personal
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  timezone: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  // Auth
  authType: string;
  oauthProvider: string | null;
  twoFactorEnabled: boolean;
  // Profile
  bio: string | null;
  profession: string | null;
  expertiseLevel: string | null;
  yearsOfExperience: number | null;
  collegeName: string | null;
  courseName: string | null;
  academicYear: number | null;
  departmentName: string | null;
  skills: string[];
  githubUrl: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  country: string | null;
  operationalDomains: string[];
  useCasePurposes: string[];
  // Wallet
  balanceCents: number | null;
  currency: string | null;
  lifetimeSpentCents: number | null;
  // Org
  organizationName: string | null;
}

export interface EditableProfileData {
  displayName?: string;
  phone?: string;
  timezone?: string;
  bio?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  skills?: string[];
}

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
  /** Allocated quota in GB for institution SSO users */
  storageQuotaGb?: number | null;
  /** For institution users: the university slug (used for department fetch) */
  institutionSlug?: string;
}
