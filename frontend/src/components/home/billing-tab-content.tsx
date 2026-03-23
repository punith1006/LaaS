"use client";

import { useEffect, useState, useMemo } from "react";
import type { User } from "@/types/auth";
import type { BillingData } from "@/lib/api";
import { getBillingData } from "@/lib/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
} from "recharts";
import { motion } from "framer-motion";

interface BillingTabContentProps {
  user: User | null;
}

// Theme-aware colors
const COLORS = {
  light: {
    daySpend: "#3a73ff",
    hourSpend: "#d98b0c",
    grid: "var(--borderColor-muted)",
    text: "var(--fgColor-muted)",
  },
  dark: {
    daySpend: "#3a73ff",
    hourSpend: "#fda422",
    grid: "var(--borderColor-muted)",
    text: "var(--fgColor-muted)",
  },
};

// Generate historical sample data for demo purposes
// This creates past usage data while keeping current values at 0
function generateHistoricalSampleData() {
  const data = [];
  
  // Generate data for the past 7 days (simplified to last 24 hours for chart)
  const now = new Date();
  const currentHour = now.getHours();
  
  // Past usage - simulate a week of activity
  const pastDays = [
    { day: "Mon", avgSpend: 45.50, peakRate: 8.20 },
    { day: "Tue", avgSpend: 52.30, peakRate: 9.10 },
    { day: "Wed", avgSpend: 38.70, peakRate: 6.50 },
    { day: "Thu", avgSpend: 61.20, peakRate: 11.30 },
    { day: "Fri", avgSpend: 55.80, peakRate: 10.20 },
    { day: "Sat", avgSpend: 28.40, peakRate: 4.80 },
    { day: "Sun", avgSpend: 22.60, peakRate: 3.90 },
  ];

  // Convert to hourly cumulative data (showing today's equivalent hours)
  for (let i = 0; i <= currentHour; i++) {
    const hour = i.toString().padStart(2, "0") + ":00";
    // Simulate realistic spend curve - lower at night, higher during day
    const hourMultiplier = i < 8 ? 0.3 : i < 18 ? 1.2 : 0.8;
    const baseRate = 5.50; // Historical average hourly rate
    const hourlyRate = baseRate * hourMultiplier;
    const cumulativeSpend = baseRate * (i / 24) * hourMultiplier;

    data.push({
      time: hour,
      daySpend: Math.max(0, cumulativeSpend),
      rollingAvg: Math.max(0, cumulativeSpend),
      hourSpend: Math.max(0, hourlyRate),
    });
  }

  // "Now" point carries forward the last cumulative value
  const lastCumulative = data.length > 0 ? data[data.length - 1].daySpend : 0;
  data.push({
    time: "Now",
    daySpend: lastCumulative,
    rollingAvg: lastCumulative,
    hourSpend: 0,
  });

  return data;
}

// Generate mock hourly data for the chart
function generateHourlyData(dailySpend: number, currentRate: number) {
  const data = [];
  const now = new Date();
  const currentHour = now.getHours();

  for (let i = 0; i <= currentHour; i++) {
    const hour = i.toString().padStart(2, "0") + ":00";
    // Simulate realistic spend curve - lower at night, higher during day
    const hourMultiplier = i < 8 ? 0.3 : i < 18 ? 1.2 : 0.8;
    const randomVariation = 0.9 + Math.random() * 0.2;
    const cumulativeSpend = (dailySpend * (i / 24) * hourMultiplier * randomVariation);
    const hourlyRate = currentRate * hourMultiplier * randomVariation;

    data.push({
      time: hour,
      daySpend: Math.max(0, cumulativeSpend),
      rollingAvg: Math.max(0, cumulativeSpend),
      hourSpend: Math.max(0, hourlyRate),
    });
  }

  // Add "Now" as the last point
  data.push({
    time: "Now",
    daySpend: dailySpend,
    rollingAvg: dailySpend,
    hourSpend: currentRate,
  });

  return data;
}

// Generate zero-value placeholder data for the chart
// Used when backend returns empty or no hourlyData to show a visible flat line at zero
// Always generates a full 24-hour timeline to ensure the chart has enough points to draw a line
function generateZeroValueData() {
  const data = [];
  const now = new Date();
  const currentHour = now.getHours();

  // Generate all 24 hours (00:00 through 23:00) to ensure full timeline
  // This guarantees enough points to draw a visible line regardless of current time
  for (let i = 0; i <= 23; i++) {
    const hour = i.toString().padStart(2, "0") + ":00";
    // Mark the current hour as "Now" for visual clarity
    const timeLabel = i === currentHour ? "Now" : hour;
    data.push({
      time: timeLabel,
      daySpend: 0,
      rollingAvg: 0,
      hourSpend: 0,
    });
  }

  return data;
}

// Metric Card Component - Lambda.ai style
function MetricCard({
  icon,
  label,
  value,
  subValue,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        backgroundColor: highlight ? "var(--bgColor-info, #cedeff)" : "var(--bgColor-mild)",
        border: highlight
          ? "1px solid var(--borderColor-info, #3a73ff)"
          : "1px solid var(--borderColor-default)",
        borderRadius: "4px",
        padding: "16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        flex: 1,
        minWidth: "140px",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "4px",
          backgroundColor: highlight ? "transparent" : "var(--bgColor-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-xs)",
            color: highlight ? "var(--fgColor-info, #3a73ff)" : "var(--fgColor-muted)",
            marginBottom: "2px",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-h4)",
            fontWeight: 600,
            color: "var(--fgColor-default)",
            lineHeight: 1.2,
          }}
        >
          {value}
        </div>
        {subValue && (
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-xs)",
              color: highlight ? "var(--fgColor-info, #3a73ff)" : "var(--fgColor-muted)",
            }}
          >
            {subValue}
          </div>
        )}
      </div>
    </div>
  );
}

// Resource Item Component
function ResourceItem({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        padding: "12px 0",
        borderBottom: "1px solid var(--borderColor-muted)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          color: "var(--fgColor-muted)",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-h4)",
          fontWeight: 600,
          color: "var(--fgColor-default)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// Custom Tooltip for the chart
function CustomTooltip({
  active,
  payload,
  label,
  isDark,
}: {
  active?: boolean;
  payload?: Array<{ color: string; value: number; name: string; dataKey: string }>;
  label?: string;
  isDark: boolean;
}) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: "var(--bgColor-default)",
          border: "1px solid var(--borderColor-default)",
          borderRadius: "4px",
          padding: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-xs)",
            color: "var(--fgColor-muted)",
            marginBottom: "8px",
          }}
        >
          {label}
        </div>
        {payload.map((entry, index) => {
          // Format based on data type: cumulative vs hourly
          const isHourly = entry.dataKey === "hourSpend";
          const formattedLabel = isHourly
            ? `rate ₹${entry.value.toFixed(2)} / hr`
            : `spent ₹${entry.value.toFixed(2)} today`;
          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "4px",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: entry.color,
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-sm)",
                  color: "var(--fgColor-default)",
                }}
              >
                {formattedLabel}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
}

export function BillingTabContent({ user }: BillingTabContentProps) {
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  // Detect theme
  useEffect(() => {
    const checkTheme = () => {
      const darkMode = document.documentElement.classList.contains("dark");
      setIsDark(darkMode);
    };
    checkTheme();
    
    // Listen for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    getBillingData()
      .then((data) => {
        setBillingData(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  // Use API data or fallback to user data
  const usage = billingData?.usage ?? {
    storageQuotaGb: user?.storageQuotaGb ?? 5,
    storageUsedGb: 0,
    storageAllocatedGb: 0,
    computeHoursUsed: 0,
    billingCycle: 'N/A',
  };

  // Mock data for Lambda.ai style billing display
  const creditBalance = billingData?.creditBalance ?? 0;
  const spendRate = billingData?.spendRate ?? 0;
  const spendLimit = billingData?.spendLimit ?? 0;
  const spendLimitEnabled = billingData?.spendLimitEnabled ?? false;
  const dailySpend = billingData?.dailySpend ?? 0;
  const currentSpendRate = billingData?.currentSpendRate ?? 0;
  const runwayHours = billingData?.runway ?? null;

  // Format runway as human-readable string
  const formatRunway = (hours: number | null): string => {
    if (hours === null || currentSpendRate <= 0) return "--";
    if (hours <= 0) return "0 hrs";
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    if (days > 0 && remainingHours > 0) return `${days}d ${remainingHours}h`;
    if (days > 0) return `${days}d`;
    return `${remainingHours}h`;
  };

  // Resource usage (from active sessions + storage volume - all real DB data)
  const gpus = billingData?.gpus ?? 0;
  const gpuVramMb = billingData?.gpuVramMb ?? 0;
  const vcpus = billingData?.vcpus ?? 0;
  const memoryMb = billingData?.memoryMb ?? 0;
  const endpoints = billingData?.endpoints ?? 0;
  const storageAllocatedGb = billingData?.storageAllocatedGb ?? 0;
  const storageUsedGb = billingData?.storageUsedGb ?? 0;
  const storageUsagePercent = billingData?.storageUsagePercent ?? 0;

  // Format memory
  const formatMemory = (mb: number) => {
    if (mb === 0) return "0 MB";
    if (mb >= 1024) return `${(mb / 1024).toFixed(0)} GB`;
    return `${mb} MB`;
  };

  // Format GPU VRAM
  const formatVram = (mb: number) => {
    if (mb === 0) return "--";
    if (mb >= 1024) return `${(mb / 1024).toFixed(0)} GB`;
    return `${mb} MB`;
  };

  // Generate chart data from hourly data
  // Ensures all data points have explicit numeric values (never null/undefined)
  // so the chart renders visible lines even when all values are zero
  const chartData = useMemo(() => {
    let data;
    const now = new Date();
    const currentHour = now.getHours();
    
    // Helper: Generate a full 24-hour timeline with zero values, marking current hour as "Now"
    const generateFullTimeline = () => {
      const timeline = [];
      for (let i = 0; i <= 23; i++) {
        const hour = i.toString().padStart(2, "0") + ":00";
        const timeLabel = i === currentHour ? "Now" : hour;
        timeline.push({
          time: timeLabel,
          daySpend: 0,
          rollingAvg: 0,
          hourSpend: 0,
        });
      }
      return timeline;
    };
    
    // Use hourly data from API if available and has data points
    if (billingData?.hourlyData && billingData.hourlyData.length > 0) {
      // If backend returns very few points (< 3), pad with full 24-hour timeline
      if (billingData.hourlyData.length < 3) {
        const fullTimeline = generateFullTimeline();
        // Merge backend data into the full timeline
        billingData.hourlyData.forEach((item) => {
          // Find the hour index (parse "HH:00" or "Now")
          let hourIndex = -1;
          if (item.hour === "Now") {
            hourIndex = currentHour;
          } else {
            const hourMatch = item.hour.match(/^(\d{2}):/);
            if (hourMatch) {
              hourIndex = parseInt(hourMatch[1], 10);
            }
          }
          if (hourIndex >= 0 && hourIndex <= 23) {
            fullTimeline[hourIndex] = {
              time: fullTimeline[hourIndex].time, // Keep "Now" label if applicable
              rollingAvg: item.cumulativeSpend ?? 0,
              hourSpend: item.hourlyRate ?? 0,
              daySpend: item.cumulativeSpend ?? 0,
            };
          }
        });
        data = fullTimeline;
      } else {
        data = billingData.hourlyData.map((item) => ({
          time: item.hour,
          // Ensure all values are explicit numbers, defaulting to 0 for null/undefined
          rollingAvg: item.cumulativeSpend ?? 0, // Cumulative spend up to this hour (blue line)
          hourSpend: item.hourlyRate ?? 0, // Actual hourly rate (orange line)
          daySpend: item.cumulativeSpend ?? 0, // alias for type compat
        }));
      }
    }
    // If backend returns empty hourlyData but we have billing context, generate zero-value timeline
    else if (billingData && (!billingData.hourlyData || billingData.hourlyData.length === 0)) {
      data = generateZeroValueData();
    }
    // If current values are 0 and no billing data, show historical sample data for demo
    else if (currentSpendRate === 0 && dailySpend === 0) {
      data = generateHistoricalSampleData();
    }
    // Fallback to mock hourly data if no hourly data
    else {
      data = generateHourlyData(dailySpend, currentSpendRate);
    }
    
    // When no active session, the "Now" point should have hourSpend=0
    // but cumulative spend carries forward from previous hours
    if (currentSpendRate === 0) {
      const nowIndex = data.findIndex((d) => d.time === "Now");
      if (nowIndex >= 0) {
        data[nowIndex] = { ...data[nowIndex], hourSpend: 0 };
      }
    }
    
    return data;
  }, [billingData, dailySpend, currentSpendRate]);

  const themeColors = isDark ? COLORS.dark : COLORS.light;

  // Calculate proportional Y-axis domains
  // When all actual data values are 0, use a small Y-axis range so the flat zero line is visible
  // Only use rolling-average-based scaling when there are actual non-zero data values
  const { leftAxisMax, rightAxisMax } = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { leftAxisMax: 1, rightAxisMax: 0.5 };
    }
    
    // Get actual max values from chart data
    const actualMaxCumulative = Math.max(...chartData.map((d) => d.rollingAvg ?? 0));
    const actualMaxHourly = Math.max(...chartData.map((d) => d.hourSpend ?? 0));

    // Check if ALL actual data values are zero (flat line at zero scenario)
    const allDataIsZero = actualMaxCumulative === 0 && actualMaxHourly === 0;
    
    if (allDataIsZero) {
      // Use small Y-axis ranges so the flat zero line is visible at the bottom
      // with reasonable chart height (not squished to invisible bottom edge)
      return { leftAxisMax: 1, rightAxisMax: 0.5 };
    }

    // Use spendRate (7-day rolling avg) as reference for proportional scaling
    // Only when there are actual non-zero values
    const rollingAvgDaily = billingData?.spendRate ?? 0;
    const estimatedHourlyFromDaily = rollingAvgDaily / 24;
    
    // Ensure minimum visible ranges
    const MIN_LEFT_AXIS = 10;  // ₹10 minimum for cumulative spend axis
    const MIN_RIGHT_AXIS = 1;  // ₹1 minimum for hourly rate axis
    
    const rawLeftMax = Math.max(actualMaxCumulative, rollingAvgDaily) * 1.2; // 20% padding
    const rawRightMax = Math.max(actualMaxHourly, estimatedHourlyFromDaily) * 1.3; // 30% padding

    return {
      leftAxisMax: Math.max(rawLeftMax, MIN_LEFT_AXIS),
      rightAxisMax: Math.max(rawRightMax, MIN_RIGHT_AXIS),
    };
  }, [chartData, billingData?.spendRate]);

  return (
    <div>
      {/* Balance Summary Section */}
      <div
        style={{
          backgroundColor: "var(--bgColor-mild)",
          border: "1px solid var(--borderColor-default)",
          borderRadius: "4px",
          padding: "24px",
          marginBottom: "24px",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-h4)",
            fontWeight: 600,
            color: "var(--fgColor-default)",
            margin: 0,
            marginBottom: "4px",
          }}
        >
          Balance Summary
        </h3>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--fgColor-muted)",
            margin: 0,
            marginBottom: "16px",
          }}
        >
          Spending overview
        </p>

        {/* Metric Cards Row */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <MetricCard
            highlight
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                style={{ color: "var(--fgColor-info, #3a73ff)" }}
              >
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <path d="M2 10h20" />
              </svg>
            }
            label="Credit balance"
            value={`₹${creditBalance.toFixed(2)}`}
          />
          <MetricCard
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                style={{ color: "var(--fgColor-muted)" }}
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            }
            label="Burn rate"
            value={`₹${currentSpendRate.toFixed(2)}/hr`}
          />
          <MetricCard
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                style={{ color: "var(--fgColor-muted)" }}
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            }
            label="Runway"
            value={formatRunway(runwayHours)}
          />
          <MetricCard
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                style={{ color: "var(--fgColor-muted)" }}
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            }
            label="Spend limit"
            value={`₹${spendLimit.toFixed(2)}`}
          />
        </div>
      </div>

      {/* Two Column Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: "24px",
        }}
      >
        {/* Daily Spend Section with Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            backgroundColor: "var(--bgColor-mild)",
            border: "1px solid var(--borderColor-default)",
            borderRadius: "4px",
            padding: "24px",
            minHeight: "400px",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "16px",
            }}
          >
            <div>
              <h3
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-h4)",
                  fontWeight: 600,
                  color: "var(--fgColor-default)",
                  margin: 0,
                  marginBottom: "4px",
                }}
              >
                Daily spend
              </h3>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-sm)",
                  color: "var(--fgColor-muted)",
                  margin: 0,
                }}
              >
                Keep an eye on your daily spend with real-time insights.
              </p>
            </div>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-xs)",
                color: "var(--fgColor-muted)",
                backgroundColor: "var(--bgColor-muted)",
                padding: "4px 8px",
                borderRadius: "4px",
                border: "1px solid var(--borderColor-default)",
              }}
            >
              REAL-TIME
            </span>
          </div>

          {/* Stats Row */}
          <div
            style={{
              display: "flex",
              gap: "32px",
              marginBottom: "24px",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-xs)",
                  color: "var(--fgColor-muted)",
                  marginBottom: "4px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Rolling average
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-h3)",
                  fontWeight: 600,
                  color: "var(--fgColor-default)",
                }}
              >
                ₹{(billingData?.spendRate ?? 0).toFixed(2)}
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: 400,
                    color: "var(--fgColor-muted)",
                  }}
                >
                  {" "}
                  / day
                </span>
              </div>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-xs)",
                  color: "var(--fgColor-muted)",
                  marginBottom: "4px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Current burn rate
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-h3)",
                  fontWeight: 600,
                  color: themeColors.hourSpend,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: themeColors.hourSpend,
                  }}
                />
                ₹{currentSpendRate.toFixed(2)}
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: 400,
                    color: "var(--fgColor-muted)",
                  }}
                >
                  {" "}
                  / hr
                </span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div style={{ height: "200px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  {/* Gradient for day spend area */}
                  <linearGradient id="daySpendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={themeColors.daySpend}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={themeColors.daySpend}
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                  {/* Gradient for hour spend area */}
                  <linearGradient id="hourSpendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={themeColors.hourSpend}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={themeColors.hourSpend}
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={themeColors.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "var(--fgColor-muted)",
                    fontSize: 10,
                    fontFamily: "var(--font-sans)",
                  }}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis
                  yAxisId="left"
                  domain={[0, leftAxisMax]}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: themeColors.daySpend,
                    fontSize: 10,
                    fontFamily: "var(--font-sans)",
                  }}
                  tickFormatter={(value) => `₹${value.toFixed(1)}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, rightAxisMax]}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: themeColors.hourSpend,
                    fontSize: 10,
                    fontFamily: "var(--font-sans)",
                  }}
                  tickFormatter={(value) => `₹${value.toFixed(2)}`}
                />
                <Tooltip
                  content={<CustomTooltip isDark={isDark} />}
                />
                {/* Cumulative spend area (blue) */}
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="rollingAvg"
                  name="Cumulative spend"
                  stroke={themeColors.daySpend}
                  strokeWidth={2}
                  fill="url(#daySpendGradient)"
                  animationDuration={1500}
                  connectNulls={true}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                {/* Hour spend line (orange/yellow) */}
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="hourSpend"
                  name="Spend rate"
                  stroke={themeColors.hourSpend}
                  strokeWidth={2}
                  fill="url(#hourSpendGradient)"
                  animationDuration={1500}
                  connectNulls={true}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "24px",
              marginTop: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "12px",
                  height: "3px",
                  backgroundColor: themeColors.daySpend,
                  borderRadius: "2px",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-xs)",
                  color: "var(--fgColor-muted)",
                }}
              >
                Cumulative spend
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "12px",
                  height: "3px",
                  backgroundColor: themeColors.hourSpend,
                  borderRadius: "2px",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-xs)",
                  color: "var(--fgColor-muted)",
                }}
              >
                Spend rate
              </span>
            </div>
          </div>
        </motion.div>

        {/* Current Resources Section */}
        <div
          style={{
            backgroundColor: "var(--bgColor-mild)",
            border: "1px solid var(--borderColor-default)",
            borderRadius: "4px",
            padding: "24px",
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-h4)",
              fontWeight: 600,
              color: "var(--fgColor-default)",
              margin: 0,
              marginBottom: "4px",
            }}
          >
            Current resources
          </h3>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              color: "var(--fgColor-muted)",
              margin: 0,
              marginBottom: "16px",
            }}
          >
            Monitor your GPU, vCPU, storage, and endpoint usage.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0 24px",
            }}
          >
            <ResourceItem label="GPUs" value={gpus > 0 ? `${gpus} (${formatVram(gpuVramMb)} VRAM)` : "0"} />
            <ResourceItem label="vCPUs" value={vcpus} />
            <ResourceItem label="RAM" value={formatMemory(memoryMb)} />
            <ResourceItem label="Endpoints" value={endpoints} />
            <ResourceItem
              label="Storage allocated"
              value={storageAllocatedGb > 0 ? `${storageAllocatedGb} GB` : "Not provisioned"}
            />
            <ResourceItem
              label="Storage used"
              value={storageAllocatedGb > 0 ? `${storageUsedGb.toFixed(2)} GB (${storageUsagePercent}%)` : "--"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
