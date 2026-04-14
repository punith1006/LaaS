"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import type { User } from "@/types/auth";
import { submitWaitlist, type WaitlistFormData } from "@/lib/api";
import { PolicyCheckbox } from "@/components/auth/policy-checkbox";
import { PolicyModal } from "@/components/auth/policy-modal";
import type { PolicySlug } from "@/config/policies";

// ─── Globals ─────────────────────────────────────────────────────────────────
const ACCENT = "#4f6ef7";
const ACCENT_DARK = "#3a56d4";
const ACCENT_GLOW = "rgba(79,110,247,0.18)";

interface WaitlistPageProps {
  user: User;
}

// ─── FAQ Component ───────────────────────────────────────────────────────────
function FAQ({ q, a, isOpen, onToggle }: { q: string; a: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div style={{ borderBottom: "1px solid var(--borderColor-default)", overflow: "hidden" }}>
      <button onClick={onToggle}
        style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "18px 0", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.95rem", fontWeight: 500, color: "var(--fgColor-default)" }}>{q}</span>
        <span style={{ color: "var(--fgColor-muted)", fontSize: "1.2rem", transform: isOpen ? "rotate(45deg)" : "rotate(0)", transition: "transform 0.2s ease", flexShrink: 0 }}>+</span>
      </button>
      <div style={{ maxHeight: isOpen ? 300 : 0, overflow: "hidden", transition: "max-height 0.3s ease" }}>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", lineHeight: 1.7, color: "var(--fgColor-muted)", margin: "0 0 18px" }}>{a}</p>
      </div>
    </div>
  );
}

// ─── FAQ Data ────────────────────────────────────────────────────────────────
const faqs = [
  { q: "How do I launch my first session on LaaS?", a: "Sign up with your university email or Google account, top up your wallet, pick a compute tier that fits your workload, and click Launch. Within seconds a fully configured desktop or notebook environment is live in your browser — no drivers, no local installation required." },
  { q: "How does GPU sharing work — can I really get my own VRAM slice?", a: "Yes. Each session is allocated a guaranteed, isolated slice of GPU memory. Your workload — whether PyTorch, TensorFlow, or any GPU-accelerated application — sees only the VRAM assigned to you and operates completely independently from other users on the same node." },
  { q: "What is a Stateful Desktop session?", a: "A Stateful Desktop is a full-featured remote Linux desktop streamed directly to your browser — no downloads or plugins needed. All your files, installed packages, and project work are automatically saved to your personal storage and restored on every future session, just like picking up where you left off on your own machine." },
  { q: "What is an Ephemeral session and who should use it?", a: "Ephemeral sessions provide a lightweight, browser-based compute environment (Jupyter Notebook, VS Code, or SSH) for temporary workloads. Compute data is cleared when the session ends, but your saved files remain intact. This mode is ideal for quick experiments, inference jobs, or users accessing the platform without university affiliation." },
  { q: "How is my data isolated from other users?", a: "Your personal storage is provisioned with a hard quota and is inaccessible to any other user. Each session runs inside a fully isolated compute environment — GPU memory, CPU, RAM, and storage are all enforced at a system level to guarantee complete separation between concurrent users." },
  { q: "Can I use MATLAB, Blender, or PyTorch without any setup?", a: "It depends on the template you select. If a pre-configured template with these tools is available, you're ready to go instantly. Alternatively, you can launch a fresh instance and fully customize it with any software you need, no restrictions." },
  { q: "How does billing work?", a: "LaaS uses a wallet-based credit system with per-hour billing charge cycles. Active sessions burn credits at the configured compute rate. Paused sessions only incur minimal storage fees. You can set spend limits and view a real-time daily spend chart on your dashboard." },
  { q: "What happens when a session is idle?", a: "Sessions that exceed a configurable idle threshold are automatically terminated to conserve resources. Files saved to your persistent storage are always preserved regardless of session termination status." },
  { q: "What happens when I end or delete a session?", a: "When a session ends, the temporary compute environment is permanently torn down — any in-session system changes are discarded. However, all files in your personal storage are always preserved. Compute charges stop immediately; any applicable storage fees continue based on your subscription." },
  { q: "What happens if my browser disconnects mid-session?", a: "Your session keeps running on the platform until the booked time expires. Simply reopen the LaaS portal and reconnect — your desktop or notebook resumes exactly where you left off. You will also receive advance warnings before any scheduled session expiry." },
  { q: "What is the refund policy?", a: "Credits consumed by active sessions are non-refundable. If you believe a deduction occurred due to a platform-side issue, contact us at project@gktech.ai with your session details and we will review it within 2 business days. Unused wallet balance refund requests from institutions are considered on a case-by-case basis." },
];

// ─── Form Options ────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  "Student",
  "Working Professional",
  "Freelancer / Independent",
  "Researcher / Academic",
  "Not Currently Employed",
];

const COMPUTE_OPTIONS = [
  { value: "1 GPU", label: "1 GPU", desc: "Entry-level workloads" },
  { value: "2-4 GPUs", label: "2–4 GPUs", desc: "Medium-scale training" },
  { value: "5-8 GPUs", label: "5–8 GPUs", desc: "Large-scale experiments" },
  { value: "8+ GPUs", label: "8+ GPUs", desc: "Enterprise workloads" },
];

const DURATION_OPTIONS = [
  "Less than a week",
  "1–4 weeks",
  "1–3 months",
  "3–6 months",
  "6+ months",
];

const URGENCY_OPTIONS = [
  "Immediately",
  "Within 2 weeks",
  "Within a month",
  "Within 3 months",
  "Just exploring for now",
];

const EXPECTATION_OPTIONS = [
  "Explore & Learn",
  "Research & Development",
  "Production Workloads",
  "Cost Savings vs Cloud",
  "Academic Projects",
  "Revenue & Monetization",
];

const WORKLOAD_OPTIONS = [
  "Model Training",
  "Inference & Deployment",
  "Data Processing",
  "Development & IDE",
  "Desktop Computing",
  "Other",
];

// ─── Main Component ──────────────────────────────────────────────────────────
export function WaitlistPage({ user }: WaitlistPageProps) {
  const [formData, setFormData] = useState<WaitlistFormData>({
    currentStatus: "",
    organizationName: "",
    jobTitle: "",
    computeNeeds: "",
    expectedDuration: "",
    urgency: "",
    expectations: [],
    primaryWorkload: "",
    workloadDescription: "",
    agreedToPolicy: false,
    agreedToComms: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policyModalSlug, setPolicyModalSlug] = useState<PolicySlug | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const isStudent = formData.currentStatus === "Student";
  const organizationLabel = isStudent ? "Institution Name" : "Company / Organization";

  // Word count for workload description
  const getWordCount = (text: string) => {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  };
  const wordCount = getWordCount(formData.workloadDescription || "");

  // Toggle expectation chip
  const toggleExpectation = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      expectations: prev.expectations.includes(value)
        ? prev.expectations.filter((e) => e !== value)
        : [...prev.expectations, value],
    }));
  };

  // Validate form
  const isValid =
    formData.currentStatus &&
    formData.computeNeeds &&
    formData.expectedDuration &&
    formData.urgency &&
    formData.expectations.length > 0 &&
    formData.primaryWorkload &&
    formData.agreedToPolicy;

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    setError(null);

    try {
      await submitWaitlist(formData);
      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Submission failed";
      if (message.includes("409") || message.toLowerCase().includes("already")) {
        setError("You've already joined the waitlist!");
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle policy checkbox click
  const handlePolicyCheckedChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, agreedToPolicy: checked }));
    if (checked) setPolicyError(null);
  };

  // Success view
  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bgColor-default)", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>
        <style>{`
          @keyframes scaleIn {
            from { transform: scale(0.8); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div style={{ textAlign: "center", maxWidth: 480, animation: "fadeUp 0.5s ease" }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${ACCENT}, #8b5cf6)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 32px",
            animation: "scaleIn 0.4s ease",
            boxShadow: `0 8px 32px ${ACCENT_GLOW}`,
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 style={{ fontFamily: "var(--font-sans)", fontSize: "2.2rem", fontWeight: 800, color: "var(--fgColor-default)", marginBottom: 16, letterSpacing: "-0.02em" }}>
            You&apos;re on the list!
          </h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "1.1rem", color: "var(--fgColor-muted)", marginBottom: 32, lineHeight: 1.6 }}>
            Thanks for your interest, {user.firstName || "there"}! We&apos;re reviewing applications and will reach out when your access is ready.
          </p>
          <Link href="/" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "14px 28px",
            background: ACCENT,
            color: "#fff",
            fontFamily: "var(--font-sans)",
            fontSize: "1rem",
            fontWeight: 600,
            borderRadius: 10,
            textDecoration: "none",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = ACCENT_DARK; e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = ACCENT; e.currentTarget.style.transform = "translateY(0)"; }}>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bgColor-default)" }}>
      <style>{`
        .waitlist-input:focus {
          border-color: ${ACCENT} !important;
          outline: none;
          box-shadow: 0 0 0 3px ${ACCENT_GLOW};
        }
        .waitlist-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          padding-right: 40px;
        }
        .waitlist-select:focus {
          border-color: ${ACCENT} !important;
          outline: none;
          box-shadow: 0 0 0 3px ${ACCENT_GLOW};
        }
        @media (max-width: 768px) {
          .waitlist-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── HERO ── */}
      <section style={{
        background: "linear-gradient(180deg, var(--bgColor-default) 0%, var(--bgColor-mild) 100%)",
        padding: "80px 24px 48px",
        textAlign: "center",
        borderBottom: "1px solid var(--borderColor-default)",
      }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            background: "var(--bgColor-muted)",
            border: `1px solid ${ACCENT}`,
            borderRadius: 9999,
            marginBottom: 20,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: ACCENT }}>
              Early Access
            </span>
          </div>
          <h1 style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, color: "var(--fgColor-default)", letterSpacing: "-0.02em", marginBottom: 16, lineHeight: 1.2 }}>
            Secure Your Spot in the Future of GPU Computing
          </h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "1rem", color: "var(--fgColor-muted)", maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>
            Be among the first to experience dedicated GPU workstations for research, training, and development. Tell us about your needs and we&apos;ll prioritize your access.
          </p>
        </div>
      </section>

      {/* ── FORM ── */}
      <section style={{ padding: "48px 24px" }}>
        <form onSubmit={handleSubmit} style={{ maxWidth: 800, margin: "0 auto" }}>
          {/* Pre-filled User Info */}
          <div style={{
            background: "var(--bgColor-mild)",
            border: "1px solid var(--borderColor-default)",
            borderRadius: 12,
            padding: "24px",
            marginBottom: 32,
          }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: ACCENT, marginBottom: 16 }}>
              Your Information
            </div>
            <div className="waitlist-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 500, color: "var(--fgColor-muted)", marginBottom: 6 }}>First Name</label>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--bgColor-muted)",
                  border: "1px solid var(--borderColor-default)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  opacity: 0.7,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fgColor-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.9rem", color: "var(--fgColor-default)" }}>{user.firstName || "N/A"}</span>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 500, color: "var(--fgColor-muted)", marginBottom: 6 }}>Last Name</label>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--bgColor-muted)",
                  border: "1px solid var(--borderColor-default)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  opacity: 0.7,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fgColor-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.9rem", color: "var(--fgColor-default)" }}>{user.lastName || "N/A"}</span>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 500, color: "var(--fgColor-muted)", marginBottom: 6 }}>Email</label>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--bgColor-muted)",
                  border: "1px solid var(--borderColor-default)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  opacity: 0.7,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fgColor-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.9rem", color: "var(--fgColor-default)" }}>{user.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="waitlist-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>

            {/* Current Status */}
            <div>
              <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 500, color: "var(--fgColor-default)", marginBottom: 8 }}>
                I am a... <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={formData.currentStatus}
                onChange={(e) => setFormData((prev) => ({ ...prev, currentStatus: e.target.value }))}
                className="waitlist-select waitlist-input"
                style={{
                  width: "100%",
                  background: "var(--bgColor-muted)",
                  border: "1px solid var(--borderColor-default)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.9rem",
                  color: "var(--fgColor-default)",
                  cursor: "pointer",
                }}
                required
              >
                <option value="">Select your status</option>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Organization */}
            <div>
              <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 500, color: "var(--fgColor-default)", marginBottom: 8 }}>
                {organizationLabel} <span style={{ color: "var(--fgColor-muted)", fontWeight: 400 }}>(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.organizationName || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, organizationName: e.target.value }))}
                placeholder={isStudent ? "e.g., KSR College of Engineering" : "e.g., Acme Corp"}
                className="waitlist-input"
                style={{
                  width: "100%",
                  background: "var(--bgColor-muted)",
                  border: "1px solid var(--borderColor-default)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.9rem",
                  color: "var(--fgColor-default)",
                }}
              />
            </div>

            {/* Job Title */}
            <div>
              <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 500, color: "var(--fgColor-default)", marginBottom: 8 }}>
                Role / Designation <span style={{ color: "var(--fgColor-muted)", fontWeight: 400 }}>(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.jobTitle || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, jobTitle: e.target.value }))}
                placeholder="e.g., ML Engineer, Data Scientist, Student"
                className="waitlist-input"
                style={{
                  width: "100%",
                  background: "var(--bgColor-muted)",
                  border: "1px solid var(--borderColor-default)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.9rem",
                  color: "var(--fgColor-default)",
                }}
              />
            </div>

            {/* Expected Duration */}
            <div>
              <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 500, color: "var(--fgColor-default)", marginBottom: 8 }}>
                Expected workload duration <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={formData.expectedDuration}
                onChange={(e) => setFormData((prev) => ({ ...prev, expectedDuration: e.target.value }))}
                className="waitlist-select waitlist-input"
                style={{
                  width: "100%",
                  background: "var(--bgColor-muted)",
                  border: "1px solid var(--borderColor-default)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.9rem",
                  color: "var(--fgColor-default)",
                  cursor: "pointer",
                }}
                required
              >
                <option value="">Select duration</option>
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Urgency */}
            <div>
              <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 500, color: "var(--fgColor-default)", marginBottom: 8 }}>
                How soon do you need access? <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={formData.urgency}
                onChange={(e) => setFormData((prev) => ({ ...prev, urgency: e.target.value }))}
                className="waitlist-select waitlist-input"
                style={{
                  width: "100%",
                  background: "var(--bgColor-muted)",
                  border: "1px solid var(--borderColor-default)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.9rem",
                  color: "var(--fgColor-default)",
                  cursor: "pointer",
                }}
                required
              >
                <option value="">Select urgency</option>
                {URGENCY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Primary Workload */}
            <div>
              <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 500, color: "var(--fgColor-default)", marginBottom: 8 }}>
                Primary workload type <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={formData.primaryWorkload}
                onChange={(e) => setFormData((prev) => ({ ...prev, primaryWorkload: e.target.value }))}
                className="waitlist-select waitlist-input"
                style={{
                  width: "100%",
                  background: "var(--bgColor-muted)",
                  border: "1px solid var(--borderColor-default)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.9rem",
                  color: "var(--fgColor-default)",
                  cursor: "pointer",
                }}
                required
              >
                <option value="">Select workload type</option>
                {WORKLOAD_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Compute Needs - Radio Cards */}
          <div style={{ marginBottom: 32 }}>
            <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 500, color: "var(--fgColor-default)", marginBottom: 12 }}>
              How much compute do you need? <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {COMPUTE_OPTIONS.map((opt) => {
                const isSelected = formData.computeNeeds === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, computeNeeds: opt.value }))}
                    style={{
                      background: isSelected ? `${ACCENT}15` : "var(--bgColor-muted)",
                      border: isSelected ? `2px solid ${ACCENT}` : "2px solid var(--borderColor-default)",
                      borderRadius: 12,
                      padding: "16px 12px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: "1.1rem", fontWeight: 700, color: isSelected ? ACCENT : "var(--fgColor-default)", marginBottom: 4 }}>
                      {opt.label}
                    </div>
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", color: "var(--fgColor-muted)" }}>
                      {opt.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expectations - Multi-select Chips */}
          <div style={{ marginBottom: 32 }}>
            <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 500, color: "var(--fgColor-default)", marginBottom: 12 }}>
              What excites you most about LaaS? <span style={{ color: "#ef4444" }}>* (select at least 1)</span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {EXPECTATION_OPTIONS.map((opt) => {
                const isSelected = formData.expectations.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleExpectation(opt)}
                    style={{
                      background: isSelected ? ACCENT : "var(--bgColor-muted)",
                      border: isSelected ? `1px solid ${ACCENT}` : "1px solid var(--borderColor-default)",
                      borderRadius: 9999,
                      padding: "8px 18px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      fontFamily: "var(--font-sans)",
                      fontSize: "0.85rem",
                      fontWeight: isSelected ? 600 : 500,
                      color: isSelected ? "#fff" : "var(--fgColor-default)",
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Workload Description */}
          <div style={{ marginBottom: 32 }}>
            <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 500, color: "var(--fgColor-default)", marginBottom: 8 }}>
              Describe your workload <span style={{ color: "var(--fgColor-muted)", fontWeight: 400 }}>(Optional)</span>
            </label>
            <textarea
              ref={descriptionRef}
              value={formData.workloadDescription || ""}
              onChange={(e) => {
                const text = e.target.value;
                const words = getWordCount(text);
                if (words <= 500) {
                  setFormData((prev) => ({ ...prev, workloadDescription: text }));
                }
              }}
              placeholder="Tell us about what you'd love to build, train, or explore with dedicated GPU access. The more detail, the better we can tailor your experience! (Optional)"
              rows={5}
              className="waitlist-input"
              style={{
                width: "100%",
                background: "var(--bgColor-muted)",
                border: "1px solid var(--borderColor-default)",
                borderRadius: 8,
                padding: "14px",
                fontFamily: "var(--font-sans)",
                fontSize: "0.9rem",
                color: "var(--fgColor-default)",
                resize: "vertical",
                lineHeight: 1.6,
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", color: wordCount >= 450 ? "#f59e0b" : "var(--fgColor-muted)" }}>
                {wordCount}/500 words
              </span>
            </div>
          </div>

          {/* Policy & Disclaimer */}
          <div style={{
            background: "var(--bgColor-mild)",
            border: "1px solid var(--borderColor-default)",
            borderRadius: 12,
            padding: "24px",
            marginBottom: 32,
          }}>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.85rem", color: "var(--fgColor-muted)", marginBottom: 20, lineHeight: 1.6 }}>
              By submitting, you consent to allow LaaS to store and process the information above to evaluate your access request and improve our services. Review our{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); setPolicyModalSlug("acceptable_use"); }} style={{ color: ACCENT, textDecoration: "underline" }}>
                Acceptable Use Policy
              </a>{" "}
              for details.
            </p>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <input
                type="checkbox"
                id="agreedToPolicy"
                checked={formData.agreedToPolicy}
                onChange={(e) => { setFormData((prev) => ({ ...prev, agreedToPolicy: e.target.checked })); if (e.target.checked) setPolicyError(null); }}
                style={{ marginTop: 3, accentColor: ACCENT, width: 16, height: 16, cursor: "pointer" }}
              />
              <label htmlFor="agreedToPolicy" style={{ fontFamily: "var(--font-sans)", fontSize: "0.85rem", color: "var(--fgColor-muted)", cursor: "pointer", lineHeight: 1.5 }}>
                I agree with{" "}
                <a href="#" onClick={(e) => { e.preventDefault(); setPolicyModalSlug("acceptable_use"); }} style={{ color: ACCENT, textDecoration: "underline", fontWeight: 600 }}>
                  LaaS&apos;s Policy
                </a>
              </label>
            </div>

            {/* Comms checkbox */}
            <div style={{ marginTop: 16, display: "flex", alignItems: "flex-start", gap: 10 }}>
              <input
                type="checkbox"
                id="agreedToComms"
                checked={formData.agreedToComms}
                onChange={(e) => setFormData((prev) => ({ ...prev, agreedToComms: e.target.checked }))}
                style={{ marginTop: 3, accentColor: ACCENT, width: 16, height: 16, cursor: "pointer" }}
              />
              <label htmlFor="agreedToComms" style={{ fontFamily: "var(--font-sans)", fontSize: "0.85rem", color: "var(--fgColor-muted)", cursor: "pointer", lineHeight: 1.5 }}>
                I&apos;d like to receive updates about LaaS, including early access notifications and product news
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: 8,
              padding: "14px 18px",
              marginBottom: 24,
            }}>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.9rem", color: "#ef4444", margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isValid || submitting}
            style={{
              width: "100%",
              background: isValid && !submitting ? ACCENT : "var(--bgColor-muted)",
              color: isValid && !submitting ? "#fff" : "var(--fgColor-muted)",
              fontFamily: "var(--font-sans)",
              fontSize: "1rem",
              fontWeight: 700,
              padding: "16px 24px",
              borderRadius: 10,
              border: "none",
              cursor: isValid && !submitting ? "pointer" : "not-allowed",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              boxShadow: isValid && !submitting ? `0 8px 24px ${ACCENT_GLOW}` : "none",
            }}
          >
            {submitting ? (
              <>
                <svg style={{ animation: "spin 1s linear infinite", width: 20, height: 20 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                </svg>
                Submitting...
              </>
            ) : (
              <>
                Join the Waitlist
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>

          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </form>
      </section>

      {/* Policy Modal */}
      {policyModalSlug && (
        <PolicyModal
          slug={policyModalSlug}
          open={!!policyModalSlug}
          onOpenChange={(open) => !open && setPolicyModalSlug(null)}
          onConfirm={() => {
            setFormData((prev) => ({ ...prev, agreedToPolicy: true }));
            setPolicyError(null);
            setPolicyModalSlug(null);
          }}
        />
      )}

      {/* ── FAQ ── */}
      <section id="faq" style={{ borderTop: "1px solid var(--borderColor-default)", padding: "80px 48px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>FAQ</div>
            <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, color: "var(--fgColor-default)", letterSpacing: "-0.02em", marginBottom: 14 }}>
              Frequently Asked Questions
            </h2>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.95rem", color: "var(--fgColor-muted)" }}>
              Can&apos;t find what you&apos;re looking for? Reach us at{" "}
              <a href="mailto:project@gktech.ai" style={{ color: ACCENT, textDecoration: "underline", fontWeight: 600 }}>project@gktech.ai</a>.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))", gap: "0 48px", alignItems: "start" }}>
            <div>{faqs.slice(0, 5).map((f, i) => (
              <FAQ key={i} {...f} isOpen={openFaqIndex === i} onToggle={() => setOpenFaqIndex(openFaqIndex === i ? null : i)} />
            ))}</div>
            <div>{faqs.slice(5).map((f, i) => (
              <FAQ key={i + 5} {...f} isOpen={openFaqIndex === i + 5} onToggle={() => setOpenFaqIndex(openFaqIndex === i + 5 ? null : i + 5)} />
            ))}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
