"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

// Compute configuration types
interface ComputeConfig {
  id: string;
  name: string;
  vcpu: number;
  ramGb: number;
  vramGb: number | null;
  smPercent: number | null;
  pricePerHour: number;
  bestFor: string;
  gpuModel?: string;
}

// Hardcoded compute configurations matching the spec
const COMPUTE_CONFIGS: ComputeConfig[] = [
  {
    id: "starter",
    name: "Starter",
    vcpu: 2,
    ramGb: 4,
    vramGb: null,
    smPercent: null,
    pricePerHour: 15,
    bestFor: "Scripting, text editing, light dev",
  },
  {
    id: "standard",
    name: "Standard",
    vcpu: 4,
    ramGb: 8,
    vramGb: null,
    smPercent: null,
    pricePerHour: 30,
    bestFor: "MATLAB, office, full-stack dev",
  },
  {
    id: "pro",
    name: "Pro",
    vcpu: 4,
    ramGb: 8,
    vramGb: 4,
    smPercent: 16,
    pricePerHour: 60,
    bestFor: "Blender, ML inference, CV",
    gpuModel: "RTX 4090",
  },
  {
    id: "power",
    name: "Power",
    vcpu: 6,
    ramGb: 16,
    vramGb: 8,
    smPercent: 33,
    pricePerHour: 100,
    bestFor: "Simulation, 3D render, training",
    gpuModel: "RTX 4090",
  },
  {
    id: "max",
    name: "Max",
    vcpu: 8,
    ramGb: 16,
    vramGb: 16,
    smPercent: 66,
    pricePerHour: 150,
    bestFor: "Large model training, DL research",
    gpuModel: "RTX 4090",
  },
  {
    id: "full",
    name: "Full Machine",
    vcpu: 16,
    ramGb: 48,
    vramGb: 24,
    smPercent: 100,
    pricePerHour: 300,
    bestFor: "Exclusive research, max performance",
    gpuModel: "RTX 4090",
  },
];

// Generate random instance name
function generateInstanceName(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `gpu-instance-${suffix}`;
}

// Validate instance name
function validateInstanceName(name: string): string | null {
  if (name.length < 3) return "Name must be at least 3 characters";
  if (name.length > 64) return "Name must be at most 64 characters";
  if (!/^[a-zA-Z0-9-]+$/.test(name)) return "Only letters, numbers, and hyphens allowed";
  if (name.startsWith("-") || name.endsWith("-")) return "Cannot start or end with a hyphen";
  return null;
}

// Section Header component
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: "0.75rem",
        fontWeight: 600,
        color: "var(--fgColor-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: "16px",
      }}
    >
      {children}
    </div>
  );
}

// GPU Chip Icon
function GpuChipIcon({ size = 14 }: { size?: number }) {
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
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
    </svg>
  );
}

// Monitor Icon
function MonitorIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

// Terminal Icon
function TerminalIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

// Database/Storage Icon
function StorageIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

// Clock/Temporary Icon
function ClockIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// Info Icon
function InfoIcon({ size = 16 }: { size?: number }) {
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
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

// Warning Icon
function WarningIcon({ size = 16 }: { size?: number }) {
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
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// Caution Icon
function CautionIcon({ size = 16 }: { size?: number }) {
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
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// Close Icon
function CloseIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// Checkmark Icon
function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function LaunchInstancePage() {
  const router = useRouter();
  
  // State
  const [selectedConfig, setSelectedConfig] = useState<string>("power");
  const [selectedMode, setSelectedMode] = useState<"gui" | "cli">("gui");
  const [storageType, setStorageType] = useState<"stateful" | "ephemeral">("stateful");
  const [instanceName, setInstanceName] = useState<string>(generateInstanceName());
  const [nameError, setNameError] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Mock hasFileStore - toggle to test both states
  const [hasFileStore, setHasFileStore] = useState<boolean>(true);

  // Dark mode detection
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Auto-select storage type based on file store availability
  useEffect(() => {
    if (hasFileStore) {
      setStorageType("stateful");
    } else {
      setStorageType("ephemeral");
    }
  }, [hasFileStore]);

  // Get selected config object
  const currentConfig = COMPUTE_CONFIGS.find((c) => c.id === selectedConfig);
  const isGpuConfig = currentConfig && currentConfig.vramGb !== null;

  // Handle instance name change
  const handleNameChange = (value: string) => {
    setInstanceName(value);
    setNameError(validateInstanceName(value));
  };

  // Check if launch is valid
  const canLaunch = currentConfig && !nameError && instanceName.length >= 3;

  // Handle launch click - open review modal
  const handleLaunchClick = () => {
    if (!canLaunch) return;
    setShowReviewModal(true);
  };

  // Handle confirm launch
  const handleConfirmLaunch = () => {
    setIsLaunching(true);
    // Mock launch - redirect after 1.5s
    setTimeout(() => {
      setIsLaunching(false);
      setShowReviewModal(false);
      router.push("/instances");
    }, 1500);
  };

  // Colors for info boxes
  const infoBoxColors = {
    blue: {
      bg: isDarkMode ? "rgba(58, 115, 255, 0.08)" : "rgba(58, 115, 255, 0.06)",
      border: isDarkMode ? "#6C9AFF" : "#3A73FF",
      icon: isDarkMode ? "#6C9AFF" : "#3A73FF",
    },
    amber: {
      bg: isDarkMode ? "rgba(217, 139, 12, 0.08)" : "rgba(217, 139, 12, 0.06)",
      border: isDarkMode ? "#FDA422" : "#D98B0C",
      icon: isDarkMode ? "#FDA422" : "#D98B0C",
    },
    orange: {
      bg: isDarkMode ? "rgba(231, 103, 66, 0.08)" : "rgba(231, 103, 66, 0.06)",
      border: "#E76742",
      icon: "#E76742",
    },
    green: {
      text: isDarkMode ? "#05C004" : "#009C00",
    },
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bgColor-default)",
        paddingBottom: "100px",
      }}
    >
      {/* Page Content */}
      <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
        {/* Back Navigation */}
        <Link
          href="/instances"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontFamily: "var(--font-sans)",
            fontSize: "0.875rem",
            color: "var(--fgColor-muted)",
            textDecoration: "none",
            marginBottom: "24px",
            transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fgColor-default)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fgColor-muted)")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Instances
        </Link>

        {/* Page Header */}
        <div style={{ marginBottom: "32px" }}>
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "2rem",
              fontWeight: 700,
              color: "var(--fgColor-default)",
              margin: 0,
              lineHeight: "2.5rem",
            }}
          >
            Launch Instance
          </h1>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.875rem",
              color: "var(--fgColor-muted)",
              marginTop: "8px",
              lineHeight: "1.375rem",
            }}
          >
            Configure your GPU-accelerated compute environment. Select resources, OS, and storage — billed per hour of usage.
          </p>
        </div>

        {/* SECTION 2: COMPUTE CONFIGURATION */}
        <div
          style={{
            backgroundColor: "var(--bgColor-mild)",
            border: "1px solid var(--borderColor-default)",
            borderRadius: "4px",
            padding: "24px",
            marginBottom: "32px",
          }}
        >
          <SectionHeader>Compute Configuration</SectionHeader>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px",
            }}
            className="compute-grid"
          >
            {COMPUTE_CONFIGS.map((config) => {
              const isSelected = selectedConfig === config.id;
              const isGpu = config.vramGb !== null;

              return (
                <button
                  key={config.id}
                  onClick={() => setSelectedConfig(config.id)}
                  style={{
                    backgroundColor: "var(--bgColor-default)",
                    border: isSelected
                      ? "2px solid var(--fgColor-accent)"
                      : "1px solid var(--borderColor-default)",
                    borderRadius: "4px",
                    padding: isSelected ? "15px" : "16px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "border-color 0.15s ease",
                    position: "relative",
                  }}
                >
                  {/* Config Name */}
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "1rem",
                      fontWeight: 600,
                      color: "var(--fgColor-default)",
                      marginBottom: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{config.name}</span>
                    {isGpu ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "2px 6px",
                          backgroundColor: "var(--bgColor-muted)",
                          borderRadius: "2px",
                          fontSize: "0.625rem",
                          fontWeight: 500,
                          color: "var(--fgColor-accent)",
                        }}
                      >
                        <GpuChipIcon size={10} />
                        GPU
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: "2px 6px",
                          backgroundColor: "var(--bgColor-muted)",
                          borderRadius: "2px",
                          fontSize: "0.625rem",
                          fontWeight: 500,
                          color: "var(--fgColor-muted)",
                        }}
                      >
                        CPU Only
                      </span>
                    )}
                  </div>

                  {/* Specs Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "4px 12px",
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: "0.8125rem",
                      color: "var(--fgColor-muted)",
                      marginBottom: "12px",
                    }}
                  >
                    <div>{config.vcpu} vCPU</div>
                    <div>{config.ramGb} GB RAM</div>
                    {config.vramGb !== null ? (
                      <>
                        <div style={{ color: "var(--fgColor-accent)" }}>{config.vramGb} GB VRAM</div>
                        <div>{config.smPercent}% SM</div>
                      </>
                    ) : (
                      <div style={{ gridColumn: "span 2", opacity: 0.6 }}>—</div>
                    )}
                  </div>

                  {/* GPU Model for GPU configs */}
                  {config.gpuModel && (
                    <div
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "0.75rem",
                        color: "var(--fgColor-accent)",
                        marginBottom: "8px",
                      }}
                    >
                      {config.gpuModel}
                    </div>
                  )}

                  {/* Price */}
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: "var(--fgColor-default)",
                      marginBottom: "8px",
                    }}
                  >
                    ₹{config.pricePerHour}/hr
                  </div>

                  {/* Best For */}
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "0.75rem",
                      color: "var(--fgColor-muted)",
                      fontStyle: "italic",
                      lineHeight: "1.3",
                    }}
                  >
                    {config.bestFor}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: OPERATING SYSTEM */}
        <div
          style={{
            backgroundColor: "var(--bgColor-mild)",
            border: "1px solid var(--borderColor-default)",
            borderRadius: "4px",
            padding: "24px",
            marginBottom: "32px",
          }}
        >
          <SectionHeader>Operating System</SectionHeader>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              padding: "16px",
              backgroundColor: "var(--bgColor-default)",
              border: "1px solid var(--borderColor-default)",
              borderRadius: "4px",
            }}
          >
            <Image
              src="/images/ubuntu-logo.png"
              alt="Ubuntu"
              width={48}
              height={48}
              style={{ objectFit: "contain" }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "var(--fgColor-default)",
                  }}
                >
                  Ubuntu 22.04 LTS
                </span>
                <span style={{ color: infoBoxColors.green.text }}>
                  <CheckIcon size={16} />
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.75rem",
                  color: "var(--fgColor-muted)",
                  marginTop: "4px",
                }}
              >
                Pre-installed: CUDA 12.8, Python 3.10, PyTorch, TensorFlow
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: INTERFACE MODE */}
        <div
          style={{
            backgroundColor: "var(--bgColor-mild)",
            border: "1px solid var(--borderColor-default)",
            borderRadius: "4px",
            padding: "24px",
            marginBottom: "32px",
          }}
        >
          <SectionHeader>Interface Mode</SectionHeader>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            {/* GUI Desktop */}
            <button
              onClick={() => setSelectedMode("gui")}
              style={{
                backgroundColor: "var(--bgColor-default)",
                border: selectedMode === "gui"
                  ? "2px solid var(--fgColor-accent)"
                  : "1px solid var(--borderColor-default)",
                borderRadius: "4px",
                padding: selectedMode === "gui" ? "15px" : "16px",
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <span style={{ color: "var(--fgColor-default)" }}>
                  <MonitorIcon />
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "var(--fgColor-default)",
                  }}
                >
                  GUI Desktop
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.875rem",
                  color: "var(--fgColor-muted)",
                  lineHeight: "1.4",
                }}
              >
                Full KDE desktop environment streamed to your browser via WebRTC. Ideal for graphical workloads and IDE usage.
              </div>
            </button>

            {/* CLI Terminal */}
            <button
              onClick={() => setSelectedMode("cli")}
              style={{
                backgroundColor: "var(--bgColor-default)",
                border: selectedMode === "cli"
                  ? "2px solid var(--fgColor-accent)"
                  : "1px solid var(--borderColor-default)",
                borderRadius: "4px",
                padding: selectedMode === "cli" ? "15px" : "16px",
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <span style={{ color: "var(--fgColor-default)" }}>
                  <TerminalIcon />
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "var(--fgColor-default)",
                  }}
                >
                  CLI Terminal
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.875rem",
                  color: "var(--fgColor-muted)",
                  lineHeight: "1.4",
                }}
              >
                SSH access with JupyterLab available via browser. Optimized for scripting, training jobs, and headless workloads.
              </div>
            </button>
          </div>
        </div>

        {/* SECTION 5: STORAGE */}
        <div
          style={{
            backgroundColor: "var(--bgColor-mild)",
            border: "1px solid var(--borderColor-default)",
            borderRadius: "4px",
            padding: "24px",
            marginBottom: "32px",
          }}
        >
          <SectionHeader>Storage</SectionHeader>
          
          {/* Dev toggle for testing */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
              padding: "8px 12px",
              backgroundColor: "var(--bgColor-muted)",
              borderRadius: "4px",
              fontSize: "0.75rem",
              color: "var(--fgColor-muted)",
            }}
          >
            <span>Dev: hasFileStore</span>
            <button
              onClick={() => setHasFileStore(!hasFileStore)}
              style={{
                padding: "2px 8px",
                fontSize: "0.75rem",
                backgroundColor: hasFileStore ? infoBoxColors.green.text : "var(--fgColor-muted)",
                color: "#fff",
                border: "none",
                borderRadius: "2px",
                cursor: "pointer",
              }}
            >
              {hasFileStore ? "true" : "false"}
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            {/* Stateful */}
            <button
              onClick={() => setStorageType("stateful")}
              style={{
                backgroundColor: "var(--bgColor-default)",
                border: storageType === "stateful"
                  ? "2px solid var(--fgColor-accent)"
                  : "1px solid var(--borderColor-default)",
                borderRadius: "4px",
                padding: storageType === "stateful" ? "15px" : "16px",
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <span style={{ color: "var(--fgColor-default)" }}>
                  <StorageIcon />
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "var(--fgColor-default)",
                  }}
                >
                  Stateful
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.875rem",
                  color: "var(--fgColor-muted)",
                  lineHeight: "1.4",
                }}
              >
                Persistent NFS storage — your files survive across instance restarts and config changes.
              </div>
            </button>

            {/* Ephemeral */}
            <button
              onClick={() => setStorageType("ephemeral")}
              style={{
                backgroundColor: "var(--bgColor-default)",
                border: storageType === "ephemeral"
                  ? "2px solid var(--fgColor-accent)"
                  : "1px solid var(--borderColor-default)",
                borderRadius: "4px",
                padding: storageType === "ephemeral" ? "15px" : "16px",
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <span style={{ color: "var(--fgColor-default)" }}>
                  <ClockIcon />
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "var(--fgColor-default)",
                  }}
                >
                  Ephemeral
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.875rem",
                  color: "var(--fgColor-muted)",
                  lineHeight: "1.4",
                }}
              >
                10 GB temporary disk provisioned for this session only.
              </div>
            </button>
          </div>

          {/* Conditional Info Boxes */}
          {/* A. Stateful + hasFileStore = true → BLUE info box */}
          {storageType === "stateful" && hasFileStore && (
            <div
              style={{
                display: "flex",
                gap: "12px",
                padding: "16px",
                backgroundColor: infoBoxColors.blue.bg,
                borderLeft: `3px solid ${infoBoxColors.blue.border}`,
                borderRadius: "4px",
              }}
            >
              <span style={{ color: infoBoxColors.blue.icon, flexShrink: 0, marginTop: "2px" }}>
                <InfoIcon size={18} />
              </span>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "var(--fgColor-default)",
                    marginBottom: "8px",
                  }}
                >
                  Persistent Storage Attached
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "0.875rem",
                    color: "var(--fgColor-default)",
                    lineHeight: "1.5",
                    marginBottom: "12px",
                  }}
                >
                  Your File Store will be mounted at <code style={{ fontFamily: "var(--font-mono, monospace)", backgroundColor: "var(--bgColor-muted)", padding: "2px 6px", borderRadius: "3px", fontSize: "0.8125rem" }}>/home/ubuntu</code>. All files, datasets, model checkpoints, and configurations persist across sessions. Switch between Starter and Full Machine without losing a byte — your work follows you wherever you go.
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontFamily: "var(--font-sans)",
                    fontSize: "0.875rem",
                    color: infoBoxColors.green.text,
                  }}
                >
                  <CheckIcon size={14} />
                  MyStore (9 GB) — Active and reachable
                </div>
              </div>
            </div>
          )}

          {/* B. Stateful + hasFileStore = false → AMBER warning box */}
          {storageType === "stateful" && !hasFileStore && (
            <div
              style={{
                display: "flex",
                gap: "12px",
                padding: "16px",
                backgroundColor: infoBoxColors.amber.bg,
                borderLeft: `3px solid ${infoBoxColors.amber.border}`,
                borderRadius: "4px",
              }}
            >
              <span style={{ color: infoBoxColors.amber.icon, flexShrink: 0, marginTop: "2px" }}>
                <WarningIcon size={18} />
              </span>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "var(--fgColor-default)",
                    marginBottom: "8px",
                  }}
                >
                  File Store Required
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "0.875rem",
                    color: "var(--fgColor-default)",
                    lineHeight: "1.5",
                    marginBottom: "16px",
                  }}
                >
                  Stateful instances require an active File Store to persist your data. Create one to carry your work between sessions and across compute configurations.
                </div>
                <Link
                  href="/storage"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontFamily: "var(--font-sans)",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "var(--fgColor-inverse)",
                    backgroundColor: "var(--bgColor-inverse)",
                    padding: "0 16px",
                    height: "36px",
                    borderRadius: "4px",
                    textDecoration: "none",
                  }}
                >
                  Create File Store
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              </div>
            </div>
          )}

          {/* C. Ephemeral → ORANGE caution box */}
          {storageType === "ephemeral" && (
            <div
              style={{
                display: "flex",
                gap: "12px",
                padding: "16px",
                backgroundColor: infoBoxColors.orange.bg,
                borderLeft: `3px solid ${infoBoxColors.orange.border}`,
                borderRadius: "4px",
              }}
            >
              <span style={{ color: infoBoxColors.orange.icon, flexShrink: 0, marginTop: "2px" }}>
                <CautionIcon size={18} />
              </span>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "var(--fgColor-default)",
                    marginBottom: "8px",
                  }}
                >
                  Temporary Storage Only
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "0.875rem",
                    color: "var(--fgColor-default)",
                    lineHeight: "1.5",
                  }}
                >
                  This instance will receive 10 GB of temporary disk space. All data — files, models, outputs — will be permanently deleted when the instance is stopped or terminated. This cannot be recovered. Use this for quick experiments, one-off training runs, or when you don&apos;t need persistence.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 6: INSTANCE NAME */}
        <div
          style={{
            backgroundColor: "var(--bgColor-mild)",
            border: "1px solid var(--borderColor-default)",
            borderRadius: "4px",
            padding: "24px",
            marginBottom: "32px",
          }}
        >
          <SectionHeader>Instance Name</SectionHeader>
          <div>
            <input
              type="text"
              value={instanceName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="gpu-instance-a7x3"
              style={{
                width: "100%",
                maxWidth: "400px",
                fontFamily: "var(--font-sans)",
                fontSize: "0.875rem",
                color: "var(--fgColor-default)",
                backgroundColor: "transparent",
                border: nameError
                  ? "1px solid var(--fgColor-critical)"
                  : "1px solid var(--borderColor-default)",
                borderRadius: "4px",
                padding: "0 12px",
                height: "40px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {nameError && (
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.75rem",
                  color: "var(--fgColor-critical)",
                  marginTop: "4px",
                }}
              >
                {nameError}
              </div>
            )}
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.75rem",
                color: "var(--fgColor-muted)",
                marginTop: "6px",
              }}
            >
              Choose a name to identify your instance. Letters, digits, and hyphens only.
            </div>
          </div>
        </div>
      </div>

      {/* STICKY FOOTER */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: isDarkMode
            ? "rgba(22, 22, 22, 0.8)"
            : "rgba(231, 230, 217, 0.8)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid var(--borderColor-default)",
          height: "64px",
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Left side - Summary */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.875rem",
                color: "var(--fgColor-default)",
                marginBottom: "2px",
              }}
            >
              {currentConfig?.name || "–"} · Ubuntu 22.04 · {selectedMode === "gui" ? "GUI" : "CLI"} · {storageType === "stateful" ? "Stateful" : "Ephemeral"}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "0.75rem",
                color: "var(--fgColor-muted)",
              }}
            >
              {currentConfig?.vcpu || 0} vCPU · {currentConfig?.ramGb || 0} GB RAM
              {currentConfig?.vramGb && ` · ${currentConfig.vramGb} GB VRAM`}
            </div>
          </div>

          {/* Right side - Price & Button */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "var(--fgColor-default)",
              }}
            >
              ₹{currentConfig?.pricePerHour || 0}/hr
            </div>
            <button
              onClick={handleLaunchClick}
              disabled={!canLaunch}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "var(--fgColor-inverse)",
                backgroundColor: "var(--bgColor-inverse)",
                border: "none",
                borderRadius: "4px",
                padding: "0 24px",
                height: "40px",
                cursor: canLaunch ? "pointer" : "not-allowed",
                opacity: canLaunch ? 1 : 0.4,
                transition: "opacity 0.15s ease",
              }}
              onMouseEnter={(e) => canLaunch && (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => canLaunch && (e.currentTarget.style.opacity = "1")}
            >
              Launch Instance
            </button>
          </div>
        </div>
      </div>

      {/* REVIEW AGREEMENT MODAL */}
      {showReviewModal && (
        <>
          {/* Modal Backdrop */}
          <div
            onClick={() => !isLaunching && setShowReviewModal(false)}
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

          {/* Modal */}
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "100%",
              maxWidth: "560px",
              backgroundColor: "var(--bgColor-default)",
              border: "1px solid var(--borderColor-default)",
              borderRadius: "4px",
              zIndex: 1001,
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 24px",
                borderBottom: "1px solid var(--borderColor-default)",
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  color: "var(--fgColor-default)",
                  margin: 0,
                }}
              >
                Review Agreement
              </h2>
              <button
                onClick={() => !isLaunching && setShowReviewModal(false)}
                disabled={isLaunching}
                style={{
                  width: "24px",
                  height: "24px",
                  backgroundColor: "transparent",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: isLaunching ? "not-allowed" : "pointer",
                  color: "var(--fgColor-default)",
                  padding: 0,
                  opacity: isLaunching ? 0.4 : 1,
                }}
              >
                <CloseIcon />
              </button>
            </div>

            {/* Modal Body */}
            <div
              style={{
                padding: "24px",
                fontFamily: "var(--font-sans)",
                fontSize: "0.875rem",
                color: "var(--fgColor-default)",
                lineHeight: "1.6",
              }}
            >
              <p style={{ margin: "0 0 16px 0" }}>
                You will be billed at <strong>₹{currentConfig?.pricePerHour}/hr</strong> for this instance whether the GPU is actively in use or not.
              </p>
              <p style={{ margin: "0 0 16px 0" }}>
                I have read and agree to the following end user licensing agreements: <strong>NVIDIA CUDA EULA</strong> and <strong>cuDNN Supplement</strong>.
              </p>
              <p style={{ margin: "0 0 16px 0" }}>
                I acknowledge that cryptocurrency mining is strictly prohibited and may result in immediate termination of all instances, deletion of all data, and permanent account suspension.
              </p>
              <p style={{ margin: "0 0 16px 0" }}>
                I understand that usage is billed hourly. Charges are deducted from my wallet balance in real-time.
              </p>
              <p style={{ margin: 0 }}>
                By clicking <strong>&quot;Confirm and Launch&quot;</strong>, you agree to LaaS Terms of Service and Acceptable Use Policy.
              </p>
            </div>

            {/* Modal Footer */}
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
                onClick={() => setShowReviewModal(false)}
                disabled={isLaunching}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "var(--fgColor-default)",
                  backgroundColor: "transparent",
                  border: "1px solid var(--borderColor-default)",
                  borderRadius: "4px",
                  padding: "0 20px",
                  height: "40px",
                  cursor: isLaunching ? "not-allowed" : "pointer",
                  opacity: isLaunching ? 0.4 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLaunch}
                disabled={isLaunching}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "var(--fgColor-inverse)",
                  backgroundColor: "var(--bgColor-inverse)",
                  border: "none",
                  borderRadius: "4px",
                  padding: "0 20px",
                  height: "40px",
                  cursor: isLaunching ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {isLaunching && (
                  <div
                    style={{
                      width: "14px",
                      height: "14px",
                      border: "2px solid var(--fgColor-inverse)",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                )}
                {isLaunching ? "Launching..." : "Confirm and Launch"}
              </button>
            </div>
          </div>

          {/* Spinner animation */}
          <style>{`
            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </>
      )}

      {/* Responsive grid styles */}
      <style>{`
        .compute-grid {
          grid-template-columns: repeat(3, 1fr);
        }
        @media (max-width: 1024px) {
          .compute-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .compute-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
