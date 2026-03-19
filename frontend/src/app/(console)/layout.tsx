"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getAccessToken } from "@/lib/token";

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user has a valid access token
    const token = getAccessToken();
    if (!token) {
      // No token, redirect to sign-in
      router.replace("/signin");
      return;
    }
    setIsAuthenticated(true);
  }, [router]);

  // Show nothing while checking authentication
  if (isAuthenticated === null) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
