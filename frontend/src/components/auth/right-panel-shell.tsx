"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface RightPanelShellProps {
  children: React.ReactNode;
  className?: string;
}

export function RightPanelShell({ children, className }: RightPanelShellProps) {
  return (
    <div
      className={cn(
        "relative flex h-full min-w-0 flex-1 flex-col bg-white",
        className
      )}
    >
      <Link
        href="/"
        className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
        aria-label="Close"
      >
        <X className="h-5 w-5 text-neutral-700" />
      </Link>
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 md:px-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
