"use client";

import { useState } from "react";
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
import { loginSchema, type LoginInput } from "@/lib/validations";
import { signIn, forgotPassword } from "@/lib/api";
import { APP_NAME } from "@/config/constants";

export function SignInForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      await signIn(data.email, data.password);
      toast.success("Signed in successfully");
      router.push("/dashboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[400px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          Welcome to {APP_NAME}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Enter your email below to login to your account.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
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
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              onClick={async () => {
                const email = watch("email");
                if (!email) {
                  toast.error("Enter your email first");
                  return;
                }
                try {
                  await forgotPassword(email);
                  toast.success("If an account exists, a password reset email has been sent.");
                } catch {
                  toast.success("If an account exists, a password reset email has been sent.");
                }
              }}
              className="text-sm text-neutral-600 underline hover:text-neutral-900"
            >
              Forgot your password?
            </button>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
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
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="relative">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-neutral-500">
          OR
        </span>
      </div>

      <OauthButtons mode="signin" />

      <p className="text-center text-sm text-neutral-600">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium underline hover:text-neutral-900">
          Sign up
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
    </div>
  );
}
