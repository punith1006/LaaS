"use client";

import { useEffect, useState } from "react";
import { getMe, retryStorageProvisioning } from "@/lib/api";
import type { User } from "@/types/auth";
import { toast } from "sonner";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    getMe().then(setUser).catch(() => setUser(null));
  }, []);

  const quotaGb = user?.storageQuotaGb ?? 5;
  const handleRetryStorage = async () => {
    setRetrying(true);
    try {
      const result = await retryStorageProvisioning();
      if (result.status === "provisioned") {
        const u = await getMe();
        setUser(u ?? null);
        const gb = u?.storageQuotaGb ?? 5;
        toast.success(`Your ${gb}GB storage is now ready.`);
      } else {
        toast.error(result.error ?? "Provisioning failed again.");
        const u = await getMe();
        setUser(u ?? null);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Retry failed");
      const u = await getMe();
      setUser(u ?? null);
    } finally {
      setRetrying(false);
    }
  };

  const isInstitution = user?.authType === "university_sso";
  const storageFailed =
    isInstitution && user?.storageProvisioningStatus === "failed";
  const storagePending =
    isInstitution && user?.storageProvisioningStatus === "pending";
  const storageReady =
    isInstitution && user?.storageProvisioningStatus === "provisioned";

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
      <p className="mt-2 text-neutral-600">
        {user ? "You are signed in." : "Loading…"}
      </p>

      {storageFailed && (
        <div
          className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800"
          role="alert"
        >
          <p className="font-semibold">Disk provisioning failed</p>
          <p className="mt-1 text-sm">
            {user.storageProvisioningError ||
              `Your ${quotaGb}GB persistent storage could not be created. You can retry or contact support.`}
          </p>
          <button
            type="button"
            onClick={handleRetryStorage}
            disabled={retrying}
            className="mt-3 rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {retrying ? "Retrying…" : "Retry storage setup"}
          </button>
        </div>
      )}

      {storagePending && (
        <div
          className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800"
          role="status"
        >
          <p className="font-semibold">Setting up your storage</p>
          <p className="mt-1 text-sm">
            Your {quotaGb}GB persistent storage is being provisioned. If this
            message persists, use &quot;Retry storage setup&quot; below or
            contact support.
          </p>
          <button
            type="button"
            onClick={handleRetryStorage}
            disabled={retrying}
            className="mt-3 rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {retrying ? "Retrying…" : "Retry storage setup"}
          </button>
        </div>
      )}

      {storageReady && (
        <div
          className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800"
          role="status"
        >
          <p className="font-semibold">Your {quotaGb}GB persistent storage is ready</p>
          <p className="mt-1 text-sm">
            You can use stateful sessions and your files will persist.
          </p>
        </div>
      )}
    </div>
  );
}
