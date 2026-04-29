"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  getComputeConfigs,
  getStorageStatus,
  getBillingData,
  launchComputeSession,
  type ComputeConfigResponse,
  type StorageStatus,
} from "@/lib/api";
import { ComputeRecommendation } from "@/components/compute/compute-recommendation";

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
  
  // API data state
  const [configs, setConfigs] = useState<ComputeConfigResponse[]>([]);
  const [configsLoading, setConfigsLoading] = useState(true);
  const [configsError, setConfigsError] = useState<string | null>(null);
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  
  // Form state
  const [selectedConfig, setSelectedConfig] = useState<string>("");
  const [selectedMode, setSelectedMode] = useState<"gui" | "cli">("gui");
  const [storageType, setStorageType] = useState<"stateful" | "ephemeral">("stateful");
  const [instanceName, setInstanceName] = useState<string>(generateInstanceName());
  const [nameError, setNameError] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showRecommendationFlow, setShowRecommendationFlow] = useState(false);
  
  // Derived state
  const hasFileStore = storageStatus?.hasStorage && storageStatus?.reachable;

  // Fetch compute configs on mount
  useEffect(() => {
    const fetchConfigs = async () => {
      setConfigsLoading(true);
      setConfigsError(null);
      try {
        const data = await getComputeConfigs();
        if (data && data.configs && data.configs.length > 0) {
          // Filter out "GPU Desktop Standard" if it exists in the database
          const filteredConfigs = data.configs.filter(
            (c) => c.name !== "GPU Desktop Standard" && c.slug !== "gpu-desktop-standard"
          );
          setConfigs(filteredConfigs);
          // Select first available config by default
          const firstAvailable = filteredConfigs.find(c => c.available);
          if (firstAvailable) {
            setSelectedConfig(firstAvailable.id);
          } else if (data.configs.length > 0) {
            setSelectedConfig(data.configs[0].id);
          }
        } else {
          setConfigsError("No compute configurations available");
        }
      } catch (err) {
        console.error("Failed to fetch configs:", err);
        setConfigsError("Failed to load compute configurations. Please try again.");
      } finally {
        setConfigsLoading(false);
      }
    };
    fetchConfigs();
  }, []);

  // Fetch storage status on mount
  useEffect(() => {
    const fetchStorageStatus = async () => {
      try {
        const status = await getStorageStatus();
        setStorageStatus(status);
      } catch (err) {
        console.error("Failed to fetch storage status:", err);
        setStorageStatus({ hasStorage: false, reachable: false, serviceHealthy: false });
      }
    };
    fetchStorageStatus();
  }, []);

  // Fetch wallet balance on mount
  useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        const billing = await getBillingData();
        if (billing) {
          setWalletBalance(billing.creditBalance || 0);
        }
      } catch (err) {
        console.error("Failed to fetch wallet balance:", err);
      }
    };
    fetchWalletBalance();
  }, []);

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
    if (storageStatus !== null) {
      if (hasFileStore) {
        setStorageType("stateful");
      } else {
        setStorageType("ephemeral");
      }
    }
  }, [hasFileStore, storageStatus]);

  // Get selected config object
  const currentConfig = configs.find((c) => c.id === selectedConfig);
  
  // Helper function to get price in rupees
  const getPricePerHour = (config: ComputeConfigResponse | undefined): number => {
    if (!config) return 0;
    return config.basePricePerHourCents / 100;
  };
  
  // Helper function to get RAM in GB
  const getRamGb = (config: ComputeConfigResponse | undefined): number => {
    if (!config) return 0;
    return Math.round(config.memoryMb / 1024);
  };
  
  // Helper function to get VRAM in GB
  const getVramGb = (config: ComputeConfigResponse | undefined): number => {
    if (!config) return 0;
    return Math.round(config.gpuVramMb / 1024);
  };

  // Handle instance name change
  const handleNameChange = (value: string) => {
    setInstanceName(value);
    setNameError(validateInstanceName(value));
  };

  // Wallet balance validation
  const pricePerHour = getPricePerHour(currentConfig);
  const hasInsufficientBalance = walletBalance < pricePerHour;
  
  // Check if selected config is available
  const isConfigAvailable = currentConfig?.available ?? false;

  // Check if launch is valid
  const canLaunch = 
    currentConfig && 
    !nameError && 
    instanceName.length >= 3 && 
    isConfigAvailable &&
    !hasInsufficientBalance &&
    (storageType === "ephemeral" || hasFileStore);

  // Handle launch click - open review modal
  const handleLaunchClick = () => {
    if (!canLaunch) return;
    setLaunchError(null);
    setShowReviewModal(true);
  };

  // Handle confirm launch - call real API
  const handleConfirmLaunch = async () => {
    if (!currentConfig) return;
    
    setIsLaunching(true);
    setLaunchError(null);
    
    try {
      const result = await launchComputeSession({
        computeConfigId: selectedConfig,
        instanceName: instanceName.toLowerCase(),
        interfaceMode: selectedMode,
        storageType: storageType,
      });
      
      // Redirect to instances page with session info
      router.push(`/instances?session=${result.sessionId}&launched=true`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to launch instance";
      setLaunchError(message);
    } finally {
      setIsLaunching(false);
    }
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
        {!showRecommendationFlow && (
        <>
        <Link
          href="/instances"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.875rem",
            fontWeight: 400,
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                color: "var(--fgColor-default)",
                margin: 0,
                lineHeight: "2.5rem",
              }}
            >
              Launch Instance
            </h1>
            {!showRecommendationFlow && (
              <div
                onClick={() => setShowRecommendationFlow(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--fgColor-info, #3A73FF)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18h6" /><path d="M10 22h4" />
                  <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
                </svg>
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-sm, 0.875rem)",
                    color: "var(--fgColor-info, #3A73FF)",
                    textDecoration: "underline",
                    textUnderlineOffset: "3px",
                  }}
                >
                  Not sure which config? Let us help you choose
                </span>
              </div>
            )}
          </div>
          <p
            style={{
              fontSize: "0.875rem",
              fontWeight: 400,
              color: "var(--fgColor-muted)",
              marginTop: "8px",
              lineHeight: "1.375rem",
            }}
          >
            Configure your GPU-accelerated compute environment. Select resources, OS, and storage — billed per hour of usage.
          </p>
        </div>
        </>
        )}

        {showRecommendationFlow ? (
          <ComputeRecommendation
            configs={configs}
            walletBalance={walletBalance}
            onSelectConfig={(configId: string) => {
              setSelectedConfig(configId);
              setShowRecommendationFlow(false);
            }}
            onBack={() => setShowRecommendationFlow(false)}
          />
        ) : (
          <>
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
          
          {/* Loading state */}
          {configsLoading && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "16px",
              }}
              className="compute-grid"
            >
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: "var(--bgColor-default)",
                    border: "1px solid var(--borderColor-default)",
                    borderRadius: "4px",
                    padding: "16px",
                    height: "180px",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                >
                  <div style={{ height: "24px", width: "60%", backgroundColor: "var(--borderColor-default)", borderRadius: "4px", marginBottom: "12px" }} />
                  <div style={{ height: "16px", width: "80%", backgroundColor: "var(--borderColor-default)", borderRadius: "4px", marginBottom: "8px" }} />
                  <div style={{ height: "16px", width: "70%", backgroundColor: "var(--borderColor-default)", borderRadius: "4px", marginBottom: "8px" }} />
                  <div style={{ height: "32px", width: "40%", backgroundColor: "var(--borderColor-default)", borderRadius: "4px", marginBottom: "8px" }} />
                </div>
              ))}
            </div>
          )}
          
          {/* Error state */}
          {!configsLoading && configsError && (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "var(--fgColor-critical)",
              }}
            >
              <div style={{ marginBottom: "12px" }}>
                <WarningIcon size={32} />
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 500, marginBottom: "8px" }}>
                {configsError}
              </div>
              <button
                onClick={() => window.location.reload()}
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "var(--fgColor-default)",
                  backgroundColor: "transparent",
                  border: "1px solid var(--borderColor-default)",
                  borderRadius: "4px",
                  padding: "8px 16px",
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            </div>
          )}
          
          {/* Configs grid */}
          {!configsLoading && !configsError && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "16px",
              }}
              className="compute-grid"
            >
              {configs.map((config) => {
                const isSelected = selectedConfig === config.id;
                const isAvailable = config.available;

                return (
                  <button
                    key={config.id}
                    onClick={() => setSelectedConfig(config.id)}
                    disabled={!isAvailable}
                    style={{
                      backgroundColor: "var(--bgColor-default)",
                      border: isSelected
                        ? "2px solid var(--fgColor-default)"
                        : "1px solid var(--borderColor-default)",
                      borderRadius: "4px",
                      padding: isSelected ? "15px" : "16px",
                      cursor: isAvailable ? "pointer" : "not-allowed",
                      textAlign: "left",
                      transition: "border-color 0.15s ease",
                      position: "relative",
                      opacity: isAvailable ? 1 : 0.5,
                    }}
                  >
                    {/* Unavailable badge */}
                    {!isAvailable && (
                      <span
                        style={{
                          position: "absolute",
                          top: "8px",
                          right: "8px",
                          fontSize: "0.625rem",
                          fontWeight: 600,
                          color: "var(--fgColor-critical)",
                          backgroundColor: "var(--bgColor-critical-muted)",
                          padding: "2px 6px",
                          borderRadius: "2px",
                          textTransform: "uppercase",
                        }}
                      >
                        Unavailable
                      </span>
                    )}
                    
                    {/* Config Name */}
                    <div
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: 600,
                        color: "var(--fgColor-default)",
                        marginBottom: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>{config.name}</span>
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
                          color: "var(--fgColor-muted)",
                        }}
                      >
                        <GpuChipIcon size={10} />
                        GPU
                      </span>
                    </div>

                    {/* Specs Grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "4px 12px",
                        fontSize: "0.875rem",
                        fontWeight: 400,
                        color: "var(--fgColor-muted)",
                        marginBottom: "12px",
                      }}
                    >
                      <div>{config.vcpu} vCPU</div>
                      <div>{getRamGb(config)} GB RAM</div>
                      <div style={{ color: "var(--fgColor-default)" }}>{getVramGb(config)} GB VRAM</div>
                      <div>{config.hamiSmPercent}% SM</div>
                    </div>

                    {/* GPU Model for GPU configs */}
                    {config.gpuModel && (
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 400,
                          color: "var(--fgColor-muted)",
                          marginBottom: "8px",
                        }}
                      >
                        {config.gpuModel}
                      </div>
                    )}

                    {/* Price */}
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: "var(--fgColor-default)",
                        marginBottom: "8px",
                      }}
                    >
                      ₹{getPricePerHour(config)}/hr
                    </div>

                    {/* Best For */}
                    <div
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 400,
                        color: "var(--fgColor-muted)",
                        fontStyle: "italic",
                        lineHeight: "1.3",
                      }}
                    >
                      {config.bestFor || "General purpose GPU workloads"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
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
              padding: "15px",
              backgroundColor: "var(--bgColor-default)",
              border: "2px solid var(--fgColor-default)",
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
                    fontSize: "1.125rem",
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
                  fontSize: "0.75rem",
                  fontWeight: 400,
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
                  ? "2px solid var(--fgColor-default)"
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
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    color: "var(--fgColor-default)",
                  }}
                >
                  GUI Desktop
                </span>
              </div>
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 400,
                  color: "var(--fgColor-muted)",
                  lineHeight: "1.4",
                }}
              >
                Full KDE desktop environment streamed to your browser via WebRTC. Ideal for graphical workloads and IDE usage.
              </div>
            </button>

            {/* CLI Terminal - Coming Soon */}
            <div
              style={{
                backgroundColor: "var(--bgColor-default)",
                border: "1px solid var(--borderColor-default)",
                borderRadius: "4px",
                padding: "16px",
                cursor: "not-allowed",
                textAlign: "left",
                opacity: 0.5,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <span style={{ color: "var(--fgColor-default)" }}>
                  <TerminalIcon />
                </span>
                <span
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    color: "var(--fgColor-default)",
                  }}
                >
                  CLI Terminal
                </span>
                <span
                  style={{
                    fontSize: "0.6rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    color: "var(--fgColor-muted)",
                    backgroundColor: "var(--borderColor-default)",
                    padding: "2px 6px",
                    borderRadius: "3px",
                    letterSpacing: "0.02em",
                  }}
                >
                  Coming Soon
                </span>
              </div>
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 400,
                  color: "var(--fgColor-muted)",
                  lineHeight: "1.4",
                }}
              >
                SSH access with JupyterLab available via browser. Optimized for scripting, training jobs, and headless workloads.
              </div>
            </div>
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
          
          {/* hasFileStore will come from API */}

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
                  ? "2px solid var(--fgColor-default)"
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
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    color: "var(--fgColor-default)",
                  }}
                >
                  Stateful
                </span>
              </div>
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 400,
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
                  ? "2px solid var(--fgColor-default)"
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
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    color: "var(--fgColor-default)",
                  }}
                >
                  Ephemeral
                </span>
              </div>
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 400,
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
                    fontSize: "0.875rem",
                    fontWeight: 400,
                    color: "var(--fgColor-default)",
                    lineHeight: "1.5",
                    marginBottom: "12px",
                  }}
                >
                  Your File Store will be mounted at <code style={{ backgroundColor: "var(--bgColor-muted)", padding: "2px 6px", borderRadius: "3px", fontSize: "0.8125rem" }}>/home/ubuntu</code>. All files, datasets, model checkpoints, and configurations persist across sessions. Switch between Starter and Full Machine without losing a byte — your work follows you wherever you go.
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.875rem",
                    fontWeight: 400,
                    color: infoBoxColors.green.text,
                  }}
                >
                  <CheckIcon size={14} />
                  {storageStatus?.volumeName ?? 'File Store'} ({storageStatus?.quotaGb ?? '?'} GB) — Active and reachable
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
                    fontSize: "0.875rem",
                    fontWeight: 400,
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
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "var(--bgColor-default)",
                    backgroundColor: "var(--fgColor-default)",
                    border: "1px solid var(--fgColor-default)",
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
                    fontSize: "0.875rem",
                    fontWeight: 400,
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
                fontSize: "0.875rem",
                fontWeight: 400,
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
                  fontSize: "0.75rem",
                  fontWeight: 400,
                  color: "var(--fgColor-critical)",
                  marginTop: "4px",
                }}
              >
                {nameError}
              </div>
            )}
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 400,
                color: "var(--fgColor-muted)",
                marginTop: "6px",
              }}
            >
              Choose a name to identify your instance. Letters, digits, and hyphens only.
            </div>
          </div>
        </div>
          </>
        )}
      </div>

      {/* STICKY FOOTER */}
      {!showRecommendationFlow && (
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
                fontSize: "0.875rem",
                fontWeight: 400,
                color: "var(--fgColor-default)",
                marginBottom: "2px",
              }}
            >
              {currentConfig?.name || "–"} · Ubuntu 22.04 · {selectedMode === "gui" ? "GUI" : "CLI"} · {storageType === "stateful" ? "Stateful" : "Ephemeral"}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 400,
                color: "var(--fgColor-muted)",
              }}
            >
              {currentConfig?.vcpu || 0} vCPU · {getRamGb(currentConfig)} GB RAM
              {currentConfig && getVramGb(currentConfig) > 0 && ` · ${getVramGb(currentConfig)} GB VRAM`}
            </div>
          </div>

          {/* Right side - Price & Button */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {hasInsufficientBalance && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  backgroundColor: "var(--fgColor-warning)",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  color: "var(--bgColor-default)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Insufficient Credit Balance
              </div>
            )}
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "var(--fgColor-default)",
              }}
            >
              ₹{pricePerHour}/hr
            </div>
            <button
              onClick={handleLaunchClick}
              disabled={!canLaunch}
              style={{
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "var(--bgColor-default)",
                backgroundColor: "var(--fgColor-default)",
                border: "1px solid var(--fgColor-default)",
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
      )}

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
                fontSize: "0.875rem",
                fontWeight: 400,
                color: "var(--fgColor-default)",
                lineHeight: "1.6",
              }}
            >
              <p style={{ margin: "0 0 16px 0" }}>
                You will be billed at <strong>₹{pricePerHour}/hr</strong> for this instance whether the GPU is actively in use or not.
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
            
            {/* Launch Error Display */}
            {launchError && (
              <div
                style={{
                  margin: "0 24px 16px",
                  padding: "12px 16px",
                  backgroundColor: "var(--bgColor-critical-muted)",
                  borderLeft: "3px solid var(--fgColor-critical)",
                  borderRadius: "4px",
                  fontSize: "0.875rem",
                  color: "var(--fgColor-critical)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                }}
              >
                <WarningIcon size={18} />
                <span>{launchError}</span>
              </div>
            )}

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
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "var(--bgColor-default)",
                  backgroundColor: "var(--fgColor-default)",
                  border: "1px solid var(--fgColor-default)",
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
                      border: "2px solid var(--bgColor-default)",
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
          grid-template-columns: repeat(2, 1fr);
        }
        @media (max-width: 640px) {
          .compute-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
