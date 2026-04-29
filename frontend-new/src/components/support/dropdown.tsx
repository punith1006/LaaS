"use client";

import * as React from "react";

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

export function Dropdown({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  required = false,
  error,
}: DropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-dropdown-item]');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          onChange(options[highlightedIndex].value);
          setIsOpen(false);
        } else {
          setIsOpen(true);
          setHighlightedIndex(options.findIndex((opt) => opt.value === value));
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex((prev) =>
            prev < options.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : options.length - 1
          );
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  // Use hardcoded values for dark theme to ensure visibility
  const darkBg = "#1F1F1F"; // Solid dark background
  const darkBorder = "#4B5563"; // Visible border
  const darkText = "#F0EFE2"; // Cream text
  const darkMuted = "#818178"; // Muted text
  const darkHover = "#2D2D2D"; // Hover background
  const dropdownBg = "#222222"; // Dropdown menu background

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-required={required}
        style={{
          width: "100%",
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          backgroundColor: darkBg,
          border: `1px solid ${error ? "#EF4444" : darkBorder}`,
          borderRadius: "4px",
          cursor: disabled ? "not-allowed" : "pointer",
          fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
          fontSize: "0.875rem",
          fontWeight: 400,
          lineHeight: 1.375,
          color: selectedOption ? darkText : darkMuted,
          opacity: disabled ? 0.4 : 1,
          transition: "border-color 0.15s ease, background-color 0.15s ease",
          outline: "none",
        }}
        onFocus={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = darkText;
          }
        }}
        onBlur={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = error ? "#EF4444" : darkBorder;
          }
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.backgroundColor = darkHover;
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.backgroundColor = darkBg;
          }
        }}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            flexShrink: 0,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={listRef}
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 9999,
            border: `1px solid ${darkBorder}`,
            borderRadius: "4px",
            backgroundColor: dropdownBg,
            boxShadow: "0 4px 20px 0 rgba(0, 0, 0, 0.5)",
            maxHeight: "200px",
            overflowY: "auto",
            padding: "4px 0",
          }}
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              data-dropdown-item
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              style={{
                padding: "8px 12px",
                fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
                fontSize: "0.875rem",
                fontWeight: 400,
                lineHeight: 1.375,
                color: darkText,
                backgroundColor: highlightedIndex === index ? darkHover : "transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {option.value === value && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#7565F6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {option.value !== value && <span style={{ width: "16px", display: "inline-block" }} />}
              <span>{option.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <span
          style={{
            display: "block",
            marginTop: "4px",
            fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
            fontSize: "0.75rem",
            fontWeight: 400,
            color: "#EF4444",
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
