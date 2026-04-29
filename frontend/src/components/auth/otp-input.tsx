"use client";

import { useRef, useCallback, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  className?: string;
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled,
  className,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const setValue = useCallback(
    (newValue: string) => {
      const digits = newValue.replace(/\D/g, "").slice(0, length);
      onChange(digits);
      return digits;
    },
    [length, onChange]
  );

  const handleChange = (index: number, v: string) => {
    const digit = v.replace(/\D/g, "").slice(-1);
    const next = value.split("");
    next[index] = digit;
    const joined = setValue(next.join(""));
    const arr = joined.split("");
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    const digits = setValue(pasted);
    const lastIdx = Math.min(pasted.length, length) - 1;
    inputRefs.current[lastIdx]?.focus();
  };

  const digits = value.split("").concat(Array(length).fill("")).slice(0, length);

  return (
    <div
      className={cn("flex gap-2 justify-center", className)}
      onPaste={handlePaste}
      role="group"
      aria-label="Verification code"
    >
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of ${length}`}
          className={cn(
            "h-12 w-12 rounded-md border border-neutral-300 text-center text-lg font-semibold text-neutral-900",
            "focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            digits[i] ? "border-neutral-900" : ""
          )}
        />
      ))}
    </div>
  );
}
