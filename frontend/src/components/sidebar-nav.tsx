"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const styles = `
  .nav-item {
    background-color: transparent;
    transition: background-color 0.15s ease, color 0.15s ease;
  }
  .nav-item:hover {
    background-color: var(--bgColor-default);
    color: var(--fgColor-default);
  }
  .nav-item.active {
    background-color: var(--bgColor-default);
    color: var(--fgColor-default);
  }
  .sub-item {
    background-color: transparent;
    transition: background-color 0.15s ease, color 0.15s ease;
  }
  .sub-item:hover {
    background-color: var(--bgColor-default);
    color: var(--fgColor-default);
  }
  .sub-item.active {
    background-color: var(--bgColor-default);
    color: var(--fgColor-default);
  }
`;

interface NavSection {
  id: string;
  label: string;
  href?: string;
  items?: { id: string; label: string; href?: string }[];
}

const navSections: NavSection[] = [
  { id: "home", label: "HOME", href: "/home" },
  {
    id: "hub",
    label: "THE HUB",
    items: [
      { id: "templates", label: "Templates (available soon)" },
    ],
  },
  {
    id: "manage",
    label: "MANAGE",
    items: [
      { id: "instances", label: "Instances", href: "/instances" },
      { id: "storage", label: "Storage", href: "/storage" },
    ],
  },
  {
    id: "account",
    label: "ACCOUNT",
    items: [
      { id: "profile", label: "Profile", href: "/profile" },
      { id: "ssh-keys", label: "SSH Keys (available soon)" },
      { id: "billing", label: "Billing", href: "/billing" },
      { id: "referral", label: "Refer & Earn", href: "/referral" },
    ],
  },
];

// Lambda-style line icons (from Lambda.ai CSS)
function NavIcon({ type, size = 22 }: { type: string; size?: number }) {
  const strokeWidth = 1.5;
  const color = "currentColor";

  switch (type) {
    case "home":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "hub":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "manage":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case "account":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1" />
        </svg>
      );
  }
}

export function SidebarNav() {
  return (
    <>
      <style>{styles}</style>
      <NavContent />
    </>
  );
}

function NavContent() {
  const router = useRouter();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string[]>(["hub"]);

  // Determine active item based on current pathname
  const getActiveItem = () => {
    if (pathname === "/home" || pathname.startsWith("/home")) return "home";
    if (pathname === "/billing" || pathname.startsWith("/billing")) return "billing";
    if (pathname === "/storage" || pathname.startsWith("/storage")) return "storage";
    if (pathname === "/instances" || pathname.startsWith("/instances")) return "instances";
    if (pathname === "/referral" || pathname.startsWith("/referral")) return "referral";
    if (pathname === "/profile" || pathname.startsWith("/profile")) return "profile";
    // Add more route matching as needed
    return "home";
  };

  const [activeItem, setActiveItem] = useState<string>(getActiveItem());

  const toggleSection = (id: string) => {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const isExpanded = (id: string) => expanded.includes(id);

  const handleNavClick = (section: NavSection) => {
    if (section.href) {
      router.push(section.href);
    }
    setActiveItem(section.id);
    if (section.items && section.items.length > 0) {
      toggleSection(section.id);
    }
  };

  const handleSubItemClick = (item: { id: string; label: string; href?: string }) => {
    if (item.href) {
      router.push(item.href);
    }
    setActiveItem(item.id);
  };

  return (
    <nav aria-label="Primary navigation" style={{ paddingTop: "8px", paddingBottom: "8px" }}>
      {navSections.map((section) => {
        const hasItems = section.items && section.items.length > 0;
        const isActive = activeItem === section.id;
        const expandedState = isExpanded(section.id);

        return (
          <div key={section.id}>
            {/* Section header — Lambda style nav item */}
            <button
              onClick={() => handleNavClick(section)}
              className={`w-full flex items-center gap-3 relative ${isActive ? "active" : ""}`}
              style={{
                height: "48px",
                padding: "0 16px",
                color: "var(--fgColor-default)",
                backgroundColor: isActive ? "var(--bgColor-default)" : "transparent",
                fontWeight: 400,
              }}
            >
              {/* Hover/Active indicator - 2px left border */}
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "2px",
                  height: "28px",
                  backgroundColor: isActive ? "var(--fgColor-default)" : "transparent",
                  borderRadius: "1px",
                  transition: "background-color 0.15s ease",
                }}
              />
              <span className="shrink-0">
                <NavIcon type={section.id} size={24} />
              </span>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-base)",
                  fontWeight: 400,
                  textTransform: "uppercase",
                  letterSpacing: "var(--tracking-label)",
                }}
              >
                {section.label}
              </span>
            </button>

            {/* Sub-items */}
            {hasItems && expandedState && (
              <div>
                {section.items!.map((item) => {
                  const isSubActive = activeItem === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSubItemClick(item)}
                      className={`w-full text-left relative ${isSubActive ? "active" : ""}`}
                      style={{
                        height: "44px",
                        padding: "0 16px 0 52px",
                        fontSize: "var(--text-sm)",
                        fontWeight: isSubActive ? 500 : 400,
                        color: isSubActive ? "var(--fgColor-default)" : "var(--fgColor-muted)",
                        backgroundColor: isSubActive ? "var(--bgColor-default)" : "transparent",
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {/* Sub-item active indicator */}
                      <span
                        style={{
                          position: "absolute",
                          left: "20px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: isSubActive ? "5px" : "0",
                          height: isSubActive ? "5px" : "0",
                          backgroundColor: isSubActive ? "var(--fgColor-default)" : "transparent",
                          borderRadius: "50%",
                          transition: "all 0.15s ease",
                        }}
                      />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
