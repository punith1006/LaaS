"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FooterLinks } from "@/components/auth/footer-links";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MOCK_INSTITUTIONS, type Institution } from "@/config/institutions";
import { cn } from "@/lib/utils";

export function InstitutionSelector() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Institution | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onContinue = () => {
    if (!selected) return;
    setIsLoading(true);
    toast.success(`Redirecting to ${selected.name}…`);
    setTimeout(() => {
      router.push("/dashboard");
    }, 2000);
  };

  return (
    <div className="w-full max-w-[400px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          Sign in with your Institution
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Select your university or institution to continue with SSO.
        </p>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {selected ? selected.name : "Select institution…"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search institution…" />
            <CommandList>
              <CommandEmpty>No institution found.</CommandEmpty>
              <CommandGroup>
                {MOCK_INSTITUTIONS.map((inst) => (
                  <CommandItem
                    key={inst.id}
                    value={inst.name}
                    onSelect={() => {
                      setSelected(inst);
                      setOpen(false);
                    }}
                  >
                    {inst.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <p className="text-sm text-neutral-500">
        You will be redirected to your institution&apos;s login page.
      </p>

      <Button
        className="w-full"
        disabled={!selected || isLoading}
        onClick={onContinue}
      >
        {isLoading ? "Redirecting…" : "Continue with SSO"}
      </Button>

      <Button variant="outline" className="w-full" asChild>
        <Link href="/signin">Back to Sign In</Link>
      </Button>

      <FooterLinks />
    </div>
  );
}
