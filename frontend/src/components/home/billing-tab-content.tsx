"use client";

import { useEffect, useState } from "react";
import type { User } from "@/types/auth";
import type { BillingData } from "@/lib/api";
import { getBillingData } from "@/lib/api";

interface BillingTabContentProps {
  user: User | null;
}

// Section header component
function SectionHeader({ title }: { title: string }) {
  return (
    <h2
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-base)",
        fontWeight: 600,
        color: "var(--fgColor-default)",
        marginBottom: "16px",
        marginTop: "8px",
      }}
    >
      {title}
    </h2>
  );
}

// Info row component
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 0",
        borderBottom: "1px solid var(--borderColor-muted)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          color: "var(--fgColor-muted)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          fontWeight: 500,
          color: "var(--fgColor-default)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function BillingTabContent({ user }: BillingTabContentProps) {
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBillingData()
      .then((data) => {
        setBillingData(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const isInstitution = user?.authType === "university_sso";
  
  // Use API data or fallback to user data
  const plan = billingData?.plan ?? {
    type: isInstitution ? 'institution' : 'free',
    name: isInstitution ? 'Institution Plan' : 'Free Tier',
    description: isInstitution
      ? 'Your institution provides access to LaaS platform resources.'
      : 'You are on the free tier with basic access to LaaS platform resources.',
  };
  
  const usage = billingData?.usage ?? {
    storageQuotaGb: user?.storageQuotaGb ?? 5,
    storageUsedGb: 0,
    computeHoursUsed: 0,
    billingCycle: isInstitution ? 'Institution Managed' : 'N/A',
  };

  const paymentMethod = billingData?.paymentMethod ?? (isInstitution
    ? {
        type: 'institution',
        description: 'Managed by your institution',
      }
    : null);

  return (
    <div>
      {/* Billing Overview Card */}
      <div
        style={{
          backgroundColor: "var(--bgColor-mild)",
          border: "1px solid var(--borderColor-default)",
          borderRadius: "4px",
          padding: "24px",
          marginBottom: "24px",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-base)",
            fontWeight: 600,
            color: "var(--fgColor-default)",
            margin: 0,
            marginBottom: "16px",
          }}
        >
          Current Plan
        </h3>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "8px",
            marginBottom: "8px",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-h2)",
              fontWeight: 600,
              color: "var(--fgColor-default)",
            }}
          >
            {plan.name}
          </span>
        </div>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--fgColor-muted)",
            margin: 0,
          }}
        >
          {plan.description}
        </p>
      </div>

      {/* Usage Section */}
      <SectionHeader title="Usage" />
      <div
        style={{
          backgroundColor: "var(--bgColor-mild)",
          border: "1px solid var(--borderColor-default)",
          borderRadius: "4px",
          padding: "0 16px",
          marginBottom: "24px",
        }}
      >
        <InfoRow label="Storage Allocated" value={`${usage.storageQuotaGb} GB`} />
        <InfoRow label="Storage Used" value={`${usage.storageUsedGb} GB`} />
        <InfoRow label="Compute Hours" value={`${usage.computeHoursUsed} hours`} />
        <InfoRow 
          label="Billing Cycle" 
          value={usage.billingCycle} 
        />
      </div>

      {/* Payment Method Section */}
      <SectionHeader title="Payment Method" />
      <div
        style={{
          backgroundColor: "var(--bgColor-mild)",
          border: "1px solid var(--borderColor-default)",
          borderRadius: "4px",
          padding: "24px",
        }}
      >
        {paymentMethod ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "4px",
                backgroundColor: "var(--bgColor-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "var(--fgColor-muted)" }}
              >
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-sm)",
                  fontWeight: 500,
                  color: "var(--fgColor-default)",
                }}
              >
                {paymentMethod.type === 'institution' ? 'Institution Billing' : 'Payment Method'}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-xs)",
                  color: "var(--fgColor-muted)",
                }}
              >
                {paymentMethod.description}
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              color: "var(--fgColor-muted)",
              textAlign: "center",
              padding: "16px",
            }}
          >
            No payment method required for free tier.
          </div>
        )}
      </div>

      {/* Billing History Section */}
      <SectionHeader title="Billing History" />
      <div
        style={{
          backgroundColor: "var(--bgColor-mild)",
          border: "1px solid var(--borderColor-default)",
          borderRadius: "4px",
          padding: "16px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--fgColor-muted)",
            textAlign: "center",
            padding: "24px",
          }}
        >
          No billing history available.
        </div>
      </div>
    </div>
  );
}
