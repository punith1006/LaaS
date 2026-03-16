import { z } from "zod";

/**
 * Allowed characters for password (single source of truth; must match backend).
 * Letters, digits, and: !@#$%^&*()_+-=[]{};':"\\|,.<>/?`~ and space
 */
const ALLOWED_PASSWORD_CHARS_REGEX =
  /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~ ]+$/;

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email address");

export const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/\d/, "At least 1 number")
  .regex(/[a-z]/, "At least 1 lowercase letter")
  .regex(/[A-Z]/, "At least 1 uppercase letter")
  .regex(ALLOWED_PASSWORD_CHARS_REGEX, "Use only allowed characters");

/** Per-rule checks for UI strength indicator (same rules as passwordSchema) */
export function getPasswordRuleResults(password: string) {
  return {
    minLength: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    allowedCharsOnly:
      password.length === 0 || ALLOWED_PASSWORD_CHARS_REGEX.test(password),
  };
}

export const PASSWORD_RULE_LABELS: Record<keyof ReturnType<typeof getPasswordRuleResults>, string> = {
  minLength: "At least 8 characters",
  hasNumber: "At least 1 number",
  hasLowercase: "At least 1 lowercase letter",
  hasUppercase: "At least 1 uppercase letter",
  allowedCharsOnly: "Use only allowed characters",
};

export const nameSchema = z.object({
  firstName: z.string().min(1, "Required").max(100, "Too long"),
  lastName: z.string().min(1, "Required").max(100, "Too long"),
});

export const otpSchema = z
  .string()
  .length(6, "Must be 6 digits")
  .regex(/^\d+$/, "Must be digits only");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerStep1Schema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type NameInput = z.infer<typeof nameSchema>;
export type RegisterStep1Input = z.infer<typeof registerStep1Schema>;
