"use client";

import { useState, useEffect } from "react";
import { getAccessToken } from "@/lib/token";
import { getMe } from "@/lib/api";
import type { User } from "@/types/auth";
import { WaitlistPage } from "@/components/waitlist/waitlist-page";

export default function WaitlistRoute() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    getMe()
      .then((u) => {
        setUser(u ?? null);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  return <WaitlistPage user={user} />;
}
