"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getMe } from "@/lib/api";
import type { User } from "@/types/auth";
import { HomeTabContent } from "@/components/home/home-tab-content";
import { BillingTabContent } from "@/components/home/billing-tab-content";

// Tab type definition
type Tab = "home" | "billing";

// Lambda.ai style tabs component - matching Usage Dashboard pattern
function HomeTabs({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (tab: Tab) => void }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "home", label: "Home" },
    { id: "billing", label: "Billing" },
  ];

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        height: "40px",
        gap: "24px",
        borderBottom: "1px solid var(--borderColor-default)",
        marginTop: "24px",
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              position: "relative",
              cursor: "pointer",
              flexShrink: 0,
              whiteSpace: "nowrap",
              height: "40px",
              background: "transparent",
              border: "none",
              padding: "0 0 12px 0",
              marginBottom: "-1px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "1rem",
                fontWeight: isActive ? 600 : 400,
                lineHeight: "1.5rem",
                display: "block",
                color: isActive ? "var(--fgColor-default)" : "var(--fgColor-muted)",
                transition: "color 0.15s ease",
              }}
            >
              {tab.label}
            </span>
            {/* Active tab underline - dark/black like Lambda.ai */}
            {isActive && (
              <span
                style={{
                  position: "absolute",
                  zIndex: 1,
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "2px",
                  backgroundColor: "var(--fgColor-default)",
                  transition: "all 0.2s ease",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

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

  // Get tab from URL or default to "home"
  const currentTab = (searchParams.get("tab") as Tab) || "home";

  useEffect(() => {
    // Force fresh fetch by adding cache-busting timestamp
    const fetchUser = async () => {
      try {
        const u = await getMe();
        setUser(u);
        setLoading(false);
      } catch {
        setUser(null);
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleTabChange = (tab: Tab) => {
    // Update URL with new tab parameter
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    router.push(`/home?${params.toString()}`, { scroll: false });
  };

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

      {/* Tabs */}
      <HomeTabs activeTab={currentTab} onTabChange={handleTabChange} />

      {/* Tab Content */}
      <div style={{ marginTop: "24px" }}>
        {currentTab === "home" && <HomeTabContent user={user} />}
        {currentTab === "billing" && <BillingTabContent user={user} />}
      </div>
    </div>
  );
}
