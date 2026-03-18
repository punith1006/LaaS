"use client";

import { useState } from "react";

/**
 * Sidebar navigation — Utilitarian minimalism (Design\template.txt).
 * Accordions: Home (fixed), The Hub, Manage, Account.
 * Uppercase labels, wide tracking, minimal functional indicators.
 */

interface NavSection {
  id: string;
  label: string;
  items: string[];
  isAccordion: boolean;
}

const sections: NavSection[] = [
  { id: "home", label: "Home", items: [], isAccordion: false },
  { id: "hub", label: "The Hub", items: ["Overview", "Activity", "Resources"], isAccordion: true },
  { id: "manage", label: "Manage", items: ["Projects", "Team", "Settings"], isAccordion: true },
  { id: "account", label: "Account", items: ["Profile", "Billing", "Security"], isAccordion: true },
];

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      style={{
        transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.15s ease",
      }}
    >
      <path
        d="M1 3L5 7L9 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SidebarNav() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["hub"]));
  const [activeItem, setActiveItem] = useState<string>("home");

  const toggle = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpanded(next);
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "var(--text-xs)",
    textTransform: "uppercase",
    letterSpacing: "var(--tracking-label)",
    fontWeight: 500,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Primary navigation */}
      <nav className="flex-1 min-h-0 py-4" aria-label="Primary navigation">
        {sections.map((section) => (
          <div key={section.id} className="mb-1">
            {section.isAccordion ? (
              /* Accordion section */
              <div>
                <button
                  type="button"
                  onClick={() => toggle(section.id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-black/[0.03] transition-colors"
                  style={labelStyle}
                >
                  <span style={{ color: "#1a1a1a" }}>{section.label}</span>
                  <span style={{ color: "#9a9a8e" }}>
                    <Chevron expanded={expanded.has(section.id)} />
                  </span>
                </button>
                {expanded.has(section.id) && (
                  <div className="py-1">
                    {section.items.map((item) => {
                      const itemId = `${section.id}-${item.toLowerCase()}`;
                      const isActive = activeItem === itemId;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setActiveItem(itemId)}
                          className="w-full text-left px-8 py-2 transition-colors relative"
                          style={{
                            fontSize: "var(--text-sm)",
                            color: isActive ? "#1a1a1a" : "#6b6b5f",
                            fontWeight: isActive ? 500 : 400,
                          }}
                        >
                          {isActive && (
                            <span
                              className="absolute left-4 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                              style={{ backgroundColor: "#22c55e" }}
                            />
                          )}
                          {item}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Fixed section - Home */
              <button
                type="button"
                onClick={() => setActiveItem(section.id)}
                className="w-full text-left px-4 py-2.5 transition-colors relative"
                style={{
                  ...labelStyle,
                  color: activeItem === section.id ? "#1a1a1a" : "#1a1a1a",
                  fontWeight: activeItem === section.id ? 600 : 500,
                }}
              >
                {activeItem === section.id && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5"
                    style={{ backgroundColor: "#22c55e" }}
                  />
                )}
                {section.label}
              </button>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom group - no divider per current design */}
      <div className="shrink-0 min-h-[140px]" aria-hidden />
    </div>
  );
}
