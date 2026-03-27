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
//               LaaS gives KSRCE students and researchers instant access to NVIDIA 4090&amp; H100 GPUs, 15 GB persistent storage, and Jupyter notebooks — secured by university SSO.
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

function StepCard({ num, icon, title, items, color, glow, glow2, border, featured = false, extraPad = 0 }: {
  num: string; icon: React.ReactNode; title: string; items: string[];
  color: string; glow: string; glow2: string; border: string;
  featured?: boolean; extraPad?: number;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position: "relative", overflow: "hidden",
        background: featured
          ? `linear-gradient(160deg, ${glow2} 0%, var(--bgColor-mild) 60%)`
          : "var(--bgColor-mild)",
        border: `1px solid ${hov || featured ? border : "var(--borderColor-default)"}`,
        borderRadius: 18,
        padding: `${24 + extraPad}px 20px ${22 + extraPad}px`,
        transition: "all 0.35s cubic-bezier(0.23,1,0.32,1)",
        transform: hov ? "translateY(-8px)" : featured ? "translateY(-6px)" : "translateY(0)",
        boxShadow: featured
          ? `0 24px 60px rgba(0,0,0,0.1), 0 0 50px ${glow}`
          : hov ? `0 20px 50px rgba(0,0,0,0.1), 0 0 40px ${glow}` : "none",
        cursor: "default",
      }}>
      {/* Featured top bar */}
      {featured && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />}
      {/* Top glow line on hover (non-featured) */}
      {!featured && <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 1, background: hov ? `linear-gradient(90deg, transparent, ${color}, transparent)` : "transparent", transition: "all 0.3s" }} />}
      {/* Ghost number */}
      <div style={{ position: "absolute", top: 14, right: 16, fontFamily: "ui-monospace,monospace", fontSize: featured ? "3.4rem" : "2.8rem", fontWeight: 800, color, opacity: hov || featured ? 0.13 : 0.06, lineHeight: 1, letterSpacing: "-0.05em", transition: "opacity 0.3s", userSelect: "none" }}>{num}</div>
      {/* Icon */}
      <div style={{ width: featured ? 52 : 44, height: featured ? 52 : 44, borderRadius: 12, background: glow2, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", color, marginBottom: 14, transition: "box-shadow 0.3s", boxShadow: hov || featured ? `0 0 20px ${glow}` : "none" }}>
        {icon}
      </div>
      {/* Badge */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "ui-monospace,monospace", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color, background: glow2, border: `1px solid ${border}`, borderRadius: 6, padding: "2px 8px", marginBottom: 10 }}>
        {featured && <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, display: "inline-block" }} />}
        Step {num}
      </div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: featured ? "1.05rem" : "0.97rem", fontWeight: 700, color: "var(--fgColor-default)", marginBottom: 12, lineHeight: 1.3 }}>{title}</div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 7 }}>
        {items.map((it, i) => (
          <li key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "var(--font-sans)", fontSize: "0.78rem", color: hov || featured ? "var(--fgColor-default)" : "var(--fgColor-muted)", transition: "color 0.2s" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0, opacity: hov || featured ? 1 : 0.3, transition: "opacity 0.25s" }} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}



// ─── Theme Hook ──────────────────────────────────────────────────────────────
function useTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved === "true") { setIsDark(true); document.documentElement.classList.add("dark"); }
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("darkMode", String(next));
  };

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
function Nav({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
      height: 60,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 48px",
      background: scrolled ? (isDark ? "rgba(8,10,18,0.92)" : "rgba(245,245,240,0.92)") : "transparent",
      borderBottom: scrolled ? `1px solid var(--borderColor-default)` : "1px solid transparent",
      backdropFilter: scrolled ? "blur(14px)" : "none",
      transition: "all 0.3s ease",
    }}>
      <span style={{ fontFamily: "var(--font-sans)", fontSize: "1.1rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fgColor-default)" }}>
        LaaS
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        {["Features", "How It Works", "Pricing", "FAQ"].map(l => (
          <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`}
            style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", color: "var(--fgColor-muted)", textDecoration: "none", transition: "color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--fgColor-default)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--fgColor-muted)")}>
            {l}
          </a>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onToggle}
          style={{ background: "transparent", border: `1px solid var(--borderColor-default)`, borderRadius: 6, width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fgColor-muted)", transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--bgColor-muted)"; e.currentTarget.style.color = "var(--fgColor-default)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--fgColor-muted)"; }}>
          {isDark
            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>}
        </button>
        <Link href="/signin"
          style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", fontWeight: 500, color: "var(--fgColor-default)", textDecoration: "none", padding: "7px 18px", border: "1px solid var(--borderColor-default)", borderRadius: 6, transition: "all 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--bgColor-muted)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          Sign In
        </Link>
        <Link href="/signup"
          style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", fontWeight: 600, color: "#fff", textDecoration: "none", padding: "7px 20px", backgroundColor: ACCENT, borderRadius: 6, border: `1px solid ${ACCENT}`, transition: "all 0.15s", boxShadow: `0 0 20px ${ACCENT_GLOW}` }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}>
          Get Started →
        </Link>
      </div>
    </nav>
  );
}

// ─── Terminal Block ───────────────────────────────────────────────────────────
const termLines = [
  { t: "cmd", s: "$ laas login --sso ksrce.edu.in" },
  { t: "ok", s: "✓  Authenticated via KSRCE SSO" },
  { t: "ok", s: "✓  Storage provisioned  up to 100 GB ZFS" },
  { t: "", s: "" },
  { t: "cmd", s: "$ laas launch --gpu 4090 --type jupyter" },
  { t: "muted", s: "  Selecting node …" },
  { t: "muted", s: "  Pulling image  laas/jupyter:cuda12" },
  { t: "ok", s: "✓  Session live in 8s" },
  { t: "url", s: "  → https://sess.laas.io/xk9f2a" },
  { t: "", s: "" },
  { t: "muted", s: "  GPU  4090 24 GB     vCPU 8     RAM 32 GB" },
  { t: "cursor", s: "▊" },
];

function HeroTerminal() {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const tids: ReturnType<typeof setTimeout>[] = [];
    termLines.forEach((_, idx) => {
      tids.push(setTimeout(() => setShown(idx + 1), idx * 380));
    });
    return () => tids.forEach(clearTimeout);
  }, []);

  const col: Record<string, string> = {
    cmd: "var(--fgColor-default)", ok: "#22c55e",
    muted: "var(--fgColor-muted)", url: ACCENT, cursor: ACCENT,
  };

  return (
    <div style={{ background: "var(--bgColor-mild)", border: "1px solid var(--borderColor-default)", borderRadius: 10, overflow: "hidden", fontFamily: "var(--font-mono),ui-monospace,monospace", fontSize: "0.82rem", lineHeight: 1.75 }}>
      <div style={{ display: "flex", gap: 7, padding: "10px 16px", background: "var(--bgColor-muted)", borderBottom: "1px solid var(--borderColor-default)", alignItems: "center" }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
        <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--fgColor-muted)" }}>laas — bash</span>
      </div>
      <div style={{ padding: "18px 22px", minHeight: 240 }}>
        {termLines.slice(0, shown).map((l, i) => (
          <div key={i} style={{ color: col[l.t] ?? "var(--fgColor-default)", animation: "fadeUp 0.2s ease" }}>{l.s}</div>
        ))}
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
      `}</style>

      <div ref={gridRef} style={{
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
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.85rem", color: "var(--fgColor-muted)", lineHeight: 1.7, marginBottom: 16 }}>Move massive checkpoints on our high-speed local network. AWS charges per-GB — we don't.</p>
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

        {/* Card 5: Predictable Envs — spans 2 */}
        <div className="bento-card bento-animate" style={{ gridColumn: "span 2", padding: "28px 32px", display: "flex", gap: 32, alignItems: "center", transitionDelay: "0.3s" }}>
          <div style={{ flex: 1 }}>
            <div className="bento-tag" style={{ background: "rgba(249,115,22,0.1)", color: "#f97316", border: "1px solid rgba(249,115,22,0.25)" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="9" x2="19" y2="9" /><line x1="5" y1="15" x2="19" y2="15" /></svg>
              Consistency
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: "1.2rem", fontWeight: 800, color: "var(--fgColor-default)", marginBottom: 8, lineHeight: 1.25 }}>Same env on CPU and 4090— guaranteed</div>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.88rem", color: "var(--fgColor-muted)", lineHeight: 1.7 }}>Code on Epi-CPU, scale to 4090without touching a single config. Environment drift is a cloud problem, not yours.</p>
          </div>
          <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {[["Epi-CPU", "#888"], ["GPU-S", "#8b5cf6"], ["4090", "#4f8ef7"]].map(([label, color]) => (
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
function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--borderColor-default)", overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "18px 0", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.95rem", fontWeight: 500, color: "var(--fgColor-default)" }}>{q}</span>
        <span style={{ color: "var(--fgColor-muted)", fontSize: "1.2rem", transform: open ? "rotate(45deg)" : "rotate(0)", transition: "transform 0.2s ease", flexShrink: 0 }}>+</span>
      </button>
      <div style={{ maxHeight: open ? 300 : 0, overflow: "hidden", transition: "max-height 0.3s ease" }}>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", lineHeight: 1.7, color: "var(--fgColor-muted)", margin: "0 0 18px" }}>{a}</p>
      </div>
    </div>
  );
}

// ─── Pricing card ─────────────────────────────────────────────────────────────
function PricingTable({ rows }: { rows: any[] }) {
  const [hov, setHov] = useState<number | null>(null);
  const cols = [
    { key: "title", label: "Tier" },
    { key: "vcpu", label: "vCPUs" },
    { key: "memory", label: "RAM" },
    { key: "vram", label: "GPU VRAM" },
    { key: "hami", label: "HAMI %" },
    { key: "maxConc", label: "Max Sessions" },
    { key: "price", label: "₹/hour" },
  ] as const;

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
        .pricing-row.featured td { background: rgba(79,110,247,0.06); }
        .pricing-row.featured:hover td { background: rgba(79,110,247,0.1); }
      `}</style>
      <div style={{
        background: "var(--bgColor-default)",
        border: "1px solid var(--borderColor-default)",
        borderRadius: 14, overflow: "hidden",
      }}>
        <table className="pricing-table">
          <thead>
            <tr>
              {cols.map(c => (
                <th key={c.key}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(rows as any[]).map((row, i) => (
              <tr
                key={i}
                className={`pricing-row${row.highlight ? " featured" : ""}`}
                onMouseEnter={() => setHov(i)}
                onMouseLeave={() => setHov(null)}
              >
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontWeight: 800, fontSize: "0.97rem" }}>{row.title}</span>
                    {row.badge && (
                      <span style={{
                        fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase",
                        letterSpacing: "0.07em", background: ACCENT, color: "#fff",
                        borderRadius: 4, padding: "2px 7px",
                      }}>{row.badge}</span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--fgColor-muted)", marginTop: 3, fontWeight: 400 }}>{row.bestFor}</div>
                </td>
                <td style={{ fontFamily: "var(--font-mono),monospace", fontWeight: 600 }}>{row.vcpu}</td>
                <td style={{ fontFamily: "var(--font-mono),monospace", fontWeight: 600 }}>{row.memory}</td>
                <td style={{ fontFamily: "var(--font-mono),monospace", fontWeight: 600 }}>{row.vram}</td>
                <td style={{ fontFamily: "var(--font-mono),monospace", fontWeight: 600 }}>{row.hami}</td>
                <td style={{ fontFamily: "var(--font-mono),monospace", fontWeight: 600 }}>{row.maxConc}</td>
                <td>
                  <span style={{
                    fontFamily: "var(--font-mono),monospace", fontSize: "1.05rem", fontWeight: 800,
                    color: row.highlight ? ACCENT : (hov === i ? ACCENT : "var(--fgColor-default)"),
                    transition: "color 0.15s",
                  }}>{row.price}</span>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.72rem", color: "var(--fgColor-muted)", marginLeft: 3 }}>/hr</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

// ─── Main ─────────────────────────────────────────────────────────────────────
export function LandingPage() {
  const [isDark, toggle] = useTheme();
  const [zoom, setZoom] = useState(1);
  const stepsRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const row = stepsRowRef.current;
    if (!row) return;

    const cards = Array.from(row.querySelectorAll<HTMLElement>(".dock-card"));

    const onMove = (e: MouseEvent) => {
      const rowRect = row.getBoundingClientRect();
      const mouseX = e.clientX - rowRect.left;

      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const cardCenterX = rect.left + rect.width / 2 - rowRect.left;
        const dist = Math.abs(mouseX - cardCenterX);
        const maxDist = 180;
        const t = Math.max(0, 1 - dist / 260);
        const eased = t * t * (3 - 2 * t);
        const scale = 1 + eased * 0.07;
        const lift = eased * 6;
        card.style.transform = `translateY(-${lift}px) scale(${scale})`;
        card.style.zIndex = String(Math.round(eased * 10));
      });
    };

    const onLeave = () => {
      cards.forEach((card) => {
        card.style.transform = "";
        card.style.zIndex = "";
      });
    };

    row.addEventListener("mousemove", onMove);
    row.addEventListener("mouseleave", onLeave);
    return () => {
      row.removeEventListener("mousemove", onMove);
      row.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  // Apply zoom to match 1280px design viewport
  useEffect(() => {
    const setZoomValue = () => {
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
    { val: 500, suffix: "+", label: "Active Students" },
    { val: 24, suffix: " GB", label: "GPU VRAM (4090)" },
    { val: 15, suffix: " GB", label: "Storage / User" },
    { val: 99, suffix: "%", label: "Uptime SLA" },
  ];

  const steps = [
    { num: "01", icon: I.template, title: "Choose Template", color: "#4f8ef7", glow: "rgba(79,142,247,0.18)", glow2: "rgba(79,142,247,0.1)", border: "rgba(79,142,247,0.25)", items: ["Jupyter Notebook", "VS Code Server", "Stateful Desktop", "Custom CLI"] },
    { num: "02", icon: I.config, title: "Configure Resources", color: "#8b5cf6", glow: "rgba(139,92,246,0.18)", glow2: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.25)", items: ["Pick GPU tier", "Set memory & vCPU", "Choose OS image", "Set session duration"] },
    { num: "03", icon: I.launch, title: "Launch Instance", color: "#00d4ff", glow: "rgba(0,212,255,0.15)", glow2: "rgba(0,212,255,0.08)", border: "rgba(0,212,255,0.22)", items: ["One-click launch", "Ready in < 30s", "Auto-mount storage", "SSO identity injected"] },
    { num: "04", icon: I.tools, title: "Development Tools", color: "#10f5a4", glow: "rgba(16,245,164,0.15)", glow2: "rgba(16,245,164,0.08)", border: "rgba(16,245,164,0.22)", items: ["Full terminal access", "SSH key support", "File upload/download", "Live port forwarding"] },
    { num: "05", icon: I.deploy, title: "Manage & Monitor", color: "#f97316", glow: "rgba(249,115,22,0.15)", glow2: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.22)", items: ["Pause / Resume", "Real-time billing", "Session event log", "Quota analytics"] },
  ];

  const faqs = [
    { q: "What types of GPUs are available on LaaS?", a: "LaaS provides access to NVIDIA RTX 4090 GPUs with 24 GB VRAM. Fractional GPU allocation via HAMI allows multiple users to share a single GPU efficiently for lighter workloads." },
    { q: "How is storage handled across sessions?", a: "Institution SSO users receive up to 100 GB of persistent ZFS storage on first login. This dataset is mounted automatically into every session, so your datasets, notebooks, and code persist indefinitely between sessions." },
    { q: "Can I access my session via SSH?", a: "Yes. Every session exposes an SSH endpoint. You can upload your public SSH keys through the Account → SSH Keys panel and connect directly from your local terminal." },
    { q: "How does billing work?", a: "LaaS uses a wallet-based credit system with per-second billing charges. Active sessions burn credits at the configured compute rate. Paused sessions only incur minimal storage fees. You can set spend limits and view a real-time daily spend chart on your dashboard." },
    { q: "Do I need to set up Keycloak for university SSO?", a: "Admins configure the Keycloak IDP federation (SAML or OIDC) once per institution. After that, all students and faculty can sign in using their existing university email credentials — no additional signup required." },
    { q: "What happens when a session is idle?", a: "Sessions that exceed a configurable idle threshold are automatically terminated to conserve resources. Files saved to the persistent storage volume are always preserved regardless of session termination status." },
  ];

  const pricing = [
    { title: "Spark", price: "₹35", vcpu: 2, memory: "4 GB", vram: "2 GB", hami: "8%", maxConc: 8, bestFor: "Small PyTorch inference, Jupyter notebooks, educational projects", badge: undefined, highlight: false },
    { title: "Blaze", price: "₹65", vcpu: 4, memory: "8 GB", vram: "4 GB", hami: "17%", maxConc: 4, bestFor: "Model fine-tuning, GPU-accelerated rendering, professional development", badge: "Popular", highlight: true },
    { title: "Inferno", price: "₹105", vcpu: 8, memory: "16 GB", vram: "8 GB", hami: "33%", maxConc: 2, bestFor: "Large model training, complex 3D rendering, GPU-intensive simulations", badge: undefined, highlight: false },
    { title: "Supernova", price: "₹155", vcpu: 12, memory: "32 GB", vram: "16 GB", hami: "67%", maxConc: 1, bestFor: "Large-scale deep learning, exclusive research sessions, production inference", badge: "Exclusive", highlight: false },
  ];
  // desc field removed — replaced by bestFor in new PricingCard

  return (
    <div className="landing-page">
      <Head>
        <style>{brandCss}</style>
      </Head>
      <style>{`
        .landing-page { zoom: calc(100vw / 1280); }
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

      <Nav isDark={isDark} onToggle={toggle} />

      {/* ── HERO ── */}
      <section style={{ position: "relative", minHeight: `${(1 / zoom) * 100}vh`, display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden" }}>

        {/* ↓ Particle network replaces the old hero-grid div */}
        <Particles />

        {/* Radial glow top-left */}
        <div style={{ position: "absolute", top: -120, left: -120, width: 600, height: 600, background: `radial-gradient(circle, ${ACCENT_GLOW} 0%, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />

        <div className="hero-split" style={{ display: "flex", alignItems: "center", gap: 48, padding: "72px 48px 56px", maxWidth: 1140, margin: "0 auto", width: "100%", position: "relative", zIndex: 1 }}>
          {/* Left */}
          <div style={{ flex: "1 1 52%", minWidth: 0 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", background: "var(--bgColor-mild)", border: `1px solid ${ACCENT}`, borderRadius: 9999, marginBottom: 20, animation: "fadeUp 0.4s ease 0.1s both" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
              <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: ACCENT }}>KSRCE AI Lab Infrastructure</span>
            </div>
            <h1 style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(2.4rem, 5vw, 4rem)", fontWeight: 800, lineHeight: 1.1, color: "var(--fgColor-default)", marginBottom: 10, letterSpacing: "-0.02em", animation: "fadeUp 0.4s ease 0.2s both" }}>
              Your Remote AI Workstation.
            </h1>
            <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(1.6rem, 3.5vw, 2.6rem)", fontWeight: 700, lineHeight: 1.2, color: ACCENT, marginBottom: 16, letterSpacing: "-0.02em", animation: "fadeUp 0.4s ease 0.3s both" }}>
              Work Anywhere. Create Everywhere.
            </h2>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.95rem", lineHeight: 1.65, color: "var(--fgColor-muted)", maxWidth: 440, marginBottom: 24, animation: "fadeUp 0.4s ease 0.4s both" }}>
              LaaS gives KSRCE students and researchers instant access to NVIDIA RTX 4090 GPUs with 24 GB VRAM, up to 100 GB persistent storage, and Jupyter notebooks — secured by university SSO.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", animation: "fadeUp 0.4s ease 0.5s both" }}>
              <Link href="/signup"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 26px", background: ACCENT, color: "#fff", fontFamily: "var(--font-sans)", fontSize: "0.95rem", fontWeight: 700, borderRadius: 8, border: `1px solid ${ACCENT}`, textDecoration: "none", boxShadow: `0 4px 24px ${ACCENT_GLOW}`, transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = ACCENT_DARK; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = ACCENT; e.currentTarget.style.transform = "translateY(0)"; }}>
                Launch a GPU →
              </Link>
              <a href="#how-it-works"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 26px", background: "transparent", color: "var(--fgColor-default)", fontFamily: "var(--font-sans)", fontSize: "0.95rem", fontWeight: 500, borderRadius: 8, border: "1px solid var(--borderColor-default)", textDecoration: "none", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--bgColor-mild)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "translateY(0)"; }}>
                See How It Works
              </a>
            </div>
          </div>

          {/* Right — Terminal */}
          <div style={{ flex: "1 1 48%", minWidth: 0, animation: "fadeUp 0.5s ease 0.5s both" }}>
            <HeroTerminal />
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div className="reveal-on-scroll" style={{ borderTop: "1px solid var(--borderColor-default)", borderBottom: "1px solid var(--borderColor-default)", background: "var(--bgColor-mild)" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 48px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          {stats.map((s, i) => (
            <div key={i} style={{ padding: "32px 24px", borderRight: i < stats.length - 1 ? "1px solid var(--borderColor-default)" : "none", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: "2.2rem", fontWeight: 800, color: "var(--fgColor-default)", lineHeight: 1, marginBottom: 6 }}>
                <Counter end={s.val} suffix={s.suffix} />
              </div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--fgColor-muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TRUSTED BY ── */}
      <div className="reveal-on-scroll" style={{ borderBottom: "1px solid var(--borderColor-default)", padding: "28px 48px", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", fontWeight: 600, color: "var(--fgColor-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 20 }}>
          Powering institutions that push boundaries
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "20px 48px" }}>
          {["KSRCE", "Partner Colleges", "Research Groups", "Industry Labs", "Govt. R&D Units"].map(l => (
            <span key={l} style={{ fontFamily: "var(--font-sans)", fontSize: "0.9rem", fontWeight: 600, color: "var(--fgColor-muted)", letterSpacing: "0.03em" }}>{l}</span>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works">
        <div className="land-section reveal-on-scroll">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>How It Works</div>
            <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, color: "var(--fgColor-default)", letterSpacing: "-0.02em", marginBottom: 14 }}>Launch AI Workspaces<br />in Minutes</h2>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "1rem", color: "var(--fgColor-muted)", maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>From template to production in five steps. No hardware hassles — just pure computational power on-demand.</p>
          </div>
          <div
            ref={stepsRowRef}
            style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, alignItems: "center" }}
          >
            {steps.map((s, i) => {
              const isFeatured = i === 2;
              const isTall = i === 1 || i === 3;
              return (
                <div
                  key={i}
                  className="dock-card reveal-on-scroll"
                  style={{
                    transitionDelay: `${i * 0.12}s`,
                    transformOrigin: "bottom center",
                    transition: "transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                    willChange: "transform",
                  }}
                >
                  <StepCard {...s} featured={isFeatured} extraPad={isTall ? 16 : 0} />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── YOUR GPU, YOUR TERMINAL ── */}
      <section className="reveal-on-scroll" style={{ background: "var(--bgColor-mild)", borderTop: "1px solid var(--borderColor-default)", borderBottom: "1px solid var(--borderColor-default)" }}>
        <div className="land-section hero-split" style={{ display: "flex", gap: 56, alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ background: "var(--bgColor-muted)", border: "1px solid var(--borderColor-default)", borderRadius: 10, overflow: "hidden", fontFamily: "var(--font-mono),ui-monospace,monospace", fontSize: "0.82rem", lineHeight: 1.8 }}>
              <div style={{ background: "var(--bgColor-mild)", borderBottom: "1px solid var(--borderColor-default)", padding: "10px 18px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
                <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--fgColor-muted)" }}>ssh student@sess.laas.io</span>
              </div>
              <div style={{ padding: "18px 22px" }}>
                <div style={{ color: "var(--fgColor-muted)" }}>Welcome to LaaS Node gpu-01.ksrce.edu.in</div>
                <div style={{ color: "var(--fgColor-muted)" }}>NVIDIA 409024 GB · CUDA 12.2 · Ubuntu 22.04</div>
                <div style={{ height: 12 }} />
                <div style={{ color: "var(--fgColor-default)" }}>$ nvidia-smi --query-gpu=name,memory.total --format=csv,noheader</div>
                <div style={{ color: "#22c55e" }}>NVIDIA 4090-SXM4-24GB, 24576 MiB</div>
                <div style={{ height: 8 }} />
                <div style={{ color: "var(--fgColor-default)" }}>$ du -sh ~/data/</div>
                <div style={{ color: "var(--fgColor-muted)" }}>3.2G    /home/student/data/</div>
                <div style={{ height: 8 }} />
                <div style={{ color: "var(--fgColor-default)" }}>$ python train.py --epochs 50 --model resnet50</div>
                <div style={{ color: "#22c55e" }}>Epoch  1/50  loss: 2.4132  acc: 0.312 ✓</div>
                <div style={{ color: "#22c55e" }}>Epoch  2/50  loss: 1.9820  acc: 0.418 ✓</div>
                <div style={{ color: ACCENT }}>▊</div>
              </div>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>Full Linux Access</div>
            <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 800, color: "var(--fgColor-default)", letterSpacing: "-0.02em", marginBottom: 20, lineHeight: 1.15 }}>Your GPU,<br />Your Terminal</h2>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.95rem", lineHeight: 1.75, color: "var(--fgColor-muted)", marginBottom: 28 }}>Get root-level SSH access to your GPU node. Run any workload — training, inference, data processing — with no restrictions. Your home directory persists across all sessions.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                "Instance & session management from dashboard",
                "Managed background runs with log tailing",
                "File transfer via SCP, SFTP or browser UI",
                "Agent-native API for CI/CD automation",
              ].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#22c55e", flexShrink: 0 }}>{I.check}</span>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.88rem", color: "var(--fgColor-default)" }}>{f}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 32 }}>
              <Link href="/signup"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 26px", background: ACCENT, color: "#fff", fontFamily: "var(--font-sans)", fontSize: "0.9rem", fontWeight: 600, borderRadius: 7, textDecoration: "none", transition: "all 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.background = ACCENT_DARK)}
                onMouseLeave={e => (e.currentTarget.style.background = ACCENT)}>
                Start Free →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ── */}
      <section id="features">
        <div className="land-section">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>Why Choose Us</div>
            <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, color: "var(--fgColor-default)", letterSpacing: "-0.02em" }}>Built for Academia, Better than Cloud</h2>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "1rem", color: "var(--fgColor-muted)", marginTop: 12, maxWidth: 640, margin: "12px auto 0", lineHeight: 1.6 }}>LaaS eliminates the hidden costs and complexity of AWS/GCP, offering zero-setup persistent storage and tailored institutional integration.</p>
          </div>
          <FeatureComparison />
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ background: "var(--bgColor-mild)", borderTop: "1px solid var(--borderColor-default)", borderBottom: "1px solid var(--borderColor-default)" }}>
        <div className="land-section">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>Pricing</div>
            <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, color: "var(--fgColor-default)", letterSpacing: "-0.02em", marginBottom: 12 }}>Pay as you go</h2>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "1rem", color: "var(--fgColor-muted)", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>Our pricing model lets you pay only for what you use. No minimum commitments. Paused instances only incur storage fees.</p>
          </div>
          <div style={{ marginBottom: 32 }}>
            <PricingTable rows={pricing} />
          </div>
          <div style={{ background: "var(--bgColor-default)", border: "1px solid var(--borderColor-default)", borderRadius: 10, padding: "28px 32px" }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--fgColor-muted)", marginBottom: 18 }}>All plans include</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "10px 40px" }}>
              {["Persistent ZFS storage", "SSH & browser file access", "Pre-built ML images (CUDA, PyTorch)", "University SSO login", "Real-time billing dashboard", "Session pause / resume", "Spend limit controls", "Priority email support"].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#22c55e" }}>{I.check}</span>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", color: "var(--fgColor-default)" }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <Link href="/signup"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 32px", background: ACCENT, color: "#fff", fontFamily: "var(--font-sans)", fontSize: "1rem", fontWeight: 700, borderRadius: 8, textDecoration: "none", boxShadow: `0 4px 24px ${ACCENT_GLOW}`, transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = ACCENT_DARK; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = ACCENT; e.currentTarget.style.transform = "translateY(0)"; }}>
              Start Free — No Credit Card →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq">
        <div className="land-section">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>FAQ</div>
            <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, color: "var(--fgColor-default)", letterSpacing: "-0.02em" }}>Frequently Asked Questions</h2>
          </div>
          <div style={{ maxWidth: 780, margin: "0 auto" }}>
            {faqs.map((f, i) => <FAQ key={i} {...f} />)}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{ background: `linear-gradient(135deg, #0e1a3a 0%, #0b0d18 100%)`, padding: "80px 48px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 700, height: 400, background: `radial-gradient(ellipse, ${ACCENT_GLOW} 0%, transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 14 }}>Ready to launch your first GPU session?</h2>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "1rem", color: "rgba(255,255,255,0.6)", marginBottom: 36, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 36px" }}>Sign up with your university email or institutional SSO and be running model training within 60 seconds.</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/signup"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 36px", background: ACCENT, color: "#fff", fontFamily: "var(--font-sans)", fontSize: "1rem", fontWeight: 700, borderRadius: 8, textDecoration: "none", boxShadow: `0 4px 24px rgba(79,110,247,0.5)`, transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = ACCENT_DARK; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = ACCENT; e.currentTarget.style.transform = "translateY(0)"; }}>
              Create Account →
            </Link>
            <Link href="/signin"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 36px", background: "transparent", color: "#fff", fontFamily: "var(--font-sans)", fontSize: "1rem", fontWeight: 500, borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", textDecoration: "none", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "translateY(0)"; }}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid var(--borderColor-default)", padding: "28px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
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
