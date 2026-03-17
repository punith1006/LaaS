"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { saveTokens } from "@/lib/token";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      toast.error(`Authentication failed: ${error}`);
      router.replace("/signin");
      return;
    }

    if (!code) {
      router.replace("/signin");
      return;
    }

    const redirectUri = `${window.location.origin}/callback`;
    const idpHint = sessionStorage.getItem("laas_idp_hint");
    sessionStorage.removeItem("laas_idp_hint");

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/oauth/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            redirectUri,
            idpHint: idpHint || undefined,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const msg = Array.isArray(data.message)
            ? data.message[0]
            : data.message;
          throw new Error(msg || "Authentication failed");
        }

        const tokens = await res.json();
        saveTokens(tokens);
        toast.success("Signed in successfully");
        router.replace("/dashboard");
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Authentication failed",
        );
        router.replace("/signin");
      }
    })();
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
        <p className="mt-4 text-sm text-neutral-600">
          Completing sign in...
        </p>
      </div>
    </div>
  );
}
