"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PolicySlug } from "@/config/policies";

export interface SignupState {
  email: string;
  password: string;
  agreedPolicies: Record<PolicySlug, boolean>;
  firstName: string;
  lastName: string;
  currentStep: 1 | 2 | 3;
}

const initialAgreedPolicies: Record<PolicySlug, boolean> = {
  acceptable_use: false,
  user_content_disclaimer: false,
  console_tos: false,
};

type SignupActions = {
  setStep1: (
    email: string,
    password: string,
    policies: Record<PolicySlug, boolean>
  ) => void;
  setStep2: (firstName: string, lastName: string) => void;
  setPolicy: (slug: PolicySlug, agreed: boolean) => void;
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
      reset: () => set(initialState),
      hasStep1Data: () => {
        const s = get();
        return Boolean(s.email && s.password);
      },
      hasEmail: () => Boolean(get().email),
    }),
    { name: "laas-signup", storage: typeof window !== "undefined" ? window.sessionStorage : undefined }
  )
);
