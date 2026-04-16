// "use client";

// import React, { useState, useEffect, useRef } from "react";
// import Head from "next/head";
// import Link from "next/link";

// // ─── Globals ─────────────────────────────────────────────────────────────────
// const ACCENT = "#4f6ef7";
// const ACCENT_DARK = "#3a56d4";
// const ACCENT_GLOW = "rgba(79,110,247,0.18)";

// // ─── Theme Hook ──────────────────────────────────────────────────────────────
// function useTheme() {
//   const [isDark, setIsDark] = useState(false);

//   useEffect(() => {
//     const saved = localStorage.getItem("darkMode");
//     if (saved === "true") { setIsDark(true); document.documentElement.classList.add("dark"); }
//   }, []);

//   const toggle = () => {
//     const next = !isDark;
//     setIsDark(next);
//     document.documentElement.classList.toggle("dark");
//     localStorage.setItem("darkMode", String(next));
//   };

//   return [isDark, toggle] as const;
// }

// // ─── Scroll Reveal Hook ──────────────────────────────────────────────────────
// function useScrollReveal() {
//   useEffect(() => {
//     const observer = new IntersectionObserver((entries) => {
//       entries.forEach(entry => {
//         if (entry.isIntersecting) {
//           entry.target.classList.add('revealed');
//         }
//       });
//     }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

//     document.querySelectorAll('.reveal-on-scroll').forEach(e => observer.observe(e));
//     return () => observer.disconnect();
//   }, []);
// }

// // ─── Nav ──────────────────────────────────────────────────────────────────────
// function Nav({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
//   const [scrolled, setScrolled] = useState(false);
//   useEffect(() => {
//     const h = () => setScrolled(window.scrollY > 30);
//     window.addEventListener("scroll", h);
//     return () => window.removeEventListener("scroll", h);
//   }, []);

//   return (
//     <nav style={{
//       position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
//       height: 60,
//       display: "flex", alignItems: "center", justifyContent: "space-between",
//       padding: "0 48px",
//       background: scrolled ? (isDark ? "rgba(8,10,18,0.92)" : "rgba(245,245,240,0.92)") : "transparent",
//       borderBottom: scrolled ? `1px solid var(--borderColor-default)` : "1px solid transparent",
//       backdropFilter: scrolled ? "blur(14px)" : "none",
//       transition: "all 0.3s ease",
//     }}>
//       <span style={{ fontFamily: "var(--font-sans)", fontSize: "1.1rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fgColor-default)" }}>
//         LaaS
//       </span>
//       <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
//         {["Features", "How It Works", "Pricing", "FAQ"].map(l => (
//           <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`} style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", color: "var(--fgColor-muted)", textDecoration: "none", transition: "color 0.15s" }}
//             onMouseEnter={e => (e.currentTarget.style.color = "var(--fgColor-default)")}
//             onMouseLeave={e => (e.currentTarget.style.color = "var(--fgColor-muted)")}>
//             {l}
//           </a>
//         ))}
//       </div>
//       <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//         <button onClick={onToggle} style={{ background: "transparent", border: `1px solid var(--borderColor-default)`, borderRadius: 6, width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fgColor-muted)", transition: "all 0.15s" }}
//           onMouseEnter={e => { e.currentTarget.style.background = "var(--bgColor-muted)"; e.currentTarget.style.color = "var(--fgColor-default)"; }}
//           onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--fgColor-muted)"; }}>
//           {isDark
//             ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
//             : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>}
//         </button>
//         <Link href="/signin" style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", fontWeight: 500, color: "var(--fgColor-default)", textDecoration: "none", padding: "7px 18px", border: "1px solid var(--borderColor-default)", borderRadius: 6, transition: "all 0.15s" }}
//           onMouseEnter={e => (e.currentTarget.style.background = "var(--bgColor-muted)")}
//           onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
//           Sign In
//         </Link>
//         <Link href="/signup" style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", fontWeight: 600, color: "#fff", textDecoration: "none", padding: "7px 20px", backgroundColor: ACCENT, borderRadius: 6, border: `1px solid ${ACCENT}`, transition: "all 0.15s", boxShadow: `0 0 20px ${ACCENT_GLOW}` }}
//           onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
//           onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}>
//           Get Started →
//         </Link>
//       </div>
//     </nav>
//   );
// }

// // ─── Terminal Block ───────────────────────────────────────────────────────────
// const termLines = [
//   { t: "cmd", s: "$ laas login --sso ksrce.edu.in" },
//   { t: "ok", s: "✓  Authenticated via KSRCE SSO" },
//   { t: "ok", s: "✓  Storage provisioned  15 GB ZFS" },
//   { t: "", s: "" },
//   { t: "cmd", s: "$ laas launch --gpu 4090--type jupyter" },
//   { t: "muted", s: "  Selecting node …" },
//   { t: "muted", s: "  Pulling image  laas/jupyter:cuda12" },
//   { t: "ok", s: "✓  Session live in 8s" },
//   { t: "url", s: "  → https://sess.laas.io/xk9f2a" },
//   { t: "", s: "" },
//   { t: "muted", s: "  GPU  409040 GB     vCPU 8     RAM 32 GB" },
//   { t: "cursor", s: "▊" },
// ];

// function HeroTerminal() {
//   const [shown, setShown] = useState(0);
//   useEffect(() => {
//     let i = 0;
//     const tids: ReturnType<typeof setTimeout>[] = [];
//     termLines.forEach((_, idx) => {
//       const t = setTimeout(() => setShown(idx + 1), idx * 380);
//       tids.push(t);
//     });
//     return () => tids.forEach(clearTimeout);
//   }, []);

//   const col: Record<string, string> = {
//     cmd: "var(--fgColor-default)", ok: "#22c55e",
//     muted: "var(--fgColor-muted)", url: ACCENT, cursor: ACCENT,
//   };

//   return (
//     <div style={{ background: "var(--bgColor-mild)", border: "1px solid var(--borderColor-default)", borderRadius: 10, overflow: "hidden", fontFamily: "var(--font-mono),ui-monospace,monospace", fontSize: "0.82rem", lineHeight: 1.75 }}>
//       {/* dots */}
//       <div style={{ display: "flex", gap: 7, padding: "10px 16px", background: "var(--bgColor-muted)", borderBottom: "1px solid var(--borderColor-default)", alignItems: "center" }}>
//         <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
//         <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
//         <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
//         <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--fgColor-muted)" }}>laas — bash</span>
//       </div>
//       <div style={{ padding: "18px 22px", minHeight: 240 }}>
//         {termLines.slice(0, shown).map((l, i) => (
//           <div key={i} style={{ color: col[l.t] ?? "var(--fgColor-default)", animation: "fadeUp 0.2s ease" }}>{l.s}</div>
//         ))}
//       </div>
//     </div>
//   );
// }

// // ─── Animated counter ────────────────────────────────────────────────────────
// function Counter({ end, suffix = "" }: { end: number; suffix?: string }) {
//   const [v, setV] = useState(0);
//   const ref = useRef<HTMLSpanElement>(null);
//   const done = useRef(false);
//   useEffect(() => {
//     const obs = new IntersectionObserver(([e]) => {
//       if (e.isIntersecting && !done.current) {
//         done.current = true;
//         const dur = 1600, step = 16, inc = end / (dur / step);
//         let cur = 0;
//         const timer = setInterval(() => {
//           cur += inc;
//           if (cur >= end) { setV(end); clearInterval(timer); }
//           else setV(Math.floor(cur));
//         }, step);
//       }
//     }, { threshold: 0.4 });
//     if (ref.current) obs.observe(ref.current);
//     return () => obs.disconnect();
//   }, [end]);
//   return <span ref={ref}>{v.toLocaleString()}{suffix}</span>;
// }

// // ─── Step card ───────────────────────────────────────────────────────────────
// function StepCard({ num, icon, title, items }: { num: string; icon: React.ReactNode; title: string; items: string[] }) {
//   const [hov, setHov] = useState(false);
//   return (
//     <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
//       style={{
//         background: hov ? "var(--bgColor-mild)" : "transparent", 
//         border: `1px solid ${hov ? ACCENT : "var(--borderColor-default)"}`, 
//         borderRadius: 12, 
//         padding: "24px 26px", 
//         transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)", 
//         cursor: "default",
//         transform: hov ? "translateY(-4px)" : "translateY(0)",
//         boxShadow: hov ? `0 12px 30px ${ACCENT_GLOW}` : "0 4px 12px rgba(0,0,0,0.02)",
//       }}>
//       <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
//         <span style={{ color: ACCENT, background: hov ? "var(--bgColor-muted)" : "transparent", padding: 6, borderRadius: 8, transition: "background 0.3s" }}>{icon}</span>
//         <span style={{ fontFamily: "var(--font-mono),ui-monospace,monospace", fontSize: "0.75rem", color: hov ? ACCENT : "var(--fgColor-muted)", background: "var(--bgColor-muted)", border: "1px solid var(--borderColor-default)", borderRadius: 6, padding: "2px 8px", transition: "color 0.3s" }}>Step {num}</span>
//       </div>
//       <div style={{ fontFamily: "var(--font-sans)", fontSize: "1.1rem", fontWeight: 700, color: "var(--fgColor-default)", marginBottom: 12 }}>{title}</div>
//       <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
//         {items.map((it, i) => (
//           <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-sans)", fontSize: "0.85rem", color: "var(--fgColor-muted)" }}>
//             <span style={{ width: 6, height: 6, borderRadius: "50%", background: hov ? ACCENT : "var(--fgColor-muted)", opacity: hov ? 1 : 0.4, flexShrink: 0, transition: "all 0.3s" }} />
//             <span style={{ transition: "color 0.2s", color: hov ? "var(--fgColor-default)" : "var(--fgColor-muted)" }}>{it}</span>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }

// // ─── Why Choose Us / Comparison ──────────────────────────────────────────────
// function FeatureComparison() {
//   const [hovIndex, setHovIndex] = useState<number | null>(null);

//   const features = [
//     { 
//       title: "Persistent Storage", 
//       us: "15 GB Zero-setup ZFS", 
//       them: "Manual cloud volumes", 
//       desc: "Your data survives pod deletion. No more re-uploading gigabytes of datasets before every experiment." 
//     },
//     { 
//       title: "Zero Egress Fees", 
//       us: "Fast Local Network", 
//       them: "Costly AWS/GCP bandwidth", 
//       desc: "Move massive models and datasets on our high-speed local network without paying per-GB transfer costs." 
//     },
//     { 
//       title: "Instant GUI Environment", 
//       us: "KDE Plasma + CUDA", 
//       them: "CLI only by default", 
//       desc: "Get an interactive desktop within the browser, pre-configured with PyTorch, HuggingFace, and CUDA bindings." 
//     },
//     { 
//       title: "Seamless Authentication", 
//       us: "University SSO Integration", 
//       them: "External credentials", 
//       desc: "Students and researchers sign in using their existing KSRCE IDs. No separate credentials required." 
//     },
//     { 
//       title: "Predictable Environments", 
//       us: "Identical across all tiers", 
//       them: "Varies by instance type", 
//       desc: "A script written on an Epi-CPU will run exactly the same when scaled up to an 4090GPU." 
//     },
//     { 
//       title: "Bare-metal Performance", 
//       us: "AMD Ryzen 9 + NVMe", 
//       them: "Virtual vCPUs & network EBS", 
//       desc: "Get raw hardware performance instead of heavily virtualized cloud resources with noisy neighbors." 
//     },
//   ];

//   return (
//     <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24, marginTop: 48 }}>
//       {features.map((f, i) => (
//         <div key={i} className="reveal-on-scroll"
//           onMouseEnter={() => setHovIndex(i)} 
//           onMouseLeave={() => setHovIndex(null)}
//           style={{ 
//             background: hovIndex === i ? "var(--bgColor-mild)" : "transparent",
//             border: `1px solid ${hovIndex === i ? ACCENT : "var(--borderColor-default)"}`, 
//             borderRadius: 16, 
//             padding: "28px", 
//             transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
//             position: "relative",
//             overflow: "hidden",
//             boxShadow: hovIndex === i ? `0 15px 35px rgba(0,0,0,0.1), inset 0 0 0 1px ${ACCENT_GLOW}` : "0 4px 15px rgba(0,0,0,0.02)",
//             transform: hovIndex === i ? "translateY(-6px)" : "translateY(0)"
//           }}>

//           <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
//             <div style={{ width: 40, height: 40, borderRadius: 10, background: hovIndex === i ? ACCENT : "var(--bgColor-muted)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}>
//               <span style={{ color: hovIndex === i ? "#fff" : ACCENT }}>{I.check}</span>
//             </div>
//             <div style={{ fontFamily: "var(--font-sans)", fontSize: "1.15rem", fontWeight: 700, color: "var(--fgColor-default)", letterSpacing: "-0.01em" }}>{f.title}</div>
//           </div>

//           <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.9rem", color: "var(--fgColor-muted)", lineHeight: 1.6, marginBottom: 24 }}>
//             {f.desc}
//           </p>

//           <div style={{ background: "var(--bgColor-muted)", borderRadius: 8, padding: "14px", border: "1px solid var(--borderColor-default)" }}>
//             <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontFamily: "var(--font-sans)", fontSize: "0.85rem", color: "var(--fgColor-default)", fontWeight: 600 }}>
//               <span style={{ color: "#22c55e", transform: "scale(0.8)" }}>{I.check}</span> {f.us}
//             </div>
//             <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-sans)", fontSize: "0.85rem", color: "var(--fgColor-muted)" }}>
//               <span style={{ color: "#ef4444", fontWeight: 700, fontSize: "0.7rem", paddingLeft: 3 }}>✕</span> <span style={{ textDecoration: "line-through", opacity: 0.7 }}>{f.them}</span>
//             </div>
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }

// // ─── FAQ ──────────────────────────────────────────────────────────────────────
// function FAQ({ q, a }: { q: string; a: string }) {
//   const [open, setOpen] = useState(false);
//   return (
//     <div style={{ borderBottom: "1px solid var(--borderColor-default)", overflow: "hidden" }}>
//       <button onClick={() => setOpen(!open)} style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "18px 0", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
//         <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.95rem", fontWeight: 500, color: "var(--fgColor-default)" }}>{q}</span>
//         <span style={{ color: "var(--fgColor-muted)", fontSize: "1.2rem", transform: open ? "rotate(45deg)" : "rotate(0)", transition: "transform 0.2s ease", flexShrink: 0 }}>+</span>
//       </button>
//       <div style={{ maxHeight: open ? 300 : 0, overflow: "hidden", transition: "max-height 0.3s ease" }}>
//         <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", lineHeight: 1.7, color: "var(--fgColor-muted)", margin: "0 0 18px" }}>{a}</p>
//       </div>
//     </div>
//   );
// }

// // ─── Pricing card ─────────────────────────────────────────────────────────────
// function PricingCard({ title, desc, price, spec, badge, highlight }: { title: string; desc: string; price: string; spec: string; badge?: string; highlight?: boolean }) {
//   const [hov, setHov] = useState(false);
//   return (
//     <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
//       style={{ background: highlight ? `linear-gradient(135deg, ${ACCENT_GLOW}, var(--bgColor-mild))` : "var(--bgColor-mild)", border: `1px solid ${hov || highlight ? ACCENT : "var(--borderColor-default)"}`, borderRadius: 12, padding: "24px", transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)", position: "relative", overflow: "hidden", transform: hov ? "translateY(-4px)" : "translateY(0)" }}>
//       {badge && <span style={{ position: "absolute", top: 18, right: 18, fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", background: ACCENT, color: "#fff", borderRadius: 4, padding: "3px 10px" }}>{badge}</span>}
//       <div style={{ fontFamily: "var(--font-mono),ui-monospace,monospace", fontSize: "0.75rem", color: "var(--fgColor-muted)", marginBottom: 8, letterSpacing: "0.02em" }}>{spec}</div>
//       <div style={{ fontFamily: "var(--font-sans)", fontSize: "1.2rem", fontWeight: 800, color: "var(--fgColor-default)", marginBottom: 8 }}>{title}</div>
//       <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.85rem", color: "var(--fgColor-muted)", marginBottom: 20, lineHeight: 1.5, minHeight: 38 }}>{desc}</div>
//       <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
//         <span style={{ fontFamily: "var(--font-sans)", fontSize: "2rem", fontWeight: 800, color: "var(--fgColor-default)", letterSpacing: "-0.03em" }}>{price}</span>
//         <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 500, color: "var(--fgColor-muted)" }}>/hr</span>
//       </div>
//     </div>
//   );
// }

// // ─── SVG icons ───────────────────────────────────────────────────────────────
// const I = {
//   template: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>,
//   config: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
//   launch: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>,
//   tools: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>,
//   deploy: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>,
//   terminal: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>,
//   check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
// };


// // ─── Main ─────────────────────────────────────────────────────────────────────
// export function LandingPage() {
//   const [isDark, toggle] = useTheme();
//   useScrollReveal();

//   const brandCss = `
//     :root {
//       --font-sans: 'Inter', -apple-system, sans-serif;
//       --font-mono: 'JetBrains Mono', monospace;
//     }
//   `;

//   const stats = [
//     { val: 500, suffix: "+", label: "Active Students" },
//     { val: 40, suffix: " GB", label: "GPU VRAM (4090)" },
//     { val: 15, suffix: " GB", label: "Storage / User" },
//     { val: 99, suffix: "%", label: "Uptime SLA" },
//   ];

//   const steps = [
//     { num: "01", icon: I.template, title: "Choose Template", items: ["Jupyter Notebook", "VS Code Server", "Stateful Desktop", "Custom CLI"] },
//     { num: "02", icon: I.config, title: "Configure Resources", items: ["Pick GPU tier", "Set memory & vCPU", "Choose OS image", "Set session duration"] },
//     { num: "03", icon: I.launch, title: "Launch Instance", items: ["One-click launch", "Ready in < 30s", "Auto-mount storage", "SSO identity injected"] },
//     { num: "04", icon: I.tools, title: "Development Tools", items: ["Full terminal access", "SSH key support", "File upload/download", "Live port forwarding"] },
//     { num: "05", icon: I.deploy, title: "Manage & Monitor", items: ["Pause / Resume", "Real-time billing", "Session event log", "Quota analytics"] },
//   ];


//   const faqs = [
//     { q: "What types of GPUs are available on LaaS?", a: "LaaS provides access to NVIDIA 4090(40 GB & 80 GB) and H100 GPUs. Fractional GPU allocation via HAMI is available for lighter workloads, allowing multiple users to share a single GPU efficiently." },
//     { q: "How is storage handled across sessions?", a: "Institution SSO users receive a dedicated 15 GB persistent ZFS dataset on first login. This dataset is mounted automatically into every session, so your datasets, notebooks, and code persist indefinitely between sessions." },
//     { q: "Can I access my session via SSH?", a: "Yes. Every session exposes an SSH endpoint. You can upload your public SSH keys through the Account → SSH Keys panel and connect directly from your local terminal." },
//     { q: "How does billing work?", a: "LaaS uses a wallet-based credit system with per-second billing charges. Active sessions burn credits at the configured compute rate. Paused sessions only incur minimal storage fees. You can set spend limits and view a real-time daily spend chart on your dashboard." },
//     { q: "Do I need to set up Keycloak for university SSO?", a: "Admins configure the Keycloak IDP federation (SAML or OIDC) once per institution. After that, all students and faculty can sign in using their existing university email credentials — no additional signup required." },
//     { q: "What happens when a session is idle?", a: "Sessions that exceed a configurable idle threshold are automatically terminated to conserve resources. Files saved to the persistent storage volume are always preserved regardless of session termination status." },
//   ];

//   const pricing = [
//     { title: "Ephemeral CPU", desc: "For quick notebook execution and SSH CLI", price: "₹10", spec: "2 vCPU · 4GB RAM", badge: undefined, highlight: false },
//     { title: "Ephemeral GPU-S", desc: "Fractional GPU for light ML inference", price: "₹40", spec: "4GB VRAM · 2 vCPU", badge: undefined, highlight: false },
//     { title: "Stateful 'Pro' GPU", desc: "Persistent GUI Desktop w/ fractional GPU", price: "₹60", spec: "4GB VRAM · 4 vCPU · 8GB RAM", badge: "Popular", highlight: true },
//     { title: "Full Machine Node", desc: "100% exclusive access. No noisy neighbors.", price: "₹300", spec: "32GB VRAM · 16 vCPU · 48GB RAM", badge: undefined, highlight: false },
//   ];

//   return (
//     <>
//       <Head>
//         <style>{brandCss}</style>
//       </Head>
//       <style>{`
//         @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
//         @keyframes gridPulse { 0%,100%{opacity:0.2} 50%{opacity:0.35} }
//         .land-section { padding: 90px 48px; max-width: 1140px; margin: 0 auto; }
//         .land-section-full { padding: 90px 48px; }
//         .hero-grid {
//           background-image: linear-gradient(var(--borderColor-default) 1px, transparent 1px),
//                             linear-gradient(90deg, var(--borderColor-default) 1px, transparent 1px);
//           background-size: 56px 56px;
//           animation: gridPulse 6s ease infinite;
//         }
//         @media (max-width: 860px) {
//           .hero-split { flex-direction: column !important; }
//           .land-section { padding: 64px 20px; }
//         }
//         .highlight-text { color: ${ACCENT}; }

//         /* Scroll Reveal Animations */
//         .reveal-on-scroll {
//           opacity: 0;
//           transform: translateY(30px) scale(0.98);
//           transition: opacity 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
//           will-change: opacity, transform;
//         }
//         .reveal-on-scroll.revealed {
//           opacity: 1;
//           transform: translateY(0) scale(1);
//         }
//       `}</style>

//       <Nav isDark={isDark} onToggle={toggle} />

//       {/* ── HERO ── */}
//       <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden" }}>
//         {/* Grid bg */}
//         <div className="hero-grid" style={{ position: "absolute", inset: 0, opacity: 0.25, pointerEvents: "none" }} />
//         {/* Radial glow top-left */}
//         <div style={{ position: "absolute", top: -120, left: -120, width: 600, height: 600, background: `radial-gradient(circle, ${ACCENT_GLOW} 0%, transparent 70%)`, pointerEvents: "none" }} />

//         <div className="hero-split" style={{ display: "flex", alignItems: "center", gap: 56, padding: "100px 48px 60px", maxWidth: 1140, margin: "0 auto", width: "100%", position: "relative" }}>
//           {/* Left */}
//           <div style={{ flex: 1, minWidth: 0 }}>
//             <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", background: "var(--bgColor-mild)", border: `1px solid ${ACCENT}`, borderRadius: 9999, marginBottom: 28, animation: "fadeUp 0.4s ease 0.1s both" }}>
//               <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
//               <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: ACCENT }}>KSRCE AI Lab Infrastructure</span>
//             </div>
//             <h1 style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(2.8rem, 6vw, 4.8rem)", fontWeight: 800, lineHeight: 1.05, color: "var(--fgColor-default)", marginBottom: 12, letterSpacing: "-0.03em", animation: "fadeUp 0.4s ease 0.2s both" }}>
//               Rent GPUs.
//             </h1>
//             <h1 style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(2.8rem, 6vw, 4.8rem)", fontWeight: 800, lineHeight: 1.05, color: ACCENT, marginBottom: 28, letterSpacing: "-0.03em", animation: "fadeUp 0.4s ease 0.3s both" }}>
//               Ship Faster.
//             </h1>
//             <p style={{ fontFamily: "var(--font-sans)", fontSize: "1.05rem", lineHeight: 1.75, color: "var(--fgColor-muted)", maxWidth: 460, marginBottom: 36, animation: "fadeUp 0.4s ease 0.4s both" }}>
//               LaaS gives KSRCE students and researchers instant access to NVIDIA 4090&amp; H100 GPUs, upto100 GB persistent storage, and Jupyter notebooks — secured by university SSO.
//             </p>
//             <div style={{ display: "flex", gap: 12, flexWrap: "wrap", animation: "fadeUp 0.4s ease 0.5s both" }}>
//               <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 30px", background: ACCENT, color: "#fff", fontFamily: "var(--font-sans)", fontSize: "1rem", fontWeight: 700, borderRadius: 8, border: `1px solid ${ACCENT}`, textDecoration: "none", boxShadow: `0 4px 24px ${ACCENT_GLOW}`, transition: "all 0.2s" }}
//                 onMouseEnter={e => { e.currentTarget.style.background = ACCENT_DARK; e.currentTarget.style.transform = "translateY(-2px)"; }}
//                 onMouseLeave={e => { e.currentTarget.style.background = ACCENT; e.currentTarget.style.transform = "translateY(0)"; }}>
//                 Launch a GPU →
//               </Link>
//               <a href="#how-it-works" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 30px", background: "transparent", color: "var(--fgColor-default)", fontFamily: "var(--font-sans)", fontSize: "1rem", fontWeight: 500, borderRadius: 8, border: "1px solid var(--borderColor-default)", textDecoration: "none", transition: "all 0.2s" }}
//                 onMouseEnter={e => { e.currentTarget.style.background = "var(--bgColor-mild)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
//                 onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "translateY(0)"; }}>
//                 See How It Works
//               </a>
//             </div>
//           </div>

//           {/* Right — Terminal */}
//           <div style={{ flex: 1, minWidth: 0, animation: "fadeUp 0.5s ease 0.5s both" }}>
//             <HeroTerminal />
//           </div>
//         </div>
//       </section>

//       {/* ── STATS ── */}
//       <div className="reveal-on-scroll" style={{ borderTop: "1px solid var(--borderColor-default)", borderBottom: "1px solid var(--borderColor-default)", background: "var(--bgColor-mild)" }}>
//         <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 48px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
//           {stats.map((s, i) => (
//             <div key={i} style={{ padding: "32px 24px", borderRight: i < stats.length - 1 ? "1px solid var(--borderColor-default)" : "none", textAlign: "center" }}>
//               <div style={{ fontFamily: "var(--font-sans)", fontSize: "2.2rem", fontWeight: 800, color: "var(--fgColor-default)", lineHeight: 1, marginBottom: 6 }}>
//                 <Counter end={s.val} suffix={s.suffix} />
//               </div>
//               <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--fgColor-muted)" }}>{s.label}</div>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* ── TRUSTED BY ── */}
//       <div className="reveal-on-scroll" style={{ borderBottom: "1px solid var(--borderColor-default)", padding: "28px 48px", textAlign: "center" }}>
//         <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", fontWeight: 600, color: "var(--fgColor-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 20 }}>
//           Powering institutions that push boundaries
//         </div>
//         <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "20px 48px" }}>
//           {["KSRCE", "Partner Colleges", "Research Groups", "Industry Labs", "Govt. R&D Units"].map(l => (
//             <span key={l} style={{ fontFamily: "var(--font-sans)", fontSize: "0.9rem", fontWeight: 600, color: "var(--fgColor-muted)", letterSpacing: "0.03em" }}>{l}</span>
//           ))}
//         </div>
//       </div>

//       {/* ── HOW IT WORKS (5 steps) ── */}
//       <section id="how-it-works">
//         <div className="land-section reveal-on-scroll">
//           <div style={{ textAlign: "center", marginBottom: 56 }}>
//             <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>How It Works</div>
//             <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, color: "var(--fgColor-default)", letterSpacing: "-0.02em", marginBottom: 14 }}>Launch AI Workspaces<br />in Minutes</h2>
//             <p style={{ fontFamily: "var(--font-sans)", fontSize: "1rem", color: "var(--fgColor-muted)", maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>From template to production in five steps. No hardware hassles — just pure computational power on-demand.</p>
//           </div>
//           <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 18 }}>
//             {steps.map((s, i) => (
//               <div key={i} className="reveal-on-scroll" style={{ transitionDelay: `${i * 0.1}s` }}>
//                 <StepCard {...s} />
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* ── YOUR GPU, YOUR TERMINAL ── */}
//       <section className="reveal-on-scroll" style={{ background: "var(--bgColor-mild)", borderTop: "1px solid var(--borderColor-default)", borderBottom: "1px solid var(--borderColor-default)" }}>
//         <div className="land-section hero-split" style={{ display: "flex", gap: 56, alignItems: "center" }}>
//           {/* Left — terminal */}
//           <div style={{ flex: 1, minWidth: 0 }}>
//             <div style={{ background: "var(--bgColor-muted)", border: "1px solid var(--borderColor-default)", borderRadius: 10, overflow: "hidden", fontFamily: "var(--font-mono),ui-monospace,monospace", fontSize: "0.82rem", lineHeight: 1.8 }}>
//               <div style={{ background: "var(--bgColor-mild)", borderBottom: "1px solid var(--borderColor-default)", padding: "10px 18px", display: "flex", alignItems: "center", gap: 8 }}>
//                 <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
//                 <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
//                 <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
//                 <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--fgColor-muted)" }}>ssh student@sess.laas.io</span>
//               </div>
//               <div style={{ padding: "18px 22px" }}>
//                 <div style={{ color: "var(--fgColor-muted)" }}>Welcome to LaaS Node gpu-01.ksrce.edu.in</div>
//                 <div style={{ color: "var(--fgColor-muted)" }}>NVIDIA 409040 GB · CUDA 12.2 · Ubuntu 22.04</div>
//                 <div style={{ height: 12 }} />
//                 <div style={{ color: "var(--fgColor-default)" }}>$ nvidia-smi --query-gpu=name,memory.total --format=csv,noheader</div>
//                 <div style={{ color: "#22c55e" }}>NVIDIA 4090-SXM4-40GB, 40960 MiB</div>
//                 <div style={{ height: 8 }} />
//                 <div style={{ color: "var(--fgColor-default)" }}>$ du -sh ~/data/</div>
//                 <div style={{ color: "var(--fgColor-muted)" }}>3.2G    /home/student/data/</div>
//                 <div style={{ height: 8 }} />
//                 <div style={{ color: "var(--fgColor-default)" }}>$ python train.py --epochs 50 --model resnet50</div>
//                 <div style={{ color: "#22c55e" }}>Epoch  1/50  loss: 2.4132  acc: 0.312 ✓</div>
//                 <div style={{ color: "#22c55e" }}>Epoch  2/50  loss: 1.9820  acc: 0.418 ✓</div>
//                 <div style={{ color: ACCENT }}>▊</div>
//               </div>
//             </div>
//           </div>
//           {/* Right */}
//           <div style={{ flex: 1, minWidth: 0 }}>
//             <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>Full Linux Access</div>
//             <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 800, color: "var(--fgColor-default)", letterSpacing: "-0.02em", marginBottom: 20, lineHeight: 1.15 }}>Your GPU,<br />Your Terminal</h2>
//             <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.95rem", lineHeight: 1.75, color: "var(--fgColor-muted)", marginBottom: 28 }}>Get root-level SSH access to your GPU node. Run any workload — training, inference, data processing — with no restrictions. Your home directory persists across all sessions.</p>
//             <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
//               {[
//                 "Instance & session management from dashboard",
//                 "Managed background runs with log tailing",
//                 "File transfer via SCP, SFTP or browser UI",
//                 "Agent-native API for CI/CD automation",
//               ].map((f, i) => (
//                 <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
//                   <span style={{ color: "#22c55e", flexShrink: 0 }}>{I.check}</span>
//                   <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.88rem", color: "var(--fgColor-default)" }}>{f}</span>
//                 </div>
//               ))}
//             </div>
//             <div style={{ marginTop: 32 }}>
//               <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 26px", background: ACCENT, color: "#fff", fontFamily: "var(--font-sans)", fontSize: "0.9rem", fontWeight: 600, borderRadius: 7, textDecoration: "none", transition: "all 0.2s" }}
//                 onMouseEnter={e => (e.currentTarget.style.background = ACCENT_DARK)}
//                 onMouseLeave={e => (e.currentTarget.style.background = ACCENT)}>
//                 Start Free →
//               </Link>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* ── WHY CHOOSE US ── */}
//       <section id="features">
//         <div className="land-section">
//           <div style={{ textAlign: "center", marginBottom: 56 }}>
//             <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>Why Choose Us</div>
//             <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, color: "var(--fgColor-default)", letterSpacing: "-0.02em" }}>Built for Academia, Better than Cloud</h2>
//             <p style={{ fontFamily: "var(--font-sans)", fontSize: "1rem", color: "var(--fgColor-muted)", marginTop: 12, maxWidth: 640, margin: "12px auto 0", lineHeight: 1.6 }}>LaaS eliminates the hidden costs and complexity of AWS/GCP, offering zero-setup persistent storage and tailored institutional integration.</p>
//           </div>
//           <FeatureComparison />
//         </div>
//       </section>

//       {/* ── PRICING ── */}
//       <section id="pricing" style={{ background: "var(--bgColor-mild)", borderTop: "1px solid var(--borderColor-default)", borderBottom: "1px solid var(--borderColor-default)" }}>
//         <div className="land-section">
//           <div style={{ textAlign: "center", marginBottom: 56 }}>
//             <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>Pricing</div>
//             <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, color: "var(--fgColor-default)", letterSpacing: "-0.02em", marginBottom: 12 }}>Pay as you go</h2>
//             <p style={{ fontFamily: "var(--font-sans)", fontSize: "1rem", color: "var(--fgColor-muted)", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>Our pricing model lets you pay only for what you use. No minimum commitments. Paused instances only incur storage fees.</p>
//           </div>
//           <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 18, marginBottom: 36 }}>
//             {pricing.map((p, i) => <PricingCard key={i} {...p} />)}
//           </div>
//           {/* Feature checklist */}
//           <div style={{ background: "var(--bgColor-default)", border: "1px solid var(--borderColor-default)", borderRadius: 10, padding: "28px 32px" }}>
//             <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--fgColor-muted)", marginBottom: 18 }}>All plans include</div>
//             <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "10px 40px" }}>
//               {["Persistent ZFS storage", "SSH & browser file access", "Pre-built ML images (CUDA, PyTorch)", "University SSO login", "Real-time billing dashboard", "Session pause / resume", "Spend limit controls", "Priority email support"].map((f, i) => (
//                 <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
//                   <span style={{ color: "#22c55e" }}>{I.check}</span>
//                   <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", color: "var(--fgColor-default)" }}>{f}</span>
//                 </div>
//               ))}
//             </div>
//           </div>
//           <div style={{ textAlign: "center", marginTop: 32 }}>
//             <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 32px", background: ACCENT, color: "#fff", fontFamily: "var(--font-sans)", fontSize: "1rem", fontWeight: 700, borderRadius: 8, textDecoration: "none", boxShadow: `0 4px 24px ${ACCENT_GLOW}`, transition: "all 0.2s" }}
//               onMouseEnter={e => { e.currentTarget.style.background = ACCENT_DARK; e.currentTarget.style.transform = "translateY(-2px)"; }}
//               onMouseLeave={e => { e.currentTarget.style.background = ACCENT; e.currentTarget.style.transform = "translateY(0)"; }}>
//               Start Free — No Credit Card →
//             </Link>
//           </div>
//         </div>
//       </section>

//       {/* ── FAQ ── */}
//       <section id="faq">
//         <div className="land-section">
//           <div style={{ textAlign: "center", marginBottom: 56 }}>
//             <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>FAQ</div>
//             <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, color: "var(--fgColor-default)", letterSpacing: "-0.02em" }}>Frequently Asked Questions</h2>
//           </div>
//           <div style={{ maxWidth: 780, margin: "0 auto" }}>
//             {faqs.map((f, i) => <FAQ key={i} {...f} />)}
//           </div>
//         </div>
//       </section>

//       {/* ── CTA BANNER ── */}
//       <section style={{ background: `linear-gradient(135deg, #0e1a3a 0%, #0b0d18 100%)`, padding: "80px 48px", textAlign: "center", position: "relative", overflow: "hidden" }}>
//         <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 700, height: 400, background: `radial-gradient(ellipse, ${ACCENT_GLOW} 0%, transparent 70%)`, pointerEvents: "none" }} />
//         <div style={{ position: "relative" }}>
//           <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 14 }}>Ready to launch your first GPU session?</h2>
//           <p style={{ fontFamily: "var(--font-sans)", fontSize: "1rem", color: "rgba(255,255,255,0.6)", marginBottom: 36, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 36px" }}>Sign up with your university email or institutional SSO and be running model training within 60 seconds.</p>
//           <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
//             <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 36px", background: ACCENT, color: "#fff", fontFamily: "var(--font-sans)", fontSize: "1rem", fontWeight: 700, borderRadius: 8, textDecoration: "none", boxShadow: `0 4px 24px rgba(79,110,247,0.5)`, transition: "all 0.2s" }}
//               onMouseEnter={e => { e.currentTarget.style.background = ACCENT_DARK; e.currentTarget.style.transform = "translateY(-2px)"; }}
//               onMouseLeave={e => { e.currentTarget.style.background = ACCENT; e.currentTarget.style.transform = "translateY(0)"; }}>
//               Create Account →
//             </Link>
//             <Link href="/signin" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 36px", background: "transparent", color: "#fff", fontFamily: "var(--font-sans)", fontSize: "1rem", fontWeight: 500, borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", textDecoration: "none", transition: "all 0.2s" }}
//               onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
//               onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "translateY(0)"; }}>
//               Sign In
//             </Link>
//           </div>
//         </div>
//       </section>

//       {/* ── FOOTER ── */}
//       <footer style={{ borderTop: "1px solid var(--borderColor-default)", padding: "28px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
//         <span style={{ fontFamily: "var(--font-sans)", fontSize: "1rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fgColor-default)" }}>LaaS</span>
//         <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.8rem", color: "var(--fgColor-muted)" }}>KSRCE AI Lab — Lab as a Service Platform · © 2025</span>
//         <div style={{ display: "flex", gap: 24 }}>
//           {["Privacy", "Terms", "Docs", "Pricing"].map(l => (
//             <a key={l} href="#" style={{ fontFamily: "var(--font-sans)", fontSize: "0.8rem", color: "var(--fgColor-muted)", textDecoration: "none", transition: "color 0.15s" }}
//               onMouseEnter={e => (e.currentTarget.style.color = "var(--fgColor-default)")}
//               onMouseLeave={e => (e.currentTarget.style.color = "var(--fgColor-muted)")}>
//               {l}
//             </a>
//           ))}
//         </div>
//       </footer>
//     </>
//   );
// }


"use client";

import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { getMe, checkWaitlistStatus, getWaitlistCount } from "@/lib/api";
import type { WaitlistStatusResponse } from "@/lib/api";
import { getIdToken } from "@/lib/token";
import { SignOutModal } from "@/components/sign-out-modal";
import type { User } from "@/types/auth";

// ─── Globals ─────────────────────────────────────────────────────────────────
const ACCENT = "#4f6ef7";
const ACCENT_DARK = "#3a56d4";
const ACCENT_GLOW = "rgba(79,110,247,0.18)";



// ─── Particles ───────────────────────────────────────────────────────────────
function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const dots = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.5 + 0.1,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dots.forEach(d => {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0) d.x = canvas.width;
        if (d.x > canvas.width) d.x = 0;
        if (d.y < 0) d.y = canvas.height;
        if (d.y > canvas.height) d.y = 0;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100,160,255,${d.opacity})`;
        ctx.fill();
      });
      dots.forEach((a, i) => {
        dots.slice(i + 1).forEach(b => {
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(79,110,247,${0.07 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}
    />
  );
}

function BentoStepCard({ num, icon, title, desc, items, color, glow2, border }: {
  num: string; icon: React.ReactNode; title: string; desc: string; items: string[];
  color: string; glow2: string; border: string;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position: "relative",
        background: hov ? "#191c24" : "#111318",
        border: `1px solid ${hov ? border : "rgba(255,255,255,0.08)"}`,
        borderRadius: 16,
        padding: "24px 28px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transition: "all 0.3s ease",
      }}>

      {/* Huge Watermark Number */}
      <div style={{
        position: "absolute",
        top: -24,
        right: -12,
        fontFamily: "var(--font-sans)",
        fontSize: "10rem",
        fontWeight: 900,
        lineHeight: 0.8,
        color: hov ? color : "white",
        opacity: hov ? 0.08 : 0.03,
        transition: "all 0.4s ease",
        pointerEvents: "none",
        userSelect: "none",
        letterSpacing: "-0.05em",
        zIndex: 0
      }}>
        {num}
      </div>

      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Icon Box */}
        <div style={{
          width: 44, height: 44,
          borderRadius: 10,
          background: "transparent",
          border: `1px solid rgba(255,255,255,0.06)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: color,
          marginBottom: 16,
          transition: "all 0.3s",
        }}>
          {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 20 })}
        </div>

        {/* Title */}
        <h3 style={{
          fontFamily: "var(--font-sans)",
          fontSize: "1.25rem",
          fontWeight: 800,
          color: "white",
          marginBottom: 6,
          letterSpacing: "-0.02em"
        }}>
          {title}
        </h3>

        {/* Description */}
        <p style={{
          fontFamily: "var(--font-sans)",
          fontSize: "0.85rem",
          color: "rgba(255,255,255,0.45)",
          lineHeight: 1.5,
          marginBottom: 16,
        }}>
          {desc}
        </p>

        {/* Pill list at the bottom */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: "auto" }}>
          {items.map((it, i) => (
            <span key={i} style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.7rem",
              fontWeight: 500,
              color: color,
              background: "rgba(255,255,255,0.02)",
              border: `1px solid rgba(255,255,255,0.05)`,
              borderRadius: 6,
              padding: "4px 10px",
              transition: "all 0.2s"
            }}>
              {it}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}



// ─── Theme Hook ──────────────────────────────────────────────────────────────
function useTheme() {
  const [isDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    try { localStorage.setItem('darkMode', 'true'); } catch(e) {}
  }, []);

  const toggle = () => {};

  return [isDark, toggle] as const;
}

// ─── Scroll Reveal Hook ──────────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    document.querySelectorAll(".reveal-on-scroll").forEach(e => observer.observe(e));
    return () => observer.disconnect();
  }, []);
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav({ isDark, onToggle, isAuthenticated, userName, waitlistStatus, waitlistCount, isMobile }: { isDark: boolean; onToggle: () => void; isAuthenticated?: boolean; userName?: string | null; waitlistStatus?: WaitlistStatusResponse | null; waitlistCount?: number; isMobile?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    if (!isMobile) setMobileMenuOpen(false);
  }, [isMobile]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const performSignOut = () => {
    const idToken = getIdToken();
    const darkMode = localStorage.getItem("darkMode");
    localStorage.clear();
    sessionStorage.clear();
    if (darkMode) localStorage.setItem("darkMode", darkMode);
    setIsSignOutModalOpen(false);
    const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL;
    const keycloakRealm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || "laas";
    if (keycloakUrl) {
      const appUrl = window.location.origin;
      let logoutUrl = `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/logout`;
      const params = new URLSearchParams();
      if (idToken) params.set("id_token_hint", idToken);
      params.set("post_logout_redirect_uri", `${appUrl}/`);
      logoutUrl += `?${params.toString()}`;
      window.location.href = logoutUrl;
    } else {
      window.location.href = "/";
    }
  };

  return (
    <>
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
      height: 64,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: isMobile ? "0 16px" : "0 48px",
      background: scrolled ? (isDark ? "rgba(8,10,18,0.92)" : "rgba(245,245,240,0.92)") : "transparent",
      borderBottom: scrolled ? `1px solid var(--borderColor-default)` : "1px solid transparent",
      backdropFilter: scrolled ? "blur(14px)" : "none",
      transition: "all 0.3s ease",
    }}>
      <Link href="/" style={{ display: "flex", alignItems: "center" }}>
        <img src="/images/ksrce-logo.png" alt="KSRCE LaaS" style={{ height: isMobile ? 36 : 44, objectFit: "contain", verticalAlign: "middle" }} />
      </Link>

      {/* Desktop center nav links */}
      {!isMobile && (
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {["Features", "How It Works", "Pricing", "FAQ"].map((l, i) => (
            <a key={l} href={i === 0 ? "#capabilities" : `#${l.toLowerCase().replace(/ /g, "-")}`}
              style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", color: "var(--fgColor-muted)", textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--fgColor-default)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--fgColor-muted)")}>
              {l}
            </a>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 10 }}>
        {/* Demand badge — hidden on mobile to save space */}
        {!isMobile && !(isAuthenticated && waitlistStatus?.enrolled) && (waitlistCount ?? 0) > 0 && (
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 10px",
            background: "rgba(251,146,60,0.10)",
            border: "1px solid rgba(251,146,60,0.25)",
            borderRadius: 6,
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#fb923c",
              flexShrink: 0,
            }} />
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.72rem", fontWeight: 600, color: "#fb923c", whiteSpace: "nowrap" }}>
              {waitlistCount}+ on the waitlist
            </span>
          </span>
        )}
        {isAuthenticated ? (
          <>
            {/* Waitlist status indicator for enrolled users — hide on mobile */}
            {!isMobile && waitlistStatus?.enrolled && (
              <Link
                href="/waitlist"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 12px",
                  background: isDark ? "rgba(79,110,247,0.12)" : "rgba(79,110,247,0.08)",
                  border: "1px solid rgba(79,110,247,0.3)",
                  borderRadius: 6,
                  textDecoration: "none",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = isDark ? "rgba(79,110,247,0.2)" : "rgba(79,110,247,0.15)")}
                onMouseLeave={e => (e.currentTarget.style.background = isDark ? "rgba(79,110,247,0.12)" : "rgba(79,110,247,0.08)")}
              >
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#22c55e",
                  flexShrink: 0,
                }} />
                <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", fontWeight: 600, color: "var(--fgColor-default)" }}>
                  #{waitlistStatus.position}
                </span>
                <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", color: "var(--fgColor-muted)" }}>
                  of {waitlistStatus.totalCount} in waitlist
                </span>
              </Link>
            )}
            <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", fontWeight: 500, color: "var(--fgColor-default)", padding: isMobile ? "6px 10px" : "7px 18px", border: "1px solid var(--borderColor-default)", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bgColor-muted)")}
              onMouseLeave={e => { if (!showDropdown) e.currentTarget.style.background = "transparent"; }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              {!isMobile && (userName || "Account")}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2, transition: "transform 0.2s", transform: showDropdown ? "rotate(180deg)" : "rotate(0deg)" }}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {showDropdown && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, minWidth: 180, background: isDark ? "rgba(15,17,25,0.98)" : "rgba(255,255,255,0.98)", border: "1px solid var(--borderColor-default)", borderRadius: 8, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", overflow: "hidden", backdropFilter: "blur(12px)", zIndex: 300 }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--borderColor-default)" }}>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.8rem", fontWeight: 600, color: "var(--fgColor-default)" }}>{userName || "Account"}</div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.7rem", color: "var(--fgColor-muted)", marginTop: 2 }}>Signed in</div>
                </div>
                <button
                  onClick={() => { setShowDropdown(false); setIsSignOutModalOpen(true); }}
                  style={{ width: "100%", padding: "10px 16px", fontFamily: "var(--font-sans)", fontSize: "0.82rem", fontWeight: 500, color: "#ef4444", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8, transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
          </>
        ) : (
          <Link href="/signin"
            style={{ fontFamily: "var(--font-sans)", fontSize: isMobile ? "0.8rem" : "0.875rem", fontWeight: 500, color: "var(--fgColor-default)", textDecoration: "none", padding: isMobile ? "6px 12px" : "7px 18px", border: "1px solid var(--borderColor-default)", borderRadius: 6, transition: "all 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bgColor-muted)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            Sign In
          </Link>
        )}
        {/* Hide "Get Started" button for users already enrolled in waitlist */}
        {!(isAuthenticated && waitlistStatus?.enrolled) && (
          <Link href={isAuthenticated ? "/waitlist" : "/signup"}
            style={{ fontFamily: "var(--font-sans)", fontSize: isMobile ? "0.8rem" : "0.875rem", fontWeight: 600, color: "#fff", textDecoration: "none", padding: isMobile ? "6px 12px" : "7px 20px", backgroundColor: ACCENT, borderRadius: 6, border: `1px solid ${ACCENT}`, transition: "all 0.15s", boxShadow: `0 0 20px ${ACCENT_GLOW}` }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}>
            {isMobile ? "Join" : "Get Started →"}
          </Link>
        )}

        {/* Hamburger menu button — mobile only */}
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ background: "transparent", border: "1px solid var(--borderColor-default)", borderRadius: 6, width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fgColor-default)", flexShrink: 0, transition: "all 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bgColor-muted)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            {mobileMenuOpen
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            }
          </button>
        )}
      </div>
    </nav>

    {/* Mobile menu overlay */}
    {isMobile && mobileMenuOpen && (
      <div style={{
        position: "fixed", top: 64, left: 0, right: 0, zIndex: 199,
        background: isDark ? "rgba(8,10,18,0.97)" : "rgba(245,245,240,0.97)",
        borderBottom: `1px solid var(--borderColor-default)`,
        backdropFilter: "blur(16px)",
        padding: "16px 20px 24px",
        display: "flex", flexDirection: "column", gap: 4,
      }}>
        {["Features", "How It Works", "Pricing", "FAQ"].map((l, i) => (
          <a key={l}
            href={i === 0 ? "#capabilities" : `#${l.toLowerCase().replace(/ /g, "-")}`}
            onClick={() => setMobileMenuOpen(false)}
            style={{ fontFamily: "var(--font-sans)", fontSize: "1rem", fontWeight: 500, color: "var(--fgColor-default)", textDecoration: "none", padding: "14px 8px", borderBottom: "1px solid var(--borderColor-default)", display: "block" }}>
            {l}
          </a>
        ))}
        {/* Waitlist badge in mobile menu */}
        {!(isAuthenticated && waitlistStatus?.enrolled) && (waitlistCount ?? 0) > 0 && (
          <div style={{ padding: "12px 8px", borderBottom: "1px solid var(--borderColor-default)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "rgba(251,146,60,0.10)", border: "1px solid rgba(251,146,60,0.25)", borderRadius: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fb923c" }} />
              <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.8rem", fontWeight: 600, color: "#fb923c" }}>{waitlistCount}+ on the waitlist</span>
            </span>
          </div>
        )}
        {isAuthenticated && waitlistStatus?.enrolled && (
          <Link href="/waitlist" onClick={() => setMobileMenuOpen(false)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 8px", borderBottom: "1px solid var(--borderColor-default)", textDecoration: "none" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.9rem", fontWeight: 600, color: "var(--fgColor-default)" }}>#{waitlistStatus.position} of {waitlistStatus.totalCount} in waitlist</span>
          </Link>
        )}
      </div>
    )}

    <SignOutModal
      isOpen={isSignOutModalOpen}
      onClose={() => setIsSignOutModalOpen(false)}
      onConfirm={performSignOut}
    />
    </>
  );
}

// ─── Terminal Block ───────────────────────────────────────────────────────────
// Each step is either a "cmd" (typewriter-typed) or "output" (appears instantly).
// After all steps play, the terminal clears and loops.
type TermStep =
  | { type: "cmd"; text: string }
  | { type: "output"; lines: { t: string; s: string }[] };

const termSequence: TermStep[] = [
  { type: "cmd", text: "$ laas login --sso ksrce.edu.in" },
  {
    type: "output", lines: [
      { t: "ok", s: "✓  Authenticated via KSRCE SSO" },
      { t: "ok", s: "✓  Storage provisioned" },
    ]
  },
  { type: "cmd", text: "$ laas launch --gpu 5090 --type jupyter" },
  {
    type: "output", lines: [
      { t: "muted", s: "  Selecting node …" },
      { t: "muted", s: "  Pulling image  laas/jupyter:cuda12" },
      { t: "ok", s: "✓  Session live in 8s" },
      { t: "url", s: "  → https://sess.laas.io/xk9f2a" },
    ]
  },
  { type: "cmd", text: "$ laas status" },
  {
    type: "output", lines: [
      { t: "muted", s: "  GPU   RTX 5090 32 GB   vCPU 8   RAM 16 GB" },
      { t: "ok", s: "  Status: ● Running" },
      { t: "url", s: "  Cost:  ₹210/hr" },
    ]
  },
];

const CHAR_DELAY = 38;       // ms per character when typing a command
const OUTPUT_LINE_DELAY = 280; // ms between each output line appearing
const LOOP_PAUSE = 2500;     // ms pause before clearing and restarting

function HeroTerminal() {
  const [lines, setLines] = useState<{ t: string; s: string }[]>([]);
  const [typingText, setTypingText] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const waitSleep = (ms: number) =>
      new Promise<void>((resolve, reject) => {
        const id = setTimeout(() => {
          if (cancelled) reject(new Error("cancelled"));
          else resolve();
        }, ms);
        timers.push(id);
      });

    async function runSequence() {
      try {
        while (!cancelled) {
          setLines([]);
          setTypingText("");
          setShowCursor(true);

          for (const step of termSequence) {
            if (cancelled) return;

            if (step.type === "cmd") {
              for (let i = 0; i <= step.text.length; i++) {
                if (cancelled) return;
                setTypingText(step.text.slice(0, i));
                await waitSleep(CHAR_DELAY);
              }
              await waitSleep(200);
              setLines(prev => [...prev, { t: "cmd", s: step.text }]);
              setTypingText("");
            } else {
              for (const line of step.lines) {
                if (cancelled) return;
                setLines(prev => [...prev, line]);
                await waitSleep(OUTPUT_LINE_DELAY);
              }
              setLines(prev => [...prev, { t: "", s: "" }]);
              await waitSleep(150);
            }
          }

          await waitSleep(LOOP_PAUSE);
        }
      } catch {
        // cancelled — silently stop
      }
    }

    runSequence();
    return () => {
      cancelled = true;
      timers.forEach(id => clearTimeout(id));
    };
  }, []);

  const col: Record<string, string> = {
    cmd: "var(--fgColor-default)", ok: "#22c55e",
    muted: "var(--fgColor-muted)", url: ACCENT, cursor: ACCENT,
  };

  return (
    <div style={{ background: "var(--bgColor-mild)", border: "1px solid var(--borderColor-default)", borderRadius: 10, overflow: "hidden", fontFamily: "var(--font-mono),ui-monospace,monospace", fontSize: "0.82rem", lineHeight: 1.75 }}>
      <style>{`
        @keyframes blink-cursor { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
      `}</style>
      <div style={{ display: "flex", gap: 7, padding: "10px 16px", background: "var(--bgColor-muted)", borderBottom: "1px solid var(--borderColor-default)", alignItems: "center" }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
        <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--fgColor-muted)" }}>laas — bash</span>
      </div>
      <div style={{ padding: "18px 22px", minHeight: 240 }}>
        {lines.map((l, i) => (
          <div key={i} style={{ color: col[l.t] ?? "var(--fgColor-default)" }}>{l.s || "\u00A0"}</div>
        ))}
        {/* Current typing line with blinking cursor */}
        {typingText !== "" && (
          <div style={{ color: "var(--fgColor-default)" }}>
            {typingText}
            <span style={{ color: ACCENT, animation: "blink-cursor 1s step-end infinite", fontWeight: 700 }}>▊</span>
          </div>
        )}
        {/* Resting cursor when not typing */}
        {typingText === "" && showCursor && (
          <div style={{ color: "var(--fgColor-default)" }}>
            <span style={{ color: ACCENT, animation: "blink-cursor 1s step-end infinite", fontWeight: 700 }}>▊</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Animated counter ────────────────────────────────────────────────────────
function Counter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true;
        const dur = 1600, step = 16, inc = end / (dur / step);
        let cur = 0;
        const timer = setInterval(() => {
          cur += inc;
          if (cur >= end) { setV(end); clearInterval(timer); }
          else setV(Math.floor(cur));
        }, step);
      }
    }, { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end]);
  return <span ref={ref}>{v.toLocaleString()}{suffix}</span>;
}



function FeatureComparison() {
  const gridRef = useRef<HTMLDivElement>(null);

  // Mouse spotlight
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll<HTMLElement>(".bento-card"));
    const onMove = (e: MouseEvent) => {
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        card.style.setProperty("--my", `${e.clientY - rect.top}px`);
      });
    };
    grid.addEventListener("mousemove", onMove);
    return () => grid.removeEventListener("mousemove", onMove);
  }, []);

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add("bento-revealed");
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
    gridRef.current?.querySelectorAll(".bento-animate").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        .bento-card {
          position: relative;
          background: var(--bgColor-mild);
          border: 1px solid var(--borderColor-default);
          border-radius: 20px;
          overflow: hidden;
          transition: border-color 0.3s, transform 0.3s;
        }
        .bento-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(320px circle at var(--mx,50%) var(--my,50%), rgba(79,110,247,0.07), transparent 70%);
          opacity: 0;
          transition: opacity 0.4s;
          pointer-events: none;
          z-index: 0;
        }
        .bento-card:hover::before { opacity: 1; }
        .bento-card:hover { border-color: rgba(79,110,247,0.35); transform: translateY(-3px); }
        .bento-card > * { position: relative; z-index: 1; }
        .bento-tag {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 0.68rem; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; border-radius: 6px;
          padding: 3px 10px; margin-bottom: 14px;
        }
        .vs-row {
          display: flex; align-items: center; gap: 10px;
          font-family: var(--font-sans); font-size: 0.82rem;
          padding: 8px 12px; border-radius: 8px;
          background: var(--bgColor-muted);
          border: 1px solid var(--borderColor-default);
          margin-bottom: 6px;
        }
        .bento-animate {
          opacity: 0;
          transform: translateY(28px) scale(0.97);
          transition:
            opacity 0.65s cubic-bezier(0.2, 0.8, 0.2, 1),
            transform 0.65s cubic-bezier(0.2, 0.8, 0.2, 1),
            border-color 0.3s,
            box-shadow 0.3s;
        }
        .bento-animate.bento-revealed {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        @media (max-width: 767px) {
          .bento-card[style*="span 2"], .bento-card[style*="span 3"] {
            grid-column: span 1 !important;
            flex-direction: column !important;
          }
          .bento-grid-root {
            grid-template-columns: 1fr !important;
          }
          .bento-grid-root > * {
            grid-column: span 1 !important;
          }
        }
      `}</style>

      <div ref={gridRef} className="bento-grid-root" style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 16,
        marginTop: 48,
      }}>

        {/* Card 1: Storage — spans 2 cols */}
        <div className="bento-card bento-animate" style={{ gridColumn: "span 2", padding: "32px 36px", display: "flex", gap: 40, alignItems: "center", transitionDelay: "0s" }}>
          <div style={{ flex: 1 }}>
            <div className="bento-tag" style={{ background: "rgba(79,142,247,0.12)", color: "#4f8ef7", border: "1px solid rgba(79,142,247,0.25)" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>
              Persistent Storage
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: "1.3rem", fontWeight: 800, color: "var(--fgColor-default)", marginBottom: 10, lineHeight: 1.25 }}>Your data outlives every session</div>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.88rem", color: "var(--fgColor-muted)", lineHeight: 1.7, marginBottom: 20 }}>No more re-uploading gigabytes of datasets before every run. Your persistent ZFS volume mounts automatically every time.</p>
            <div className="vs-row"><span style={{ color: "#22c55e" }}>✓</span><span style={{ color: "var(--fgColor-default)", fontWeight: 600 }}>Up to 100 GB Zero-setup ZFS — always mounted</span></div>
            <div className="vs-row"><span style={{ color: "#ef4444", fontSize: "0.7rem", fontWeight: 800 }}>✕</span><span style={{ color: "var(--fgColor-muted)", textDecoration: "line-through", opacity: 0.6 }}>Manual cloud volumes — re-attach each session</span></div>
          </div>
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: "4.5rem", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.04em", background: "linear-gradient(135deg, #4f8ef7, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>100</div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: "1rem", fontWeight: 700, color: "var(--fgColor-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>GB</div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.72rem", color: "var(--fgColor-muted)", marginTop: 4 }}>per user, always-on</div>
          </div>
        </div>

        {/* Card 2: Zero Egress */}
        <div className="bento-card bento-animate" style={{ padding: "28px 26px", transitionDelay: "0.1s" }}>
          <div className="bento-tag" style={{ background: "rgba(0,212,255,0.08)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.2)" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
            Zero Egress
          </div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: "1.1rem", fontWeight: 800, color: "var(--fgColor-default)", marginBottom: 8, lineHeight: 1.25 }}>No bandwidth tax on your models</div>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.85rem", color: "var(--fgColor-muted)", lineHeight: 1.7, marginBottom: 16 }}>Move massive checkpoints on our high-speed local network. AWS charges per-GB — we don&apos;t.</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(0,212,255,0.06)", borderRadius: 10, border: "1px solid rgba(0,212,255,0.15)" }}>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "1.6rem", fontWeight: 800, color: "#00d4ff" }}>$0</span>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.78rem", color: "var(--fgColor-muted)", lineHeight: 1.4 }}>egress fees,<br />ever</span>
          </div>
        </div>

        {/* Card 3: SSO */}
        <div className="bento-card bento-animate" style={{ padding: "28px 26px", transitionDelay: "0.15s" }}>
          <div className="bento-tag" style={{ background: "rgba(16,245,164,0.08)", color: "#10f5a4", border: "1px solid rgba(16,245,164,0.2)" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            Auth
          </div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: "1.1rem", fontWeight: 800, color: "var(--fgColor-default)", marginBottom: 8, lineHeight: 1.25 }}>Sign in with your university ID</div>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.85rem", color: "var(--fgColor-muted)", lineHeight: 1.7, marginBottom: 18 }}>KSRCE SSO — no new passwords, no separate signup. One credential for everything.</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--bgColor-muted)", borderRadius: 10, border: "1px solid var(--borderColor-default)" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #10f5a4, #4f8ef7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 800, color: "#fff" }}>KS</div>
            <div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.78rem", fontWeight: 600, color: "var(--fgColor-default)" }}>student@ksrce.edu.in</div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.68rem", color: "#10f5a4" }}>✓ SSO Verified</div>
            </div>
          </div>
        </div>

        {/* Card 4: Instant GUI */}
        <div className="bento-card bento-animate" style={{ padding: "28px 26px", transitionDelay: "0.22s" }}>
          <div className="bento-tag" style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.25)" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
            GUI Desktop
          </div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: "1.1rem", fontWeight: 800, color: "var(--fgColor-default)", marginBottom: 8, lineHeight: 1.25 }}>Full KDE desktop in your browser</div>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.85rem", color: "var(--fgColor-muted)", lineHeight: 1.7, marginBottom: 16 }}>PyTorch, HuggingFace, CUDA — pre-installed. No setup, no config files, no env hell.</p>
          <div className="vs-row"><span style={{ color: "#22c55e" }}>✓</span><span style={{ color: "var(--fgColor-default)", fontWeight: 600 }}>KDE Plasma + CUDA 12.2</span></div>
          <div className="vs-row"><span style={{ color: "#ef4444", fontSize: "0.7rem", fontWeight: 800 }}>✕</span><span style={{ color: "var(--fgColor-muted)", textDecoration: "line-through", opacity: 0.6 }}>CLI-only cloud defaults</span></div>
        </div>

        {/* Demo Video — spans 2 rows */}
        <video
          src="/Image_Assets/hf_20260322_011532_86f9b93a-2ffc-42fd-8735-12a4c55ab536.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="bento-animate"
          style={{ gridRow: "span 2", width: "100%", height: "100%", minHeight: 400, objectFit: "cover", borderRadius: 16, transitionDelay: "0.25s" }}
        />

        {/* Card 5: Predictable Envs — spans 2 */}
        <div className="bento-card bento-animate" style={{ gridColumn: "span 2", padding: "28px 32px", display: "flex", gap: 32, alignItems: "center", transitionDelay: "0.3s" }}>
          <div style={{ flex: 1 }}>
            <div className="bento-tag" style={{ background: "rgba(249,115,22,0.1)", color: "#f97316", border: "1px solid rgba(249,115,22,0.25)" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="9" x2="19" y2="9" /><line x1="5" y1="15" x2="19" y2="15" /></svg>
              Consistency
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: "1.2rem", fontWeight: 800, color: "var(--fgColor-default)", marginBottom: 8, lineHeight: 1.25 }}>Same env on CPU and RTX 5090— guaranteed</div>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.88rem", color: "var(--fgColor-muted)", lineHeight: 1.7 }}>Code on Epi-CPU, scale to RTX 5090 without touching a single config. Environment drift is a cloud problem, not yours.</p>
          </div>
          <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {[["Epi-CPU", "#888"], ["GPU-S", "#8b5cf6"], ["RTX 5090", "#4f8ef7"]].map(([label, color]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 80, height: 28, borderRadius: 7, background: `${color}22`, border: `1px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "var(--font-mono),monospace", fontSize: "0.68rem", color: color as string, fontWeight: 700 }}>{label}</span>
                </div>
                <span style={{ fontFamily: "var(--font-mono),monospace", fontSize: "0.65rem", color: "var(--fgColor-muted)" }}>pytorch==2.3 cuda==12.2</span>
                <span style={{ color: "#22c55e", fontSize: "0.75rem" }}>✓</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 6: Bare-metal — full width */}
        <div className="bento-card bento-animate" style={{ gridColumn: "span 3", padding: "28px 36px", display: "flex", alignItems: "center", gap: 48, transitionDelay: "0.38s" }}>
          <div style={{ flex: 1 }}>
            <div className="bento-tag" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></svg>
              Bare-metal
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: "1.2rem", fontWeight: 800, color: "var(--fgColor-default)", marginBottom: 8 }}>Raw hardware. No noisy neighbours.</div>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.88rem", color: "var(--fgColor-muted)", lineHeight: 1.7 }}>AMD Ryzen 9 + NVMe, not throttled virtual vCPUs sharing a hypervisor with 40 other tenants.</p>
          </div>
          <div style={{ flexShrink: 0, width: 280 }}>
            {[
              { label: "LaaS (bare-metal)", pct: 94, color: "#4f8ef7" },
              { label: "AWS EC2 (vCPU)", pct: 58, color: "#ef4444" },
              { label: "GCP Compute", pct: 54, color: "#ef4444" },
            ].map(({ label, pct, color }) => (
              <div key={label} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", color: "var(--fgColor-muted)" }}>{label}</span>
                  <span style={{ fontFamily: "var(--font-mono),monospace", fontSize: "0.72rem", color, fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ height: 5, background: "var(--bgColor-muted)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, opacity: 0.85 }} />
                </div>
              </div>
            ))}
            <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.65rem", color: "var(--fgColor-muted)", marginTop: 6, opacity: 0.6 }}>CPU benchmark score (relative)</div>
          </div>
        </div>

      </div>
    </>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
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

// ─── Pricing table ─────────────────────────────────────────────────────────────
function PricingGrid({ rows }: { rows: { title: string; badge?: string; highlight?: boolean; bestFor?: string; vcpu: string | number; memory: string; vram: string; hami: string; price: string | number }[] }) {
  return (
    <>
      <style>{`
        .pricing-table { width: 100%; border-collapse: collapse; }
        .pricing-table th {
          font-family: var(--font-sans); font-size: 0.72rem; font-weight: 600;
          letter-spacing: 0.07em; text-transform: uppercase;
          color: var(--fgColor-muted); text-align: left;
          padding: 12px 20px; border-bottom: 1px solid var(--borderColor-default);
        }
        .pricing-table th:last-child { text-align: right; }
        .pricing-table td {
          font-family: var(--font-sans); font-size: 0.92rem;
          padding: 18px 20px; border-bottom: 1px solid var(--borderColor-default);
          color: var(--fgColor-default); white-space: nowrap;
          transition: background 0.15s;
        }
        .pricing-table td:last-child { text-align: right; }
        .pricing-table tr:last-child td { border-bottom: none; }
        .pricing-row { transition: background 0.15s; }
        .pricing-row:hover td { background: var(--bgColor-muted); }
        .pricing-row.featured td { background: rgba(79,110,247,0.15); }
        .pricing-row.featured:hover td { background: rgba(79,110,247,0.25); }
      `}</style>

      <div className="reveal-on-scroll" style={{ width: "100%", maxWidth: 1040, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ background: "var(--bgColor-default)", border: "1px solid var(--borderColor-default)", borderRadius: 14, overflow: "hidden", minWidth: 560 }}>
          <table className="pricing-table">
            <thead>
              <tr>
                <th>Tier</th>
                <th>vCPUs</th>
                <th>RAM</th>
                <th>GPU VRAM</th>
                <th>HAMI %</th>
                <th>₹/hour</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={`pricing-row ${row.highlight ? "featured" : ""}`}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <img src="/images/nvidia_logo_icon_169902.png" alt="NVIDIA" style={{ height: 26, objectFit: "contain", opacity: 0.95 }} />
                      <span style={{ fontWeight: 800, fontSize: "0.97rem" }}>{row.title}</span>
                      {row.badge && <span style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", background: ACCENT, color: "#fff", borderRadius: 4, padding: "2px 7px" }}>{row.badge}</span>}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--fgColor-muted)", marginTop: 5, fontWeight: 400, whiteSpace: "normal" }}>{row.bestFor}</div>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono),monospace", fontWeight: 600 }}>{row.vcpu}</td>
                  <td style={{ fontFamily: "var(--font-mono),monospace", fontWeight: 600 }}>{row.memory}</td>
                  <td style={{ fontFamily: "var(--font-mono),monospace", fontWeight: 800, color: "#a855f7" }}>{row.vram}</td>
                  <td style={{ fontFamily: "var(--font-mono),monospace", fontWeight: 600 }}>{row.hami}</td>
                  <td>
                    <span style={{ fontFamily: "var(--font-mono),monospace", fontSize: "1.05rem", fontWeight: 800, color: row.highlight ? "#4f6ef7" : "var(--fgColor-default)", transition: "color 0.15s" }}>{row.price}</span>
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.72rem", color: "var(--fgColor-muted)", marginLeft: 3 }}>/hr</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </>
  );
}

// ─── SVG icons ───────────────────────────────────────────────────────────────
const I = {
  template: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>,
  config: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
  launch: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>,
  tools: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>,
  deploy: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>,
  terminal: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
};

// ─── Interactive Section Grid ──────────────────────────────────────────────────
function InteractiveGrid() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const lastRippleTime = React.useRef(0);

  // Automatic looping waves
  React.useEffect(() => {
    let timeoutId: number | ReturnType<typeof setTimeout>;

    const fireAutoWave = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const wave = document.createElement("div");
      wave.className = "auto-wave";

      // Random spawn position, slight bias towards center
      const rx = (Math.random() * 0.8 + 0.1) * rect.width;
      const ry = (Math.random() * 0.8 + 0.1) * rect.height;
      wave.style.left = `${rx}px`;
      wave.style.top = `${ry}px`;

      const palettes = [
        "radial-gradient(ellipse at 40% 50%, rgba(79,130,247,1) 0%, rgba(139,92,246,0.6) 45%, transparent 70%)",
        "radial-gradient(ellipse at 60% 40%, rgba(16,245,164,1) 0%, rgba(79,130,247,0.6) 45%, transparent 70%)",
        "radial-gradient(ellipse at 50% 60%, rgba(139,92,246,1) 0%, rgba(249,115,22,0.6) 45%, transparent 70%)",
      ];
      wave.style.background = palettes[Math.floor(Math.random() * palettes.length)];

      container.appendChild(wave);
      setTimeout(() => wave?.remove(), 8000);

      // Loop with slight irregular timing (3-4 seconds)
      timeoutId = setTimeout(fireAutoWave, 3000 + Math.random() * 1500);
    };

    fireAutoWave();
    return () => clearTimeout(timeoutId);
  }, []);

  // Mouse interaction ripples
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();

      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) return;

      const now = Date.now();
      // throttle ripple generation
      if (now - lastRippleTime.current < 60) return;
      lastRippleTime.current = now;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ripple = document.createElement("div");
      ripple.className = "grid-ripple";
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      container.appendChild(ripple);

      // Cleanup ripple after animation (1500ms)
      setTimeout(() => {
        ripple?.remove();
      }, 1500);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        background: "#06070a", // Solid dark background base
        overflow: "hidden" // Ensure animation doesn't spill
      }}
    >
      <style>{`
        .auto-wave {
          position: absolute;
          width: 800px;
          height: 800px;
          border-radius: 50%;
          transform: translate(-50%, -50%) scale(0.1);
          animation: autoWaveAnim 12s cubic-bezier(0.1, 0.4, 0.5, 1) forwards;
          pointer-events: none;
          mix-blend-mode: color-dodge;
        }
        @keyframes autoWaveAnim {
          0% { transform: translate(-50%, -50%) scale(0.1) rotate(0deg); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(3.5) rotate(90deg); opacity: 0; }
        }

        .grid-ripple {
          position: absolute;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 2px solid rgba(0, 212, 255, 0.6);
          background: radial-gradient(circle, rgba(0,212,255,0.3) 0%, transparent 60%);
          transform: translate(-50%, -50%) scale(0.1);
          animation: rippleAnim 1.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
          mix-blend-mode: color-dodge;
          pointer-events: none;
        }
        @keyframes rippleAnim {
          0% { transform: translate(-50%, -50%) scale(0.1); opacity: 1; border-width: 10px; }
          100% { transform: translate(-50%, -50%) scale(8); opacity: 0; border-width: 1px; }
        }
      `}</style>

      {/* Container that masks children to only show through the dots */}
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          inset: 0,
          WebkitMaskImage: "radial-gradient(white 1.5px, transparent 1.5px)",
          WebkitMaskSize: "24px 24px",
          pointerEvents: "none"
        }}
      >
        {/* Default faint dot color */}
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.06)" }} />

        {/* Dynamic elements inject here */}

        {/* Mouse ripples get injected precisely here */}
      </div>
    </div>
  );
}

// ─── Capabilities Section ────────────────────────────────────────────────────────
const capabilityItems = [
  {
    num: "01",
    title: "On-Demand GPU Infrastructure.",
    subtitle: "Bare-metal performance. Zero hardware setup.",
    bullets: [
      <>Instantly provision <span style={{ color: ACCENT }}>fractional GPU slices</span> or an entire dedicated RTX 5090 node.</>,
      <>Containerized architecture guarantees <span style={{ color: ACCENT }}>sub-30 second boot times</span> for your workloads.</>,
      <>Strict <span style={{ color: ACCENT }}>resource isolation</span> ensures peak computational consistency.</>
    ]
  },
  {
    num: "02",
    title: "Persistent Stateful Storage.",
    subtitle: "Your workspace, exactly how you left it.",
    bullets: [
      <><span style={{ color: ACCENT }}>Up to 100GB</span> of dedicated, high-speed storage allocated per subscription.</>,
      <><span style={{ color: ACCENT }}>Hard-isolated volumes</span> guarantee absolute data privacy and security.</>,
      <>Switch flexibly between compute tiers <span style={{ color: ACCENT }}>without moving a single file</span> or reinstalling environments.</>
    ]
  },
  {
    num: "03",
    title: "Seamless GUI & CLI Access.",
    subtitle: "A full remote workstation streamed directly to your browser.",
    bullets: [
      <>High-fidelity desktop experiences powered by <span style={{ color: ACCENT }}>ultra-low latency</span> rendering.</>,
      <>Pre-loaded with essential toolchains like <span style={{ color: ACCENT }}>MATLAB, PyTorch, Blender, and VS Code.</span></>,
      <>Absolute <span style={{ color: ACCENT }}>raw terminal access</span> for maximum orchestration control.</>
    ]
  },
  {
    num: "04",
    title: "Integrated Mentorship Program.",
    subtitle: "Guided expertise from industry leaders.",
    bullets: [
      <>Direct channels for architecture reviews and <span style={{ color: ACCENT }}>model optimization</span> strategies.</>,
      <>Hands-on guidance to accelerate your research from <span style={{ color: ACCENT }}>prototype to production.</span></>,
      <>Comprehensive documentation paired with <span style={{ color: ACCENT }}>premium engineering support.</span></>
    ]
  }
];

// ─── Isometric Stack Asset ──────────────────────────────────────────────────────
function IsometricStackAsset({ activeIndex }: { activeIndex: number | null }) {
  const blockLabels = ["Fractional GPU compute", "Persistent ZFS storage", "WebRTC session layer", "Expert mentorship"];
  const sideLabels = ["STUDENTS", "RESEARCHERS", "INSTITUTIONS"];

  const CX = 200;
  const BASE_Y = 110;
  const DX = 160;
  const DY = 80;
  const DEPTH = 22;

  const tightGap = 36;
  const expandedGap = 100;

  function getCy(idx: number) {
    if (activeIndex === null) return BASE_Y + idx * (tightGap + 20);
    // For first item (index 0): no expansion gap, just highlight — keep default spacing
    if (activeIndex === 0) return BASE_Y + idx * (tightGap + 20);
    // For items 1-3: gap opens ABOVE the active slab
    return BASE_Y + idx * tightGap + (idx >= activeIndex ? expandedGap : 0);
  }

  // Bracket definitions: ALL start from slab 0, each extends to a different depth
  // Like the reference: all originate at the top slab, progressively deeper
  const brackets = [
    { topIdx: 0, botIdx: 1 },  // LEARNERS: slab 0 → bottom of slab 1
    { topIdx: 0, botIdx: 2 },  // BUILDERS: slab 0 → bottom of slab 2
    { topIdx: 0, botIdx: 3 },  // INNOVATORS: slab 0 → below slab 3
  ];

  // Bracket X positions: longest (all slabs) leftmost, shortest rightmost
  const bracketXs = [CX + DX * 0.88, CX + DX * 0.74, CX + DX * 0.58];

  // Top/bottom Y follow the isometric slope of the right face edges
  // Right face top edge: (CX, cy+DY) → (CX+DX, cy). At fraction f: y = cy + DY*(1-f)
  // Right face bottom edge: (CX, cy+DY+DEPTH) → (CX+DX, cy+DEPTH). Same slope offset by DEPTH
  const bracketYs = brackets.map((b, i) => {
    const f = (bracketXs[i] - CX) / DX;
    const slopeOffset = DY * (1 - f);
    // Top: on slab 0's right face top edge, nudged slightly inward (-4)
    const topY = getCy(0) + slopeOffset - 4;
    // Bottom: on closing slab's right face bottom edge, nudged slightly below (+6)
    const botY = getCy(b.botIdx) + DEPTH + slopeOffset + 6;
    return { topY, botY };
  });

  // Label Y = at the bottom turn of each bracket (not midpoint)
  const labelYs = bracketYs.map(b => b.botY);

  const isoCorners = (cy: number) => ({
    top: { x: CX, y: cy - DY },
    right: { x: CX + DX, y: cy },
    bottom: { x: CX, y: cy + DY },
    left: { x: CX - DX, y: cy },
  });

  // Calculate angle for text rotation on left face
  // The vector is from left to bottom: (+DX, +DY)
  const angleRad = Math.atan2(DY, DX);
  const angleDeg = (angleRad * 180) / Math.PI;

  const getPoints = (c: { top: { x: number; y: number }; right: { x: number; y: number }; bottom: { x: number; y: number }; left: { x: number; y: number } }) => {
    return {
      topFace: `${c.top.x},${c.top.y} ${c.right.x},${c.right.y} ${c.bottom.x},${c.bottom.y} ${c.left.x},${c.left.y}`,
      leftFace: `${c.left.x},${c.left.y} ${c.bottom.x},${c.bottom.y} ${c.bottom.x},${c.bottom.y + DEPTH} ${c.left.x},${c.left.y + DEPTH}`,
      rightFace: `${c.bottom.x},${c.bottom.y} ${c.right.x},${c.right.y} ${c.right.x},${c.right.y + DEPTH} ${c.bottom.x},${c.bottom.y + DEPTH}`,
    };
  };

  const drawPattern0 = (cy: number) => {
    const c = isoCorners(cy);
    const elements: React.ReactNode[] = [];
    const steps = 5;
    // Grid Lines
    for (let i = 1; i < steps; i++) {
      const f = i / steps;
      const x1 = c.top.x + (c.left.x - c.top.x) * f;
      const y1 = c.top.y + (c.left.y - c.top.y) * f;
      const x2 = c.right.x + (c.bottom.x - c.right.x) * f;
      const y2 = c.right.y + (c.bottom.y - c.right.y) * f;
      elements.push(<line key={`h${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />);

      const x3 = c.top.x + (c.right.x - c.top.x) * f;
      const y3 = c.top.y + (c.right.y - c.top.y) * f;
      const x4 = c.left.x + (c.bottom.x - c.left.x) * f;
      const y4 = c.left.y + (c.bottom.y - c.left.y) * f;
      elements.push(<line key={`v${i}`} x1={x3} y1={y3} x2={x4} y2={y4} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />);
    }
    // Dots
    for (let i = 1; i < steps; i++) {
      for (let j = 1; j < steps; j++) {
        const x = c.top.x + (c.right.x - c.top.x) * (j / steps) + (c.left.x - c.top.x) * (i / steps);
        const y = c.top.y + (c.right.y - c.top.y) * (j / steps) + (c.left.y - c.top.y) * (i / steps);
        const isCenter = i === 2 && j === 2;
        elements.push(<circle key={`d${i}${j}`} cx={x} cy={y} r="2" fill={isCenter ? "#fff" : "rgba(255,255,255,0.6)"} />);
      }
    }
    return <g>{elements}</g>;
  };

  const drawPattern1 = (cy: number) => {
    // Concentric squares
    const elements: React.ReactNode[] = [];
    for (let i = 1; i <= 3; i++) {
      const scale = i * 0.25;
      const c = isoCorners(cy);
      const points = `${CX},${cy - DY * scale} ${CX + DX * scale},${cy} ${CX},${cy + DY * scale} ${CX - DX * scale},${cy}`;
      elements.push(<polygon key={`sq${i}`} points={points} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray={i === 2 ? "4 4" : "none"} />);
    }
    // Inner solid square
    const scale = 0.15;
    const points = `${CX},${cy - DY * scale} ${CX + DX * scale},${cy} ${CX},${cy + DY * scale} ${CX - DX * scale},${cy}`;
    elements.push(<polygon key="sq_solid" points={points} fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />);
    return <g>{elements}</g>;
  };

  const drawPattern2 = (cy: number) => {
    return (
      <g>
        <ellipse cx={CX} cy={cy} rx={DX * 0.4} ry={DY * 0.4} stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none" strokeDasharray="3 4" />
        <ellipse cx={CX} cy={cy} rx={DX * 0.25} ry={DY * 0.25} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none" />
        <ellipse cx={CX} cy={cy} rx={DX * 0.1} ry={DY * 0.1} stroke="#fff" strokeWidth="2" fill="none" />
      </g>
    );
  };

  const drawPattern3 = (cy: number) => {
    const rx = DX * 0.25;
    const ry = DY * 0.25;
    const offset = DX * 0.15;
    return (
      <g>
        <ellipse cx={CX - offset} cy={cy} rx={rx} ry={ry} stroke="#4f8ef7" strokeWidth="1.5" fill="rgba(79,142,247,0.05)" />
        <ellipse cx={CX + offset} cy={cy} rx={rx} ry={ry} stroke="#fff" strokeWidth="1.5" fill="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
        <circle cx={CX} cy={cy - ry * 0.6} r="3" fill="#3bff3b" />
        <circle cx={CX} cy={cy + ry * 0.6} r="3" fill="#ff3b3b" />
        {/* Intersection dots approximation */}
        <circle cx={CX} cy={cy} r="1" fill="#fff" />
        <circle cx={CX - 8} cy={cy} r="1" fill="#fff" />
        <circle cx={CX + 8} cy={cy} r="1" fill="#fff" />
        <circle cx={CX} cy={cy - 8} r="1" fill="#fff" />
        <circle cx={CX} cy={cy + 8} r="1" fill="#fff" />
      </g>
    );
  };

  const drawLayer = (idx: number) => {
    const cy = getCy(idx);
    const isActive = activeIndex === idx;
    const c = isoCorners(cy);
    const pts = getPoints(c);

    // Styling
    const topFill = isActive ? "rgba(10, 10, 15, 0.95)" : "rgba(5, 5, 8, 0.8)";
    const leftFill = "rgba(15, 15, 20, 0.95)";
    const rightFill = "rgba(8, 8, 12, 0.95)";

    const strokeBase = isActive ? "url(#activeBorder)" : "rgba(255,255,255,0.15)";
    const strokeWidth = isActive ? "2" : "1";

    return (
      <g key={idx} style={{ transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        {/* Depth Faces */}
        <polygon points={pts.leftFace} fill={leftFill} stroke={strokeBase} strokeWidth={strokeWidth} style={{ transition: "all 0.6s ease" }} />
        <polygon points={pts.rightFace} fill={rightFill} stroke={strokeBase} strokeWidth={strokeWidth} style={{ transition: "all 0.6s ease" }} />

        {/* Top Face */}
        <polygon points={pts.topFace} fill={topFill} stroke={strokeBase} strokeWidth={strokeWidth} style={{ transition: "all 0.6s ease" }} />

        {/* Highlight inner edges for 3D effect */}
        {isActive && (
          <g>
            <line x1={c.left.x} y1={c.left.y} x2={c.bottom.x} y2={c.bottom.y} stroke="#00f3ff" strokeWidth="1" />
            <line x1={c.bottom.x} y1={c.bottom.y} x2={c.right.x} y2={c.right.y} stroke="#ff3366" strokeWidth="1" />
          </g>
        )}

        {/* Patterns */}
        {isActive && (
          <g style={{ opacity: 0, animation: "fadeIn 0.5s forwards 0.3s" }}>
            {idx === 0 && drawPattern0(cy)}
            {idx === 1 && drawPattern1(cy)}
            {idx === 2 && drawPattern2(cy)}
            {idx === 3 && drawPattern3(cy)}
          </g>
        )}

        {/* Corner Accents on Active */}
        {isActive && (
          <g>
            <circle cx={c.top.x} cy={c.top.y} r="2.5" fill="#fff" />
            <circle cx={c.left.x} cy={c.left.y} r="2.5" fill="#00f3ff" />
            <circle cx={c.right.x} cy={c.right.y} r="2.5" fill="#ff3366" />
            <circle cx={c.bottom.x} cy={c.bottom.y} r="2.5" fill="#3bff3b" />
          </g>
        )}

        {/* Slanted Text on Left Face */}
        {(() => {
          const label = blockLabels[idx];
          // Face diagonal length for auto-fit
          const faceLen = Math.sqrt(Math.pow(c.bottom.x - c.left.x, 2) + Math.pow(c.bottom.y - c.left.y, 2));
          const baseFontSize = 10;
          const charWidth = 6; // approximate monospace char width at baseFontSize
          const estimatedWidth = label.length * charWidth;
          const usable = faceLen * 0.85; // 85% of face length for padding
          const fontSize = estimatedWidth > usable ? baseFontSize * (usable / estimatedWidth) : baseFontSize;
          return (
            <text
              x={0}
              y={0}
              fill="rgba(255,255,255,0.9)"
              fontFamily="var(--font-mono), monospace"
              fontSize={fontSize}
              fontWeight="700"
              letterSpacing="0.05em"
              dominantBaseline="middle"
              textAnchor="middle"
              transform={`translate(${(c.left.x + c.bottom.x) / 2}, ${(c.left.y + c.bottom.y) / 2 + DEPTH / 2 + 1.3}) skewY(${angleDeg})`}
              style={{ pointerEvents: "none" }}
            >
              {label}
            </text>
          );
        })()}
      </g>
    );
  };

  const drawConnections = () => {
    // Bracket ⎤ connectors overlaying the south-east (right) face.
    const stubLen = 8;
    const opacity = 0.4;
    const stroke = `rgba(255,255,255,${opacity})`;
    const transition = "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)";

    return (
      <g>
        {bracketYs.map((b, i) => {
          const x = bracketXs[i];
          return (
            <g key={i}>
              {/* Top horizontal stub ── */}
              <line
                x1={x - stubLen} y1={b.topY} x2={x} y2={b.topY}
                stroke={stroke} strokeWidth="1.2" strokeDasharray="2 3"
                style={{ transition }}
              />
              {/* Vertical line | */}
              <line
                x1={x} y1={b.topY} x2={x} y2={b.botY}
                stroke={stroke} strokeWidth="1.2" strokeDasharray="2 3"
                style={{ transition }}
              />
              {/* Bottom horizontal stub ── */}
              <line
                x1={x - stubLen} y1={b.botY} x2={x} y2={b.botY}
                stroke={stroke} strokeWidth="1.2" strokeDasharray="2 3"
                style={{ transition }}
              />
            </g>
          );
        })}
      </g>
    );
  };

  const drawRightLabels = () => {
    return sideLabels.map((label, i) => (
      <text
        key={i}
        x={bracketXs[i] + 6}
        y={labelYs[i]}
        fill="rgba(255,255,255,0.75)"
        fontFamily="var(--font-mono), monospace"
        fontSize="10"
        fontWeight="700"
        letterSpacing="0.14em"
        dominantBaseline="middle"
        style={{ transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        {label}
      </text>
    ));
  };

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", overflow: "hidden" }}>
      <svg viewBox="0 0 500 500" style={{ width: "108%", height: "108%", overflow: "visible" }}>
        <defs>
          <linearGradient id="activeBorder" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff3366" />
            <stop offset="50%" stopColor="#4f8ef7" />
            <stop offset="100%" stopColor="#00f3ff" />
          </linearGradient>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}</style>
        </defs>

        {/* Draw layers from bottom to top for correct z-indexing */}
        {[3, 2, 1, 0].map(idx => drawLayer(idx))}
        {/* Connectors and labels render AFTER slabs so they overlay the right face */}
        {drawConnections()}
        {drawRightLabels()}
      </svg>
    </div>
  );
}

function CapabilitiesSection({ isMobile }: { isMobile?: boolean }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="capabilities" className="reveal-on-scroll" style={{ padding: isMobile ? "32px 20px 20px" : "48px 48px 24px 48px", background: "var(--bgColor-default)", borderBottom: "1px solid var(--borderColor-default)" }}>
      <div style={{ maxWidth: 1140, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--fgColor-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h7" /></svg>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "1rem", color: "var(--fgColor-default)", fontWeight: 500 }}>Capabilities</span>
          </div>
          <h2 style={{ fontFamily: "var(--font-sans)", fontSize: isMobile ? "clamp(1.4rem, 6vw, 2rem)" : "clamp(1.65rem, 3.1vw, 2.8rem)", fontWeight: 800, color: "var(--fgColor-default)", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 16 }}>
            You bring the ideas. We provide the <span style={{ color: ACCENT }}>compute</span>.
          </h2>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: isMobile ? "0.85rem" : "0.95rem", color: "var(--fgColor-muted)", maxWidth: "100%", lineHeight: 1.6, textAlign: "center" }}>
            <span style={{ display: "block", marginBottom: "0.5rem", color: "#FFD700", fontFamily: "'Courier New', 'Lucida Console', monospace", fontWeight: 700, letterSpacing: "0.04em", fontSize: isMobile ? "0.95rem" : "1.1rem" }}>No more fighting hardware limits or expensive cloud bills.</span>
            LaaS gives students, researchers, and fast-moving teams instant, pay-as-you-go access to top-tier AI supercomputing.
          </p>
        </div>

        {/* Content Split */}
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 32 : 80, alignItems: "stretch", flexWrap: "wrap", paddingTop: 16 }}>

          {/* Left: Accordion */}
          <div style={{ flex: "1 1 500px", display: "flex", flexDirection: "column" }}>
            {capabilityItems.map((item, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div key={idx} style={{ borderBottom: "1px solid var(--borderColor-default)" }}>
                  {/* Toggle Button */}
                  <button onClick={() => setOpenIndex(isOpen ? null : idx)}
                    style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "26px 0", cursor: "pointer", display: "flex", gap: 20, alignItems: "flex-start" }}>

                    {/* Numbering */}
                    <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "1.15rem", fontWeight: 600, color: isOpen ? ACCENT : "var(--fgColor-muted)", transition: "color 0.2s" }}>
                      {item.num} <span style={{ color: isOpen ? "var(--fgColor-muted)" : "#4f6ef7", transition: "color 0.2s" }}>/</span>
                    </span>

                    {/* Title */}
                    <div style={{ flex: 1 }}>
                      <span style={{ fontFamily: "var(--font-sans)", fontSize: isMobile ? "1.15rem" : "1.55rem", fontWeight: 700, color: "var(--fgColor-default)", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                        {item.title}
                      </span>
                    </div>

                    {/* Plus / Minus */}
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--fgColor-muted)", fontSize: "1.25rem", fontWeight: 400, transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.3s ease" }}>
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>

                  {/* Expanded Content */}
                  <div style={{ maxHeight: isOpen ? 500 : 0, overflow: "hidden", transition: "max-height 0.4s cubic-bezier(0.1, 0.8, 0.3, 1)", marginTop: isOpen ? -30 : 0, paddingTop: isOpen ? 30 : 0 }}>
                    <div style={{ paddingBottom: 30, paddingLeft: 12 }}>

                      {/* Bent Pointer & Subtitle */}
                      <div style={{ position: "relative", marginBottom: 24, paddingLeft: 53 }}>
                        {/* CSS Drawing of the Bent Pointer */}
                        <div style={{ position: "absolute", top: -30, left: 0, width: 35, height: 35, borderLeft: "1.5px solid rgba(255,255,255,0.7)", borderBottom: "1.5px solid rgba(255,255,255,0.7)" }} />
                        <p style={{ margin: 0, padding: 0, fontFamily: "var(--font-mono), monospace", fontSize: "0.82rem", color: "var(--fgColor-muted)", lineHeight: 1.6 }}>
                          {item.subtitle}
                        </p>
                      </div>

                      {/* Bullets */}
                      <ul style={{ listStyle: "none", padding: 0, paddingLeft: 53, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                        {item.bullets.map((bullet, i) => (
                          <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", fontFamily: "var(--font-mono), monospace", fontSize: "0.8rem", color: "var(--fgColor-muted)", lineHeight: 1.6 }}>
                            <span style={{ color: "var(--fgColor-default)", fontWeight: 700 }}>+</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>

                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Isometric Stack Asset — hidden on mobile */}
          {!isMobile && (
          <div style={{ flex: "1 1 400px", minHeight: 460, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", alignSelf: "flex-start" }}>
            <IsometricStackAsset activeIndex={openIndex} />
          </div>
          )}

        </div>
      </div>
    </section>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function LandingPage({ isAuthenticated }: { isAuthenticated?: boolean }) {
  const [isDark, toggle] = useTheme();
  const [zoom, setZoom] = useState(1);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [waitlistStatus, setWaitlistStatus] = useState<WaitlistStatusResponse | null>(null);
  const [waitlistCount, setWaitlistCount] = useState<number>(0);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    // Fetch public waitlist count unconditionally
    getWaitlistCount().then(c => setWaitlistCount(c)).catch(() => {});
    if (isAuthenticated) {
      getMe().then(u => setUser(u)).catch(() => {});
      checkWaitlistStatus().then(status => setWaitlistStatus(status)).catch(() => {});
    }
  }, [isAuthenticated]);

  const userName = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email : null;

  // Apply zoom to match 1280px design viewport (desktop only)
  useEffect(() => {
    const setZoomValue = () => {
      if (window.innerWidth < 768) {
        document.documentElement.style.zoom = "1";
        setZoom(1);
        return;
      }
      const zoomValue = window.innerWidth / 1280;
      document.documentElement.style.zoom = String(zoomValue);
      setZoom(zoomValue);
    };
    setZoomValue();
    window.addEventListener("resize", setZoomValue);
    return () => {
      window.removeEventListener("resize", setZoomValue);
      // Reset zoom when leaving landing page
      document.documentElement.style.zoom = "1";
    };
  }, []);

  useScrollReveal();

  const brandCss = `
    :root {
      --font-sans: 'Inter', -apple-system, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }
  `;

  const stats = [
    { val: "RTX 5090", suffix: "", label: "NVIDIA Compute Nodes", icon: "/images/nvidia_logo_icon_169902.png" },
    { val: 128, suffix: " GB", label: "Cluster GPU VRAM" },
    { val: "Upto 100", suffix: "GB", label: "Storage / User" },
    { val: 99, suffix: "%", label: "Uptime SLA" },
  ];

  const steps = [
    {
      num: "01", icon: I.template, title: "Choose Template",
      desc: "Pick a pre-configured framework and pair it with the right GPU tier for your ML workload.",
      color: "#4f8ef7", glow: "rgba(79,142,247,0.18)", glow2: "rgba(79,142,247,0.1)", border: "rgba(79,142,247,0.25)",
      items: ["Jupyter", "VS Code", "Stateful GUI", "Custom CLI"]
    },
    {
      num: "02", icon: I.config, title: "Configure Resources",
      desc: "Select GPU type, vCPUs, and memory. Scale from a fractional slice to a multi-GPU cluster instantly.",
      color: "#8b5cf6", glow: "rgba(139,92,246,0.18)", glow2: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.25)",
      items: ["RTX 5090", "H100 (Soon)", "Up to 32GB VRAM", "Persistent Storage"]
    },
    {
      num: "03", icon: I.launch, title: "Launch Instance",
      desc: "One click and your fully configured environment is live and ready for training in under 30 seconds.",
      color: "#00d4ff", glow: "rgba(0,212,255,0.15)", glow2: "rgba(0,212,255,0.08)", border: "rgba(0,212,255,0.22)",
      items: ["One-click launch", "SSO injected", "Storage mounted"]
    },
    {
      num: "04", icon: I.tools, title: "Development Tools",
      desc: "Multiple access methods to work your way. Full terminal privileges and seamless UI.",
      color: "#10f5a4", glow: "rgba(16,245,164,0.15)", glow2: "rgba(16,245,164,0.08)", border: "rgba(16,245,164,0.22)",
      items: ["Full SSH Access", "JupyterLab", "File Transfer", "Live Logs"]
    },
    {
      num: "05", icon: I.deploy, title: "Manage & Monitor",
      desc: "Control your compute lifecycle. Pause instances to save credits, track real-time spend, and monitor session usage.",
      color: "#f97316", glow: "rgba(249,115,22,0.15)", glow2: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.22)",
      items: ["Pause/Resume", "Real-time Metrics", "Quota Warnings", "Detailed Logs"]
    },
  ];

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

  const pricing = [
    { title: "Spark", price: "₹120", vcpu: 2, memory: "4 GB", vram: "2 GB", hami: "8%", bestFor: "Small PyTorch inference, Jupyter notebooks, Coursework & proof-of-concept", badge: undefined, highlight: false },
    { title: "Blaze", price: "₹210", vcpu: 4, memory: "8 GB", vram: "4 GB", hami: "17%", bestFor: "Model fine-tuning, GPU-accelerated rendering, professional development", badge: "Popular", highlight: true },
    { title: "Inferno", price: "₹300", vcpu: 8, memory: "16 GB", vram: "8 GB", hami: "33%", bestFor: "Large model training, complex 3D rendering, GPU-intensive simulations", badge: undefined, highlight: false },
    { title: "Supernova", price: "₹360", vcpu: 12, memory: "32 GB", vram: "16 GB", hami: "67%", bestFor: "Large-scale deep learning, exclusive research sessions, production inference", badge: "Exclusive", highlight: false },
  ];
  // desc field removed — replaced by bestFor in new PricingCard

  return (
    <div className="landing-page">
      <Head>
        <style>{brandCss}</style>
      </Head>
      <style>{`
        .landing-page { zoom: calc(100vw / 1280); }
        @media (max-width: 767px) { .landing-page { zoom: 1; } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .land-section { padding: 90px 48px; max-width: 1140px; margin: 0 auto; }
        .land-section-full { padding: 90px 48px; }
        @media (max-width: 860px) {
          .hero-split { flex-direction: column !important; }
          .land-section { padding: 64px 20px; }
        }
        .highlight-text { color: ${ACCENT}; }
        .reveal-on-scroll {
          opacity: 0;
          transform: translateY(30px) scale(0.98);
          transition: opacity 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
          will-change: opacity, transform;
        }
        .reveal-on-scroll.revealed {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      `}</style>

      <Nav isDark={isDark} onToggle={toggle} isAuthenticated={isAuthenticated} userName={userName} waitlistStatus={waitlistStatus} waitlistCount={waitlistCount} isMobile={isMobile} />
      <section style={{ position: "relative", minHeight: `${(1 / zoom) * 100}vh`, display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden" }}>

        {/* ↓ Particle network replaces the old hero-grid div */}
        <Particles />

        {/* Radial glow top-left */}
        <div style={{ position: "absolute", top: -120, left: -120, width: 600, height: 600, background: `radial-gradient(circle, ${ACCENT_GLOW} 0%, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />

        <div className="hero-split" style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 24 : 48, padding: isMobile ? "88px 20px 24px" : "100px 48px 28px", maxWidth: 1140, margin: "0 auto", width: "100%", position: "relative", zIndex: 1 }}>
          {/* Left */}
          <div style={{ flex: isMobile ? "none" : "1 1 52%", minWidth: 0, width: isMobile ? "100%" : undefined }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", background: "var(--bgColor-mild)", border: `1px solid ${ACCENT}`, borderRadius: 9999, marginBottom: 20, animation: "fadeUp 0.4s ease 0.1s both" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
              <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: ACCENT }}>KSRCE AI Lab Infrastructure</span>
            </div>
            <h1 style={{ fontFamily: "var(--font-sans)", fontSize: isMobile ? "clamp(1.8rem, 8vw, 2.4rem)" : "clamp(2.4rem, 5vw, 4rem)", fontWeight: 800, lineHeight: 1.1, color: "var(--fgColor-default)", marginBottom: 10, letterSpacing: "-0.02em", animation: "fadeUp 0.4s ease 0.2s both" }}>
              Your Remote AI Workstation.
            </h1>
            <h2 style={{ fontFamily: "var(--font-sans)", fontSize: isMobile ? "clamp(1.2rem, 5vw, 1.6rem)" : "clamp(1.6rem, 3.5vw, 2.6rem)", fontWeight: 700, lineHeight: 1.2, color: ACCENT, marginBottom: 16, letterSpacing: "-0.02em", animation: "fadeUp 0.4s ease 0.3s both" }}>
              Work Anywhere. Create Everywhere.
            </h2>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.95rem", lineHeight: 1.65, color: "var(--fgColor-muted)", maxWidth: 440, marginBottom: 12, animation: "fadeUp 0.4s ease 0.4s both" }}>
              Built for the ones who build what&apos;s next — GPU power that scales with your ambition, not your budget.
            </p>
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 12, flexWrap: "wrap", marginBottom: 20, animation: "fadeUp 0.4s ease 0.5s both" }}>
              <Link href="/waitlist"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 26px", background: ACCENT, color: "#fff", fontFamily: "var(--font-sans)", fontSize: "0.95rem", fontWeight: 700, borderRadius: 8, border: `1px solid ${ACCENT}`, textDecoration: "none", boxShadow: `0 4px 24px ${ACCENT_GLOW}`, transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = ACCENT_DARK; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ACCENT; e.currentTarget.style.transform = "translateY(0)"; }}>
                  Launch GPU Instance →
                </Link>
              <a href="#how-it-works"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 26px", background: "transparent", color: "var(--fgColor-default)", fontFamily: "var(--font-sans)", fontSize: "0.95rem", fontWeight: 500, borderRadius: 8, border: "1px solid var(--borderColor-default)", textDecoration: "none", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--bgColor-mild)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "translateY(0)"; }}>
                See How It Works
              </a>
            </div>
          </div>

          {/* Right — Terminal */}
          <div style={{ flex: isMobile ? "none" : "1 1 48%", minWidth: 0, width: isMobile ? "100%" : undefined, animation: "fadeUp 0.5s ease 0.5s both" }}>
            <HeroTerminal />
          </div>
        </div>

        {/* Powered by — bottom of hero */}
        <div style={{ maxWidth: 1140, margin: "0 auto", width: "100%", padding: isMobile ? "0 20px" : "0 48px", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 32, animation: "fadeUp 0.4s ease 0.6s both" }}>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.9rem", fontWeight: 600, color: "var(--fgColor-muted)", letterSpacing: "0.04em", lineHeight: 1 }}>Powered by</span>
            <img src="/images/GKT-logo.png" alt="Global Knowledge" style={{ height: 80, objectFit: "contain", filter: "brightness(1.1)" }} />
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div className="reveal-on-scroll" style={{ borderTop: "1px solid var(--borderColor-default)", borderBottom: "1px solid var(--borderColor-default)", background: "var(--bgColor-mild)" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: isMobile ? "0 12px" : "0 48px", display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(180px, 1fr))" }}>
          {stats.map((s, i) => (
            <div key={i} style={{ padding: isMobile ? "20px 12px" : "32px 24px", borderRight: isMobile ? (i % 2 === 0 ? "1px solid var(--borderColor-default)" : "none") : (i < stats.length - 1 ? "1px solid var(--borderColor-default)" : "none"), borderBottom: isMobile && i < 2 ? "1px solid var(--borderColor-default)" : "none", textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "var(--font-sans)", fontSize: isMobile ? "1.5rem" : "2.2rem", fontWeight: 800, color: "var(--fgColor-default)", lineHeight: 1, marginBottom: 6 }}>
                {(s as { icon?: string }).icon && <img src={(s as { icon?: string }).icon} alt="" style={{ height: isMobile ? 22 : 32, objectFit: "contain" }} />}
                {"val" in s && typeof s.val === "string"
                  ? `${s.val}${s.suffix}`
                  : <Counter end={s.val as number} suffix={s.suffix} />
                }
              </div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--fgColor-muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TRUSTED BY ── */}
      <div className="reveal-on-scroll" style={{ borderBottom: "1px solid var(--borderColor-default)", padding: isMobile ? "20px 20px" : "28px 48px", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", fontWeight: 600, color: "var(--fgColor-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 20 }}>
          Powering institutions that push boundaries
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "20px 48px" }}>
          {["KSRCE", "Partner Colleges", "Research Groups", "Industry Labs", "Innovation & Incubation Labs"].map(l => (
            <span key={l} style={{ fontFamily: "var(--font-sans)", fontSize: "0.9rem", fontWeight: 600, color: "var(--fgColor-muted)", letterSpacing: "0.03em" }}>{l}</span>
          ))}
        </div>
      </div>

      {/* ── CAPABILITIES ── */}
      <CapabilitiesSection isMobile={isMobile} />

      {/* ── YOUR GPU, YOUR DESKTOP ── */}
      <section className="reveal-on-scroll" style={{ background: "var(--bgColor-mild)", borderTop: "1px solid var(--borderColor-default)", borderBottom: "1px solid var(--borderColor-default)" }}>
        <div className="land-section hero-split" style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: "center", gap: isMobile ? 32 : 48, padding: isMobile ? "40px 20px" : "72px 48px", width: "100%" }}>
          {/* LEFT (desktop) / BOTTOM (mobile): Workload cards grid */}
          {!isMobile && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 10,
            }}>
              {[
                { title: "AI/ML Training", desc: "Train models with PyTorch, TensorFlow & JAX on dedicated RTX 5090 GPUs with full CUDA toolkit." },
                { title: "LLM Fine-Tuning", desc: "Fine-tune LLMs with LoRA & QLoRA. 32 GB VRAM handles up to 70B parameters." },
                { title: "Engineering Simulation", desc: "Run MATLAB, ANSYS & OpenFOAM with GPU-accelerated solvers and persistent storage." },
                { title: "3D Rendering & CAD", desc: "Render in Blender, Maya or AutoCAD with real-time GPU ray tracing." },
                { title: "Video Editing & VFX", desc: "Edit 4K/8K in DaVinci Resolve with GPU-accelerated encoding and compositing." },
                { title: "Data Science & Analytics", desc: "Process massive datasets with RAPIDS & GPU-accelerated Jupyter notebooks." },
                { title: "Autonomous Systems & Robotics", desc: "Simulate and train autonomous agents with GPU-accelerated physics and reinforcement learning." },
                { title: "Bioinformatics & Genomics", desc: "Accelerate genome sequencing, protein folding and molecular dynamics with dedicated GPU compute." },
              ].map((card, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    padding: "12px 16px",
                    transition: "all 0.2s ease",
                    cursor: "default",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "rgba(79,110,247,0.35)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 700, color: "var(--fgColor-default)", marginBottom: 5 }}>{card.title}</div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", color: "var(--fgColor-muted)", lineHeight: 1.5 }}>{card.desc}</div>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* RIGHT (desktop) / TOP (mobile): Text content */}
          <div style={{ flex: 1, minWidth: 0, alignSelf: "center" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>Built for Every Workload</div>
            <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 800, color: "var(--fgColor-default)", letterSpacing: "-0.02em", marginBottom: 20, lineHeight: 1.15 }}>Your GPU,<br />Your Desktop</h2>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.95rem", lineHeight: 1.75, color: "var(--fgColor-muted)", marginBottom: 28 }}>From deep learning to 3D rendering, simulation to video editing — run any workload on dedicated GPU hardware with full root access and persistent storage.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                "Run AI training, inference & fine-tuning at scale",
                "Engineering simulations with MATLAB, ANSYS & more",
                "Video editing & creative workflows in real-time",
                "Containerized workspaces via WebRTC in seconds",
              ].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#22c55e", flexShrink: 0 }}>{I.check}</span>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.88rem", color: "var(--fgColor-default)" }}>{f}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 32 }}>
              <Link href="/waitlist"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 26px", background: ACCENT, color: "#fff", fontFamily: "var(--font-sans)", fontSize: "0.9rem", fontWeight: 600, borderRadius: 7, textDecoration: "none", transition: "all 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.background = ACCENT_DARK)}
                onMouseLeave={e => (e.currentTarget.style.background = ACCENT)}>
                Explore What&apos;s Possible →
              </Link>
            </div>
          </div>

          {/* Cards below text on mobile */}
          {isMobile && (
          <div style={{ flex: 1, minWidth: 0, width: "100%" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 10,
            }}>
              {[
                { title: "AI/ML Training", desc: "Train models with PyTorch, TensorFlow & JAX on dedicated RTX 5090 GPUs with full CUDA toolkit." },
                { title: "LLM Fine-Tuning", desc: "Fine-tune LLMs with LoRA & QLoRA. 32 GB VRAM handles up to 70B parameters." },
                { title: "Engineering Simulation", desc: "Run MATLAB, ANSYS & OpenFOAM with GPU-accelerated solvers and persistent storage." },
                { title: "3D Rendering & CAD", desc: "Render in Blender, Maya or AutoCAD with real-time GPU ray tracing." },
                { title: "Video Editing & VFX", desc: "Edit 4K/8K in DaVinci Resolve with GPU-accelerated encoding and compositing." },
                { title: "Data Science & Analytics", desc: "Process massive datasets with RAPIDS & GPU-accelerated Jupyter notebooks." },
                { title: "Autonomous Systems & Robotics", desc: "Simulate and train autonomous agents with GPU-accelerated physics and reinforcement learning." },
                { title: "Bioinformatics & Genomics", desc: "Accelerate genome sequencing, protein folding and molecular dynamics with dedicated GPU compute." },
              ].map((card, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    padding: "12px 16px",
                    transition: "all 0.2s ease",
                    cursor: "default",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "rgba(79,110,247,0.35)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 700, color: "var(--fgColor-default)", marginBottom: 5 }}>{card.title}</div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", color: "var(--fgColor-muted)", lineHeight: 1.5 }}>{card.desc}</div>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}

      <section id="how-it-works" style={{ position: "relative" }}>
        <InteractiveGrid />
        <div className="land-section reveal-on-scroll" style={{ position: "relative", zIndex: 1, paddingTop: 40, paddingBottom: 40 }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: ACCENT, marginBottom: 12 }}>How It Works</div>
            <h2 style={{ fontFamily: "var(--font-sans)", fontSize: isMobile ? "clamp(1.4rem, 6vw, 2rem)" : "clamp(1.6rem, 4vw, 2.6rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 14 }}>Launch AI Workspaces<br />in Minutes</h2>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: isMobile ? "0.88rem" : "1.05rem", color: "rgba(255,255,255,0.6)", whiteSpace: isMobile ? "normal" : "nowrap", margin: "0 auto", lineHeight: 1.7 }}>From template to production in five steps. No hardware hassles — just pure computational power on-demand.</p>
          </div>

          <style>{`
            .bento-asymmetric-grid {
               display: grid;
               grid-template-columns: repeat(12, 1fr);
               gap: 16px;
               max-width: 1040px;
               margin: 0 auto;
               padding: 0 20px;
            }
            .bento-card-01 { grid-column: span 7; }
            .bento-card-02 { grid-column: span 5; }
            .bento-card-03 { grid-column: span 5; }
            .bento-card-04 { grid-column: span 7; }
            .bento-card-05 { grid-column: span 12; }
            
            @media (max-width: 960px) {
               .bento-card-01, .bento-card-02, .bento-card-03, .bento-card-04, .bento-card-05 {
                  grid-column: span 12;
               }
            }
            @media (max-width: 767px) {
               .bento-asymmetric-grid {
                 grid-template-columns: 1fr;
                 padding: 0 4px;
               }
               .bento-card-01, .bento-card-02, .bento-card-03, .bento-card-04, .bento-card-05 {
                  grid-column: span 1;
               }
            }
          `}</style>
          <div className="bento-asymmetric-grid">
            <div className="reveal-on-scroll bento-card-01" style={{ transitionDelay: "0.1s" }}><BentoStepCard {...steps[0]} /></div>
            <div className="reveal-on-scroll bento-card-02" style={{ transitionDelay: "0.15s" }}><BentoStepCard {...steps[1]} /></div>

            <div className="reveal-on-scroll bento-card-03" style={{ transitionDelay: "0.2s" }}><BentoStepCard {...steps[2]} /></div>
            <div className="reveal-on-scroll bento-card-04" style={{ transitionDelay: "0.25s" }}><BentoStepCard {...steps[3]} /></div>

            <div className="reveal-on-scroll bento-card-05" style={{ transitionDelay: "0.3s" }}><BentoStepCard {...steps[4]} /></div>
          </div>
        </div>
      </section>


      {/* ── PRICING ── */}
      <section id="pricing" style={{ background: "var(--bgColor-mild)", borderTop: "1px solid var(--borderColor-default)", borderBottom: "1px solid var(--borderColor-default)" }}>
        <div style={{ width: "100%", maxWidth: 1300, margin: "0 auto", padding: isMobile ? "48px 16px" : "120px 20px" }}>

          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", flexWrap: "wrap", gap: isMobile ? 32 : 60, alignItems: "flex-start", marginBottom: 50 }}>
            {/* Left Header Column */}
            <div className="reveal-on-scroll" style={{ flex: "1 1 320px", textAlign: "left" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>Pricing</div>
              <h2 style={{ fontFamily: "var(--font-sans)", fontSize: isMobile ? "clamp(1.5rem, 6vw, 2rem)" : "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, color: "var(--fgColor-default)", letterSpacing: "-0.02em", marginBottom: 12 }}>Pay as you go</h2>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "1rem", color: "var(--fgColor-muted)", maxWidth: "100%", lineHeight: 1.7, marginBottom: 32 }}>Our pricing model lets you pay only for what you use. No minimum commitments. Paused instances only incur storage fees. <span style={{ color: ACCENT, fontWeight: 700 }}>Zero Lock-in!</span></p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f6ef7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  <span style={{ fontSize: "0.95rem", color: "var(--fgColor-muted)", fontFamily: "var(--font-sans)" }}>Pay-as-you-go wallet with real-time billing</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f6ef7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  <span style={{ fontSize: "0.95rem", color: "var(--fgColor-muted)", fontFamily: "var(--font-sans)" }}>Fractional to Dedicated RTX 5090 GPUs</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f6ef7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  <span style={{ fontSize: "0.95rem", color: "var(--fgColor-muted)", fontFamily: "var(--font-sans)" }}>Pre-built stacks: Jupyter, VS Code & KDE Desktop</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f6ef7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  <span style={{ fontSize: "0.95rem", color: "var(--fgColor-muted)", fontFamily: "var(--font-sans)" }}>Containerized workspaces via WebRTC in seconds</span>
                </div>
              </div>

              <div style={{ marginTop: 36 }}>
                <Link href="/waitlist"
                  style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 32px", background: "#4f6ef7", color: "#ffffff", fontFamily: "var(--font-sans)", fontSize: "1rem", fontWeight: 700, borderRadius: 12, textDecoration: "none", boxShadow: "0 8px 24px rgba(79,110,247,0.35), inset 0 1px 2px rgba(255,255,255,0.2)", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#3a56d4"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#4f6ef7"; e.currentTarget.style.transform = "translateY(0)"; }}>
                  Deploy Your AI Workspace
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </Link>
              </div>
            </div>

            {/* Right Table Column */}
            <div style={{ flex: "2 1 600px", minWidth: 0 }}>
              <PricingGrid rows={pricing} />
            </div>
          </div>

          <div className="reveal-on-scroll" style={{ width: "100%", transitionDelay: "0.2s" }}>
            <style>{`
              @property --a {
                syntax: '<angle>';
                initial-value: 0deg;
                inherits: false;
              }
              @keyframes border-rotate {
                to { --a: 360deg; }
              }
              .all-plans-item { transition: transform 0.2s ease; }
              .all-plans-item:hover { transform: translateY(-2px); }
              .all-plans-border-wrap {
                padding: 2px;
                border-radius: 18px;
                background: conic-gradient(from var(--a), transparent 20%, #4f6ef7 40%, #818cf8 50%, #4f6ef7 60%, transparent 80%);
                animation: border-rotate 3s linear infinite;
              }
              .all-plans-inner {
                background: #0d0d10;
                border-radius: 16px;
                padding: 36px 44px;
                position: relative;
                overflow: hidden;
              }
            `}</style>
            <div className="all-plans-border-wrap">
              <div className="all-plans-inner">
                <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--fgColor-muted)", marginBottom: 28, textAlign: "center" }}>All plans include</div>

                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))", gap: "28px 40px" }}>
                  {[
                    { title: "Persistent ZFS Storage", desc: "Datasets outlive sessions with high-speed local mounts." },
                    { title: "Pre-built ML Images", desc: "CUDA, PyTorch, and TensorFlow environments pre-configured." },
                    { title: "Full Terminal Control", desc: "Root-level SSH and browser-based file management." },
                    { title: "University SSO Integration", desc: "Instant secure access via KSRCE institutional identity." },
                    { title: "Real-time Billing", desc: "Live spend tracking, limit controls, and session pausing." },
                    { title: "Priority Support", desc: "Premium email support from our engineering team." },
                  ].map((f, i) => (
                    <div key={i} className="all-plans-item" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div style={{ marginTop: 2 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                      <div>
                        <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.95rem", fontWeight: 700, color: "var(--fgColor-default)", marginBottom: 4 }}>{f.title}</div>
                        <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.8rem", color: "var(--fgColor-muted)", lineHeight: 1.5 }}>{f.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq">
        <div className="land-section" style={{ padding: isMobile ? "48px 20px" : undefined }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>FAQ</div>
            <h2 style={{ fontFamily: "var(--font-sans)", fontSize: isMobile ? "clamp(1.4rem, 6vw, 2rem)" : "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, color: "var(--fgColor-default)", letterSpacing: "-0.02em", marginBottom: 14 }}>Frequently Asked Questions</h2>
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

      {/* ── CTA BANNER ── */}
      <section
        style={{
          minHeight: `${(1 / zoom) * 100}vh`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#050810",
          textAlign: "center",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Video Background - Full section cover */}
        <video
          src="/Image_Assets/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center center",
            zIndex: 0,
          }}
        />
        {/* Gradient Overlay for Text Contrast */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(5,8,16,0.7) 0%, rgba(5,8,16,0.4) 40%, rgba(5,8,16,0.4) 60%, rgba(5,8,16,0.7) 100%)",
          zIndex: 1,
        }} />
        {/* Content - Centered */}
        <div style={{ position: "relative", zIndex: 2, maxWidth: 700, padding: isMobile ? "0 20px" : "0", transform: isMobile ? "translateY(0)" : "translateY(-15vh)" }}>
          <h2 style={{ fontFamily: "var(--font-sans)", fontSize: isMobile ? "clamp(1.6rem, 7vw, 2.4rem)" : "clamp(2.2rem, 5vw, 3.8rem)", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em", marginBottom: 20, lineHeight: 1.15, textShadow: "0 4px 30px rgba(0,0,0,0.8)" }}>Ready to launch your first GPU session?</h2>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: isMobile ? "0.9rem" : "clamp(0.9rem, 1.5vw, 1.1rem)", color: "rgba(255,255,255,0.85)", marginBottom: 40, lineHeight: 1.6, maxWidth: 640, margin: "0 auto 40px" }}>Stop waiting. Start training. Harness the raw power of the KSRCE RTX 5090 fleet and scale your research from zero to state-of-the-art in under 60 seconds.</p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/waitlist"
              style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 40px", background: ACCENT, color: "#fff", fontFamily: "var(--font-sans)", fontSize: "1.1rem", fontWeight: 700, borderRadius: 10, textDecoration: "none", boxShadow: `0 6px 30px rgba(79,110,247,0.6)`, transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = ACCENT_DARK; e.currentTarget.style.transform = "translateY(-3px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = ACCENT; e.currentTarget.style.transform = "translateY(0)"; }}>
              Ignite Your Session →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid var(--borderColor-default)", padding: isMobile ? "24px 20px" : "28px 48px", display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "1rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fgColor-default)" }}>LaaS</span>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.8rem", color: "var(--fgColor-muted)" }}>KSRCE AI Lab — Lab as a Service Platform · © 2025</span>
        <div style={{ display: "flex", gap: 24 }}>
          {["Privacy", "Terms", "Docs", "Pricing"].map(l => (
            <a key={l} href="#"
              style={{ fontFamily: "var(--font-sans)", fontSize: "0.8rem", color: "var(--fgColor-muted)", textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--fgColor-default)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--fgColor-muted)")}>
              {l}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}
