"use client";

import { Check, X } from "lucide-react";
import {
  getPasswordRuleResults,
  PASSWORD_RULE_LABELS,
  type PasswordRuleKey,
} from "@/lib/validations";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export function PasswordStrengthIndicator({
  password,
  className,
}: PasswordStrengthIndicatorProps) {
  const results = getPasswordRuleResults(password);
  const keys: PasswordRuleKey[] = [
    "minLength",
    "hasNumber",
    "hasLowercase",
    "hasUppercase",
    "allowedCharsOnly",
  ];

  if (password.length === 0) return null;

  return (
    <ul className={cn("mt-2 space-y-1.5 text-sm", className)} role="list">
      {keys.map((key) => {
        const pass = results[key];
        return (
          <li
            key={key}
            className={cn(
              "flex items-center gap-2",
              pass ? "text-green-600" : "text-red-500"
            )}
          >
            {pass ? (
              <Check className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <X className="h-4 w-4 shrink-0" aria-hidden />
            )}
            <span>{PASSWORD_RULE_LABELS[key]}</span>
          </li>
        );
      })}
    </ul>
  );
}
