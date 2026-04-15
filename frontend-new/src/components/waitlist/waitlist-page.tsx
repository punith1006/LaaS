"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@/types/auth";
import { submitWaitlist, getMe, type WaitlistFormData, analyzeWaitlistWorkload, checkWaitlistStatus, type WaitlistEntry, getWaitlistCount } from "@/lib/api";
import { getAccessToken } from "@/lib/token";
import { PolicyCheckbox } from "@/components/auth/policy-checkbox";
import { PolicyModal } from "@/components/auth/policy-modal";
import type { PolicySlug } from "@/config/policies";

// ─── Keycloak env vars ───────────────────────────────────────────────────────
const KC_URL = process.env.NEXT_PUBLIC_KEYCLOAK_URL;
const KC_REALM = process.env.NEXT_PUBLIC_KEYCLOAK_REALM;
const KC_CLIENT_ID = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID;

function buildOAuthUrl(provider: "google" | "github"): string {
  if (typeof window === "undefined") return "/waitlist";
  const callbackUrl = `${window.location.origin}/callback`;
  if (KC_URL && KC_REALM && KC_CLIENT_ID) {
    const params = new URLSearchParams({
      client_id: KC_CLIENT_ID,
      redirect_uri: callbackUrl,
      response_type: "code",
      scope: "openid email profile",
      kc_idp_hint: provider,
      prompt: "login",
    });
    params.append("_", Date.now().toString());
    return `${KC_URL}/realms/${KC_REALM}/protocol/openid-connect/auth?${params.toString()}`;
  }
  return "/waitlist";
}

// ─── Globals ─────────────────────────────────────────────────────────────────
const ACCENT = "#4f6ef7";
const ACCENT_DARK = "#3a56d4";
const ACCENT_GLOW = "rgba(79,110,247,0.18)";

interface WaitlistPageProps {
  user: User | null;
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
  { q: "What is the refund policy?", a: "Credits consumed by active sessions are non-refundable. If you believe a deduction occurred due to a platform-side issue, contact us at ksrcesupport@gktech.ai with your session details and we will review it within 2 business days. Unused wallet balance refund requests from institutions are considered on a case-by-case basis." },
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
  { value: "2 GB VRAM", label: "2 GB VRAM", desc: "Notebooks, light inference" },
  { value: "4-8 GB VRAM", label: "4–8 GB VRAM", desc: "Model training, fine-tuning" },
  { value: "16+ GB VRAM", label: "16+ GB VRAM", desc: "Large models, production workloads" },
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
  const router = useRouter();
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(user);
  const [formStep, setFormStep] = useState<1 | 2>(1);

  // ─── Mobile responsive hook ───────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Manual fields for unauthenticated mode
  const [manualFirstName, setManualFirstName] = useState('');
  const [manualLastName, setManualLastName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  // Post-OAuth re-hydration: if user just returned from OAuth, fetch their profile
  // Also check if user is already enrolled in waitlist
  useEffect(() => {
    const checkUserAndStatus = async () => {
      const token = getAccessToken();
      if (!token) return;

      let user = authenticatedUser;
      
      // Fetch user if not already available
      if (!user) {
        const me = await getMe();
        if (me) {
          setAuthenticatedUser(me);
          user = me;
        }
      }

      // Check waitlist enrollment status
      if (user) {
        setCheckingStatus(true);
        try {
          const status = await checkWaitlistStatus();
          if (status.enrolled && status.entry) {
            setAlreadyEnrolled(true);
            setWaitlistEntry(status.entry);
            setWaitlistPosition(status.position ?? null);
          }
        } catch {
          // Silently fail - will show normal form
        } finally {
          setCheckingStatus(false);
        }
      }
    };

    checkUserAndStatus();
  }, []);

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

  // Already enrolled state
  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false);
  const [waitlistEntry, setWaitlistEntry] = useState<WaitlistEntry | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // ─── sessionStorage: restore ack view for unauthenticated users after reload ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = sessionStorage.getItem('waitlist_just_submitted');
    if (stored) {
      sessionStorage.removeItem('waitlist_just_submitted'); // consume once
      try {
        const data = JSON.parse(stored) as {
          entry: WaitlistEntry;
          position: number | null;
          totalCount: number | null;
        };
        setWaitlistEntry(data.entry);
        setWaitlistPosition(data.position ?? null);
        setAlreadyEnrolled(true);
      } catch {
        // Corrupted storage — ignore and show normal form
      }
    }
  }, []);
  
  // AI Analysis state
  const [analysisState, setAnalysisState] = useState<'idle' | 'analyzing' | 'success' | 'failure'>('idle');
  const [analysisData, setAnalysisData] = useState<{
    detectedGoal?: string;
    estimatedVramNeedGb?: number;
    estimatedComputeIntensity?: string;
    detectedFrameworks?: string[];
    keyInsights?: string[];
    suggestions?: string;
    [key: string]: unknown;
  } | null>(null);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());

  const isStudent = formData.currentStatus === "Student";
  const organizationLabel = isStudent ? "Institution Name" : "Company / Organization";

  // Derived display name for enrolled users with fallback for authenticated users
  // (authenticated waitlist submission doesn't include firstName in payload)
  const enrolledDisplayName =
    waitlistEntry?.firstName?.trim() ||
    authenticatedUser?.firstName?.trim() ||
    "there";

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

  // Email format validator
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // AI Analysis handler
  const handleAnalyzeWorkload = async () => {
    if (!formData.workloadDescription) return;
    const wordCount = formData.workloadDescription.trim().split(/\s+/).length;
    if (wordCount < 10) return;

    setAnalysisState('analyzing');
    setError(null);

    try {
      const result = await analyzeWaitlistWorkload(formData.workloadDescription);
      setAnalysisData(result);

      if (result.inputQuality === 'sufficient') {
        // Map AI results to form fields
        const goalMap: Record<string, string> = {
          ml_training: 'Model Training',
          inference: 'Inference & Deployment',
          data_science: 'Data Processing',
          rendering: 'Desktop Computing',
          general_dev: 'Development & IDE',
          research: 'Other',
        };

        const intensityToDuration: Record<string, string> = {
          low: 'Less than a week',
          medium: '1–4 weeks',
          high: '1–3 months',
          very_high: '3–6 months',
        };

        const vramToCompute = (vram: number): string => {
          if (vram <= 2) return '2 GB VRAM';
          if (vram <= 8) return '4-8 GB VRAM';
          return '16+ GB VRAM';
        };

        const newAutoFilled = new Set<string>();
        const updates: Partial<typeof formData> = {};

        if (result.detectedGoal && goalMap[result.detectedGoal]) {
          updates.primaryWorkload = goalMap[result.detectedGoal];
          newAutoFilled.add('primaryWorkload');
        }
        if (result.estimatedComputeIntensity && intensityToDuration[result.estimatedComputeIntensity]) {
          updates.expectedDuration = intensityToDuration[result.estimatedComputeIntensity];
          newAutoFilled.add('expectedDuration');
        }
        if (result.estimatedVramNeedGb !== undefined) {
          updates.computeNeeds = vramToCompute(result.estimatedVramNeedGb);
          newAutoFilled.add('computeNeeds');
        }

        setFormData(prev => ({ ...prev, ...updates }));
        setAutoFilledFields(newAutoFilled);
        setAnalysisState('success');
      } else {
        setAnalysisState('failure');
      }
    } catch (err: unknown) {
      setAnalysisState('failure');
      setAnalysisData({ suggestions: (err instanceof Error ? err.message : null) || 'Analysis failed. Please try again.' });
    }
  };

  // Validate Step 1 (can proceed to Step 2)
  const canProceedToStep2 =
    formData.currentStatus &&
    // For unauthenticated users, firstName + valid email are required
    (authenticatedUser
      ? true
      : manualFirstName.trim() !== '' && manualEmail.trim() !== '' && emailRegex.test(manualEmail));

  // Validate form (final submission)
  const isValid =
    formData.currentStatus &&
    formData.computeNeeds &&
    formData.primaryWorkload &&
    formData.agreedToPolicy &&
    // For unauthenticated users, firstName + valid email are required
    (authenticatedUser
      ? true
      : manualFirstName.trim() !== '' && manualEmail.trim() !== '' && emailRegex.test(manualEmail));

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    // Extra validation for unauthenticated mode
    if (!authenticatedUser) {
      if (!manualFirstName.trim() || !manualEmail.trim()) {
        setError('First name and email are required.');
        return;
      }
      if (!emailRegex.test(manualEmail)) {
        setEmailError('Please enter a valid email address.');
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: WaitlistFormData = authenticatedUser
        ? formData
        : {
            ...formData,
            firstName: manualFirstName,
            lastName: manualLastName || undefined,
            email: manualEmail,
          };
      const responseData = await submitWaitlist(payload);
      setSubmitted(true);

      // For unauthenticated users, persist enough data to restore the status view
      // after the full-page reload triggered by handleViewStatus
      if (!authenticatedUser) {
        const entrySnapshot: WaitlistEntry = {
          id: responseData.id,
          firstName: manualFirstName,
          lastName: manualLastName || '',
          email: manualEmail,
          currentStatus: formData.currentStatus,
          organizationName: formData.organizationName || null,
          jobTitle: formData.jobTitle || null,
          computeNeeds: formData.computeNeeds || null,
          expectedDuration: formData.expectedDuration || null,
          urgency: formData.urgency || null,
          primaryWorkload: formData.primaryWorkload || null,
          workloadDescription: formData.workloadDescription || null,
          status: responseData.status,
          createdAt: responseData.createdAt,
        };
        let pos: number | null = null;
        let total: number | null = null;
        try {
          const count = await getWaitlistCount();
          if (count) {
            pos = count;   // user just submitted — they're last in line
            total = count;
          }
        } catch {
          // ignore — position will just be null (graceful degradation)
        }
        try {
          sessionStorage.setItem('waitlist_just_submitted', JSON.stringify({
            entry: entrySnapshot,
            position: pos,
            totalCount: total,
          }));
        } catch {
          // sessionStorage unavailable — not critical
        }
      }
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

  // Handle "View Your Status" click from success screen
  const handleViewStatus = async () => {
    if (authenticatedUser) {
      setLoadingStatus(true);
      try {
        const status = await checkWaitlistStatus();
        if (status.enrolled && status.entry) {
          setWaitlistEntry(status.entry);
          setWaitlistPosition(status.position ?? null);
          setAlreadyEnrolled(true);
          setSubmitted(false);
        } else {
          // Not enrolled (shouldn't happen after submission, but handle gracefully)
          router.push('/waitlist');
        }
      } catch {
        // On error, go to waitlist
        router.push('/waitlist');
      } finally {
        setLoadingStatus(false);
      }
    } else {
      // Unauthenticated user — reload waitlist page (router.push is a no-op on same route)
      window.location.href = '/waitlist';
    }
  };
  
  // Success view
  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bgColor-default)", display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? "32px 16px" : "48px 24px" }}>
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
            Spot Secured!
          </h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "1.1rem", color: "var(--fgColor-muted)", marginBottom: 32, lineHeight: 1.6 }}>
            Your application has been received. We&apos;re excited to have you on board.
          </p>
          <button
            onClick={handleViewStatus}
            disabled={loadingStatus}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 28px",
              background: loadingStatus ? ACCENT_DARK : ACCENT,
              color: "#fff",
              fontFamily: "var(--font-sans)",
              fontSize: "1rem",
              fontWeight: 600,
              borderRadius: 10,
              border: "none",
              cursor: loadingStatus ? "wait" : "pointer",
              transition: "all 0.2s",
              opacity: loadingStatus ? 0.8 : 1,
            }}
            onMouseEnter={(e) => { if (!loadingStatus) { e.currentTarget.style.background = ACCENT_DARK; e.currentTarget.style.transform = "translateY(-2px)"; } }}
            onMouseLeave={(e) => { if (!loadingStatus) { e.currentTarget.style.background = ACCENT; e.currentTarget.style.transform = "translateY(0)"; } }}
          >
            {loadingStatus ? (
              <>
                <svg style={{ animation: "spin 1s linear infinite", width: 18, height: 18 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                </svg>
                Loading...
              </>
            ) : (
              <>
                View Your Status
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </>
            )}
          </button>
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
        position: 'relative',
        overflow: 'hidden',
        padding: isMobile ? "48px 16px 32px" : "80px 24px 48px",
        textAlign: "center",
        borderBottom: "1px solid var(--borderColor-default)",
      }}>
        {/* Background video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        >
          <source src="/Image_Assets/waitlist-bg.MP4" type="video/mp4" />
        </video>
        {/* Dark overlay for text readability */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.75)',
          zIndex: 1,
        }} />
        <div style={{ maxWidth: 800, margin: "0 auto", position: 'relative', zIndex: 2 }}>
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
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "1rem", color: "rgba(255, 255, 255, 0.85)", maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>
            Be among the first to experience dedicated GPU workstations for research, training, and development. Tell us about your needs and we&apos;ll prioritize your access.
          </p>
        </div>
      </section>

      {/* ── ALREADY ENROLLED MESSAGE ── */}
      {alreadyEnrolled && waitlistEntry ? (
        <section style={{ padding: isMobile ? "32px 12px" : "80px 24px" }}>
          <div style={{
            maxWidth: 800,
            margin: "0 auto",
            position: "relative",
          }}>
            {/* Glow effect container */}
            <div style={{
              background: "linear-gradient(135deg, rgba(79, 110, 247, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)",
              border: "1px solid",
              borderImage: "linear-gradient(135deg, rgba(79, 110, 247, 0.3), rgba(139, 92, 246, 0.3)) 1",
              borderRadius: 20,
              padding: isMobile ? "32px 16px" : "64px 48px",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            }}>
              {/* Subtle animated glow */}
              <style>{`
                @keyframes pulseGlow {
                  0%, 100% { opacity: 0.4; }
                  50% { opacity: 0.7; }
                }
              `}</style>
              <div style={{
                position: "absolute",
                top: -100,
                right: -100,
                width: 300,
                height: 300,
                background: "radial-gradient(circle, rgba(79, 110, 247, 0.15) 0%, transparent 70%)",
                animation: "pulseGlow 4s ease-in-out infinite",
              }} />
              <div style={{
                position: "absolute",
                bottom: -100,
                left: -100,
                width: 300,
                height: 300,
                background: "radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)",
                animation: "pulseGlow 4s ease-in-out infinite",
                animationDelay: "2s",
              }} />

              {/* Content container */}
              <div style={{ position: "relative", zIndex: 1 }}>
                {/* Status badge */}
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 18px",
                  background: "rgba(34, 197, 94, 0.1)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                  borderRadius: 9999,
                  marginBottom: 28,
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#22c55e" }}>
                    You&apos;re on the List!
                  </span>
                </div>

                {/* Main heading with gradient text */}
                <h2 style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.85) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: "-0.02em",
                  marginBottom: 16,
                  lineHeight: 1.2,
                }}>
                  Your Vision is Already in Motion, {enrolledDisplayName}!
                </h2>

                {/* Subheading */}
                <p style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "1.15rem",
                  color: "rgba(255, 255, 255, 0.7)",
                  marginBottom: 32,
                  lineHeight: 1.6,
                }}>
                  We&apos;ve heard you — and we&apos;re thrilled to have you with us.
                </p>

                {/* Body text with dynamic personalization */}
                <div style={{
                  maxWidth: 640,
                  margin: "0 auto 40px",
                }}>
                  <p style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "1rem",
                    color: "rgba(255, 255, 255, 0.6)",
                    lineHeight: 1.8,
                    marginBottom: 16,
                  }}>
                    We&apos;d love to showcase our solution and have you experience the power of turning your ideas into reality — powered by our Compute Engine infrastructure.
                  </p>
                  <p style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "1rem",
                    color: "rgba(255, 255, 255, 0.6)",
                    lineHeight: 1.8,
                  }}>
                    {waitlistEntry.currentStatus && (
                      <>As a <span style={{ color: "rgba(255, 255, 255, 0.85)", fontWeight: 600 }}>{waitlistEntry.currentStatus}</span>{waitlistEntry.organizationName && <> at <span style={{ color: ACCENT, fontWeight: 600 }}>{waitlistEntry.organizationName}</span></>}, your vision matters to us.</>
                    )}
                    {!waitlistEntry.currentStatus && waitlistEntry.organizationName && (
                      <>At <span style={{ color: ACCENT, fontWeight: 600 }}>{waitlistEntry.organizationName}</span>, your vision matters to us.</>
                    )}
                    {waitlistEntry.computeNeeds && (
                      <> We know you need serious compute power ({waitlistEntry.computeNeeds}), and we&apos;re working at full throttle to get you access.</>
                    )}
                  </p>
                </div>

                {/* Stats row: spot position + enrollment date */}
                <div style={{
                  display: "flex",
                  gap: 16,
                  justifyContent: "center",
                  flexDirection: isMobile ? "column" : "row",
                  alignItems: isMobile ? "stretch" : "flex-start",
                  flexWrap: "wrap",
                  marginBottom: 40,
                }}>
                  {/* Left card: Queue position */}
                  <div style={{
                    flex: "1 1 160px",
                    maxWidth: isMobile ? "100%" : 200,
                    background: "rgba(79, 110, 247, 0.07)",
                    border: "1px solid rgba(79, 110, 247, 0.22)",
                    borderRadius: 14,
                    padding: "20px 24px",
                    textAlign: "center",
                  }}>
                    <p style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "rgba(255, 255, 255, 0.45)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}>
                      Your Spot
                    </p>
                    <p style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "2.4rem",
                      fontWeight: 800,
                      color: ACCENT,
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                      marginBottom: 6,
                      textShadow: `0 0 24px rgba(79,110,247,0.5)`,
                    }}>
                      {waitlistPosition !== null ? `#${waitlistPosition}` : "—"}
                    </p>
                    <p style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "0.78rem",
                      color: "rgba(255, 255, 255, 0.35)",
                      margin: 0,
                    }}>
                      in the queue
                    </p>
                  </div>

                  {/* Right card: Enrollment date */}
                  <div style={{
                    flex: "1 1 160px",
                    maxWidth: isMobile ? "100%" : 200,
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 14,
                    padding: "20px 24px",
                    textAlign: "center",
                  }}>
                    <p style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "rgba(255, 255, 255, 0.45)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}>
                      Enrolled on
                    </p>
                    <p style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "1.15rem",
                      fontWeight: 700,
                      color: "rgba(255, 255, 255, 0.85)",
                      lineHeight: 1.3,
                      margin: 0,
                    }}>
                      {new Date(waitlistEntry.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {/* Closing message */}
                <p style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "1rem",
                  color: "rgba(255, 255, 255, 0.6)",
                  lineHeight: 1.7,
                  marginBottom: 40,
                }}>
                  Our team is actively provisioning infrastructure and you&apos;ll be among the first to know when it&apos;s your turn.
                </p>

                {/* Contact section */}
                <div style={{
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  paddingTop: 32,
                }}>
                  <p style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "0.95rem",
                    color: "rgba(255, 255, 255, 0.5)",
                    marginBottom: 12,
                  }}>
                    Got questions, ideas, or something urgent? We&apos;re always listening.
                  </p>
                  <a
                    href="mailto:ksrcesupport@gktech.ai"
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      color: ACCENT,
                      textDecoration: "none",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#6b8bff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = ACCENT;
                    }}
                  >
                    ksrcesupport@gktech.ai
                  </a>
                </div>

                {/* Go to Home button */}
                <div style={{ marginTop: 40 }}>
                  <Link
                    href="/"
                    style={{
                      display: isMobile ? "flex" : "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "12px 24px",
                      background: "transparent",
                      color: "rgba(255, 255, 255, 0.95)",
                      fontFamily: "var(--font-sans)",
                      fontSize: "1rem",
                      fontWeight: 600,
                      borderRadius: 8,
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      textDecoration: "none",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
                      e.currentTarget.style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                      e.currentTarget.style.color = "rgba(255, 255, 255, 0.95)";
                    }}
                  >
                    Back to Home
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : checkingStatus ? (
        /* Loading state while checking status */
        <section style={{ padding: "80px 24px", textAlign: "center" }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <svg style={{ animation: "spin 1s linear infinite", width: 32, height: 32, color: ACCENT }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.95rem", color: "var(--fgColor-muted)", marginTop: 16 }}>
              Checking your enrollment status...
            </p>
          </div>
        </section>
      ) : null}

      {/* ── FORM ── */}
      {!alreadyEnrolled && (
        <section style={{ padding: "64px 24px" }}>
          <form onSubmit={handleSubmit} style={{ maxWidth: 800, margin: "0 auto", padding: "0 8px" }}>
          {/* ── STEP 1: Personal Information ── */}
          {formStep === 1 && (
            <>
              {/* Back to Home */}
              <div style={{ marginBottom: 24 }}>
                <Link
                  href="/"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.875rem",
                    color: "var(--fgColor-muted)",
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                    transition: "color 0.15s ease",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fgColor-default)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fgColor-muted)")}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Back to Home
                </Link>
              </div>

              {/* ── Your Information Section ── */}
              <div style={{
                background: "var(--bgColor-mild)",
                border: "1px solid var(--borderColor-default)",
                borderRadius: 12,
                padding: isMobile ? "20px 16px" : "36px 40px",
                marginBottom: 48,
              }}>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: ACCENT, marginBottom: 20 }}>
                  Your Information
                </div>

                {authenticatedUser ? (
                  /* ── AUTHENTICATED: read-only pre-filled fields ── */
                  <div className="waitlist-grid" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 20 }}>
                    <div>
                      <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 500, color: "var(--fgColor-muted)", marginBottom: 9 }}>First Name</label>
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
                        <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.9rem", color: "var(--fgColor-default)" }}>{authenticatedUser.firstName || "N/A"}</span>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 500, color: "var(--fgColor-muted)", marginBottom: 9 }}>Last Name</label>
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
                        <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.9rem", color: "var(--fgColor-default)" }}>{authenticatedUser.lastName || "N/A"}</span>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 500, color: "var(--fgColor-muted)", marginBottom: 9 }}>Email</label>
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
                        <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.9rem", color: "var(--fgColor-default)" }}>{authenticatedUser.email}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── UNAUTHENTICATED: editable fields + OAuth buttons ── */
                  <>
                    <div className="waitlist-grid" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 20, marginBottom: 28 }}>
                      {/* First Name */}
                      <div>
                        <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 500, color: "var(--fgColor-muted)", marginBottom: 9 }}>
                          First Name <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={manualFirstName}
                          onChange={(e) => setManualFirstName(e.target.value)}
                          placeholder="e.g., Alex"
                          className="waitlist-input"
                          style={{
                            width: "100%",
                            background: "var(--bgColor-muted)",
                            border: "1px solid var(--borderColor-default)",
                            borderRadius: 8,
                            padding: "10px 14px",
                            fontFamily: "var(--font-sans)",
                            fontSize: "0.9rem",
                            color: "var(--fgColor-default)",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                      {/* Last Name */}
                      <div>
                        <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 500, color: "var(--fgColor-muted)", marginBottom: 9 }}>
                          Last Name <span style={{ color: "var(--fgColor-muted)", fontWeight: 400 }}>(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={manualLastName}
                          onChange={(e) => setManualLastName(e.target.value)}
                          placeholder="e.g., Johnson"
                          className="waitlist-input"
                          style={{
                            width: "100%",
                            background: "var(--bgColor-muted)",
                            border: "1px solid var(--borderColor-default)",
                            borderRadius: 8,
                            padding: "10px 14px",
                            fontFamily: "var(--font-sans)",
                            fontSize: "0.9rem",
                            color: "var(--fgColor-default)",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                      {/* Email */}
                      <div>
                        <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 500, color: "var(--fgColor-muted)", marginBottom: 9 }}>
                          Email <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <input
                          type="email"
                          value={manualEmail}
                          onChange={(e) => { setManualEmail(e.target.value); if (emailError) setEmailError(''); }}
                          onBlur={() => {
                            if (manualEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manualEmail)) {
                              setEmailError('Please enter a valid email address.');
                            } else {
                              setEmailError('');
                            }
                          }}
                          placeholder="e.g., alex@example.com"
                          className="waitlist-input"
                          style={{
                            width: "100%",
                            background: "var(--bgColor-muted)",
                            border: `1px solid ${emailError ? '#ef4444' : 'var(--borderColor-default)'}`,
                            borderRadius: 8,
                            padding: "10px 14px",
                            fontFamily: "var(--font-sans)",
                            fontSize: "0.9rem",
                            color: "var(--fgColor-default)",
                            boxSizing: "border-box",
                          }}
                        />
                        {emailError && (
                          <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", color: "#ef4444", margin: "4px 0 0" }}>{emailError}</p>
                        )}
                      </div>
                    </div>

                    {/* OAuth divider */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 20px" }}>
                      <div style={{ flex: 1, height: 1, background: "var(--borderColor-default)" }} />
                      <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.78rem", color: "var(--fgColor-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>Or sign in with</span>
                      <div style={{ flex: 1, height: 1, background: "var(--borderColor-default)" }} />
                    </div>

                    {/* OAuth buttons */}
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                      {/* Google */}
                      <button
                        type="button"
                        onClick={() => {
                          sessionStorage.setItem('oauth_return_to', '/waitlist');
                          window.location.href = buildOAuthUrl('google');
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 10,
                          padding: "10px 16px",
                          background: "var(--bgColor-muted)",
                          border: "1px solid var(--borderColor-default)",
                          borderRadius: 8,
                          cursor: "pointer",
                          fontFamily: "var(--font-sans)",
                          fontSize: "0.88rem",
                          fontWeight: 500,
                          color: "var(--fgColor-default)",
                          transition: "border-color 0.15s, background 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.background = ACCENT_GLOW; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--borderColor-default)"; e.currentTarget.style.background = "var(--bgColor-muted)"; }}
                        aria-label="Sign in with Google"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                      </button>
                      {/* GitHub */}
                      <button
                        type="button"
                        onClick={() => {
                          sessionStorage.setItem('oauth_return_to', '/waitlist');
                          window.location.href = buildOAuthUrl('github');
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 10,
                          padding: "10px 16px",
                          background: "var(--bgColor-muted)",
                          border: "1px solid var(--borderColor-default)",
                          borderRadius: 8,
                          cursor: "pointer",
                          fontFamily: "var(--font-sans)",
                          fontSize: "0.88rem",
                          fontWeight: 500,
                          color: "var(--fgColor-default)",
                          transition: "border-color 0.15s, background 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.background = ACCENT_GLOW; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--borderColor-default)"; e.currentTarget.style.background = "var(--bgColor-muted)"; }}
                        aria-label="Sign in with GitHub"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--fgColor-default)" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                        </svg>
                        Continue with GitHub
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Professional Details in 2-column grid */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '24px 32px', marginBottom: 48 }}>
                {/* I am a... */}
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

                {/* Company/Organization */}
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

                {/* Role / Designation or Branch / Department */}
                <div>
                  <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 500, color: "var(--fgColor-default)", marginBottom: 8 }}>
                    {isStudent ? 'Branch / Department' : 'Role / Designation'} <span style={{ color: "var(--fgColor-muted)", fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.jobTitle || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, jobTitle: e.target.value }))}
                    placeholder={isStudent ? "e.g., Computer Science, AI & ML, ECE" : "e.g., ML Engineer, Data Scientist, CTO"}
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

                {/* Continue Button - inline in grid */}
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setFormStep(2)}
                    disabled={!canProceedToStep2}
                    style={{
                      width: "100%",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: canProceedToStep2 ? "var(--fgColor-inverse)" : "var(--fgColor-muted)",
                      backgroundColor: canProceedToStep2 ? "var(--fgColor-default)" : "var(--bgColor-muted)",
                      border: `1px solid ${canProceedToStep2 ? "var(--fgColor-default)" : "var(--borderColor-default)"}`,
                      borderRadius: "4px",
                      padding: "0 24px",
                      height: "44px",
                      cursor: canProceedToStep2 ? "pointer" : "not-allowed",
                      transition: "opacity 0.15s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      fontFamily: "var(--font-sans)",
                    }}
                    onMouseEnter={(e) => { if (canProceedToStep2) e.currentTarget.style.opacity = "0.85"; }}
                    onMouseLeave={(e) => { if (canProceedToStep2) e.currentTarget.style.opacity = "1"; }}
                  >
                    See What Awaits You
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── STEP 2: Workload & Preferences ── */}
          {formStep === 2 && (
            <>
              {/* Back button */}
              <div style={{ marginBottom: 24 }}>
                <span
                  onClick={() => setFormStep(1)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.875rem",
                    color: "var(--fgColor-muted)",
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                    transition: "color 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fgColor-default)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fgColor-muted)")}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Back to your information
                </span>
              </div>

              {/* AI Info Banner */}
              <div style={{
                display: 'flex',
                gap: '12px',
                padding: isMobile ? '10px 12px' : '14px 16px',
                backgroundColor: 'var(--bgColor-info, #cedeff)',
                border: '1px solid var(--borderColor-info, #3a73ff)',
                borderRadius: '4px',
                marginBottom: 16,
              }}>
                <span style={{ color: 'var(--fgColor-info)', flexShrink: 0, marginTop: '2px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </span>
                <div>
                  <div style={{
                    fontSize: 'var(--text-sm, 0.875rem)',
                    fontWeight: 600,
                    color: 'var(--fgColor-default)',
                    marginBottom: '2px',
                    fontFamily: 'var(--font-sans)',
                  }}>
                    Your Vision, Perfectly Matched
                  </div>
                  <div style={{
                    fontSize: 'var(--text-sm, 0.875rem)',
                    color: 'var(--fgColor-muted)',
                    lineHeight: 1.5,
                    fontFamily: 'var(--font-sans)',
                  }}>
                    We learn what you&apos;re building and tailor the right GPU resources around it — so you can focus on the work that matters.
                  </div>
                </div>
              </div>

              {/* Describe Your Workload Section */}
              <div style={{ marginBottom: 48 }}>
                {/* Main describe card */}
                <div style={{
                  backgroundColor: 'var(--bgColor-mild)',
                  border: '1px solid var(--borderColor-default)',
                  borderRadius: '4px',
                  padding: isMobile ? '14px' : '20px',
                }}>
                  <div style={{
                    fontSize: 'var(--text-xs, 0.75rem)',
                    fontWeight: 600,
                    color: 'var(--fgColor-default)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginBottom: '8px',
                    fontFamily: 'var(--font-sans)',
                  }}>
                    Describe Your Workload
                  </div>

                  {/* Input state */}
                  {analysisState === 'idle' && (
                    <>
                      <p style={{
                        fontSize: 'var(--text-sm, 0.875rem)',
                        color: 'var(--fgColor-default)',
                        marginBottom: '16px',
                        marginTop: 0,
                        fontFamily: 'var(--font-sans)',
                      }}>
                        Tell us what you&apos;re working on — the more detail you provide, the better our recommendation.
                      </p>

                      <textarea
                        ref={descriptionRef}
                        value={formData.workloadDescription || ""}
                        onChange={(e) => {
                          const words = e.target.value.trim().split(/\s+/);
                          if (e.target.value === "" || words.length <= 500) {
                            setFormData((prev) => ({ ...prev, workloadDescription: e.target.value }));
                          }
                        }}
                        placeholder="e.g., I need to fine-tune a ResNet model on a 2GB image dataset for my college project. I'll be using PyTorch and training for about 3-4 hours..."
                        maxLength={3000}
                        style={{
                          width: '100%',
                          minHeight: '120px',
                          resize: 'vertical',
                          backgroundColor: 'var(--bgColor-default)',
                          border: '1px solid var(--borderColor-default)',
                          borderRadius: '4px',
                          padding: '12px',
                          fontFamily: 'var(--font-sans)',
                          fontSize: 'var(--text-sm, 0.875rem)',
                          color: 'var(--fgColor-default)',
                          boxSizing: 'border-box',
                        }}
                      />

                      <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginTop: '4px',
                      }}>
                        <span style={{ fontSize: 'var(--text-xs, 0.75rem)', color: 'var(--fgColor-default)', fontFamily: 'var(--font-sans)' }}>
                          {wordCount} / 500 words
                        </span>
                      </div>

                      {/* Analyze button */}
                      <button
                        type="button"
                        onClick={handleAnalyzeWorkload}
                        disabled={wordCount < 10}
                        style={{
                          padding: '10px 28px',
                          backgroundColor: wordCount >= 10 ? 'var(--fgColor-default)' : 'var(--bgColor-muted)',
                          color: wordCount >= 10 ? 'var(--fgColor-inverse)' : 'var(--fgColor-muted)',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: 'var(--text-sm)',
                          fontWeight: 600,
                          cursor: wordCount >= 10 ? 'pointer' : 'not-allowed',
                          fontFamily: 'var(--font-sans)',
                          transition: 'all 0.2s ease',
                          marginTop: '16px',
                        }}
                      >
                        Analyze Workload
                      </button>
                    </>
                  )}

                  {/* Analyzing state */}
                  {analysisState === 'analyzing' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '32px 0' }}>
                      <div style={{
                        width: '20px', height: '20px',
                        border: '2px solid var(--borderColor-info, #3a73ff)',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }} />
                      <span style={{ color: 'var(--fgColor-default)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-sans)' }}>
                        Analyzing your workload...
                      </span>
                    </div>
                  )}

                  {/* Success state - inside card */}
                  {analysisState === 'success' && analysisData && (
                    <div style={{
                      backgroundColor: 'var(--bgColor-info, #cedeff)',
                      border: '1px solid var(--borderColor-info, #3a73ff)',
                      borderRadius: '4px',
                      padding: '16px',
                      position: 'relative',
                      marginTop: '8px',
                    }}>
                      {/* Header row */}
                      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--borderColor-info, #3a73ff)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="16" x2="12" y2="12" />
                          <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        <span style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--fgColor-default)', fontFamily: 'var(--font-sans)' }}>
                          Analysis Complete
                        </span>
                      </div>

                      {/* Analysis details grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--fgColor-muted)', letterSpacing: '0.05em', marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>Detected Goal</div>
                          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--fgColor-default)', fontFamily: 'var(--font-sans)' }}>
                            {analysisData.detectedGoal?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || '—'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--fgColor-muted)', letterSpacing: '0.05em', marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>GPU Memory Need</div>
                          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--fgColor-default)', fontFamily: 'var(--font-sans)' }}>
                            {analysisData.estimatedVramNeedGb ? `~${analysisData.estimatedVramNeedGb} GB VRAM` : '—'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--fgColor-muted)', letterSpacing: '0.05em', marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>Workload Intensity</div>
                          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--fgColor-default)', fontFamily: 'var(--font-sans)' }}>
                            {analysisData.estimatedComputeIntensity?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || '—'}
                          </div>
                        </div>
                      </div>

                      {/* Frameworks */}
                      {(analysisData.detectedFrameworks?.length ?? 0) > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--fgColor-muted)', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)' }}>Frameworks: </span>
                          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--fgColor-default)', fontFamily: 'var(--font-sans)' }}>
                            {analysisData.detectedFrameworks?.join(', ')}
                          </span>
                        </div>
                      )}

                      {/* Key insights */}
                      {(analysisData.keyInsights?.length ?? 0) > 0 && (
                        <ul style={{ margin: '8px 0 0', paddingLeft: '20px', listStyleType: 'disc' }}>
                          {analysisData.keyInsights?.map((insight: string, i: number) => (
                            <li key={i} style={{ fontSize: 'var(--text-sm)', color: 'var(--fgColor-default)', marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>
                              {insight}
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Edit Input link */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--borderColor-info, #3a73ff)' }}>
                        <span
                          onClick={() => { setAnalysisState('idle'); setAnalysisData(null); setAutoFilledFields(new Set()); }}
                          style={{
                            fontSize: 'var(--text-xs, 0.75rem)',
                            color: 'var(--fgColor-muted)',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-sans)',
                            textDecoration: 'underline',
                            textUnderlineOffset: '2px',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fgColor-default)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fgColor-muted)')}
                        >
                          Edit Input
                        </span>
                        <span style={{ fontSize: 'var(--text-xs, 0.75rem)', color: 'var(--fgColor-muted)', fontFamily: 'var(--font-sans)', fontStyle: 'italic' }}>
                          Fields below have been auto-filled — you can change them anytime
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Failure state - inside card */}
                  {analysisState === 'failure' && (
                    <div style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '4px',
                      padding: '16px',
                      position: 'relative',
                      marginTop: '8px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--fgColor-default)', fontFamily: 'var(--font-sans)' }}>
                          More Detail Needed
                        </span>
                      </div>

                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--fgColor-muted)', margin: 0, fontFamily: 'var(--font-sans)', fontStyle: 'italic' }}>
                        {analysisData?.suggestions || 'Please provide more details about your workload for better analysis.'}
                      </p>

                      {/* Try Again button */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '16px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(245, 158, 11, 0.3)' }}>
                        <button
                          type="button"
                          onClick={() => { setAnalysisState('idle'); setAnalysisData(null); }}
                          style={{
                            padding: '10px 28px',
                            backgroundColor: 'var(--fgColor-default)',
                            color: 'var(--bgColor-default)',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: 'var(--text-sm)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'var(--font-sans)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          Try Again
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Primary workload type & Expected duration - side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '24px 32px', marginBottom: 32 }}>
                <div>
                  <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 500, color: "var(--fgColor-default)", marginBottom: 8 }}>
                    Primary workload type <span style={{ color: "#ef4444" }}>*</span>
                    {autoFilledFields.has("primaryWorkload") && (
                      <span style={{ fontSize: 11, color: "rgba(56, 139, 253, 0.8)", marginLeft: 8, fontWeight: 500 }}>✦ AI-suggested</span>
                    )}
                  </label>
                  <select
                    value={formData.primaryWorkload}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, primaryWorkload: e.target.value }));
                      setAutoFilledFields((prev) => { const next = new Set(prev); next.delete("primaryWorkload"); return next; });
                    }}
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

                <div>
                  <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 500, color: "var(--fgColor-default)", marginBottom: 8 }}>
                    Expected workload duration <span style={{ color: "var(--fgColor-muted)", fontWeight: 400 }}>(Optional)</span>
                    {autoFilledFields.has("expectedDuration") && (
                      <span style={{ fontSize: 11, color: "rgba(56, 139, 253, 0.8)", marginLeft: 8, fontWeight: 500 }}>✦ AI-suggested</span>
                    )}
                  </label>
                  <select
                    value={formData.expectedDuration}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, expectedDuration: e.target.value }));
                      setAutoFilledFields((prev) => { const next = new Set(prev); next.delete("expectedDuration"); return next; });
                    }}
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
                  >
                    <option value="">Select duration</option>
                    {DURATION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* VRAM selection */}
              <div style={{ marginBottom: 48 }}>
                <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 500, color: "var(--fgColor-default)", marginBottom: 16 }}>
                  How much VRAM do you need? <span style={{ color: "#ef4444" }}>*</span>
                  {autoFilledFields.has("computeNeeds") && (
                    <span style={{ fontSize: 11, color: "rgba(56, 139, 253, 0.8)", marginLeft: 8, fontWeight: 500 }}>✦ AI-suggested</span>
                  )}
                </label>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 12 }}>
                  {COMPUTE_OPTIONS.map((opt) => {
                    const isSelected = formData.computeNeeds === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, computeNeeds: opt.value }));
                          setAutoFilledFields((prev) => { const next = new Set(prev); next.delete("computeNeeds"); return next; });
                        }}
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

              

              {/* Policy & Disclaimer */}
              <div style={{
                background: "var(--bgColor-mild)",
                border: "1px solid var(--borderColor-default)",
                borderRadius: 12,
                padding: isMobile ? "20px 16px" : "32px 36px",
                marginBottom: 40,
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
                    Secure Your Spot
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </>
          )}

          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </form>
        </section>
      )}

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
      <section id="faq" style={{ borderTop: "1px solid var(--borderColor-default)", padding: isMobile ? "48px 16px" : "80px 48px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>FAQ</div>
            <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, color: "var(--fgColor-default)", letterSpacing: "-0.02em", marginBottom: 14 }}>
              Frequently Asked Questions
            </h2>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.95rem", color: "var(--fgColor-muted)" }}>
              Can&apos;t find what you&apos;re looking for? Reach us at{" "}
              <a href="mailto:ksrcesupport@gktech.ai" style={{ color: ACCENT, textDecoration: "underline", fontWeight: 600 }}>ksrcesupport@gktech.ai</a>.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(440px, 1fr))", gap: "0 48px", alignItems: "start" }}>
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
