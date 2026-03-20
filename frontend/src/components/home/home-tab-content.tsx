"use client";

import { useEffect, useState } from "react";
import type { User } from "@/types/auth";
import type { HomeDashboardData } from "@/lib/api";
import { getHomeDashboardData } from "@/lib/api";

interface HomeTabContentProps {
  user: User | null;
}

// Card component for quick stats
function QuickStatCard({
  title,
  value,
  subtitle,
  icon,
  status,
  statusColor,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  status?: string;
  statusColor?: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "var(--bgColor-mild)",
        border: "1px solid var(--borderColor-default)",
        borderRadius: "4px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-xs)",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--fgColor-muted)",
          }}
        >
          {title}
        </div>
        {status && (
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              color: "var(--bgColor-default)",
              padding: "4px 12px",
              borderRadius: "4px",
              backgroundColor: "var(--fgColor-default)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: statusColor ?? "#3fb950",
                flexShrink: 0,
              }}
            />
            {status}
          </div>
        )}
      </div>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-lg)",
          fontWeight: 600,
          color: "var(--fgColor-default)",
        }}
      >
        {value}
      </div>
      {subtitle && (
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-xs)",
            color: "var(--fgColor-muted)",
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

// Section header component
function SectionHeader({ title }: { title: string }) {
  return (
    <h2
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-base)",
        fontWeight: 600,
        color: "var(--fgColor-default)",
        marginBottom: "12px",
        marginTop: "24px",
      }}
    >
      {title}
    </h2>
  );
}

export function HomeTabContent({ user }: HomeTabContentProps) {
  const [dashboardData, setDashboardData] = useState<HomeDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHomeDashboardData()
      .then((data) => {
        setDashboardData(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const quotaGb = dashboardData?.storage.quotaGb ?? user?.storageQuotaGb ?? 5;
  const usedGb = dashboardData?.storage.usedGb ?? 0;
  const storageStatus = dashboardData?.storage.status || user?.storageProvisioningStatus || "N/A";
  const isInstitution = user?.authType === "university_sso";

  // Quick stats from API
  const quickStats = dashboardData?.quickStats ?? {
    totalSessions: 0,
    activeSessions: 0,
    totalDatasets: 0,
    totalNotebooks: 0,
  };

  // Format storage status for display
  const getStorageStatusDisplay = () => {
    switch (storageStatus) {
      case "provisioned":
        return { text: "Live", color: "#3fb950" };
      case "pending":
        return { text: "Provisioning", color: "#d29922" };
      case "failed":
        return { text: "Error", color: "#f85149" };
      default:
        return { text: "Inactive", color: "#8b949e" };
    }
  };

  const storageDisplay = getStorageStatusDisplay();

  return (
    <div>
      {/* Welcome Section - Info banner style */}
      <div
        style={{
          backgroundColor: "var(--bgColor-info, #cedeff)",
          border: "1px solid var(--borderColor-info, #3a73ff)",
          borderRadius: "4px",
          padding: "16px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
        }}
      >
        {/* Info icon */}
        <div style={{ flexShrink: 0, marginTop: "2px" }}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--fgColor-info, #3a73ff)" }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
        <div>
          <h2
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-base)",
              fontWeight: 600,
              color: "var(--fgColor-default)",
              margin: 0,
              marginBottom: "4px",
            }}
          >
            Welcome to LaaS
          </h2>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              lineHeight: "1.375rem",
              color: "var(--fgColor-default)",
              margin: 0,
            }}
          >
            Your AI Lab-as-a-Service platform is ready. Access high-performance computing resources,
            manage your datasets, and run Jupyter notebooks all in one place.
          </p>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <SectionHeader title="Overview" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
        }}
      >
        <QuickStatCard
          title="Storage"
          value={`${usedGb} / ${quotaGb} GB`}
          subtitle={isInstitution ? "Included with your plan" : "Default allocation"}
          status={storageDisplay.text}
          statusColor={storageDisplay.color}
        />
        <QuickStatCard
          title="Compute Sessions"
          value={String(quickStats.activeSessions)}
          subtitle={quickStats.activeSessions > 0 ? "Currently running" : "No active workloads"}
        />
        <QuickStatCard
          title="Resources"
          value={`${quickStats.totalDatasets + quickStats.totalNotebooks}`}
          subtitle={`${quickStats.totalDatasets} datasets, ${quickStats.totalNotebooks} notebooks`}
        />
      </div>

      {/* Quick Actions Section */}
      <SectionHeader title="Quick Actions" />
      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <QuickActionButton label="Launch Compute" href="#" />
        <QuickActionButton label="Manage Storage" href="/storage" />
        <QuickActionButton label="API Keys" href="#" />
      </div>

      {/* Recent Activity Section */}
      <SectionHeader title="Recent Activity" />
      <div
        style={{
          backgroundColor: "var(--bgColor-mild)",
          border: "1px solid var(--borderColor-default)",
          borderRadius: "4px",
          padding: "16px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--fgColor-muted)",
            textAlign: "center",
            padding: "24px",
          }}
        >
          No recent activity to display.
        </div>
      </div>
    </div>
  );
}

// Quick action button component
function QuickActionButton({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: "40px",
        padding: "0 24px",
        backgroundColor: "transparent",
        border: "1px solid var(--borderColor-default)",
        borderRadius: "4px",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-sm)",
        fontWeight: 500,
        color: "var(--fgColor-default)",
        textDecoration: "none",
        cursor: "pointer",
        transition: "background-color 0.15s ease, border-color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "rgba(11, 11, 11, 0.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      {label}
    </a>
  );
}
