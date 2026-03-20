"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getMe } from "@/lib/api";
import type { User } from "@/types/auth";
import { HomeTabContent } from "@/components/home/home-tab-content";
import { BillingTabContent } from "@/components/home/billing-tab-content";

// Greeting helper function
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const currentTab = searchParams.get("tab") === "billing" ? "billing" : "home";

  useEffect(() => {
    // Force fresh fetch by adding cache-busting timestamp
    const fetchUser = async () => {
      try {
        const u = await getMe();
        if (!u) {
          // User is not authenticated, redirect to sign-in
          router.replace("/signin");
          return;
        }
        setUser(u);
        setLoading(false);
      } catch {
        // Error fetching user, redirect to sign-in
        router.replace("/signin");
      }
    };
    fetchUser();
  }, [router]);

  // Get user's name - prefer firstName + lastName, fall back to just firstName, then just lastName, then "there"
  const getDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    if (user?.lastName) {
      return user.lastName;
    }
    return "there";
  };

  const displayName = getDisplayName();
  const greeting = getGreeting();

  if (loading) {
    return (
      <div style={{ padding: "15px" }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "2rem",
            fontWeight: 600,
            lineHeight: "2.5rem",
            color: "var(--fgColor-default)",
            letterSpacing: "-0.02em",
          }}
        >
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "15px" }}>
      {/* Greeting Header - Lambda.ai Usage Dashboard style */}
      <h1
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "2rem",
          fontWeight: 600,
          lineHeight: "2.5rem",
          color: "var(--fgColor-default)",
          letterSpacing: "-0.02em",
          margin: 0,
        }}
      >
        {greeting}, {displayName}!
      </h1>

      {/* Tab Navigation */}
      <div
        style={{
          display: "flex",
          gap: "0",
          marginTop: "16px",
          borderBottom: "1px solid var(--borderColor-default)",
        }}
      >
        {(["home", "billing"] as const).map((tab) => {
          const isActive = currentTab === tab;
          return (
            <button
              key={tab}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                if (tab === "home") {
                  params.delete("tab");
                } else {
                  params.set("tab", tab);
                }
                const qs = params.toString();
                router.push(`/home${qs ? `?${qs}` : ""}`, { scroll: false });
              }}
              style={{
                padding: "10px 16px",
                fontFamily: "var(--font-sans)",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: isActive ? "var(--fgColor-default)" : "var(--fgColor-muted)",
                background: "none",
                border: "none",
                borderBottom: isActive ? "2px solid #C8AA6E" : "2px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s ease",
                marginBottom: "-1px",
              }}
            >
              {tab === "home" ? "Home" : "Billing"}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ marginTop: "24px" }}>
        {currentTab === "home" ? (
          <HomeTabContent user={user} />
        ) : (
          <BillingTabContent user={user} />
        )}
      </div>
    </div>
  );
}
