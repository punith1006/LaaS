"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/token";
import { LandingPage } from "@/components/landing/landing-page";

export default function RootPage() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      router.replace("/home");
    } else {
      setIsReady(true);
    }
  }, [router]);

  if (!isReady) return null;

  return <LandingPage />;
}

