"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FooterLinks } from "@/components/auth/footer-links";
import { nameSchema, type NameInput } from "@/lib/validations";
import { useSignupStore } from "@/stores/signup-store";
import { sendOtp } from "@/lib/api";

export function NameStepForm() {
  const router = useRouter();
  const { email, firstName, lastName, setStep2, hasStep1Data } = useSignupStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NameInput>({
    resolver: zodResolver(nameSchema),
    defaultValues: { firstName: firstName || "", lastName: lastName || "" },
  });

  if (!hasStep1Data()) {
    router.replace("/signup");
    return null;
  }

  const onSubmit = async (data: NameInput) => {
    setStep2(data.firstName, data.lastName);
    if (process.env.NEXT_PUBLIC_API_URL) {
      try {
        await sendOtp(email);
      } catch {
        toast.error("Failed to send verification email");
        return;
      }
    }
    router.push("/signup/verify");
  };

  return (
    <div className="w-full max-w-[400px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          Complete Your Profile
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Tell us a bit about yourself to get started.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            placeholder="Enter your first name"
            autoComplete="given-name"
            {...register("firstName")}
            className={errors.firstName ? "border-red-500" : ""}
          />
          {errors.firstName && (
            <p className="text-sm text-red-500">{errors.firstName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            placeholder="Enter your last name"
            autoComplete="family-name"
            {...register("lastName")}
            className={errors.lastName ? "border-red-500" : ""}
          />
          {errors.lastName && (
            <p className="text-sm text-red-500">{errors.lastName.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Continuing…" : "Continue"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => router.push("/signup")}
        >
          Back
        </Button>
      </form>

      <FooterLinks />
    </div>
  );
}
