"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/auth/otp-input";
import { FooterLinks } from "@/components/auth/footer-links";
import { useSignupStore } from "@/stores/signup-store";
import { verifyOtp, resendOtp } from "@/lib/api";
import { getCookie, clearCookie } from "@/lib/cookies";

const RESEND_COOLDOWN_SEC = 60;
const MAX_RESENDS = 3;

export function OtpVerification() {
  const router = useRouter();
  const { email, password, firstName, lastName, agreedPolicies, hasEmail, reset } = useSignupStore();
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!hasEmail()) router.replace("/signup");
  }, [hasEmail, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setIsVerifying(true);
    try {
      const policiesList = Object.entries(agreedPolicies)
        .filter(([, v]) => v)
        .map(([k]) => k);
      
      // Read referral code from cookie
      const referralCode = getCookie("laas_ref_code");
      
      await verifyOtp(email, code, {
        password,
        firstName,
        lastName,
        agreedPolicies: policiesList,
        referralCode: referralCode || undefined,
      });
      
      // Clear referral cookie after successful signup
      if (referralCode) {
        clearCookie("laas_ref_code");
      }
      
      toast.success("Account created successfully!");
      // Don't reset store - onboarding needs the data. Reset will happen after onboarding completes.
      router.push("/signup/onboarding");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCount >= MAX_RESENDS) {
      toast.error("Maximum resend attempts reached. Try again later.");
      return;
    }
    if (cooldown > 0) return;
    try {
      await resendOtp(email);
      setResendCount((c) => c + 1);
      setCooldown(RESEND_COOLDOWN_SEC);
      toast.success("Verification code sent.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to resend");
    }
  };

  const handleCancel = () => {
    reset();
    router.push("/signin");
  };

  if (!hasEmail()) return null;

  return (
    <div className="w-full max-w-[400px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          Your Verification Code
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Enter the code from your email :
        </p>
        <a
          href={`mailto:${email}`}
          className="mt-2 block text-sm font-medium text-neutral-900 underline hover:no-underline"
        >
          {email}
        </a>
      </div>

      <OtpInput
        value={code}
        onChange={setCode}
        length={6}
        disabled={isVerifying}
      />

      <p className="text-center text-sm text-neutral-600">
        Didn&apos;t get the email?{" "}
        {cooldown > 0 ? (
          <span className="text-neutral-500">
            Resend available in {cooldown}s
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCount >= MAX_RESENDS}
            className="underline hover:no-underline disabled:opacity-50"
          >
            Resend email
          </button>
        )}
      </p>

      <div className="space-y-3">
        <Button
          className="w-full"
          disabled={code.length !== 6 || isVerifying}
          onClick={handleVerify}
        >
          {isVerifying ? "Verifying…" : "Verify"}
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={handleCancel}>
          Cancel
        </Button>
      </div>

      <FooterLinks />
    </div>
  );
}
