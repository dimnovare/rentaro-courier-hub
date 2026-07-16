"use client";

/**
 * Shared feedback primitives for the admin console — the Banner / Notice /
 * error pieces that every section page previously hand-copied. Visuals are
 * byte-for-byte the existing per-page styles so pages can swap their local
 * copies for these imports with zero visual change.
 *
 * - <Banner tone text>            inline success/failure strip after a mutation
 * - <Notice>                      the ".card mono" loading / empty notice card
 * - <InlineError message>         compact in-flow error line (drawers, forms)
 * - <ErrorPanel …>                full-width load-failure card (+ Try again)
 * - <ActionErrorBar …>            dismissible action-failure bar
 */
import type { ReactNode } from "react";

/** Success / failure strip shown after a mutation. `ok` announces politely
 *  (role=status); `bad` interrupts (role=alert). */
export function Banner({ tone, text }: { tone: "ok" | "bad"; text: React.ReactNode }) {
  return (
    <div
      className="mono"
      role={tone === "bad" ? "alert" : "status"}
      style={{
        marginBottom: 18,
        padding: "11px 15px",
        borderRadius: "var(--r-sm)",
        fontSize: 12.5,
        color: tone === "ok" ? "var(--lime)" : "var(--danger)",
        background: tone === "ok" ? "rgba(216,255,54,0.08)" : "rgba(255,138,120,0.08)",
        border: `1px solid ${tone === "ok" ? "rgba(216,255,54,0.3)" : "rgba(255,138,120,0.32)"}`,
      }}
    >
      {text}
    </div>
  );
}

/** Muted card for loading / transient states ("Loading rentals…"). */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="card mono" style={{ padding: 28, color: "var(--text-muted)", fontSize: 13 }}>
      {children}
    </div>
  );
}

/** Compact in-flow error line (drawer forms, sub-sections). */
export function InlineError({ message }: { message: string }) {
  return (
    <div
      className="mono"
      role="alert"
      style={{
        color: "var(--danger)",
        fontSize: 12.5,
        marginBottom: 20,
        padding: "12px 16px",
        borderRadius: "var(--r-md)",
        border: "1px solid rgba(255, 138, 120, 0.32)",
        background: "rgba(255, 138, 120, 0.06)",
      }}
    >
      {message}
    </div>
  );
}

/**
 * Full load-failure card. `config` = the API base URL isn't configured (an
 * environment problem — retrying won't help, so the button is hidden);
 * otherwise shows a "Try again" that re-runs the page's load().
 */
export function ErrorPanel({
  message,
  config,
  onRetry,
}: {
  message: string;
  config: boolean;
  onRetry: () => void;
}) {
  return (
    <div
      className="card"
      role="alert"
      style={{
        padding: 28,
        maxWidth: 520,
        borderColor: "rgba(255, 138, 120, 0.32)",
        background: "linear-gradient(180deg, rgba(255,138,120,0.06), rgba(255,255,255,0.02))",
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--danger)",
          marginBottom: 10,
        }}
      >
        {config ? "Not configured" : "Error"}
      </div>
      <p style={{ color: "var(--text-2)", fontSize: 14.5, margin: "0 0 20px", lineHeight: 1.6 }}>
        {message}
      </p>
      {!config && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={onRetry}
          style={{ padding: "12px 22px", fontSize: 14 }}
        >
          Try again
        </button>
      )}
    </div>
  );
}

/** Dismissible bar for a failed row-level action (the page stays usable). */
export function ActionErrorBar({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      className="mono"
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 14,
        color: "var(--danger)",
        fontSize: 12.5,
        marginBottom: 24,
        padding: "12px 16px",
        borderRadius: "var(--r-md)",
        border: "1px solid rgba(255, 138, 120, 0.32)",
        background: "rgba(255, 138, 120, 0.06)",
      }}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="mono"
        style={{
          background: "transparent",
          border: "none",
          color: "var(--danger)",
          cursor: "pointer",
          fontSize: 12.5,
          padding: 0,
        }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
