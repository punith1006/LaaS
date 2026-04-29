"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Logout redirect handler
 * This page is called by Keycloak after successful logout via post_logout_redirect_uri
 * It clears any remaining session data and redirects to sign-in
 */
export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear any remaining local storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Redirect to sign-in page
    router.replace("/signin");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
        <p className="mt-4 text-sm text-neutral-600">
          Signing out...
        </p>
      </div>
    </div>
  );
}
