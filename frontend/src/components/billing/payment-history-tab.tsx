"use client";

import { useEffect, useState, useRef } from "react";
import type { PaymentTransactionItem, PaginatedTransactions } from "@/lib/api";
import { getPaymentTransactions, downloadInvoice } from "@/lib/api";
import { OrderDetailView } from "./order-detail-view";

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
  });
}

function formatAmount(cents: number, currency: string = "INR"): string {
  return `₹${(cents / 100).toFixed(2)} ${currency}`;
}

// Dropdown Menu Component
function ActionDropdown({
  transaction,
  onViewDetails,
  onDownloadInvoice,
}: {
  transaction: PaymentTransactionItem;
  onViewDetails: () => void;
  onDownloadInvoice: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "4px",
          backgroundColor: isOpen ? "var(--bgColor-muted)" : "transparent",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "var(--fgColor-muted)",
          transition: "background-color 0.15s ease",
        }}
        onMouseOver={(e) => {
          if (!isOpen) e.currentTarget.style.backgroundColor = "var(--bgColor-muted)";
        }}
        onMouseOut={(e) => {
          if (!isOpen) e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "4px",
            backgroundColor: "var(--bgColor-elevated, var(--bgColor-default))",
            border: "1px solid var(--borderColor-default)",
            borderRadius: "4px",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
            zIndex: 100,
            minWidth: "160px",
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => {
              setIsOpen(false);
              onViewDetails();
            }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 12px",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontSize: "0.8125rem",
              color: "var(--fgColor-default)",
              textAlign: "left",
              transition: "background-color 0.15s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bgColor-muted)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            View Details
          </button>
          {(transaction.status === "completed" || transaction.status === "paid") && (
            <button
              onClick={() => {
                setIsOpen(false);
                onDownloadInvoice();
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 12px",
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: "0.8125rem",
                color: "var(--fgColor-default)",
                textAlign: "left",
                transition: "background-color 0.15s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bgColor-muted)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Invoice
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Empty State Component
function EmptyState() {
  return (
    <div
      style={{
        backgroundColor: "var(--bgColor-mild)",
        border: "1px solid var(--borderColor-default)",
        borderRadius: "4px",
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--fgColor-muted)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ margin: "0 auto 16px" }}
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
      <h3
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "1rem",
          fontWeight: 600,
          color: "var(--fgColor-default)",
          margin: "0 0 8px 0",
        }}
      >
        No transactions yet
      </h3>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "0.875rem",
          color: "var(--fgColor-muted)",
          margin: 0,
        }}
      >
        Your payment history will appear here once you add credits.
      </p>
    </div>
  );
}

export function PaymentHistoryTab() {
  const [transactions, setTransactions] = useState<PaymentTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const limit = 10;

  const fetchTransactions = async (pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPaymentTransactions(pageNum, limit);
      setTransactions(result.transactions);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(page);
  }, [page]);

  const handleDownloadInvoice = async (transaction: PaymentTransactionItem) => {
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
    }
  };

  // If viewing order details, show the detail view
  if (selectedTransactionId) {
    return (
      <OrderDetailView
        transactionId={selectedTransactionId}
        onBack={() => setSelectedTransactionId(null)}
      />
    );
  }

  // Loading state
  if (loading && transactions.length === 0) {
    return (
      <div
        style={{
          backgroundColor: "var(--bgColor-mild)",
          border: "1px solid var(--borderColor-default)",
          borderRadius: "4px",
          padding: "48px 24px",
          textAlign: "center",
          color: "var(--fgColor-muted)",
        }}
      >
        Loading transactions...
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        style={{
          backgroundColor: "var(--bgColor-mild)",
          border: "1px solid var(--borderColor-default)",
          borderRadius: "4px",
          padding: "48px 24px",
          textAlign: "center",
        }}
      >
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", color: "var(--fgColor-critical)" }}>
          {error}
        </p>
        <button
          onClick={() => fetchTransactions(page)}
          style={{
            marginTop: "16px",
            backgroundColor: "var(--bgColor-muted)",
            color: "var(--fgColor-default)",
            border: "1px solid var(--borderColor-default)",
            borderRadius: "4px",
            padding: "8px 16px",
            fontFamily: "var(--font-sans)",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (transactions.length === 0) {
    return <EmptyState />;
  }

  const startIndex = (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, total);

  return (
    <div>
      {/* Orders heading */}
      <h2
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "1.25rem",
          fontWeight: 600,
          color: "var(--fgColor-default)",
          margin: "0 0 16px 0",
        }}
      >
        Orders
      </h2>

      {/* Table container */}
      <div
        style={{
          backgroundColor: "var(--bgColor-mild)",
          border: "1px solid var(--borderColor-default)",
          borderRadius: "4px",
          overflow: "visible",
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "100px 120px 100px 1fr 100px 50px",
            gap: "12px",
            padding: "12px 20px",
            borderBottom: "1px solid var(--borderColor-default)",
            backgroundColor: "var(--bgColor-muted)",
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
            Date
          </span>
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
            Amount
          </span>
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
            Status
          </span>
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
            }}
          >
            Type
          </span>
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
            Actions
          </span>
        </div>

        {/* Table rows */}
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            style={{
              display: "grid",
              gridTemplateColumns: "100px 120px 100px 1fr 100px 50px",
              gap: "12px",
              padding: "12px 20px",
              borderBottom: "1px solid var(--borderColor-default)",
              alignItems: "center",
              transition: "background-color 0.1s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            {/* Date */}
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "0.8125rem",
                color: "var(--fgColor-default)",
              }}
            >
              {formatDate(transaction.createdAt)}
            </span>

            {/* Amount */}
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "0.8125rem",
                color: "var(--fgColor-default)",
              }}
            >
              {formatAmount(transaction.amountCents, transaction.currency)}
            </span>

            {/* Status */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
                  fontSize: "0.8125rem",
                  color: "var(--fgColor-default)",
                }}
              >
                {getStatusLabel(transaction.status)}
              </span>
            </div>

            {/* Description */}
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.8125rem",
                color: "var(--fgColor-default)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {"Credit Recharge"}
            </span>

            {/* Order Type */}
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.8125rem",
                color: "var(--fgColor-muted)",
              }}
            >
              Purchase
            </span>

            {/* Actions */}
            <ActionDropdown
              transaction={transaction}
              onViewDetails={() => setSelectedTransactionId(transaction.id)}
              onDownloadInvoice={() => handleDownloadInvoice(transaction)}
            />
          </div>
        ))}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "16px",
            padding: "0 4px",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.875rem",
              color: "var(--fgColor-muted)",
            }}
          >
            Showing {startIndex}-{endIndex} of {total}
          </span>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: "6px 12px",
                backgroundColor: "var(--bgColor-muted)",
                border: "1px solid var(--borderColor-default)",
                borderRadius: "4px",
                fontFamily: "var(--font-sans)",
                fontSize: "0.8125rem",
                color: page === 1 ? "var(--fgColor-muted)" : "var(--fgColor-default)",
                cursor: page === 1 ? "not-allowed" : "pointer",
                opacity: page === 1 ? 0.5 : 1,
                transition: "background-color 0.15s ease",
              }}
              onMouseOver={(e) => {
                if (page !== 1) e.currentTarget.style.backgroundColor = "var(--bgColor-mild)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bgColor-muted)";
              }}
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                padding: "6px 12px",
                backgroundColor: "var(--bgColor-muted)",
                border: "1px solid var(--borderColor-default)",
                borderRadius: "4px",
                fontFamily: "var(--font-sans)",
                fontSize: "0.8125rem",
                color: page >= totalPages ? "var(--fgColor-muted)" : "var(--fgColor-default)",
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                opacity: page >= totalPages ? 0.5 : 1,
                transition: "background-color 0.15s ease",
              }}
              onMouseOver={(e) => {
                if (page < totalPages) e.currentTarget.style.backgroundColor = "var(--bgColor-mild)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bgColor-muted)";
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
