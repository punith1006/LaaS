"use client";

import { useEffect, useState } from "react";
import type { TransactionDetail } from "@/lib/api";
import { getTransactionDetail, downloadInvoice } from "@/lib/api";

interface OrderDetailViewProps {
  transactionId: string;
  onBack: () => void;
}

// Status dot colors
function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
    case "paid":
      return "#05C004"; // green
    case "failed":
      return "#E70000"; // red
    case "pending":
      return "#FDA422"; // yellow/orange
    case "cancelled":
      return "#818178"; // gray
    default:
      return "#818178";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "completed":
    case "paid":
      return "Paid";
    case "failed":
      return "Failed";
    case "pending":
      return "Pending";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(cents: number): string {
  return `₹${(cents / 100).toFixed(2)}`;
}

export function OrderDetailView({ transactionId, onBack }: OrderDetailViewProps) {
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getTransactionDetail(transactionId)
      .then((data) => {
        setTransaction(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load order details");
        setLoading(false);
      });
  }, [transactionId]);

  const handleDownloadInvoice = async () => {
    if (!transaction) return;
    setDownloading(true);
    try {
      const blob = await downloadInvoice(transaction.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${transaction.invoice?.invoiceNumber || transaction.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download invoice:", err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "48px 24px",
          textAlign: "center",
          color: "var(--fgColor-muted)",
        }}
      >
        Loading order details...
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div style={{ padding: "24px" }}>
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--fgColor-muted)",
            fontFamily: "var(--font-sans)",
            fontSize: "0.875rem",
            padding: 0,
            marginBottom: "16px",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Billing
        </button>
        <div
          style={{
            backgroundColor: "var(--bgColor-mild)",
            border: "1px solid var(--borderColor-default)",
            borderRadius: "4px",
            padding: "48px 24px",
            textAlign: "center",
            color: "var(--fgColor-critical)",
          }}
        >
          {error || "Order not found"}
        </div>
      </div>
    );
  }

  const invoice = transaction.invoice;
  const amountCents = invoice?.totalCents ?? transaction.amountCents;
  const taxCents = invoice?.taxCents ?? 0;
  const preTaxAmount = amountCents - taxCents;

  return (
    <div>
      {/* Back link */}
      <button
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--fgColor-muted)",
          fontFamily: "var(--font-sans)",
          fontSize: "0.875rem",
          padding: 0,
          marginBottom: "24px",
          transition: "color 0.15s ease",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.color = "var(--fgColor-default)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.color = "var(--fgColor-muted)";
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Billing
      </button>

      {/* Header with Download button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "1.5rem",
            fontWeight: 600,
            color: "var(--fgColor-default)",
            margin: 0,
          }}
        >
          Order Details
        </h2>
        {(transaction.status === "completed" || transaction.status === "paid") && (
          <button
            onClick={handleDownloadInvoice}
            disabled={downloading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "var(--bgColor-muted)",
              color: "var(--fgColor-default)",
              border: "1px solid var(--borderColor-default)",
              borderRadius: "4px",
              padding: "0 16px",
              height: "36px",
              fontFamily: "var(--font-sans)",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: downloading ? "not-allowed" : "pointer",
              opacity: downloading ? 0.6 : 1,
              transition: "background-color 0.15s ease",
            }}
            onMouseOver={(e) => {
              if (!downloading) e.currentTarget.style.backgroundColor = "var(--bgColor-mild)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bgColor-muted)";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {downloading ? "Downloading..." : "Download Invoice"}
          </button>
        )}
      </div>

      {/* Info cards row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {/* Created Date */}
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
              fontSize: "0.75rem",
              color: "var(--fgColor-muted)",
              marginBottom: "4px",
            }}
          >
            Created
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--fgColor-default)",
            }}
          >
            {formatDate(transaction.createdAt)}
          </div>
        </div>

        {/* Paid At */}
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
              fontSize: "0.75rem",
              color: "var(--fgColor-muted)",
              marginBottom: "4px",
            }}
          >
            Paid At
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--fgColor-default)",
            }}
          >
            {transaction.completedAt ? formatDate(transaction.completedAt) : "--"}
          </div>
        </div>

        {/* Order Status */}
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
              fontSize: "0.75rem",
              color: "var(--fgColor-muted)",
              marginBottom: "4px",
            }}
          >
            Order Status
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: getStatusColor(transaction.status),
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "var(--fgColor-default)",
              }}
            >
              {getStatusLabel(transaction.status)}
            </span>
          </div>
        </div>
      </div>

      {/* Order Summary Card */}
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
            fontSize: "1rem",
            fontWeight: 600,
            color: "var(--fgColor-default)",
            margin: 0,
            marginBottom: "16px",
          }}
        >
          Order Summary
        </h3>

        {/* Item row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 0",
          }}
        >
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", color: "var(--fgColor-muted)" }}>
            Item
          </span>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", color: "var(--fgColor-default)" }}>
            {invoice?.invoiceLineItems?.[0]?.description || "Credit Recharge"}
          </span>
        </div>

        {/* Type row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 0",
          }}
        >
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", color: "var(--fgColor-muted)" }}>
            Type
          </span>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", color: "var(--fgColor-default)" }}>
            Purchase
          </span>
        </div>

        {/* Amount row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 0",
          }}
        >
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", color: "var(--fgColor-muted)" }}>
            Amount
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "0.875rem",
              color: "var(--fgColor-default)",
            }}
          >
            {formatAmount(transaction.amountCents)}
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            height: "1px",
            backgroundColor: "var(--borderColor-default)",
            margin: "8px 0",
          }}
        />

        {/* Pre-tax Total */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 0",
          }}
        >
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", color: "var(--fgColor-muted)" }}>
            Pre-tax Total
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "0.875rem",
              color: "var(--fgColor-default)",
            }}
          >
            {formatAmount(preTaxAmount)}
          </span>
        </div>

        {/* Tax */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 0",
          }}
        >
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", color: "var(--fgColor-muted)" }}>
            Tax
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "0.875rem",
              color: "var(--fgColor-default)",
            }}
          >
            {formatAmount(taxCents)}
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            height: "1px",
            backgroundColor: "var(--borderColor-default)",
            margin: "8px 0",
          }}
        />

        {/* Amount Paid (bold, larger) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 0",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "1rem",
              fontWeight: 600,
              color: "var(--fgColor-default)",
            }}
          >
            Amount Paid
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "1.125rem",
              fontWeight: 600,
              color: "var(--fgColor-default)",
            }}
          >
            {formatAmount(amountCents)}
          </span>
        </div>
      </div>

      {/* Payment History Section */}
      {(transaction.status === "completed" || transaction.status === "paid") && (
        <div
          style={{
            backgroundColor: "var(--bgColor-mild)",
            border: "1px solid var(--borderColor-default)",
            borderRadius: "4px",
            padding: "24px",
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "1rem",
              fontWeight: 600,
              color: "var(--fgColor-default)",
              margin: 0,
              marginBottom: "16px",
            }}
          >
            Payment History
          </h3>

          {/* Payment table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 120px",
              gap: "16px",
              padding: "8px 0",
              borderBottom: "1px solid var(--borderColor-muted)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "var(--fgColor-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Description
            </span>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "var(--fgColor-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                textAlign: "right",
              }}
            >
              Amount Paid
            </span>
          </div>

          {/* Payment row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 120px",
              gap: "16px",
              padding: "12px 0",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.875rem",
                color: "var(--fgColor-default)",
              }}
            >
              Razorpay
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "0.875rem",
                color: "var(--fgColor-default)",
                textAlign: "right",
              }}
            >
              {formatAmount(amountCents)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
