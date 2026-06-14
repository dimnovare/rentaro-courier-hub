"use client";

import { useTranslations } from "next-intl";

/**
 * Compact, single-row trust strip: "Free to reserve · Pay before pickup ·
 * Refundable deposit". Reuses the hero/marquee mono + lime-dot language so it
 * sits quietly under a primary CTA or near a submit button. Not a section.
 *
 * `payLabel` overrides the middle (payment) item — the booking review passes a
 * payment-method-specific label (cash → "Pay at pickup", transfer → "Pay before
 * pickup") so the strip matches what the customer just chose.
 */
export function TrustStrip({ className, payLabel }: { className?: string; payLabel?: string }) {
  const t = useTranslations("trustStrip");
  const items = [t("freeToReserve"), payLabel ?? t("payLater"), t("refundableDeposit")];
  return (
    <div className={`trust-strip${className ? ` ${className}` : ""}`}>
      {items.map((label, i) => (
        <span className="ts-item" key={i}>
          <span className="ts-dot" />
          {label}
          {i < items.length - 1 && <span className="ts-sep">·</span>}
        </span>
      ))}
    </div>
  );
}
