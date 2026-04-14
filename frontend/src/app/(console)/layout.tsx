"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getAccessToken } from "@/lib/token";
import { getOnboardingStatus } from "@/lib/api";

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkAuthAndOnboarding = async () => {
      // Check if user has a valid access token
      const token = getAccessToken();
      if (!token) {
        // No token, redirect to sign-in
        router.replace("/signin");
        return;
      }

      // Check onboarding status as a safety net
      try {
        const onboardingStatus = await getOnboardingStatus();
        if (onboardingStatus && !onboardingStatus.isOnboardingComplete) {
          // Onboarding not complete, redirect to onboarding
          router.replace("/signup/onboarding");
          return;
        }
      } catch {
        // If the API call fails, we'll allow access (fail open)
        // The backend will enforce proper authorization
      }

      setIsCheckingOnboarding(false);
      setIsAuthenticated(true);
    };

    checkAuthAndOnboarding();
  }, [router]);

  // Show nothing while checking authentication and onboarding status
  if (isAuthenticated === null || isCheckingOnboarding) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
