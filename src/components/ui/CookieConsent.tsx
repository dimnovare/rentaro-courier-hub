"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Ic } from "@/components/ui/Icon";

/**
 * GDPR cookie-consent banner.
 *
 * Persists the visitor's choice to the `rentaro_consent` cookie
 * (`granted` | `denied`, 1-year, path=/, SameSite=Lax) and hides itself once a
 * choice exists. Analytics (see components/analytics/Analytics.tsx) only loads
 * when this cookie reads `granted`.
 *
 * SSR-safe: nothing renders on the server or on the first client paint. The
 * banner only mounts after `useEffect` runs and confirms no consent cookie is
 * set yet — so the server and client markup match (both render null) and there
 * is no hydration mismatch. A same-tab `CustomEvent` lets Analytics react to a
 * fresh "accept" without a page reload.
 */

export const CONSENT_COOKIE = "rentaro_consent";
export const CONSENT_EVENT = "rentaro-consent-change";

type ConsentValue = "granted" | "denied";

function readConsentCookie(): ConsentValue | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)rentaro_consent=(granted|denied)/);
  return match ? (match[1] as ConsentValue) : null;
}

function writeConsentCookie(value: ConsentValue) {
  // 1 year, site-wide. Lax is fine — consent is never needed cross-site.
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
}

export function CookieConsent() {
  const t = useTranslations("consent");
  // Stays false on the server and through hydration; only the post-mount
  // effect can flip it, so server and first client render both produce null.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (readConsentCookie() === null) setVisible(true);
  }, []);

  function choose(value: ConsentValue) {
    writeConsentCookie(value);
    setVisible(false);
    // Let Analytics (and anything else) react in the same tab without a reload.
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t("title")}
      style={{
        position: "fixed",
        left: "50%",
        bottom: 20,
        transform: "translateX(-50%)",
        zIndex: 220,
        width: "min(720px, calc(100vw - 28px))",
        padding: "20px 22px",
        borderRadius: "var(--r-lg)",
        background: "rgba(16,19,26,0.94)",
        border: "1px solid var(--border-strong)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: "0 18px 56px rgba(0,0,0,0.6), 0 0 48px -10px var(--lime-glow)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
        <span
          aria-hidden="true"
          style={{
            flexShrink: 0,
            width: 36,
            height: 36,
            borderRadius: 11,
            display: "grid",
            placeItems: "center",
            background: "var(--surface-2)",
            color: "var(--lime)",
          }}
        >
          <Ic.shield s={18} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 16,
              letterSpacing: "-0.01em",
              color: "var(--text)",
              marginBottom: 6,
            }}
          >
            {t("title")}
          </div>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
              lineHeight: 1.6,
              letterSpacing: "0.01em",
              color: "var(--text-muted)",
            }}
          >
            {t("message")}{" "}
            <Link
              href="/privacy"
              style={{ color: "var(--lime)", textDecoration: "none" }}
            >
              {t("learnMore")}
            </Link>
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        <button
          type="button"
          className="btn btn-ghost"
          style={{ padding: "11px 18px", fontSize: 14 }}
          onClick={() => choose("denied")}
        >
          {t("decline")}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ padding: "11px 18px", fontSize: 14 }}
          onClick={() => choose("denied")}
        >
          {t("necessaryOnly")}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          style={{ padding: "11px 18px", fontSize: 14 }}
          onClick={() => choose("granted")}
        >
          {t("accept")}
        </button>
      </div>
    </div>
  );
}
