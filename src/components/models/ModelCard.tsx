"use client";

import { useState } from "react";
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
 * `m` is the model to render by default. When `variants` holds more than one
 * model (colour variants of the same bike, grouped by `family`), the card shows
 * a row of colour swatches; the active variant drives the image, name,
 * availability and the Reserve/Details targets. Clicking a swatch swaps the
 * active variant client-side — no navigation. With a single variant (or none),
 * the card renders exactly as before (an optional single static swatch shows
 * when the model carries a `color`).
 */
export function ModelCard({
  m,
  compact = false,
  variants,
}: {
  m: BikeModel;
  compact?: boolean;
  variants?: BikeModel[];
}) {
  const { reserve } = useInteractions();
  const t = useTranslations("modelsPage");
  const tm = useTranslations("modelItems");

  // The list of colour variants to offer (defaults to just `m`). The active
  // index selects which one the card currently shows.
  const list = variants && variants.length > 0 ? variants : [m];
  const initial = Math.max(0, list.findIndex((v) => v.id === m.id));
  const [activeIdx, setActiveIdx] = useState(initial >= 0 ? initial : 0);
  const active = list[activeIdx] ?? m;
  const hasSwatches = list.length > 1;

  const avail =
    active.status === "in"
      ? { label: t("avail.inStock", { count: active.availability }), cls: "in" }
      : active.status === "low"
        ? { label: t("avail.left", { count: active.availability }), cls: "low" }
        : { label: t("avail.waitlist"), cls: "wait" };
  const pills = compact ? active.pills.slice(0, 2) : active.pills;
  const isWait = active.status === "wait";
  // A single static swatch only when there's exactly one variant that has a colour.
  const singleColor = !hasSwatches && active.colorHex ? active : null;

  return (
    <article className={`card model-card ${active.popular && !compact ? "feat" : ""}`}>
      <Link
        className="model-pic"
        href={`/models/${active.slug}`}
        aria-label={active.name}
        onClick={() => track("cta_view_details", { model: active.id, source: "model-card-image" })}
      >
        <span className={`model-badge ${active.badge.variant}`}>{active.badge.text}</span>
        <span className={`model-avail ${avail.cls}`}>
          <span className="dot" />
          {avail.label}
        </span>
        <img src={resolveImg(active.img)} alt={active.name} loading="lazy" />
      </Link>
      <div className="model-body">
        <h3>
          <Link
            href={`/models/${active.slug}`}
            style={{ color: "inherit", textDecoration: "none" }}
            onClick={() => track("cta_view_details", { model: active.id, source: "model-card-title" })}
          >
            {active.name}
          </Link>
        </h3>
        <div className="model-tagline">
          {active.brand} · {tm(`${active.id}.tagline`)}
        </div>

        {/* Colour swatches — only when this card groups >1 variant. */}
        {hasSwatches && (
          <div className="model-swatches" role="group" aria-label={t("colors.choose")}>
            {list.map((v, i) => (
              <button
                key={v.id}
                type="button"
                className={`model-swatch ${i === activeIdx ? "on" : ""}`}
                style={{ background: v.colorHex ?? "transparent" }}
                aria-label={v.color ?? v.name}
                aria-pressed={i === activeIdx}
                title={v.color ?? v.name}
                onClick={() => setActiveIdx(i)}
              >
                {i === activeIdx && (
                  <span className="model-swatch-check" aria-hidden>
                    <Ic.check s={11} />
                  </span>
                )}
              </button>
            ))}
            {active.color && <span className="model-swatch-name">{active.color}</span>}
          </div>
        )}

        {/* Singleton with a colour: a single static, non-interactive swatch. */}
        {singleColor && (
          <div className="model-swatches">
            <span
              className="model-swatch static"
              style={{ background: singleColor.colorHex ?? "transparent" }}
              aria-hidden
            />
            <span className="model-swatch-name">{singleColor.color}</span>
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
            onClick={() => reserve(isWait ? `waitlist:${active.id}` : active.id, "model-card")}
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
