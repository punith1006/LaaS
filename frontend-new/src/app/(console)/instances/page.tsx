"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAccessToken } from "@/lib/token";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

// Session types from backend
interface ComputeConfig {
  id: string;
  slug: string;
  name: string;
  vcpu: number;
  memoryMb: number;
  gpuVramMb: number;
  gpuModel: string | null;
  basePricePerHourCents: number;
}

interface SessionNode {
  id: string;
  hostname: string;
  gpuModel: string | null;
}

interface Session {
  id: string;
  userId: string;
  instanceName: string | null;
  containerName: string | null;
  sessionType: string;
  storageMode: string;
  status: string;
  sessionUrl: string | null;
  nfsMountPath: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  uptimeSeconds: number;
  costSoFarCents: number;
  allocatedVcpu: number | null;
  allocatedMemoryMb: number | null;
  allocatedGpuVramMb: number | null;
  allocatedHamiSmPercent: number | null;
  computeConfig: ComputeConfig | null;
  node: SessionNode | null;
  storageNodeId: string | null;
  storageNode: SessionNode | null;
  storageTransport: string | null;
  terminationReason: string | null;
  terminatedBy: string | null;
  terminatedAt: string | null;
  cumulativeCostCents: number;
  durationSeconds: number | null;
}

interface SessionEvent {
  id: string;
  sessionId: string;
  eventType: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

interface ConnectionInfo {
  status: "ready" | "launching" | "unavailable";
  sessionUrl?: string;
  username?: string;
  password?: string;
}

// Tab types
type FilterTab = "all" | "active" | "ended";
type SidebarTab = "connect" | "details";

// Status configurations
const ACTIVE_STATUSES = ["pending", "starting", "running", "reconnecting", "stopping"];
const ENDED_STATUSES = ["ended", "failed", "terminated_idle", "terminated_overuse"];

// Format uptime
function formatUptime(startedAt: string | null, status: string): string {
  if (!startedAt || ENDED_STATUSES.includes(status)) return "-";
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const diff = now - start;
  
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Format cost with Indian Rupee symbol and comma separators
function formatCostRupees(cents: number): string {
  const rupees = cents / 100;
  // Indian numbering format: X,XX,XXX.XX
  const formatted = rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `₹${formatted}`;
}

// Calculate live cost for a session
function calculateLiveCost(session: Session): number {
  if (ENDED_STATUSES.includes(session.status)) {
    // Ended sessions: return final cumulative cost
    return session.cumulativeCostCents;
  }
  
  if (!session.startedAt || !session.computeConfig) {
    // Pending/no data: return 0
    return 0;
  }
  
  if (!ACTIVE_STATUSES.includes(session.status) || session.status === 'pending') {
    // Not running yet
    return 0;
  }
  
  // Running sessions: calculate live cost
  const elapsedMs = Date.now() - new Date(session.startedAt).getTime();
  const elapsedHours = elapsedMs / 3600000;
  const liveCostCents = elapsedHours * session.computeConfig.basePricePerHourCents;
  return liveCostCents;
}

// Format date
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Get status color
function getStatusColor(status: string): string {
  switch (status) {
    case "running":
      return "#009C00";
    case "pending":
    case "starting":
    case "reconnecting":
      return "#D4A017";
    case "stopping":
      return "#E76742";
    case "failed":
      return "var(--fgColor-critical, #E70000)";
    case "ended":
    case "terminated_idle":
    case "terminated_overuse":
      return "var(--fgColor-muted)";
    default:
      return "var(--fgColor-muted)";
  }
}

// Get status label
function getStatusLabel(status: string): string {
  switch (status) {
    case "running": return "Running";
    case "pending": return "Pending";
    case "starting": return "Starting";
    case "reconnecting": return "Reconnecting";
    case "stopping": return "Stopping";
    case "ended": return "Ended";
    case "failed": return "Failed";
    case "terminated_idle": return "Terminated (Idle)";
    case "terminated_overuse": return "Terminated (Overuse)";
    default: return status;
  }
}

// GPU chip icon
function GpuChipIcon({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="5" width="14" height="14" rx="1" />
      <rect x="8" y="8" width="8" height="8" rx="0.5" />
      <line x1="8" y1="5" x2="8" y2="2" />
      <line x1="12" y1="5" x2="12" y2="2" />
      <line x1="16" y1="5" x2="16" y2="2" />
      <line x1="8" y1="19" x2="8" y2="22" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="16" y1="19" x2="16" y2="22" />
      <line x1="5" y1="8" x2="2" y2="8" />
      <line x1="5" y1="12" x2="2" y2="12" />
      <line x1="5" y1="16" x2="2" y2="16" />
      <line x1="19" y1="8" x2="22" y2="8" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="19" y1="16" x2="22" y2="16" />
    </svg>
  );
}

// Close icon
function CloseIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// Copy icon
function CopyIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

// Eye icon
function EyeIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// Eye off icon
function EyeOffIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const isPulsing = status === "pending" || status === "starting";
  
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "0.875rem",
        fontWeight: 400,
        color: "var(--fgColor-default)",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: getStatusColor(status),
          animation: isPulsing ? "pulse 1.5s ease-in-out infinite" : "none",
        }}
      />
      {getStatusLabel(status)}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </span>
  );
}

// Event timeline component
function EventTimeline({ events, status }: { events: SessionEvent[]; status: string }) {
  // Define the expected event sequence
  const eventSteps = [
    { type: "scheduling", label: "Scheduling" },
    { type: "allocating_ports", label: "Allocating ports" },
    { type: "starting_container", label: "Starting container" },
    { type: "waiting_desktop", label: "Waiting for desktop" },
    { type: "health_check", label: "Health checking" },
  ];

  // Find completed events
  const completedTypes = new Set(events.map(e => e.eventType));
  
  // Find the current in-progress step
  let currentStep = -1;
  for (let i = 0; i < eventSteps.length; i++) {
    if (!completedTypes.has(eventSteps[i].type)) {
      currentStep = i;
      break;
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {eventSteps.map((step, index) => {
        const event = events.find(e => e.eventType === step.type);
        const isCompleted = !!event;
        const isInProgress = index === currentStep && ACTIVE_STATUSES.includes(status);
        const isPending = index > currentStep;

        return (
          <div
            key={step.type}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "0.875rem",
            }}
          >
            <span
              style={{
                fontSize: "0.875rem",
                color: isCompleted ? "#009C00" : isInProgress ? "#D4A017" : "var(--fgColor-muted)",
                animation: isInProgress ? "pulse 1.5s ease-in-out infinite" : "none",
              }}
            >
              {isCompleted ? "✓" : isInProgress ? "●" : "○"}
            </span>
            <span
              style={{
                flex: 1,
                color: isPending ? "var(--fgColor-muted)" : "var(--fgColor-default)",
              }}
            >
              {step.label}{isInProgress ? "..." : ""}
            </span>
            {event && (
              <span
                style={{
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-mono)",
                  color: "var(--fgColor-muted)",
                }}
              >
                {new Date(event.createdAt).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Connection details component
function ConnectionDetails({ connection }: { connection: ConnectionInfo }) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const fieldStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid var(--borderColor-default)",
  };

  const labelStyle: React.CSSProperties = {
    width: "90px",
    fontSize: "0.75rem",
    fontWeight: 500,
    color: "var(--fgColor-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  };

  const valueStyle: React.CSSProperties = {
    flex: 1,
    fontSize: "0.875rem",
    fontFamily: "var(--font-mono)",
    color: "var(--fgColor-default)",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "4px 8px",
    backgroundColor: "transparent",
    border: "1px solid var(--borderColor-default)",
    borderRadius: "4px",
    cursor: "pointer",
    color: "var(--fgColor-muted)",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "0.75rem",
  };

  return (
    <div>
      {/* URL */}
      <div style={fieldStyle}>
        <span style={labelStyle}>URL</span>
        <span style={valueStyle}>
          <a
            href={connection.sessionUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--fgColor-default)", textDecoration: "underline" }}
          >
            {connection.sessionUrl}
          </a>
        </span>
        <button
          onClick={() => copyToClipboard(connection.sessionUrl || "", "url")}
          style={buttonStyle}
        >
          <CopyIcon />
          {copied === "url" ? "Copied" : ""}
        </button>
      </div>

      {/* Username */}
      <div style={fieldStyle}>
        <span style={labelStyle}>Username</span>
        <span style={valueStyle}>{connection.username || "ubuntu"}</span>
        <button
          onClick={() => copyToClipboard(connection.username || "ubuntu", "user")}
          style={buttonStyle}
        >
          <CopyIcon />
          {copied === "user" ? "Copied" : ""}
        </button>
      </div>

      {/* Password */}
      <div style={{ ...fieldStyle, borderBottom: "none" }}>
        <span style={labelStyle}>Password</span>
        <span style={valueStyle}>
          {showPassword ? connection.password : "••••••••••••••••"}
        </span>
        <div style={{ display: "flex", gap: "4px" }}>
          <button onClick={() => setShowPassword(!showPassword)} style={buttonStyle}>
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
          <button
            onClick={() => copyToClipboard(connection.password || "", "pass")}
            style={buttonStyle}
          >
            <CopyIcon />
            {copied === "pass" ? "Copied" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// Confirmation modal
function ConfirmModal({
  title,
  message,
  confirmLabel,
  isDestructive,
  isLoading,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <div
        onClick={onCancel}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          zIndex: 1000,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "var(--bgColor-default)",
          border: "1px solid var(--borderColor-default)",
          borderRadius: "4px",
          zIndex: 1001,
        }}
      >
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--borderColor-default)",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600, color: "var(--fgColor-default)" }}>
            {title}
          </h3>
        </div>
        <div style={{ padding: "24px", fontSize: "0.875rem", color: "var(--fgColor-default)", lineHeight: 1.5 }}>
          {message}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            padding: "16px 24px",
            borderTop: "1px solid var(--borderColor-default)",
          }}
        >
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--fgColor-default)",
              backgroundColor: "transparent",
              border: "1px solid var(--borderColor-default)",
              borderRadius: "4px",
              padding: "0 20px",
              height: "40px",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.4 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              fontSize: "0.875rem",
              fontWeight: 500,
              color: isDestructive ? "#fff" : "var(--bgColor-default)",
              backgroundColor: isDestructive ? "#BC0000" : "var(--fgColor-default)",
              border: "none",
              borderRadius: "4px",
              padding: "0 20px",
              height: "40px",
              cursor: isLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {isLoading && (
              <span
                style={{
                  width: "14px",
                  height: "14px",
                  border: "2px solid currentColor",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

export default function InstancesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("connect");
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [connection, setConnection] = useState<ConnectionInfo | null>(null);
  const [uptime, setUptime] = useState<string>("-");
  const [costSoFar, setCostSoFar] = useState<string>("₹0");
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [tick, setTick] = useState(0); // For live cost ticker updates (triggers re-render)

  // Get selected session
  const selectedSession = sessions.find((s) => s.id === selectedSessionId) || null;

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) return;
      
      const res = await fetch(`${API_BASE}/api/compute/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  // Tick for live cost updates (every second)
  useEffect(() => {
    const hasRunningSessions = sessions.some(
      (s) => ACTIVE_STATUSES.includes(s.status) && s.status !== 'pending' && s.startedAt
    );
    if (!hasRunningSessions) return;
    
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [sessions]);

  // Auto-open sidebar from launch redirect
  useEffect(() => {
    const sessionParam = searchParams.get("session");
    const launchedParam = searchParams.get("launched");
    
    if (sessionParam && launchedParam === "true") {
      setSelectedSessionId(sessionParam);
      setSidebarOpen(true);
      setSidebarTab("connect");
      window.history.replaceState({}, "", "/instances");
    }
  }, [searchParams]);

  // Fetch events for pending/starting sessions
  useEffect(() => {
    if (!selectedSessionId || !sidebarOpen) return;
    if (!selectedSession || !["pending", "starting"].includes(selectedSession.status)) {
      setEvents([]);
      return;
    }

    const pollEvents = async () => {
      try {
        const token = getAccessToken();
        if (!token) return;
        
        const res = await fetch(`${API_BASE}/api/compute/sessions/${selectedSessionId}/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setEvents(data);
        }
      } catch (err) {
        console.error("Failed to fetch events:", err);
      }
    };

    pollEvents();
    const interval = setInterval(pollEvents, 1500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionId, sidebarOpen, selectedSession?.status]);

  // Fetch connection info for running sessions
  useEffect(() => {
    if (!selectedSessionId || selectedSession?.status !== "running") {
      setConnection(null);
      return;
    }

    const fetchConnection = async () => {
      try {
        const token = getAccessToken();
        if (!token) return;
        
        const res = await fetch(`${API_BASE}/api/compute/sessions/${selectedSessionId}/connection`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setConnection(data);
        }
      } catch (err) {
        console.error("Failed to fetch connection:", err);
      }
    };

    fetchConnection();
  }, [selectedSessionId, selectedSession?.status]);

  // Update uptime every minute
  useEffect(() => {
    if (!selectedSession) return;
    
    const updateUptime = () => {
      setUptime(formatUptime(selectedSession.startedAt, selectedSession.status));
    };
    
    updateUptime();
    const interval = setInterval(updateUptime, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSession?.startedAt, selectedSession?.status]);

  // Real-time cost ticker - updates every second for running sessions
  useEffect(() => {
    if (!selectedSession || !selectedSession.startedAt || !selectedSession.computeConfig) {
      setCostSoFar("₹0");
      return;
    }

    const updateCost = () => {
      if (ENDED_STATUSES.includes(selectedSession.status)) {
        // For ended sessions, use the final cumulative cost
        const finalCost = selectedSession.cumulativeCostCents / 100;
        setCostSoFar(`₹${finalCost.toFixed(2)}`);
      } else if (ACTIVE_STATUSES.includes(selectedSession.status) && selectedSession.startedAt) {
        // For running sessions, calculate live cost
        const elapsedSeconds = Math.floor(
          (Date.now() - new Date(selectedSession.startedAt).getTime()) / 1000
        );
        const cost = (elapsedSeconds / 3600) * ((selectedSession.computeConfig?.basePricePerHourCents ?? 0) / 100);
        setCostSoFar(`₹${cost.toFixed(2)}`);
      }
    };

    updateCost();
    const interval = setInterval(updateCost, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSession?.id, selectedSession?.startedAt, selectedSession?.status, selectedSession?.cumulativeCostCents, selectedSession?.computeConfig?.basePricePerHourCents]);

  // Handle terminate
  const handleTerminate = async () => {
    if (!selectedSessionId) return;
    setIsTerminating(true);
    try {
      const token = getAccessToken();
      if (!token) return;
      
      await fetch(`${API_BASE}/api/compute/sessions/${selectedSessionId}/terminate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchSessions();
      setShowTerminateModal(false);
    } catch (err) {
      console.error("Failed to terminate session:", err);
    } finally {
      setIsTerminating(false);
    }
  };

  // Handle restart
  const handleRestart = async () => {
    if (!selectedSessionId) return;
    setIsRestarting(true);
    try {
      const token = getAccessToken();
      if (!token) return;
      
      await fetch(`${API_BASE}/api/compute/sessions/${selectedSessionId}/restart`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      await fetchSessions();
    } catch (err) {
      console.error("Failed to restart session:", err);
    } finally {
      setIsRestarting(false);
    }
  };

  // Filter sessions based on tab
  const filteredSessions = sessions.filter((session) => {
    if (activeTab === "active") return ACTIVE_STATUSES.includes(session.status);
    if (activeTab === "ended") return ENDED_STATUSES.includes(session.status);
    return true;
  });

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "ended", label: "Ended" },
  ];

  const handleLaunchInstance = () => {
    router.push("/instances/launch");
  };

  const handleRowClick = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setSidebarOpen(true);
    setSidebarTab("connect");
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    setSelectedSessionId(null);
  };

  // Copy session ID
  const copySessionId = async () => {
    if (selectedSessionId) {
      await navigator.clipboard.writeText(selectedSessionId);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Page Header */}
      <div style={{ padding: "24px", paddingBottom: "0" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "24px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                color: "var(--fgColor-default)",
                margin: 0,
                marginBottom: "8px",
                lineHeight: 1.2,
              }}
            >
              GPU Instances
            </h1>
            <p
              style={{
                fontSize: "0.875rem",
                fontWeight: 400,
                color: "var(--fgColor-muted)",
                margin: 0,
                maxWidth: "560px",
                lineHeight: 1.5,
              }}
            >
              High-performance GPU compute on demand. Launch containers with fractional NVIDIA GPUs, billed per second of usage.
            </p>
          </div>
          <button
            onClick={handleLaunchInstance}
            style={{
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--fgColor-inverse)",
              backgroundColor: "var(--fgColor-default)",
              border: "1px solid var(--fgColor-default)",
              borderRadius: "4px",
              padding: "0 24px",
              height: "40px",
              cursor: "pointer",
              transition: "opacity 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Launch Instance
          </button>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", padding: "0 24px 24px" }}>
        {/* Table Section */}
        <div style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
          <div
            style={{
              backgroundColor: "var(--bgColor-mild)",
              border: "1px solid var(--borderColor-default)",
              borderRadius: "4px",
            }}
          >
            {/* Tab Bar */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid var(--borderColor-default)",
                padding: "0 16px",
              }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: activeTab === tab.id ? 500 : 400,
                    color: activeTab === tab.id ? "var(--fgColor-default)" : "var(--fgColor-muted)",
                    backgroundColor: "transparent",
                    border: "none",
                    borderBottom: activeTab === tab.id ? "2px solid var(--fgColor-default)" : "2px solid transparent",
                    padding: "12px 16px",
                    cursor: "pointer",
                    transition: "color 0.15s ease, border-color 0.15s ease",
                    marginBottom: "-1px",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content Area */}
            {loading ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "80px 24px",
                  color: "var(--fgColor-muted)",
                  fontSize: "0.875rem",
                }}
              >
                Loading sessions...
              </div>
            ) : filteredSessions.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "80px 24px",
                  textAlign: "center",
                }}
              >
                <div style={{ color: "var(--fgColor-muted)", marginBottom: "16px" }}>
                  <GpuChipIcon size={40} />
                </div>
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "var(--fgColor-default)",
                    margin: 0,
                    marginBottom: "8px",
                  }}
                >
                  No running instances
                </h3>
                <p
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 400,
                    color: "var(--fgColor-muted)",
                    margin: 0,
                    marginBottom: "24px",
                    maxWidth: "360px",
                    lineHeight: 1.5,
                  }}
                >
                  Once you launch an instance, you can access it through your browser.
                </p>
                <button
                  onClick={handleLaunchInstance}
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "var(--fgColor-default)",
                    backgroundColor: "transparent",
                    border: "1px solid var(--borderColor-default)",
                    borderRadius: "4px",
                    padding: "0 24px",
                    height: "40px",
                    cursor: "pointer",
                    transition: "background-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bgColor-default)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  Launch Instance
                </button>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--borderColor-default)" }}>
                      {["Name", "Config", "GPU", "Status", "Uptime", "Cost", "Cost/hr"].map((header, idx) => (
                        <th
                          key={header}
                          style={{
                            textAlign: idx >= 5 ? "right" : "left",
                            padding: "12px 16px",
                            paddingLeft: idx === 6 ? "24px" : "16px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "var(--fgColor-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map((session) => (
                      <tr
                        key={session.id}
                        onClick={() => handleRowClick(session.id)}
                        style={{
                          borderBottom: "1px solid var(--borderColor-default)",
                          height: "48px",
                          cursor: "pointer",
                          backgroundColor: selectedSessionId === session.id ? "var(--bgColor-mild)" : "transparent",
                          transition: "background-color 0.1s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (selectedSessionId !== session.id) {
                            e.currentTarget.style.backgroundColor = "var(--bgColor-default)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedSessionId !== session.id) {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      >
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--fgColor-default)" }}>
                            {session.instanceName || (
                              <span style={{ fontFamily: "var(--font-mono)" }}>{session.containerName}</span>
                            )}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: "0.875rem", color: "var(--fgColor-default)" }}>
                          {session.computeConfig?.name || "-"}
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: "0.875rem", color: "var(--fgColor-default)" }}>
                          {session.allocatedGpuVramMb ? `${(session.allocatedGpuVramMb / 1024).toFixed(0)} GB VRAM` : "-"}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <StatusBadge status={session.status} />
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: "0.875rem", color: "var(--fgColor-muted)" }}>
                          {formatUptime(session.startedAt, session.status)}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            textAlign: "right",
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.875rem",
                          }}
                        >
                          {(() => {
                            const isLive = ACTIVE_STATUSES.includes(session.status) && 
                                          session.status !== 'pending' && 
                                          session.startedAt;
                            const costCents = calculateLiveCost(session);
                            
                            if (session.status === 'pending' || (!session.startedAt && ACTIVE_STATUSES.includes(session.status))) {
                              return <span style={{ color: "var(--fgColor-muted)" }}>—</span>;
                            }
                            
                            return (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  color: isLive ? "var(--fgColor-default)" : "var(--fgColor-muted)",
                                }}
                              >
                                {isLive && (
                                  <span
                                    style={{
                                      width: "6px",
                                      height: "6px",
                                      borderRadius: "50%",
                                      backgroundColor: "#009C00",
                                      animation: "pulse 1.5s ease-in-out infinite",
                                    }}
                                  />
                                )}
                                {formatCostRupees(costCents)}
                              </span>
                            );
                          })()}
                        </td>
                        <td style={{ padding: "12px 16px", paddingLeft: "24px", fontSize: "0.875rem", color: "var(--fgColor-default)", textAlign: "right", whiteSpace: "nowrap" }}>
                          {session.computeConfig ? `₹${(session.computeConfig.basePricePerHourCents / 100).toFixed(0)}/hr` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        {sidebarOpen && selectedSession && (
          <div
            style={{
              width: "380px",
              minWidth: "380px",
              marginLeft: "16px",
              borderLeft: "1px solid var(--borderColor-default)",
              backgroundColor: "var(--bgColor-default)",
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Sidebar Header */}
            <div
              style={{
                padding: "16px",
                borderBottom: "1px solid var(--borderColor-default)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: 600,
                      color: "var(--fgColor-default)",
                      marginBottom: "4px",
                    }}
                  >
                    {selectedSession.instanceName || selectedSession.containerName}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span
                      onClick={copySessionId}
                      style={{
                        fontSize: "0.75rem",
                        fontFamily: "var(--font-mono)",
                        color: "var(--fgColor-muted)",
                        cursor: "pointer",
                      }}
                      title="Click to copy full ID"
                    >
                      {selectedSession.id.substring(0, 8)}...
                    </span>
                    <StatusBadge status={selectedSession.status} />
                  </div>
                </div>
                <button
                  onClick={closeSidebar}
                  style={{
                    padding: "4px",
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--fgColor-muted)",
                  }}
                >
                  <CloseIcon />
                </button>
              </div>

              {/* Actions Bar */}
              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                {selectedSession.status === "running" && (
                  <button
                    onClick={handleRestart}
                    disabled={isRestarting}
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "var(--fgColor-default)",
                      backgroundColor: "transparent",
                      border: "1px solid var(--borderColor-default)",
                      borderRadius: "4px",
                      padding: "0 12px",
                      height: "32px",
                      cursor: isRestarting ? "not-allowed" : "pointer",
                      opacity: isRestarting ? 0.6 : 1,
                    }}
                  >
                    {isRestarting ? "Restarting..." : "Restart"}
                  </button>
                )}
                {ACTIVE_STATUSES.includes(selectedSession.status) && (
                  <button
                    onClick={() => setShowTerminateModal(true)}
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "#BC0000",
                      backgroundColor: "transparent",
                      border: "1px solid #BC0000",
                      borderRadius: "4px",
                      padding: "0 12px",
                      height: "32px",
                      cursor: "pointer",
                    }}
                  >
                    Terminate
                  </button>
                )}
              </div>
            </div>

            {/* Sidebar Tabs */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid var(--borderColor-default)",
                padding: "0 16px",
              }}
            >
              {(["connect", "details"] as SidebarTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSidebarTab(tab)}
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: sidebarTab === tab ? 500 : 400,
                    color: sidebarTab === tab ? "var(--fgColor-default)" : "var(--fgColor-muted)",
                    backgroundColor: "transparent",
                    border: "none",
                    borderBottom: sidebarTab === tab ? "2px solid var(--fgColor-default)" : "2px solid transparent",
                    padding: "12px 16px",
                    cursor: "pointer",
                    marginBottom: "-1px",
                    textTransform: "capitalize",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Sidebar Content */}
            <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
              {sidebarTab === "connect" ? (
                <div>
                  {/* Pending/Starting: Show event timeline */}
                  {["pending", "starting"].includes(selectedSession.status) && (
                    <div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "var(--fgColor-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          marginBottom: "16px",
                        }}
                      >
                        Launch Progress
                      </div>
                      <EventTimeline events={events} status={selectedSession.status} />
                    </div>
                  )}

                  {/* Running: Show connection details */}
                  {selectedSession.status === "running" && connection && connection.status === "ready" && (
                    <div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "var(--fgColor-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          marginBottom: "16px",
                        }}
                      >
                        Connection Details
                      </div>
                      <ConnectionDetails connection={connection} />
                    </div>
                  )}

                  {/* Running but launching: Show loading */}
                  {selectedSession.status === "running" && (!connection || connection.status === "launching") && (
                    <div style={{ textAlign: "center", padding: "24px", color: "var(--fgColor-muted)" }}>
                      Preparing connection...
                    </div>
                  )}

                  {/* Ended states */}
                  {ENDED_STATUSES.includes(selectedSession.status) && (
                    <div style={{ padding: "24px 0", textAlign: "center" }}>
                      <div style={{ fontSize: "0.875rem", color: "var(--fgColor-muted)", marginBottom: "8px" }}>
                        {selectedSession.status === "failed"
                          ? `Session failed: ${selectedSession.terminationReason || "Unknown error"}`
                          : "Session has ended"}
                      </div>
                      {selectedSession.terminationReason && selectedSession.status !== "failed" && (
                        <div style={{ fontSize: "0.75rem", color: "var(--fgColor-muted)" }}>
                          Reason: {selectedSession.terminationReason}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Details Tab */
                <div>
                  {/* Compute Configuration */}
                  <div style={{ marginBottom: "24px" }}>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "var(--fgColor-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: "12px",
                      }}
                    >
                      Compute Configuration
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <DetailRow label="Tier" value={selectedSession.computeConfig?.name || "-"} />
                      <DetailRow label="vCPU" value={`${selectedSession.allocatedVcpu || 0} cores`} />
                      <DetailRow label="RAM" value={`${((selectedSession.allocatedMemoryMb || 0) / 1024).toFixed(0)} GB`} />
                      <DetailRow label="VRAM" value={`${((selectedSession.allocatedGpuVramMb || 0) / 1024).toFixed(0)} GB`} />
                      <DetailRow label="SM" value={`${selectedSession.allocatedHamiSmPercent || 0}%`} />
                      <DetailRow label="GPU" value={selectedSession.node?.gpuModel || selectedSession.computeConfig?.gpuModel || "-"} />
                    </div>
                  </div>

                  {/* Storage */}
                  <div style={{ marginBottom: "24px" }}>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "var(--fgColor-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: "12px",
                      }}
                    >
                      Storage
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <DetailRow label="Type" value={selectedSession.storageMode === "stateful" ? "Stateful" : "Ephemeral"} />
                      {selectedSession.nfsMountPath && (
                        <DetailRow label="Mount Path" value={selectedSession.nfsMountPath} mono />
                      )}
                    </div>
                  </div>

                  {/* Timing */}
                  <div style={{ marginBottom: "24px" }}>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "var(--fgColor-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: "12px",
                      }}
                    >
                      Timing
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <DetailRow label="Started" value={formatDate(selectedSession.startedAt)} />
                      <DetailRow label="Uptime" value={uptime} />
                      <DetailRow label="Cost so far" value={costSoFar} />
                    </div>
                  </div>

                  {/* Infrastructure */}
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "var(--fgColor-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: "12px",
                      }}
                    >
                      Infrastructure
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <DetailRow label="Compute Node" value={selectedSession.node?.hostname || "-"} mono />
                      <DetailRow label="Storage Node" value={selectedSession.storageNode?.hostname || (selectedSession.storageNodeId ? selectedSession.storageNodeId.substring(0, 8) : "\u2014")} mono />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.875rem", color: "var(--fgColor-muted)" }}>Storage Transport</span>
                        {(() => {
                          const transport = selectedSession.storageTransport;
                          let label = "NFS (Legacy)";
                          let badgeBg = "var(--bgColor-mild)";
                          let badgeColor = "var(--fgColor-muted)";
                          if (transport === "local_zfs") {
                            label = "Local ZFS";
                            badgeBg = "rgba(0, 156, 0, 0.1)";
                            badgeColor = "#009C00";
                          } else if (transport === "nvmeof_tcp") {
                            label = "NVMe-oF TCP";
                            badgeBg = "rgba(56, 132, 255, 0.1)";
                            badgeColor = "#3884FF";
                          }
                          return (
                            <span
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: 500,
                                color: badgeColor,
                                backgroundColor: badgeBg,
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontFamily: "var(--font-mono)",
                              }}
                            >
                              {label}
                            </span>
                          );
                        })()}
                      </div>
                      <DetailRow label="Container" value={selectedSession.containerName || "-"} mono />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Terminate Confirmation Modal */}
      {showTerminateModal && (
        <ConfirmModal
          title="Terminate Instance"
          message="Are you sure you want to terminate this instance? This action cannot be undone. All unsaved data will be lost if you're using ephemeral storage."
          confirmLabel="Terminate"
          isDestructive
          isLoading={isTerminating}
          onConfirm={handleTerminate}
          onCancel={() => setShowTerminateModal(false)}
        />
      )}
    </div>
  );
}

// Detail row component
function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "0.875rem", color: "var(--fgColor-muted)" }}>{label}</span>
      <span
        style={{
          fontSize: "0.875rem",
          color: "var(--fgColor-default)",
          fontFamily: mono ? "var(--font-mono)" : "inherit",
        }}
      >
        {value}
      </span>
    </div>
  );
}
