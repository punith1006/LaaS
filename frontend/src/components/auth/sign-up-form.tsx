"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { OauthButtons } from "@/components/auth/oauth-buttons";
import { FooterLinks } from "@/components/auth/footer-links";
import { PasswordStrengthIndicator } from "@/components/auth/password-strength-indicator";
import { PolicyCheckbox } from "@/components/auth/policy-checkbox";
import { PolicyModal } from "@/components/auth/policy-modal";
import { registerStep1Schema, type RegisterStep1Input } from "@/lib/validations";
import { useSignupStore } from "@/stores/signup-store";
import { POLICY_SLUGS, type PolicySlug } from "@/config/policies";
import { checkEmail, type CheckEmailResponse } from "@/lib/api";

export function SignUpForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [policyModalSlug, setPolicyModalSlug] = useState<PolicySlug | null>(null);

  const { setStep1, agreedPolicies, setPolicy, setInstitution } = useSignupStore();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterStep1Input>({
    resolver: zodResolver(registerStep1Schema),
    defaultValues: { email: "", password: "" },
  });

  const password = watch("password", "");
  const emailValue = watch("email", "");

  // Clear institution state when email changes
  useEffect(() => {
    setDetectedInstitution(null);
    setInstitution(null);
  }, [emailValue]);

  const allPoliciesAgreed = POLICY_SLUGS.every((s) => agreedPolicies[s]);
  const [showPolicyErrors, setShowPolicyErrors] = useState(false);
  const policyErrorMsg = "You must agree to the terms and conditions to continue.";
  const [detectedInstitution, setDetectedInstitution] = useState<{ name: string; shortName: string | null; slug: string } | null>(null);

  const onSubmit = async (data: RegisterStep1Input) => {
    if (!allPoliciesAgreed) {
      setShowPolicyErrors(true);
      toast.error("Please agree to all policies to continue.");
      return;
    }
    setShowPolicyErrors(false);
    setIsLoading(true);
    try {
      const result = await checkEmail(data.email);
      if (result?.institution) {
        setDetectedInstitution(result.institution);
        setInstitution(result.institution);
      } else {
        setDetectedInstitution(null);
        setInstitution(null);
      }
      setStep1(data.email, data.password, agreedPolicies);
      router.push("/signup/details");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[400px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          Create an Account
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Enter email to access your account and enjoy our services.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-neutral-900">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            autoComplete="email"
            {...register("email")}
            className={errors.email ? "border-red-500" : ""}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
          {detectedInstitution && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 12px",
              backgroundColor: "#F0FDF4",
              border: "1px solid #BBF7D0",
              borderRadius: "4px",
              marginTop: "8px",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span style={{ fontSize: "0.8125rem", color: "#16a34a", fontWeight: 500 }}>
                Recognized as {detectedInstitution.shortName || detectedInstitution.name} student
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-neutral-900">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="new-password"
              {...register("password")}
              className={errors.password ? "border-red-500 pr-10" : "pr-10"}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-black rounded"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <PasswordStrengthIndicator password={password} />
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-3">
          {POLICY_SLUGS.map((slug) => (
            <PolicyCheckbox
              key={slug}
              slug={slug}
              checked={agreedPolicies[slug]}
              onCheckedChange={(v) => setPolicy(slug, v)}
              onOpenModal={() => setPolicyModalSlug(slug)}
              error={showPolicyErrors && !agreedPolicies[slug] ? policyErrorMsg : undefined}
            />
          ))}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !allPoliciesAgreed}
        >
          {isLoading ? "Continuing…" : "Sign up"}
        </Button>
      </form>

      <div className="relative">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-neutral-500">
          OR
        </span>
      </div>

      <OauthButtons mode="signup" />

      <p className="text-center text-sm text-neutral-600">
        Already have an account?{" "}
        <Link href="/signin" className="font-medium underline hover:text-neutral-900">
          Sign In
        </Link>
      </p>

      <Link
        href="/institution"
        className="flex items-center justify-center gap-2 rounded-lg border border-neutral-900 bg-neutral-900 px-4 py-2.5 text-sm text-white transition-colors hover:border-neutral-200 hover:bg-neutral-50 hover:text-neutral-700"
      >
        <GraduationCap className="h-4 w-4" />
        <span>Sign in with your institution</span>
      </Link>

      <FooterLinks />

      {policyModalSlug && (
        <PolicyModal
          slug={policyModalSlug}
          open={!!policyModalSlug}
          onOpenChange={(open) => !open && setPolicyModalSlug(null)}
          onConfirm={() => {
            setPolicy(policyModalSlug, true);
            setPolicyModalSlug(null);
          }}
        />
      )}
    </div>
  );
}
