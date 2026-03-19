"use client";

import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/google-icon";
import { GithubIcon } from "@/components/icons/github-icon";
import { cn } from "@/lib/utils";

const KEYCLOAK_URL = process.env.NEXT_PUBLIC_KEYCLOAK_URL;
const KEYCLOAK_REALM = process.env.NEXT_PUBLIC_KEYCLOAK_REALM;
const KEYCLOAK_CLIENT_ID = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID;

function getOAuthUrl(provider: "google" | "github"): string {
  const callbackUrl = `${window.location.origin}/callback`;

  if (KEYCLOAK_URL && KEYCLOAK_REALM && KEYCLOAK_CLIENT_ID) {
    const params = new URLSearchParams({
      client_id: KEYCLOAK_CLIENT_ID,
      redirect_uri: callbackUrl,
      response_type: "code",
      scope: "openid email profile",
      kc_idp_hint: provider,
      prompt: "login", // Force Keycloak to show login page instead of using existing session
    });
    // Add a cache-busting parameter to prevent browser caching
    params.append("_", Date.now().toString());
    return `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth?${params.toString()}`;
  }

  return "/dashboard";
}

interface OauthButtonsProps {
  mode: "signin" | "signup";
  className?: string;
}

export function OauthButtons({ mode, className }: OauthButtonsProps) {
  const handleGoogle = () => {
    window.location.href = getOAuthUrl("google");
  };

  const handleGitHub = () => {
    window.location.href = getOAuthUrl("github");
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
