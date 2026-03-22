"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SidebarNav } from "./sidebar-nav";
import { SignOutModal } from "./sign-out-modal";
import { getBillingData, getPlatformHealth, PlatformHealth } from "@/lib/api";

/**
 * Base screen template — Utilitarian minimalism (Design\template.txt).
 * Pixel-perfect structure matching the reference:
 * - Logo box: fills header height with padding
 * - Header: extends right from logo, bottom border only
 * - Sidebar: extends below logo, right border only
 * - Main content: the remaining area
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [hasActiveInstances, setHasActiveInstances] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [platformHealth, setPlatformHealth] = useState<PlatformHealth | null>(null);
  const [showHealthTooltip, setShowHealthTooltip] = useState(false);

  // Load dark mode preference from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode");
    if (savedMode === "true") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  // Fetch credit balance on mount
  useEffect(() => {
    getBillingData()
      .then((data) => {
        setCreditBalance(data?.creditBalance ?? null);
      })
      .catch(() => {
        setCreditBalance(null);
      });
  }, []);

  // Fetch platform health on mount and poll every 30 seconds
  useEffect(() => {
    const fetchHealth = async () => {
      const health = await getPlatformHealth();
      setPlatformHealth(health);
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Helper functions for status indicator
  const getStatusColor = () => {
    if (!platformHealth) return "#8b949e"; // Gray - loading
    switch (platformHealth.overall) {
      case "operational": return "#22c55e"; // Green
      case "degraded": return "#d29922";    // Amber
      case "outage": return "#f85149";      // Red
      default: return "#8b949e";
    }
  };

  const getStatusLabel = () => {
    if (!platformHealth) return "Checking...";
    switch (platformHealth.overall) {
      case "operational": return "All Systems Operational";
      case "degraded": return "Some Services Degraded";
      case "outage": return "Service Disruption";
      default: return "Checking...";
    }
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("darkMode", String(newMode));
  };

  /**
   * Check for active instances before sign-out
   * This is a placeholder - in production, query the actual instance API
   */
  const checkActiveInstances = async (): Promise<boolean> => {
    // TODO: Replace with actual API call to check active instances
    // Example: const response = await fetch('/api/instances/active');
    // For now, return false (no active instances)
    return false;
  };

  /**
   * Handle sign-out button click
   * Checks for active instances and shows appropriate modal
   */
  const handleSignOutClick = async () => {
    const hasActive = await checkActiveInstances();
    setHasActiveInstances(hasActive);
    setIsSignOutModalOpen(true);
  };

  /**
   * Perform graceful sign-out
   * Clears local tokens and redirects to sign-in
   */
  const performSignOut = () => {
    // Store dark mode preference before clearing
    const darkMode = localStorage.getItem("darkMode");
    
    // Clear ALL localStorage (including tokens)
    localStorage.clear();
    
    // Restore dark mode preference
    if (darkMode) {
      localStorage.setItem("darkMode", darkMode);
    }

    // Clear ALL sessionStorage
    sessionStorage.clear();

    // Close the modal
    setIsSignOutModalOpen(false);

    // App-only sign-out: Clear local tokens and redirect to sign-in
    // This doesn't terminate the Keycloak SSO session, but that's fine because:
    // 1. OAuth buttons use prompt=login to force fresh authentication
    // 2. The user can always logout from Keycloak directly if needed
    router.push("/signin");
  };

  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundColor: "var(--bgColor-default)",
        fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* Top row: Logo box + Header */}
      <div className="flex" style={{ height: "var(--shell-header-height)" }}>
        {/* Logo box — Lambda style: fills header height with padding */}
        <div
          className="flex items-center shrink-0"
          style={{
            height: "var(--shell-header-height)",
            padding: "0 32px",
            borderRight: "1px solid var(--borderColor-default)",
            borderBottom: "1px solid var(--borderColor-default)",
            backgroundColor: "var(--bgColor-mild)",
          }}
        >
          <span
            className="select-none"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-lg)",
              fontWeight: 700,
              letterSpacing: "var(--tracking-label)",
              textTransform: "uppercase",
              color: "var(--fgColor-default)",
            }}
          >
            LaaS
          </span>
        </div>

        {/* Header right section — Lambda style nav links */}
        <header
          className="flex-1 flex items-center justify-end"
          style={{
            height: "var(--shell-header-height)",
            borderBottom: "1px solid var(--borderColor-default)",
            backgroundColor: "var(--bgColor-mild)",
            gap: "16px",
            paddingRight: "24px",
          }}
          aria-label="Header"
        >
          {/* Credits Remaining */}
          <div
            className="flex items-center"
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "1rem",
              fontWeight: 500,
              lineHeight: "1.375rem",
              textTransform: "uppercase",
              color: "var(--fgColor-default)",
              padding: "8px",
              gap: "8px",
            }}
          >
            Credits Remaining: {creditBalance !== null ? `₹${creditBalance.toFixed(2)}` : "—"}
          </div>

          {/* Status indicator with tooltip */}
          <div
            className="flex items-center relative"
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "1rem",
              fontWeight: 500,
              lineHeight: "1.375rem",
              textTransform: "uppercase",
              color: "var(--fgColor-default)",
              padding: "8px",
              gap: "8px",
              cursor: "default",
            }}
            onMouseEnter={() => setShowHealthTooltip(true)}
            onMouseLeave={() => setShowHealthTooltip(false)}
          >
            Status
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: getStatusColor(),
                transition: "background-color 0.3s ease",
              }}
            />
            
            {/* Hover tooltip */}
            {showHealthTooltip && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "8px",
                  backgroundColor: "var(--bgColor-default, #0d1117)",
                  border: "1px solid var(--borderColor-default, #30363d)",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  minWidth: "260px",
                  zIndex: 9999,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                }}
              >
                {/* Overall status header */}
                <div style={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: getStatusColor(),
                  marginBottom: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}>
                  <span style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: getStatusColor(),
                  }} />
                  {getStatusLabel()}
                </div>
                
                {/* Per-service status list */}
                {platformHealth?.services.map((service, i) => (
                  <div key={i} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    borderTop: i === 0 ? "1px solid var(--borderColor-default, #30363d)" : "none",
                    borderBottom: "1px solid var(--borderColor-default, #21262d)",
                  }}>
                    <span style={{
                      fontFamily: "var(--font-sans, sans-serif)",
                      fontSize: "0.8rem",
                      color: "var(--fgColor-muted, #8b949e)",
                      textTransform: "none",
                    }}>
                      {service.message}
                    </span>
                    <span style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: service.status === 'healthy' ? '#22c55e' : '#f85149',
                      flexShrink: 0,
                      marginLeft: "12px",
                    }} />
                  </div>
                ))}

                {/* If no data yet */}
                {!platformHealth && (
                  <div style={{
                    fontFamily: "var(--font-sans, sans-serif)",
                    fontSize: "0.8rem",
                    color: "var(--fgColor-muted, #8b949e)",
                    textTransform: "none",
                  }}>
                    Checking service health...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="flex items-center cursor-pointer"
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "1rem",
              fontWeight: 500,
              lineHeight: "1.375rem",
              textTransform: "uppercase",
              color: "var(--fgColor-default)",
              background: "transparent",
              border: "none",
              padding: "8px",
              gap: "8px",
            }}
          >
            {/* Sun icon */}
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: isDarkMode ? "none" : "block" }}
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
            {/* Moon icon */}
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: isDarkMode ? "block" : "none" }}
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            Mode
          </button>

          {/* Sign out */}
          <button
            onClick={handleSignOutClick}
            className="flex items-center cursor-pointer"
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "1rem",
              fontWeight: 500,
              lineHeight: "1.375rem",
              textTransform: "uppercase",
              color: "var(--fgColor-default)",
              background: "transparent",
              border: "none",
              padding: "8px",
              gap: "8px",
            }}
          >
            Sign out
            {/* Log-out icon - Lucide style */}
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m16 17 5-5-5-5" />
              <path d="M21 12H9" />
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            </svg>
          </button>
        </header>
      </div>

      {/* Bottom row: Sidebar + Main content */}
      <div className="flex" style={{ height: "calc(100vh - var(--shell-header-height))" }}>
        {/* Sidebar: slightly darker than main content */}
        <aside
          className="flex flex-col shrink-0"
          style={{
            width: "var(--shell-sidebar-width)",
            borderRight: "1px solid var(--borderColor-default)",
            backgroundColor: "var(--bgColor-mild)",
            fontSize: "14px",
          }}
          aria-label="Navigation"
        >
          {/* Navigation accordion sections */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <SidebarNav />
          </div>
          {/* Sidebar footer — Support, Company, Settings nav items + copyright */}
          <div
            className="shrink-0"
            style={{
              borderTop: "1px solid var(--borderColor-default)",
              backgroundColor: "var(--bgColor-mild)",
              paddingTop: "8px",
              paddingBottom: "12px",
            }}
          >
            {[
              {
                label: "SUPPORT",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                ),
              },
              {
                label: "COMPANY",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                ),
              },
            ].map(({ label, icon }) => (
              <button
                key={label}
                disabled
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  height: "48px",
                  padding: "0 16px",
                  background: "transparent",
                  border: "none",
                  cursor: "default",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-base)",
                  fontWeight: 400,
                  textTransform: "uppercase",
                  letterSpacing: "var(--tracking-label)",
                  color: "var(--fgColor-default)",
                  textAlign: "left",
                }}
              >
                <span style={{ flexShrink: 0 }}>{icon}</span>
                {label}
              </button>
            ))}

            {/* Copyright */}
            <div
              style={{
                padding: "8px 16px 0",
                fontFamily: "var(--font-sans)",
                fontSize: "0.6875rem",
                color: "var(--fgColor-muted)",
                lineHeight: 1.4,
              }}
            >
              © Copyright LaaS 2026
            </div>
          </div>
        </aside>

        {/* Main content area — lighter than sidebar/header */}
        <main
          className="flex-1 min-h-0 min-w-0 overflow-auto"
          style={{
            backgroundColor: "var(--bgColor-default)",
          }}
        >
          {children}
        </main>
      </div>

      {/* Sign-out confirmation modal */}
      <SignOutModal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
        onConfirm={performSignOut}
        hasActiveInstances={hasActiveInstances}
      />
    </div>
  );
}
