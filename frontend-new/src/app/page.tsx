"use client";

import { useState, useEffect } from "react";
import { getAccessToken } from "@/lib/token";
import { LandingPage } from "@/components/landing/landing-page";

export default function RootPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    setIsAuthenticated(!!token);
    setIsReady(true);
  }, []);

  if (!isReady) return null;

  return <LandingPage isAuthenticated={isAuthenticated} />;
}

