"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getIdToken, clearTokens } from "@/lib/token";
import { LandingPage } from "@/components/landing/landing-page";

export default function RootPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const validateAuthAndRedirect = async () => {
      const accessToken = getAccessToken();
      const idToken = getIdToken();

      if (accessToken) {
        // Check if token is expired by decoding JWT
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          const isExpired = payload.exp * 1000 < Date.now();

          if (isExpired) {
            // Token expired - run sign-out flow and redirect to landing
            const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL;
            const keycloakRealm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || "laas";

            // Clear local tokens
            clearTokens();

            if (keycloakUrl && idToken) {
              // Try to sign out from Keycloak
              const appUrl = window.location.origin;
              const logoutUrl = `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/logout`;
              const params = new URLSearchParams();
              params.set("id_token_hint", idToken);
              params.set("post_logout_redirect_uri", `${appUrl}/`);

              // Clear session storage too
              sessionStorage.clear();

              // Redirect to Keycloak logout, then it will redirect back to landing page
              window.location.href = `${logoutUrl}?${params.toString()}`;
              return;
            } else {
              // No Keycloak available, just redirect to signin
              sessionStorage.clear();
              router.push("/signin");
              return;
            }
          }

          // Token is valid - redirect to /home
          router.push("/home");
          return;
        } catch {
          // Invalid token format - treat as not authenticated
          clearTokens();
          sessionStorage.clear();
        }
      }

      setIsAuthenticated(false);
      setIsReady(true);
    };

    validateAuthAndRedirect();
  }, [router]);

  if (!isReady) return null;

  return <LandingPage isAuthenticated={isAuthenticated} />;
}

