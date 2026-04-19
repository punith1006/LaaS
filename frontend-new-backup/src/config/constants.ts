/**
 * App name, taglines, and image paths.
 * Single place to change branding (no GMI; LaaS only).
 */

export const APP_NAME = "LaaS";
export const APP_FULL_NAME = "Lab as a Service";

export const TAGLINE = {
  headline: "Your lab. Any machine. Anywhere.",
  subtitle:
    "Enterprise-grade GPU compute and remote research environments, on demand.",
};

/** Base path for left-panel auth images (in public/images/) */
export const AUTH_IMAGES = [
  "/images/side-light-1.png",
  "/images/side-light-2.png",
  "/images/side-dark-1.png",
  "/images/side-dark-2.png",
] as const;

export type AuthImagePath = (typeof AUTH_IMAGES)[number];

/** Detect if image filename suggests light background (use dark text) or dark (use white text) */
export function isLightImage(path: string): boolean {
  return path.includes("side-light");
}
