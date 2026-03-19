"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/token";

export default function RootPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user has a valid access token
    const token = getAccessToken();
    if (token) {
      // User is authenticated, redirect to home
      router.replace("/home");
    } else {
      // User is not authenticated, redirect to sign-in
      router.replace("/signin");
    }
    setIsChecking(false);
  }, [router]);

  // Show nothing while checking authentication
  if (isChecking) {
    return null;
  }

  return null;
}
