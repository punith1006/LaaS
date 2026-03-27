"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { PolicySlug } from "@/config/policies";
import { POLICIES } from "@/config/policies";

interface PolicyModalProps {
  slug: PolicySlug;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function PolicyModal({
  slug,
  open,
  onOpenChange,
  onConfirm,
}: PolicyModalProps) {
  const policy = POLICIES[slug];
  const scrollRef = useRef<HTMLDivElement>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [agreeChecked, setAgreeChecked] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
      setReachedEnd(true);
    }
  }, []);

  const scrollToEnd = () => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (!open) {
      setReachedEnd(false);
      setAgreeChecked(false);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (el && el.scrollHeight <= el.clientHeight) {
          setReachedEnd(true);
        }
      });
    }
  }, [open]);

  const handleConfirm = () => {
    if (agreeChecked) {
      onConfirm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[85vh] w-[90vw] max-w-2xl flex-col gap-0 overflow-hidden p-0"
        showClose={true}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-neutral-100 px-6 pb-3 pt-6 pr-12">
          <DialogTitle className="text-lg font-semibold text-black">
            {policy.title}
          </DialogTitle>
          <p className="mt-1 text-sm text-neutral-500">
            Effective date: {policy.effectiveDate}.
          </p>
          <p className="text-sm italic text-neutral-400">
            Last updated: {policy.lastUpdated}.
          </p>
        </div>

        {/* Scrollable body — explicit height so it doesn't collapse */}
        <div
          className="relative"
          style={{ height: "calc(85vh - 190px)", minHeight: 200 }}
        >
          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="policy-content absolute inset-0 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-neutral-700 scrollbar-hide"
            dangerouslySetInnerHTML={{ __html: policy.htmlContent }}
          />

          {!reachedEnd && (
            <button
              type="button"
              onClick={scrollToEnd}
              className="absolute bottom-4 left-1/2 z-20 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full bg-black text-white shadow-lg transition-transform hover:scale-110"
              aria-label="Scroll to end"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Footer — always visible, controls disabled until scroll end */}
        <div className="shrink-0 border-t border-neutral-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <label
              className={`flex items-center gap-2 text-sm select-none ${
                reachedEnd
                  ? "cursor-pointer text-neutral-700"
                  : "cursor-not-allowed text-neutral-400"
              }`}
            >
              <Checkbox
                checked={agreeChecked}
                onCheckedChange={(v) => {
                  if (reachedEnd) setAgreeChecked(v === true);
                }}
                disabled={!reachedEnd}
                aria-label={policy.confirmLabel}
              />
              <span>{policy.confirmLabel}</span>
            </label>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!agreeChecked}
              className="px-6"
            >
              Confirm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
