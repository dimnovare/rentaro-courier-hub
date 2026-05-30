"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Ic } from "@/components/ui/Icon";
import { submitWaitlist } from "@/services/waitlistService";

type SubmitState = "idle" | "sending" | "ok" | "error";

export interface WaitlistModalProps {
  /** Whether the modal is mounted/visible. */
  open: boolean;
  /** Close the modal (Esc, backdrop, close button, or after success dismiss). */
  onClose: () => void;
  /** City context for the signup, e.g. "helsinki". */
  cityId?: string;
  /** Model context for the signup, e.g. "engine-pro". */
  modelId?: string;
  /** Where the signup originated, e.g. "city-helsinki" or "model-engine-pro". */
  source: string;
  /** Called once after a successful POST — used by callers to fire a toast. */
  onSuccess?: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Small accessible, on-brand waitlist capture modal: one email field + submit,
 * with loading / success / error states. Closes on Esc, backdrop click or the
 * close button, traps focus while open and restores it to the trigger on close.
 */
export function WaitlistModal({
  open,
  onClose,
  cityId,
  modelId,
  source,
  onSuccess,
}: WaitlistModalProps) {
  const t = useTranslations("waitlist");
  const titleId = useId();
  const descId = useId();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubmitState>("idle");

  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Element focused before the modal opened, to restore on close.
  const lastFocused = useRef<HTMLElement | null>(null);

  const emailOk = EMAIL_RE.test(email);

  // Reset transient state each time the modal opens, and remember the trigger.
  useEffect(() => {
    if (!open) return;
    lastFocused.current = (document.activeElement as HTMLElement) ?? null;
    setEmail("");
    setStatus("idle");
    // Focus the email field once mounted.
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  // Restore focus to the trigger when the modal closes.
  useEffect(() => {
    if (open) return;
    lastFocused.current?.focus?.();
  }, [open]);

  // Lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Esc to close + a simple focus trap that keeps Tab within the dialog.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const list = Array.from(focusable).filter((el) => !el.hasAttribute("disabled"));
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOk || status === "sending") return;
    setStatus("sending");
    try {
      const res = await submitWaitlist({ email: email.trim(), cityId, modelId, source });
      if (res.ok) {
        setStatus("ok");
        onSuccess?.();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (!open) return null;

  return (
    <div
      role="presentation"
      onMouseDown={(e) => {
        // Backdrop click closes; clicks inside the dialog do not bubble here.
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={onKeyDown}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: "rgba(6, 8, 12, 0.72)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="card"
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "26px 24px 24px",
          boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 60px -16px var(--lime-glow)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 6,
          }}
        >
          <h3 id={titleId} style={{ fontSize: 20, letterSpacing: "-0.02em" }}>
            {t("title")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            style={{
              all: "unset",
              cursor: "pointer",
              color: "var(--text-muted)",
              width: 30,
              height: 30,
              borderRadius: 8,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width={16}
              height={16}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M4 4 L12 12" />
              <path d="M12 4 L4 12" />
            </svg>
          </button>
        </div>

        {status === "ok" ? (
          <>
            <p id={descId} className="lead" style={{ fontSize: 14.5, marginBottom: 20 }}>
              {t("successBody")}
            </p>
            <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
              {t("done")}
            </button>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <p id={descId} className="lead" style={{ fontSize: 14.5, marginBottom: 18 }}>
              {t("body")}
            </p>
            <div className="field" style={{ marginBottom: 16 }}>
              <label htmlFor="waitlistEmail">{t("emailLabel")}</label>
              <input
                ref={inputRef}
                id="waitlistEmail"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                enterKeyHint="send"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={!emailOk || status === "sending"}
              style={
                !emailOk || status === "sending"
                  ? { opacity: 0.5, cursor: "not-allowed" }
                  : undefined
              }
            >
              {status === "sending" ? t("sending") : t("submit")}
              {status !== "sending" && (
                <span className="arrow">
                  <Ic.arrow />
                </span>
              )}
            </button>
            {status === "error" && (
              <p className="wizard-err" role="status">
                {t("error")}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
