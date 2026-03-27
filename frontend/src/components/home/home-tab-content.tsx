"use client";

import { useEffect, useState } from "react";
import type { User } from "@/types/auth";
import type { HomeDashboardData, ActivityLogEntry, BillingData } from "@/lib/api";
import { getHomeDashboardData, getRecentActivity, getBillingData } from "@/lib/api";

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
  const [activityData, setActivityData] = useState<ActivityLogEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [billingData, setBillingData] = useState<BillingData | null>(null);

  useEffect(() => {
    getHomeDashboardData()
      .then((data) => {
        setDashboardData(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    // Fetch activity data
    getRecentActivity(30)
      .then((data) => {
        setActivityData(data);
        setActivityLoading(false);
        // Auto-expand today's date
        const today = new Date().toISOString().split('T')[0];
        setExpandedDates(new Set([today]));
      })
      .catch(() => {
        setActivityLoading(false);
      });

    // Fetch billing data for runway check
    getBillingData()
      .then((data) => {
        setBillingData(data);
      })
      .catch(() => {
        // Silently fail - billing data is optional for home page
      });
  }, []);

  const quotaGb = dashboardData?.storage.quotaGb ?? user?.storageQuotaGb ?? 5;
  const usedGb = dashboardData?.storage.usedGb ?? 0;
  const isInstitution = user?.authType === "university_sso";

  // Quick stats from API
  const quickStats = dashboardData?.quickStats ?? {
    totalSessions: 0,
    activeSessions: 0,
    totalDatasets: 0,
    totalNotebooks: 0,
  };

  // Format storage status for display with live health check
  const getStorageStatusDisplay = () => {
    const dbStatus = dashboardData?.storage?.status || user?.storageProvisioningStatus || "N/A";
    const healthStatus = dashboardData?.storage?.healthStatus;

    // If DB says provisioned, use live health check result
    if (dbStatus === "provisioned") {
      if (healthStatus === "live") {
        return { text: "Live", color: "#3fb950" };        // Green - service healthy
      } else if (healthStatus === "unreachable") {
        return { text: "Unreachable", color: "#f85149" };  // Red - service down
      } else if (healthStatus === "not_found") {
        return { text: "Not Found", color: "#f85149" };   // Red - dataset deleted from host
      }
      // healthStatus is null (no check performed) - fall back to DB status
      return { text: "Live", color: "#3fb950" };
    }

    // Non-provisioned states from DB
    switch (dbStatus) {
      case "pending":
      case "provisioning":
        return { text: "Provisioning", color: "#d29922" }; // Amber
      case "failed":
      case "error":
        return { text: "Error", color: "#f85149" };        // Red
      case "wiping":
      case "wiped":
        return { text: "Inactive", color: "#8b949e" };     // Gray
      default:
        return { text: "Inactive", color: "#8b949e" };     // Gray
    }
  };

  const storageDisplay = getStorageStatusDisplay();

  // Helper function to group activities by date
  const groupActivitiesByDate = (activities: ActivityLogEntry[]) => {
    const groups: Record<string, ActivityLogEntry[]> = {};
    activities.forEach((activity) => {
      const date = activity.createdAt.split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
    });
    // Sort dates descending (most recent first)
    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return sortedDates.map((date) => ({
      date,
      activities: groups[date].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    }));
  };

  // Format date header: "Today, March 23" or "March 22, 2026"
  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = dateStr === today.toISOString().split('T')[0];
    const isYesterday = dateStr === yesterday.toISOString().split('T')[0];

    const monthDay = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    const year = date.getFullYear();
    const currentYear = today.getFullYear();

    if (isToday) {
      return `Today, ${monthDay}`;
    } else if (isYesterday) {
      return `Yesterday, ${monthDay}`;
    } else if (year === currentYear) {
      return monthDay;
    } else {
      return `${monthDay}, ${year}`;
    }
  };

  // Format time: "12:36 AM"
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Get human-readable action description
  const getActionDescription = (activity: ActivityLogEntry) => {
    const { action, details } = activity;
    switch (action) {
      case 'auth.login':
        return 'Signed in';
      case 'auth.logout':
        return 'Signed out';
      case 'filestore.create':
        const storeName = details?.name || details?.storageUid || 'File Store';
        const quota = details?.quotaGb;
        return quota ? `Created File Store '${storeName}' (${quota} GB)` : `Created File Store '${storeName}'`;
      case 'filestore.delete':
        return 'Deleted File Store';
      case 'file.upload':
        return `Uploaded file '${details?.fileName || 'unknown'}'`;
      case 'file.delete':
        return `Deleted file '${details?.fileName || 'unknown'}'`;
      case 'file.mkdir':
        return `Created folder '${details?.folderName || details?.fileName || 'unknown'}'`;
      case 'file.download':
        return `Downloaded file '${details?.fileName || 'unknown'}'`;
      // Session lifecycle events
      case 'session.created':
        const configName = details?.configName || '';
        const instName = details?.instanceName || 'Instance';
        return `Launched instance ${instName}${configName ? ` (${configName})` : ''}`;
      case 'session.scheduling':
        return `Scheduling instance ${details?.instanceName || 'Instance'}`;
      case 'session.running':
        return `Instance ${details?.instanceName || 'Instance'} is now running`;
      case 'session.terminated':
        const termCost = details?.finalCostCents ? `₹${(details.finalCostCents / 100).toFixed(2)}` : '';
        return `Terminated instance ${details?.instanceName || 'Instance'}${termCost ? ` — ${termCost}` : ''}`;
      case 'session.failed':
        return `Instance ${details?.instanceName || 'Instance'} failed`;
      case 'session.ended':
        return `Instance ${details?.instanceName || 'Instance'} ended`;
      case 'session.restarted':
        return `Restarted instance ${details?.instanceName || 'Instance'}`;
      // Billing events
      case 'billing.charge':
        const chargeAmount = details?.amountCents ? `₹${(details.amountCents / 100).toFixed(2)}` : '₹0.00';
        const chargeName = details?.instanceName || 'Session';
        return `Billed ${chargeAmount} for ${chargeName}`;
      case 'wallet.credit':
        const creditAmount = details?.amountCents ? `₹${(details.amountCents / 100).toFixed(2)}` : '₹0.00';
        return `Added ${creditAmount} to wallet`;
      default:
        // Fallback: convert action to readable format
        return action.replace(/\./g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
    }
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'auth':
        return '#3a73ff'; // blue
      case 'storage':
        return '#05C004'; // green
      case 'file':
        return '#FDA422'; // amber
      case 'billing':
        return '#f85149'; // red
      case 'session':
        return '#a371f7'; // purple
      default:
        return '#818178'; // muted
    }
  };

  // Format runway hours for display
  const formatRunway = (hours: number | null): string => {
    if (hours === null || hours === undefined) return "--";
    if (hours <= 0) return "0 hrs";
    if (hours > 8760) return "∞"; // More than a year = effectively infinite
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    if (days > 0) {
      return `${days}d ${remainingHours}h`;
    }
    return `${remainingHours} hrs`;
  };

  // Toggle date expansion
  const toggleDateExpansion = (date: string) => {
    setExpandedDates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const groupedActivities = groupActivitiesByDate(activityData);

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

      {/* Low Runway Warning */}
      {billingData?.runway !== null && billingData?.runway !== undefined && billingData.runway <= 1 && (
        <div style={{
          backgroundColor: "#FEF3C7",
          border: "1px solid #F59E0B",
          borderRadius: "4px",
          padding: "16px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
        }}>
          <div style={{ flexShrink: 0, marginTop: "2px" }}>
            {/* Orange warning triangle icon - 20x20, strokeWidth 1.5 */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <div style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase" as const,
              letterSpacing: "0.06em",
              color: "#D97706",
              marginBottom: "4px",
            }}>
              LOW RUNWAY
            </div>
            <p style={{
              fontSize: "0.875rem",
              color: "#92400E",
              margin: 0,
              lineHeight: 1.5,
            }}>
              Your compute instances will be automatically terminated when your credit runway reaches zero.
              Current runway: <strong>{formatRunway(billingData.runway)}</strong>.
              Add credits or stop active sessions to avoid interruption.
            </p>
          </div>
        </div>
      )}

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
        <QuickActionButton label="Launch Compute" href="/instances" />
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
          overflow: "hidden",
        }}
      >
        {activityLoading ? (
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              color: "var(--fgColor-muted)",
              textAlign: "center",
              padding: "24px",
            }}
          >
            Loading activity...
          </div>
        ) : groupedActivities.length === 0 ? (
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
        ) : (
          <div>
            {groupedActivities.map(({ date, activities }, groupIndex) => {
              const isExpanded = expandedDates.has(date);
              return (
                <div
                  key={date}
                  style={{
                    borderBottom:
                      groupIndex < groupedActivities.length - 1
                        ? "1px solid var(--borderColor-default)"
                        : "none",
                  }}
                >
                  {/* Date header - clickable accordion trigger */}
                  <button
                    onClick={() => toggleDateExpansion(date)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "12px 16px",
                      backgroundColor: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                      fontSize: "var(--text-sm)",
                      fontWeight: 600,
                      color: "var(--fgColor-default)",
                      textAlign: "left",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "16px",
                        fontSize: "10px",
                        color: "var(--fgColor-muted)",
                        transition: "transform 0.15s ease",
                        transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                      }}
                    >
                      ▶
                    </span>
                    {formatDateHeader(date)}
                    <span
                      style={{
                        fontWeight: 400,
                        color: "var(--fgColor-muted)",
                        fontSize: "var(--text-xs)",
                      }}
                    >
                      ({activities.length} {activities.length === 1 ? "event" : "events"})
                    </span>
                  </button>

                  {/* Activity entries - collapsible content */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: "0 16px 12px 16px",
                      }}
                    >
                      {activities.map((activity, actIndex) => (
                        <div
                          key={activity.id}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "12px",
                            padding: "10px 0",
                            borderTop:
                              actIndex > 0 ? "1px solid var(--borderColor-muted)" : "none",
                          }}
                        >
                          {/* Category dot */}
                          <div
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              backgroundColor: getCategoryColor(activity.category),
                              marginTop: "6px",
                              flexShrink: 0,
                            }}
                          />

                          {/* Time */}
                          <div
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "var(--text-xs)",
                              color: "var(--fgColor-muted)",
                              minWidth: "72px",
                              flexShrink: 0,
                            }}
                          >
                            {formatTime(activity.createdAt)}
                          </div>

                          {/* Action description */}
                          <div
                            style={{
                              flex: 1,
                              fontFamily: "var(--font-sans)",
                              fontSize: "var(--text-sm)",
                              color: "var(--fgColor-default)",
                              lineHeight: "1.4",
                            }}
                          >
                            {getActionDescription(activity)}
                          </div>

                          {/* Status badge */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              flexShrink: 0,
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "var(--font-sans)",
                                fontSize: "var(--text-xs)",
                                fontWeight: 500,
                                color:
                                  activity.status === "success"
                                    ? "#05C004"
                                    : activity.status === "failed"
                                    ? "#f85149"
                                    : "var(--fgColor-muted)",
                                textTransform: "capitalize",
                              }}
                            >
                              {activity.status}
                            </span>

                            {/* IP address (optional) */}
                            {activity.ipAddress && (
                              <span
                                style={{
                                  fontFamily: "var(--font-mono)",
                                  fontSize: "var(--text-xs)",
                                  color: "var(--fgColor-muted)",
                                }}
                              >
                                {activity.ipAddress}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
