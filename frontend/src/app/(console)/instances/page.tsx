"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Instance types
interface Instance {
  id: string;
  name: string;
  config: string;
  gpu: string;
  vram: number;
  vcpu: number;
  ram: string;
  status: "running" | "starting" | "stopped";
  startedAt: string;
  costPerHour: number; // INR
  sessionType: string;
}

// Tab types
type FilterTab = "all" | "active" | "stopped";

// Mock data for testing
const MOCK_INSTANCES: Instance[] = [
  {
    id: "1",
    name: "ml-training-01",
    config: "Power",
    gpu: "8 GB VRAM",
    vram: 8192,
    vcpu: 6,
    ram: "16 GB",
    status: "running",
    startedAt: new Date(Date.now() - 3600000 * 2.5).toISOString(),
    costPerHour: 100,
    sessionType: "stateful_desktop",
  },
  {
    id: "2",
    name: "jupyter-exp",
    config: "Ephemeral GPU-S",
    gpu: "4 GB VRAM",
    vram: 4096,
    vcpu: 2,
    ram: "4 GB",
    status: "starting",
    startedAt: new Date().toISOString(),
    costPerHour: 40,
    sessionType: "ephemeral_jupyter",
  },
  {
    id: "3",
    name: "dev-workspace",
    config: "Base",
    gpu: "2 GB VRAM",
    vram: 2048,
    vcpu: 2,
    ram: "4 GB",
    status: "stopped",
    startedAt: new Date(Date.now() - 86400000).toISOString(),
    costPerHour: 25,
    sessionType: "stateful_desktop",
  },
];

// Format uptime
function formatUptime(startedAt: string, status: string): string {
  if (status === "stopped") return "-";
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

// Format cost
function formatCost(costPerHour: number): string {
  return `₹${costPerHour}/hr`;
}

// GPU chip icon (geometric, simple)
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
      {/* Main chip body */}
      <rect x="5" y="5" width="14" height="14" rx="1" />
      {/* Inner processor */}
      <rect x="8" y="8" width="8" height="8" rx="0.5" />
      {/* Top pins */}
      <line x1="8" y1="5" x2="8" y2="2" />
      <line x1="12" y1="5" x2="12" y2="2" />
      <line x1="16" y1="5" x2="16" y2="2" />
      {/* Bottom pins */}
      <line x1="8" y1="19" x2="8" y2="22" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="16" y1="19" x2="16" y2="22" />
      {/* Left pins */}
      <line x1="5" y1="8" x2="2" y2="8" />
      <line x1="5" y1="12" x2="2" y2="12" />
      <line x1="5" y1="16" x2="2" y2="16" />
      {/* Right pins */}
      <line x1="19" y1="8" x2="22" y2="8" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="19" y1="16" x2="22" y2="16" />
    </svg>
  );
}

// Status badge component
function StatusBadge({ status }: { status: Instance["status"] }) {
  const getStatusColor = () => {
    switch (status) {
      case "running":
        return "var(--color-success, #009C00)";
      case "starting":
        return "var(--color-warning, #D4A017)";
      case "stopped":
        return "var(--fgColor-muted)";
      default:
        return "var(--fgColor-muted)";
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "running":
        return "Running";
      case "starting":
        return "Starting";
      case "stopped":
        return "Stopped";
      default:
        return status;
    }
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontFamily: "var(--font-sans)",
        fontSize: "0.8125rem",
        color: "var(--fgColor-default)",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: getStatusColor(),
        }}
      />
      {getStatusLabel()}
    </span>
  );
}

export default function InstancesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  // Toggle this to test empty state vs populated state
  const [showMockData] = useState(true);

  const instances = showMockData ? MOCK_INSTANCES : [];

  // Filter instances based on tab
  const filteredInstances = instances.filter((instance) => {
    if (activeTab === "active") {
      return instance.status === "running" || instance.status === "starting";
    }
    if (activeTab === "stopped") {
      return instance.status === "stopped";
    }
    return true;
  });

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "stopped", label: "Stopped" },
  ];

  const handleLaunchInstance = () => {
    router.push("/instances/launch");
  };

  return (
    <div style={{ padding: "24px" }}>
      {/* Page Header */}
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
              fontFamily: "var(--font-sans)",
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
              fontFamily: "var(--font-sans)",
              fontSize: "0.875rem",
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
            fontFamily: "var(--font-sans)",
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

      {/* Tabs + Content Section */}
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
                fontFamily: "var(--font-sans)",
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
        {filteredInstances.length === 0 ? (
          /* Empty State */
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
            <div
              style={{
                color: "var(--fgColor-muted)",
                marginBottom: "16px",
              }}
            >
              <GpuChipIcon size={40} />
            </div>
            <h3
              style={{
                fontFamily: "var(--font-sans)",
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
                fontFamily: "var(--font-sans)",
                fontSize: "0.875rem",
                color: "var(--fgColor-muted)",
                margin: 0,
                marginBottom: "4px",
                maxWidth: "360px",
                lineHeight: 1.5,
              }}
            >
              Launch a GPU-accelerated instance to get started.
            </p>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.875rem",
                color: "var(--fgColor-muted)",
                margin: 0,
                marginBottom: "24px",
                maxWidth: "360px",
                lineHeight: 1.5,
              }}
            >
              Access via browser desktop, SSH, or JupyterLab.
            </p>
            <button
              onClick={handleLaunchInstance}
              style={{
                fontFamily: "var(--font-sans)",
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
          /* Instances Table */
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "var(--font-sans)",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--borderColor-default)",
                  }}
                >
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "var(--fgColor-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Name
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "var(--fgColor-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Config
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "var(--fgColor-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    GPU
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "var(--fgColor-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "var(--fgColor-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Uptime
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "var(--fgColor-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Cost/hr
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "12px 16px",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "var(--fgColor-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredInstances.map((instance) => (
                  <tr
                    key={instance.id}
                    style={{
                      borderBottom: "1px solid var(--borderColor-default)",
                      height: "48px",
                    }}
                  >
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "0.875rem",
                        color: "var(--fgColor-default)",
                        fontWeight: 500,
                      }}
                    >
                      {instance.name}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "0.875rem",
                        color: "var(--fgColor-default)",
                      }}
                    >
                      {instance.config}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "0.875rem",
                        color: "var(--fgColor-default)",
                      }}
                    >
                      {instance.gpu}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <StatusBadge status={instance.status} />
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "0.875rem",
                        color: "var(--fgColor-muted)",
                      }}
                    >
                      {formatUptime(instance.startedAt, instance.status)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "0.875rem",
                        color: "var(--fgColor-default)",
                      }}
                    >
                      {formatCost(instance.costPerHour)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                      }}
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          gap: "8px",
                        }}
                      >
                        {instance.status === "running" && (
                          <button
                            disabled
                            style={{
                              fontFamily: "var(--font-sans)",
                              fontSize: "0.8125rem",
                              fontWeight: 400,
                              color: "var(--fgColor-muted)",
                              backgroundColor: "transparent",
                              border: "1px solid var(--borderColor-default)",
                              borderRadius: "4px",
                              padding: "4px 12px",
                              cursor: "not-allowed",
                              opacity: 0.6,
                            }}
                          >
                            Stop
                          </button>
                        )}
                        {instance.status === "stopped" && (
                          <button
                            disabled
                            style={{
                              fontFamily: "var(--font-sans)",
                              fontSize: "0.8125rem",
                              fontWeight: 400,
                              color: "var(--fgColor-muted)",
                              backgroundColor: "transparent",
                              border: "1px solid var(--borderColor-default)",
                              borderRadius: "4px",
                              padding: "4px 12px",
                              cursor: "not-allowed",
                              opacity: 0.6,
                            }}
                          >
                            Restart
                          </button>
                        )}
                        <button
                          disabled
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: "0.8125rem",
                            fontWeight: 400,
                            color: "var(--fgColor-muted)",
                            backgroundColor: "transparent",
                            border: "1px solid var(--borderColor-default)",
                            borderRadius: "4px",
                            padding: "4px 12px",
                            cursor: "not-allowed",
                            opacity: 0.6,
                          }}
                        >
                          Terminate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
