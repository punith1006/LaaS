"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Link2, UserPlus, IndianRupee, Copy, Check, ChevronDown, ChevronUp, Users, Wallet, Clock, Info, X } from "lucide-react";

// Types
interface ReferralStats {
  totalEarnings: number;
  successfulReferrals: number;
  pendingReferrals: number;
}

interface ReferralHistoryItem {
  id: string;
  referredUserEmail: string;
  status: string;
  rewardStatus: string;
  signupCompletedAt: string;
  firstPaymentAmountCents: number | null;
  rewardAmountCents: number | null;
  rewardCreditedAt: string | null;
}

interface ReferralLinkData {
  referralCode: string;
  referralUrl: string;
}

// Status badge component
function StatusBadge({ status, rewardStatus }: { status: string; rewardStatus: string }) {
  const getStatusConfig = () => {
    // Determine display based on rewardStatus first, then status
    if (rewardStatus === "CREDITED") {
      return {
        label: "Reward Credited",
        dotColor: "#009C00",
        bgColor: "rgba(0, 156, 0, 0.1)",
        textColor: "#009C00",
      };
    }
    switch (status) {
      case "QUALIFIED":
        return {
          label: "Qualified",
          dotColor: "#009C00",
          bgColor: "rgba(0, 156, 0, 0.1)",
          textColor: "#009C00",
        };
      case "PAYMENT_PENDING":
      case "SIGNUP_COMPLETED":
        return {
          label: status === "PAYMENT_PENDING" ? "Payment Pending" : "Signed Up",
          dotColor: "#F59E0B",
          bgColor: "rgba(245, 158, 11, 0.1)",
          textColor: "#F59E0B",
        };
      case "EXPIRED":
        return {
          label: "Expired",
          dotColor: "#EF4444",
          bgColor: "rgba(239, 68, 68, 0.1)",
          textColor: "#EF4444",
        };
      case "REWARD_VOIDED":
        return {
          label: "Voided",
          dotColor: "var(--fgColor-muted)",
          bgColor: "var(--bgColor-muted)",
          textColor: "var(--fgColor-muted)",
        };
      default:
        return {
          label: status.replace(/_/g, " "),
          dotColor: "#F59E0B",
          bgColor: "rgba(245, 158, 11, 0.1)",
          textColor: "#F59E0B",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        borderRadius: "2px",
        backgroundColor: "transparent",
        color: "var(--fgColor-muted)",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-xs)",
        fontWeight: 500,
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: config.dotColor,
        }}
      />
      {config.label}
    </span>
  );
}

// Format currency in Indian Rupees
function formatRs(amount: number | null): string {
  if (amount === null || amount === undefined) return "—";
  return `₹${amount.toLocaleString("en-IN")}`;
}

// Mask email for privacy
function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email;
  const [localPart, domain] = email.split("@");
  if (localPart.length <= 2) return email;
  const masked = `${localPart[0]}${"*".repeat(localPart.length - 2)}${localPart[localPart.length - 1]}`;
  return `${masked}@${domain}`;
}

// Format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ReferralPage() {
  const [referralLink, setReferralLink] = useState<ReferralLinkData | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [history, setHistory] = useState<ReferralHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch referral link
        const linkRes = await apiFetch(`${API_BASE}/api/referral/my-link`);
        if (!linkRes.ok) throw new Error("Failed to fetch referral link");
        const rawLink = await linkRes.json();
        setReferralLink({
          referralCode: rawLink.code,
          referralUrl: rawLink.url,
        });

        // Fetch stats
        const statsRes = await apiFetch(`${API_BASE}/api/referral/stats`);
        if (!statsRes.ok) throw new Error("Failed to fetch referral stats");
        const rawStats = await statsRes.json();
        setStats({
          totalEarnings: (rawStats.totalRewardsCents || 0) / 100,
          successfulReferrals: rawStats.totalQualified || 0,
          pendingReferrals: rawStats.totalPending || 0,
        });

        // Fetch history
        const historyRes = await apiFetch(`${API_BASE}/api/referral/conversions`);
        if (!historyRes.ok) throw new Error("Failed to fetch referral history");
        const historyData = await historyRes.json();
        setHistory(historyData.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load referral data");
      } finally {
        setLoading(false);
      }
    };

    fetchReferralData();
  }, [API_BASE]);

  const handleCopyLink = async () => {
    if (!referralLink?.referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralLink.referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = referralLink.referralUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "24px" }}>
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
          Loading...
        </h1>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "24px" }}>
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
          Refer and Earn
        </h1>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "0.875rem",
            color: "var(--fgColor-muted)",
            margin: "8px 0 0 0",
            lineHeight: "1.375rem",
          }}
        >
          Earn ₹50 credit for every friend who signs up and makes their first payment of ₹100 or more
        </p>
        <div
          style={{
            marginTop: "24px",
            padding: "16px",
            backgroundColor: "var(--bgColor-critical)",
            border: "1px solid var(--borderColor-critical)",
            borderRadius: "4px",
            color: "var(--fgColor-critical)",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px" }}>
      {/* Section 1: Page Header */}
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
        Refer and Earn
      </h1>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "0.875rem",
          color: "var(--fgColor-muted)",
          margin: "8px 0 0 0",
          lineHeight: "1.375rem",
        }}
      >
        Earn ₹50 credit for every friend who signs up and makes their first payment of ₹100 or more
      </p>

      {/* Info Banner - Matching Home Page Welcome Banner Style */}
      <div
        style={{
          backgroundColor: "var(--bgColor-info, #cedeff)",
          border: "1px solid var(--borderColor-info, #3a73ff)",
          borderRadius: "4px",
          padding: "16px",
          marginTop: "24px",
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
            Invite friends, earn credits
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
            Share your unique referral link with friends and colleagues. When they sign up and make their first payment of ₹100 or more, you'll receive ₹50 in platform credits — usable for compute sessions, storage, and more.
          </p>
        </div>
      </div>

      {/* Section 2: Referral Link Card */}
      <div
        style={{
          marginTop: "32px",
          padding: "24px",
          backgroundColor: "var(--bgColor-mild)",
          border: "1px solid var(--borderColor-default)",
          borderRadius: "4px",
        }}
      >
        <label
          style={{
            display: "block",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-xs)",
            fontWeight: 500,
            color: "var(--fgColor-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: "8px",
          }}
        >
          Your referral link
        </label>
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            readOnly
            value={referralLink?.referralUrl || ""}
            style={{
              flex: 1,
              minWidth: "280px",
              height: "40px",
              padding: "8px 12px",
              fontFamily: "'Suisse Intl Mono', monospace",
              fontSize: "0.875rem",
              color: "var(--fgColor-default)",
              backgroundColor: "var(--bgColor-default)",
              border: "1px solid var(--borderColor-default)",
              borderRadius: "4px",
              outline: "none",
            }}
          />
          <button
            onClick={handleCopyLink}
            style={{
              height: "40px",
              padding: "0 24px",
              backgroundColor: copied ? "#009C00" : "var(--fgColor-default)",
              color: copied ? "#FFFFFF" : "var(--bgColor-default)",
              border: "none",
              borderRadius: "4px",
              fontFamily: "var(--font-sans)",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "background-color 0.15s ease",
            }}
            onMouseOver={(e) => {
              if (!copied) e.currentTarget.style.opacity = "0.8";
            }}
            onMouseOut={(e) => {
              if (!copied) e.currentTarget.style.opacity = "1";
            }}
          >
            {copied ? (
              <>
                <Check size={16} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={16} />
                Copy
              </>
            )}
          </button>
        </div>
        <button
          onClick={() => setShowTermsModal(true)}
          style={{
            marginTop: "12px",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-xs)",
            color: "var(--fgColor-muted)",
            background: "none",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
            padding: 0,
          }}
        >
          Terms and conditions apply
        </button>
      </div>

      {/* Section 3: How It Works */}
      <div
        style={{
          marginTop: "48px",
          backgroundColor: "var(--bgColor-mild)",
          border: "1px solid var(--borderColor-default)",
          borderRadius: "4px",
          padding: "24px",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-base)",
            fontWeight: 600,
            color: "var(--fgColor-default)",
            margin: "0 0 24px 0",
          }}
        >
          How It Works
        </h2>
        <div
          style={{
            display: "flex",
            gap: "0",
            flexWrap: "wrap",
          }}
        >
          {[
            {
              icon: <Link2 size={24} />,
              title: "Share your link",
              description: "Send your unique referral link to friends",
              step: 1,
            },
            {
              icon: <UserPlus size={24} />,
              title: "Friend signs up",
              description: "They create an account using any signup method",
              step: 2,
            },
            {
              icon: <IndianRupee size={24} />,
              title: "You earn ₹50",
              description: "Once they make their first payment of ₹100+",
              step: 3,
            },
          ].map((item, index) => (
            <div
              key={item.step}
              style={{
                display: "flex",
                flex: 1,
                minWidth: "200px",
                gap: "16px",
                padding: index > 0 ? "0 0 0 24px" : "0",
                borderLeft: index > 0 ? "1px solid var(--borderColor-default)" : "none",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "var(--bgColor-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--fgColor-default)",
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-sm)",
                    fontWeight: 600,
                    color: "var(--fgColor-default)",
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-xs)",
                    color: "var(--fgColor-muted)",
                    marginTop: "4px",
                  }}
                >
                  {item.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Stats Summary Cards */}
      <div
        style={{
          marginTop: "48px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
        }}
      >
        {[
          {
            label: "Total Earnings",
            value: formatRs(stats?.totalEarnings || 0),
            icon: <Wallet size={20} />,
            highlight: true,
          },
          {
            label: "Successful Referrals",
            value: stats?.successfulReferrals || 0,
            icon: <Users size={20} />,
            highlight: false,
          },
          {
            label: "Pending",
            value: stats?.pendingReferrals || 0,
            icon: <Clock size={20} />,
            highlight: false,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: "24px",
              backgroundColor: stat.highlight ? "var(--bgColor-info, #cedeff)" : "var(--bgColor-mild)",
              border: stat.highlight
                ? "1px solid var(--borderColor-info, #3a73ff)"
                : "1px solid var(--borderColor-default)",
              borderRadius: "4px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: stat.highlight ? "var(--fgColor-info, #3a73ff)" : "var(--fgColor-muted)",
                marginBottom: "12px",
              }}
            >
              {stat.icon}
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-xs)",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {stat.label}
              </span>
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-lg)",
                fontWeight: 600,
                color: "var(--fgColor-default)",
              }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Section 5: Referral History */}
      <div
        style={{
          marginTop: "48px",
          backgroundColor: "var(--bgColor-mild)",
          border: "1px solid var(--borderColor-default)",
          borderRadius: "4px",
          padding: "24px",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-base)",
            fontWeight: 600,
            color: "var(--fgColor-default)",
            margin: "0 0 16px 0",
            paddingBottom: "12px",
            borderBottom: "2px solid var(--fgColor-default)",
            display: "inline-block",
          }}
        >
          Referral History
        </h2>

        {history.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: "var(--fgColor-muted)",
            }}
          >
            <Users size={48} style={{ margin: "0 auto 16px", opacity: 0.5 }} />
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                margin: 0,
              }}
            >
              No referrals yet. Share your link to start earning!
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
              }}
            >
              <thead>
                <tr>
                  {["Referred User", "Status", "Signup Date", "Payment", "Reward"].map((header) => (
                    <th
                      key={header}
                      style={{
                        textAlign: "left",
                        padding: "12px 8px",
                        fontSize: "var(--text-xs)",
                        fontWeight: 400,
                        color: "var(--fgColor-muted)",
                        borderBottom: "1px solid var(--borderColor-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td
                      style={{
                        padding: "16px 8px",
                        borderBottom: "1px solid var(--borderColor-muted)",
                        color: "var(--fgColor-default)",
                      }}
                    >
                      {maskEmail(item.referredUserEmail)}
                    </td>
                    <td
                      style={{
                        padding: "16px 8px",
                        borderBottom: "1px solid var(--borderColor-muted)",
                      }}
                    >
                      <StatusBadge status={item.status} rewardStatus={item.rewardStatus} />
                    </td>
                    <td
                      style={{
                        padding: "16px 8px",
                        borderBottom: "1px solid var(--borderColor-muted)",
                        color: "var(--fgColor-muted)",
                      }}
                    >
                      {formatDate(item.signupCompletedAt)}
                    </td>
                    <td
                      style={{
                        padding: "16px 8px",
                        borderBottom: "1px solid var(--borderColor-muted)",
                        color: "var(--fgColor-default)",
                      }}
                    >
                      {item.firstPaymentAmountCents ? formatRs(item.firstPaymentAmountCents / 100) : "—"}
                    </td>
                    <td
                      style={{
                        padding: "16px 8px",
                        borderBottom: "1px solid var(--borderColor-muted)",
                        color: "var(--fgColor-default)",
                        fontWeight: item.rewardStatus === "CREDITED" ? 500 : 400,
                      }}
                    >
                      {item.rewardStatus === "CREDITED" ? formatRs((item.rewardAmountCents || 0) / 100) : "Pending"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTermsModal(false);
          }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bgColor-mild)",
              border: "1px solid var(--borderColor-default)",
              borderRadius: "4px",
              width: "100%",
              maxWidth: "560px",
              margin: "16px",
              padding: "32px",
              position: "relative",
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setShowTermsModal(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "transparent",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                color: "var(--fgColor-muted)",
              }}
              aria-label="Close"
            >
              <X size={20} />
            </button>

            {/* Title */}
            <h2
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-base)",
                fontWeight: 600,
                color: "var(--fgColor-default)",
                margin: "0 0 24px 0",
              }}
            >
              Referral Program Terms
            </h2>

            {/* Terms list */}
            <ol
              style={{
                margin: 0,
                paddingLeft: "20px",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--fgColor-muted)",
                lineHeight: "1.5",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <li style={{ paddingLeft: "4px" }}>
                <span style={{ color: "var(--fgColor-default)" }}>1.</span> Earn ₹50 in platform credits for each friend who signs up using your referral link and completes their first payment of ₹100 or more.
              </li>
              <li style={{ paddingLeft: "4px" }}>
                <span style={{ color: "var(--fgColor-default)" }}>2.</span> Credits are applied directly to your wallet and can be used for compute sessions, storage, and all platform services.
              </li>
              <li style={{ paddingLeft: "4px" }}>
                <span style={{ color: "var(--fgColor-default)" }}>3.</span> There is no limit to the number of friends you can refer — the more you share, the more you earn.
              </li>
              <li style={{ paddingLeft: "4px" }}>
                <span style={{ color: "var(--fgColor-default)" }}>4.</span> The referred user must be a new account holder. Self-referrals and duplicate accounts are not eligible.
              </li>
              <li style={{ paddingLeft: "4px" }}>
                <span style={{ color: "var(--fgColor-default)" }}>5.</span> Rewards are credited automatically once the qualifying payment is verified. Processing may take a few minutes.
              </li>
              <li style={{ paddingLeft: "4px" }}>
                <span style={{ color: "var(--fgColor-default)" }}>6.</span> LaaS Academy reserves the right to modify or discontinue the referral program at any time. Earned credits remain valid.
              </li>
            </ol>

            {/* Footer note */}
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-xs)",
                color: "var(--fgColor-muted)",
                margin: "24px 0 0 0",
                paddingTop: "16px",
                borderTop: "1px solid var(--borderColor-default)",
              }}
            >
              Questions? Reach out via the Support section.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
