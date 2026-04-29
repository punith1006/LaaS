"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { PolicySlug } from "@/config/policies";
import { POLICIES } from "@/config/policies";

interface PolicyCheckboxProps {
  slug: PolicySlug;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onOpenModal: () => void;
  error?: string;
  className?: string;
}

export function PolicyCheckbox({
  slug,
  checked,
  onCheckedChange,
  onOpenModal,
  error,
  className,
}: PolicyCheckboxProps) {
  const policy = POLICIES[slug];

  const handleCheckboxClick = (v: boolean | "indeterminate") => {
    if (v === true) {
      onOpenModal();
    } else {
      onCheckedChange(false);
    }
  };

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-start gap-2">
        <Checkbox
          id={slug}
          checked={checked}
          onCheckedChange={handleCheckboxClick}
          aria-describedby={error ? `${slug}-error` : undefined}
        />
        <label
          htmlFor={slug}
          className="cursor-pointer text-sm leading-tight text-neutral-700"
        >
          I agree with{" "}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenModal();
            }}
            className="font-semibold underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 rounded"
          >
            {policy.checkboxLabel.replace(/^I agree with /, "")}
          </button>
        </label>
      </div>
      {error && (
        <p id={`${slug}-error`} className="text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
