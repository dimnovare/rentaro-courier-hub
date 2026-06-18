"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useInteractions } from "@/components/providers/Interactions";
import { Ic } from "@/components/ui/Icon";
import { resolveImg } from "@/services/modelService";
import { track } from "@/services/analytics";
import { pricingPlans } from "@/data/pricingPlans";
import type { BikeModel } from "@/types";

// Daily price varies only by plan term, not by model, so every card shows the
// same span. Derive it from pricingPlans so it stays correct if plans change.
const dailyRates = pricingPlans.map((p) => p.daily);
const minDaily = Math.min(...dailyRates);
const maxDaily = Math.max(...dailyRates);

/**
 * One bike card.
 *
 * Renders the model `m`. When the model carries `colors`, a small read-only
 * swatch row (a hex dot + the colour name as title/aria-label) shows beneath the
 * tagline — purely informational, no selection or navigation.
 */
export function ModelCard({ m, compact = false }: { m: BikeModel; compact?: boolean }) {
  const { reserve } = useInteractions();
  const t = useTranslations("modelsPage");
  const tm = useTranslations("modelItems");

  const avail =
    m.status === "in"
      ? { label: t("avail.inStock", { count: m.availability }), cls: "in" }
      : m.status === "low"
        ? { label: t("avail.left", { count: m.availability }), cls: "low" }
        : { label: t("avail.waitlist"), cls: "wait" };
  const pills = compact ? m.pills.slice(0, 2) : m.pills;
  const isWait = m.status === "wait";
  const colors = m.colors ?? [];

  return (
    <article className={`card model-card ${m.popular && !compact ? "feat" : ""}`}>
      <Link
        className="model-pic"
        href={`/models/${m.slug}`}
        aria-label={m.name}
        onClick={() => track("cta_view_details", { model: m.id, source: "model-card-image" })}
      >
        <span className={`model-badge ${m.badge.variant}`}>{m.badge.text}</span>
        <span className={`model-avail ${avail.cls}`}>
          <span className="dot" />
          {avail.label}
        </span>
        <img src={resolveImg(m.img)} alt={m.name} loading="lazy" />
      </Link>
      <div className="model-body">
        <h3>
          <Link
            href={`/models/${m.slug}`}
            style={{ color: "inherit", textDecoration: "none" }}
            onClick={() => track("cta_view_details", { model: m.id, source: "model-card-title" })}
          >
            {m.name}
          </Link>
        </h3>
        <div className="model-tagline">
          {m.brand} · {tm(`${m.id}.tagline`)}
        </div>

        {/* Read-only colour swatches — a hex dot per available colour. */}
        {colors.length > 0 && (
          <div className="model-swatches" role="group" aria-label={t("colors.available")}>
            {colors.map((c) => (
              <span
                key={c.name}
                className="model-swatch"
                style={{ background: c.hex }}
                title={c.name}
                aria-label={c.name}
              />
            ))}
          </div>
        )}

        <div className="spec-row">
          {pills.map((p) => (
            <span className="spec-pill" key={p}>
              <Ic.bolt s={11} />
              {p}
            </span>
          ))}
        </div>
        <div className="model-foot">
          <div className="from">
            <strong>
              €{minDaily.toFixed(2)}–{maxDaily.toFixed(2)}
              <span className="per"> {t("perDay")}</span>
            </strong>
          </div>
          <button
            className={`reserve-btn ${isWait ? "wait" : ""}`}
            onClick={() => reserve(isWait ? `waitlist:${m.id}` : m.id, "model-card")}
          >
            {isWait ? t("joinWaitlist") : t("reserve")}
            {!isWait && <Ic.arrow s={13} />}
          </button>
        </div>
      </div>
      {/* Narrow-phone guard: on the tightest widths a long localized CTA label
          ("Join waitlist" / translated "Reserve") + the price can overflow the
          space-between footer. Allow the footer to wrap and let the button take
          a full row when needed. Additive — desktop layout is unchanged. */}
      <style jsx>{`
        @media (max-width: 360px) {
          article :global(.model-foot) {
            flex-wrap: wrap;
            row-gap: 12px;
          }
          article :global(.model-foot .reserve-btn) {
            flex: 1 1 100%;
            justify-content: center;
          }
        }
      `}</style>
    </article>
  );
}
