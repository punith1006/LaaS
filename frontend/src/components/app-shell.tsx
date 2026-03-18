"use client";

import { SidebarNav } from "./sidebar-nav";

/**
 * Base screen template — Utilitarian minimalism (Design\template.txt).
 * Pixel-perfect structure matching the reference:
 * - Logo box: small bordered square in top-left corner
 * - Header: extends right from logo, bottom border only
 * - Sidebar: extends below logo, right border only
 * - Main content: the remaining area
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundColor: "var(--shell-bg)",
        fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* Top row: Logo box + Header */}
      <div className="flex" style={{ height: "var(--shell-header-height)" }}>
        {/* Logo box: bordered square with LaaS */}
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: "var(--shell-logo-size)",
            height: "var(--shell-header-height)",
            borderRight: "1px solid var(--shell-border)",
            borderBottom: "1px solid var(--shell-border)",
          }}
        >
          <span
            className="select-none"
            style={{
              fontSize: "18px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              color: "#1a1a1a",
            }}
          >
            LaaS
          </span>
        </div>

        {/* Header: bottom border only, fills remaining width */}
        <header
          className="flex-1"
          style={{
            height: "var(--shell-header-height)",
            borderBottom: "1px solid var(--shell-border)",
          }}
          aria-label="Header"
        />
      </div>

      {/* Bottom row: Sidebar + Main content */}
      <div className="flex" style={{ height: "calc(100vh - var(--shell-header-height))" }}>
        {/* Sidebar: right border only */}
        <aside
          className="flex flex-col shrink-0"
          style={{
            width: "var(--shell-sidebar-width)",
            borderRight: "1px solid var(--shell-border)",
          }}
          aria-label="Navigation"
        >
          {/* Navigation accordion sections */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <SidebarNav />
          </div>
          {/* Bottom area for user profile/settings */}
          <div
            className="shrink-0 min-h-[80px]"
            style={{
              borderTop: "1px solid var(--shell-border)",
            }}
            aria-hidden
          />
        </aside>

        {/* Main content area */}
        <main className="flex-1 min-h-0 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
