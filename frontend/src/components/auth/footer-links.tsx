"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const links = [
  { label: "Need help?", href: "#" },
  { label: "Contact Support", href: "#" },
  { label: "User Policy", href: "#" },
  { label: "User Content Disclaimer", href: "#" },
  { label: "Console Terms of Service", href: "#" },
];

interface FooterLinksProps {
  className?: string;
  onPolicyClick?: (slug: "acceptable_use" | "user_content_disclaimer" | "console_tos") => void;
}

export function FooterLinks({ className, onPolicyClick }: FooterLinksProps) {
  const slugMap = {
    "User Policy": "acceptable_use" as const,
    "User Content Disclaimer": "user_content_disclaimer" as const,
    "Console Terms of Service": "console_tos" as const,
  };

  return (
    <footer
      className={cn(
        "mt-8 flex flex-wrap justify-center gap-x-2 gap-y-1 text-center text-xs text-neutral-500",
        className
      )}
    >
      {links.map((item, i) => {
        const slug = slugMap[item.label as keyof typeof slugMap];
        if (slug && onPolicyClick) {
          return (
            <span key={item.label}>
              <button
                type="button"
                onClick={() => onPolicyClick(slug)}
                className="underline hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 rounded"
              >
                {item.label}
              </button>
              {i < links.length - 1 && <span className="mx-1">|</span>}
            </span>
          );
        }
        return (
          <span key={item.label}>
            <Link
              href={item.href}
              className="underline hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 rounded"
            >
              {item.label}
            </Link>
            {i < links.length - 1 && <span className="mx-1">|</span>}
          </span>
        );
      })}
    </footer>
  );
}
