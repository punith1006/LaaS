"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getMe, getBillingData } from "@/lib/api";
import type { User } from "@/types/auth";
import type { BillingData } from "@/lib/api";
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
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const currentTab = searchParams.get("tab") === "billing" ? "billing" : "home";

  // Theme-aware info box colors (matching ephemeral storage style)
  const infoBoxColors = {
    orange: {
      bg: isDarkMode ? "rgba(231, 103, 66, 0.08)" : "rgba(231, 103, 66, 0.06)",
      border: isDarkMode ? "#ff6742" : "#e70000",
      icon: isDarkMode ? "#ff6742" : "#e70000",
    },
  };

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

    const fetchBillingData = async () => {
      try {
        const billing = await getBillingData();
        setBillingData(billing);
      } catch {
        // Silently fail - billing data is optional
      }
    };

    fetchUser();
    fetchBillingData();

    // Detect dark mode
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };
    checkDarkMode();
    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
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

      {/* Zero Credits Warning Banner - Horizontal layout with CTA on right */}
      {billingData && billingData.creditBalance === 0 && (
        <div
          style={{
            display: "flex",
            gap: "12px",
            padding: "16px",
            marginTop: "16px",
            backgroundColor: infoBoxColors.orange.bg,
            border: `1px solid ${infoBoxColors.orange.border}`,
            borderRadius: "4px",
            alignItems: "center",
          }}
        >
          {/* Caution icon */}
          <span style={{ color: infoBoxColors.orange.icon, flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>

          {/* Content - Title (heading style) + Description */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "Outfit, var(--font-sans), sans-serif",
                fontSize: "var(--text-base)",
                fontWeight: 600,
                color: "var(--fgColor-default)",
                marginBottom: "4px",
              }}
            >
              No credits remaining
            </div>
            <div
              style={{
                fontFamily: "Outfit, var(--font-sans), sans-serif",
                fontSize: "0.875rem",
                fontWeight: 400,
                color: "var(--fgColor-default)",
                lineHeight: "1.4",
              }}
            >
              Add credits to your account to continue using LaaS.
            </div>
          </div>

          {/* CTA Button - right aligned */}
          <button
            onClick={() => router.push("/billing")}
            style={{
              fontFamily: "Outfit, var(--font-sans), sans-serif",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--bgColor-default)",
              backgroundColor: "var(--fgColor-default)",
              border: "1px solid var(--fgColor-default)",
              borderRadius: "4px",
              padding: "0 20px",
              height: "36px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              flexShrink: 0,
            }}
          >
            Add credits
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      )}

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
