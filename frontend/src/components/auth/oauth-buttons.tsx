"use client";

import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/google-icon";
import { GithubIcon } from "@/components/icons/github-icon";
import { cn } from "@/lib/utils";

interface OauthButtonsProps {
  mode: "signin" | "signup";
  onGoogle?: () => void;
  onGitHub?: () => void;
  className?: string;
}

export function OauthButtons({
  mode,
  onGoogle,
  onGitHub,
  className,
}: OauthButtonsProps) {
  const handleGoogle = () => {
    if (onGoogle) onGoogle();
    else {
      // Mock: redirect to same page for now; wire to Keycloak later
      window.location.href = "/dashboard";
    }
  };
  const handleGitHub = () => {
    if (onGitHub) onGitHub();
    else window.location.href = "/dashboard";
  };

  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogle}
        aria-label="Sign in with Google"
      >
        <GoogleIcon className="h-5 w-5" />
        <span className="sr-only md:not-sr-only md:ml-2">Google</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGitHub}
        aria-label="Sign in with GitHub"
      >
        <GithubIcon className="h-5 w-5" />
        <span className="sr-only md:not-sr-only md:ml-2">GitHub</span>
      </Button>
    </div>
  );
}
