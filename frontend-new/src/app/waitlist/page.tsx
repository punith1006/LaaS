"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/token";
import { getMe } from "@/lib/api";
import type { User } from "@/types/auth";
import { WaitlistPage } from "@/components/waitlist/waitlist-page";

export default function WaitlistRoute() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/signin");
      return;
    }
    getMe()
      .then((u) => {
        if (!u) {
          router.replace("/signin");
          return;
        }
        setUser(u);
      })
      .catch(() => router.replace("/signin"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading || !user) return null;
  return <WaitlistPage user={user} />;
}
