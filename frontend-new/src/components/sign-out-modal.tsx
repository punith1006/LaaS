"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

interface SignOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  hasActiveInstances?: boolean;
}

/**
 * Sign-out confirmation modal following Lambda.ai design system
 * - Narrow modal (max-width: 420px)
 * - Clean header with border bottom
 * - 24px padding content
 * - Primary and outline button variants
 */
export function SignOutModal({
  isOpen,
  onClose,
  onConfirm,
  hasActiveInstances = false,
}: SignOutModalProps) {
  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        {/* Modal background overlay */}
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50"
          style={{
            backgroundColor: "rgba(11, 11, 11, 0.15)",
          }}
        />
        
        {/* Modal content */}
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]"
          style={{
            width: "calc(100% - 32px)",
            maxWidth: "420px",
            maxHeight: "95%",
            backgroundColor: "var(--bgColor-default)",
            border: "1px solid var(--borderColor-default)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Modal header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "16px 24px",
              borderBottom: "1px solid var(--borderColor-default)",
              lineHeight: "1.375rem",
            }}
          >
            <DialogPrimitive.Title
              style={{
                flex: 1,
                color: "var(--fgColor-default)",
                fontSize: "1.125rem",
                fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
                fontWeight: 400,
                margin: 0,
              }}
            >
              {hasActiveInstances ? "Active Instances Running" : "Sign Out"}
            </DialogPrimitive.Title>
          </div>

          {/* Modal content */}
          <div
            style={{
              overflowY: "auto",
              overflowX: "hidden",
              padding: "24px",
            }}
          >
            <p
              style={{
                color: "var(--fgColor-mild)",
                fontSize: "0.875rem",
                lineHeight: "1.375rem",
                fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
                margin: 0,
                marginBottom: "24px",
              }}
            >
              {hasActiveInstances
                ? "You have active compute instances running. Signing out now will not terminate these instances. They will continue running and incurring charges. Please confirm if you want to proceed with signing out."
                : "Are you sure you want to sign out? You will need to sign in again to access your account."}
            </p>

            {/* Button row */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              {/* Cancel button - Outline variant */}
              <button
                onClick={onClose}
                style={{
                  color: "var(--fgColor-mild)",
                  backgroundColor: "transparent",
                  border: "1px solid var(--borderColor-default)",
                  borderRadius: "4px",
                  padding: "0 24px",
                  height: "40px",
                  fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(11, 11, 11, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                Cancel
              </button>

              {/* Confirm button - Primary variant */}
              <button
                onClick={onConfirm}
                style={{
                  color: "#E7E6D9",
                  backgroundColor: "#2E2E2E",
                  border: "1px solid transparent",
                  borderRadius: "4px",
                  padding: "0 24px",
                  height: "40px",
                  fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#0B0B0B";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#2E2E2E";
                }}
              >
                {hasActiveInstances ? "Sign Out Anyway" : "Sign Out"}
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
