"use client";

import { useTranslations } from "next-intl";

/**
 * Compact, single-row trust strip: "Free to reserve · Pay later in your portal
 * · Refundable deposit". Reuses the hero/marquee mono + lime-dot language so it
 * sits quietly under a primary CTA or near a submit button. Not a section.
 */
export function TrustStrip({ className }: { className?: string }) {
  const t = useTranslations("trustStrip");
  const items = [t("freeToReserve"), t("payLater"), t("refundableDeposit")];
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
