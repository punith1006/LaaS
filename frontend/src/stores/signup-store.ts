"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PolicySlug } from "@/config/policies";

export interface OnboardingData {
  profession?: string;
  expertiseLevel?: string;
  yearsOfExperience?: number;
  primaryUseCase?: string;
  operationalDomains: string[];
  toolsFrameworks: string[];
  goalsOther?: string;
  country?: string;
}

export interface InstitutionInfo {
  name: string;
  shortName: string | null;
  slug: string;
}

export interface SignupState {
  email: string;
  password: string;
  agreedPolicies: Record<PolicySlug, boolean>;
  firstName: string;
  lastName: string;
  currentStep: 1 | 2 | 3;
  onboardingData: OnboardingData;
  institution: InstitutionInfo | null;
}

const initialAgreedPolicies: Record<PolicySlug, boolean> = {
  acceptable_use: false,
  user_content_disclaimer: false,
  console_tos: false,
};

const initialOnboardingData: OnboardingData = {
  operationalDomains: [],
  toolsFrameworks: [],
};

type SignupActions = {
  setStep1: (
    email: string,
    password: string,
    policies: Record<PolicySlug, boolean>
  ) => void;
  setStep2: (firstName: string, lastName: string) => void;
  setPolicy: (slug: PolicySlug, agreed: boolean) => void;
  setOnboardingData: (data: Partial<OnboardingData>) => void;
  setInstitution: (institution: InstitutionInfo | null) => void;
  reset: () => void;
  hasStep1Data: () => boolean;
  hasEmail: () => boolean;
};

const initialState: SignupState = {
  email: "",
  password: "",
  agreedPolicies: initialAgreedPolicies,
  firstName: "",
  lastName: "",
  currentStep: 1,
  onboardingData: initialOnboardingData,
  institution: null,
};

export const useSignupStore = create<SignupState & SignupActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      setStep1: (email, password, policies) =>
        set({
          email,
          password,
          agreedPolicies: policies,
          currentStep: 1,
        }),
      setStep2: (firstName, lastName) =>
        set({ firstName, lastName, currentStep: 2 }),
      setPolicy: (slug, agreed) =>
        set((state) => ({
          agreedPolicies: { ...state.agreedPolicies, [slug]: agreed },
        })),
      setOnboardingData: (data) =>
        set((state) => ({
          onboardingData: { ...state.onboardingData, ...data },
        })),
      setInstitution: (institution) => set({ institution }),
      reset: () => set(initialState),
      hasStep1Data: () => {
        const s = get();
        return Boolean(s.email && s.password);
      },
      hasEmail: () => Boolean(get().email),
    }),
    {
      name: "laas-signup",
      storage: {
        getItem: (name: string) => {
          if (typeof window === "undefined") return null;
          return window.sessionStorage.getItem(name);
        },
        setItem: (name: string, value: string) => {
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(name, value);
          }
        },
        removeItem: (name: string) => {
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(name);
          }
        },
      },
    } as never
  )
);
