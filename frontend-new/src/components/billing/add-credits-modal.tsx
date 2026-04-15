"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import { createPaymentOrder, verifyPayment } from "@/lib/api";

interface AddCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

declare global {
  interface Window {
    Razorpay: new (options: {
      key: string;
      amount: number;
      currency: string;
      name: string;
      description: string;
      order_id: string;
      handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
      modal: { ondismiss: () => void };
      prefill: Record<string, unknown>;
      theme: { color: string };
    }) => {
      on(event: 'payment.failed', callback: (response: { error?: { description?: string } }) => void): void;
      open(): void;
    };
  }
}

const PRESET_AMOUNTS = [100, 250, 500, 1000];
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 1000;

export function AddCreditsModal({ isOpen, onClose, onSuccess }: AddCreditsModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Get the current amount (preset or custom)
  const currentAmount = selectedPreset ?? (customAmount ? parseInt(customAmount, 10) : 0);

  // Validation
  const isValidAmount = currentAmount >= MIN_AMOUNT && currentAmount <= MAX_AMOUNT;
  const showMinError = customAmount !== "" && currentAmount < MIN_AMOUNT;
  const showMaxError = currentAmount > MAX_AMOUNT;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPreset(null);
      setCustomAmount("");
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  // Handle preset selection
  const handlePresetClick = (amount: number) => {
    setSelectedPreset(amount);
    setCustomAmount(amount.toString());
    setError(null);
  };

  // Handle custom amount change
  const handleCustomAmountChange = (value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, "");
    setCustomAmount(numericValue);
    setSelectedPreset(null);
    setError(null);
  };

  // Handle Razorpay checkout
  const handleRechargeNow = async () => {
    if (!isValidAmount || !razorpayLoaded) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create order via backend
      const orderResponse = await createPaymentOrder(currentAmount);

      // Open Razorpay checkout
      const options = {
        key: orderResponse.keyId,
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        name: "LaaS",
        description: "Credit Recharge",
        order_id: orderResponse.orderId,
        handler: async function (razorpayResponse: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          try {
            // Verify payment with backend
            const verifyResponse = await verifyPayment({
              razorpay_order_id: razorpayResponse.razorpay_order_id,
              razorpay_payment_id: razorpayResponse.razorpay_payment_id,
              razorpay_signature: razorpayResponse.razorpay_signature,
            });

            if (verifyResponse.success) {
              // Success - close modal and refresh parent
              onSuccess();
              onClose();
            } else {
              setError("Payment verification failed. Please contact support.");
            }
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Payment verification failed";
            setError(message);
          }
        },
        modal: {
          ondismiss: function () {
            setIsLoading(false);
          },
        },
        prefill: {},
        theme: {
          color: "#C8AA6E",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: { error?: { description?: string } }) {
        setError(response.error?.description || "Payment failed. Please try again.");
        setIsLoading(false);
      });
      rzp.open();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create payment order";
      setError(message);
      setIsLoading(false);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Load Razorpay script */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayLoaded(true)}
      />

      {/* Modal Backdrop */}
      <div
        onClick={handleBackdropClick}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(11, 11, 11, 0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
      >
        {/* Modal Card */}
        <div
          style={{
            backgroundColor: "var(--bgColor-mild)",
            border: "1px solid var(--borderColor-default)",
            borderRadius: "4px",
            width: "100%",
            maxWidth: "420px",
            margin: "16px",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ padding: "24px 24px 0 24px" }}>
            <h2
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "1.25rem",
                fontWeight: 600,
                color: "var(--fgColor-default)",
                margin: 0,
                marginBottom: "8px",
              }}
            >
              Account Recharge
            </h2>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.875rem",
                color: "var(--fgColor-muted)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Add funds to your account balance using your preferred payment method.
            </p>
          </div>

          {/* Divider */}
          <div
            style={{
              height: "1px",
              backgroundColor: "var(--borderColor-default)",
              margin: "20px 0",
            }}
          />

          {/* Content */}
          <div style={{ padding: "0 24px" }}>
            {/* Section heading */}
            <h3
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--fgColor-default)",
                margin: 0,
                marginBottom: "4px",
              }}
            >
              Recharge Account
            </h3>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.75rem",
                color: "var(--fgColor-muted)",
                margin: 0,
                marginBottom: "16px",
              }}
            >
              Select an amount or enter a custom value to recharge your account.
            </p>

            {/* Preset Amount Buttons */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "16px",
                flexWrap: "wrap",
              }}
            >
              {PRESET_AMOUNTS.map((amount) => {
                const isSelected = selectedPreset === amount;
                return (
                  <button
                    key={amount}
                    onClick={() => handlePresetClick(amount)}
                    disabled={isLoading}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "4px",
                      border: isSelected
                        ? "1px solid #C8AA6E"
                        : "1px solid var(--borderColor-default)",
                      backgroundColor: isSelected
                        ? "rgba(200, 170, 110, 0.15)"
                        : "transparent",
                      color: isSelected ? "#C8AA6E" : "var(--fgColor-default)",
                      fontFamily: "var(--font-sans)",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      cursor: isLoading ? "not-allowed" : "pointer",
                      transition: "all 0.15s ease",
                      opacity: isLoading ? 0.5 : 1,
                    }}
                  >
                    ₹{amount}
                  </button>
                );
              })}
            </div>

            {/* Custom Amount */}
            <label
              style={{
                display: "block",
                fontFamily: "var(--font-sans)",
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "var(--fgColor-default)",
                marginBottom: "6px",
              }}
            >
              Custom Amount
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "var(--bgColor-muted)",
                border: `1px solid ${showMinError || showMaxError ? "#FF6742" : "var(--borderColor-default)"}`,
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  padding: "0 12px",
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.875rem",
                  color: "var(--fgColor-muted)",
                  borderRight: "1px solid var(--borderColor-default)",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                ₹
              </span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                placeholder="25"
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: "0 12px",
                  height: "40px",
                  border: "none",
                  outline: "none",
                  backgroundColor: "transparent",
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.875rem",
                  color: "var(--fgColor-default)",
                  opacity: isLoading ? 0.5 : 1,
                }}
              />
            </div>

            {/* Validation Messages */}
            {showMinError && (
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.75rem",
                  color: "#FF6742",
                  margin: "6px 0 0 0",
                }}
              >
                Minimum recharge amount is ₹{MIN_AMOUNT}
              </p>
            )}
            {showMaxError && (
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.75rem",
                  color: "#FF6742",
                  margin: "6px 0 0 0",
                }}
              >
                Maximum recharge amount is ₹{MAX_AMOUNT}
              </p>
            )}

            {/* Error Message */}
            {error && (
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.75rem",
                  color: "#FF6742",
                  margin: "12px 0 0 0",
                  padding: "8px 12px",
                  backgroundColor: "rgba(255, 103, 66, 0.1)",
                  borderRadius: "4px",
                }}
              >
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: "24px" }}>
            {/* Recharge Now Button */}
            <button
              onClick={handleRechargeNow}
              disabled={!isValidAmount || isLoading || !razorpayLoaded}
              style={{
                width: "100%",
                height: "44px",
                backgroundColor:
                  isValidAmount && !isLoading ? "#F0EFE2" : "var(--bgColor-muted)",
                color: isValidAmount && !isLoading ? "#0B0B0B" : "var(--fgColor-muted)",
                border: "none",
                borderRadius: "4px",
                fontFamily: "var(--font-sans)",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor:
                  isValidAmount && !isLoading && razorpayLoaded
                    ? "pointer"
                    : "not-allowed",
                transition: "all 0.15s ease",
                opacity: !razorpayLoaded ? 0.7 : 1,
              }}
            >
              {isLoading
                ? "Processing..."
                : !razorpayLoaded
                  ? "Loading..."
                  : `Recharge Now${currentAmount > 0 ? ` - ₹${currentAmount}` : ""}`}
            </button>

            {/* Footer Text */}
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.6875rem",
                color: "var(--fgColor-muted)",
                textAlign: "center",
                margin: "12px 0 0 0",
              }}
            >
              All purchases are final. Please refer to our refund policy.
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: "4px",
              cursor: isLoading ? "not-allowed" : "pointer",
              color: "var(--fgColor-muted)",
              opacity: isLoading ? 0.5 : 1,
            }}
            aria-label="Close"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
