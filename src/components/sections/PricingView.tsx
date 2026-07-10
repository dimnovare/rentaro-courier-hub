"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useInteractions } from "@/components/providers/Interactions";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";
import { resolvePlanPrice } from "@/services/pricingService";
import type { BikeModel, PricingPlan } from "@/types";

/** Empty price overrides → resolvePlanPrice returns the global tier (standard). */
const STANDARD: Pick<BikeModel, "price30" | "price6mo" | "price12mo"> = {};

export function PricingView({
  plans,
  models,
}: {
  plans: PricingPlan[];
  /** Active bike models, passed only when at least one has custom pricing. */
  models?: BikeModel[];
}) {
  const { reserve } = useInteractions();
  const t = useTranslations("pricing");
  const locale = useLocale();

  // Once bikes carry their own pricing, an abstract "Standard pricing" entry is
  // misleading — the picker only ever offers REAL bikes, defaulting to the first
  // rentable one (in stock, else the first model). This initial pick is computed
  // identically on server and client, so SSR paints a real bike's true prices.
  const showPicker = !!models && models.length > 0;
  const defaultModel = showPicker
    ? (models!.find((m) => m.status !== "wait") ?? models![0])
    : null;
  const [selectedId, setSelectedId] = useState<string | null>(defaultModel?.id ?? null);
  const selected =
    (showPicker && (models!.find((m) => m.id === selectedId) ?? defaultModel)) || null;
  const isWaitlist = selected?.status === "wait";
  // Stable key so the price numbers re-animate only when the chosen bike changes.
  const flashKey = selected?.id ?? "standard";

  return (
    <section className="section-pad" id="pricing">
      <div className="wrap">
        <Reveal className="section-head center">
          <Kicker>{t("kicker")}</Kicker>
          <h2 className="h-section">{t("heading")}</h2>
          <p className="lead" style={{ marginInline: "auto" }}>
            {t("lead")}
          </p>

          {showPicker && (
            <div className="pricing-picker">
              <label className="pricing-picker-label" htmlFor="pricing-bike">
                {t("picker.label")}
              </label>
              <div className="pricing-picker-control">
                <select
                  id="pricing-bike"
                  value={selected?.id ?? ""}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  {models!.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.status === "wait" ? ` · ${t("picker.waitlistTag")}` : ""}
                    </option>
                  ))}
                </select>
                <span className="pricing-picker-caret" aria-hidden>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </div>
              {selected && (
                <p className="pricing-picker-sub" aria-live="polite">
                  {t("picker.showingFor", { name: selected.name })}
                </p>
              )}
            </div>
          )}
        </Reveal>

        <div className="pricing-grid">
          {plans.map((plan, i) => {
            // t.has guards: plan ids are admin/catalog-driven — a new plan has
            // no message key yet, so fall back to the API-provided term/tag.
            const term = t.has(`terms.${plan.id}`) ? t(`terms.${plan.id}`) : plan.term;
            const tag = t.has(`tags.${plan.id}`) ? t(`tags.${plan.id}`) : plan.tag;
            const perks = plan.perks[locale] ?? plan.perks.en ?? [];
            // Every figure on the card flows through resolvePlanPrice so the
            // daily, 30-day, deposit and due-at-pickup numbers all agree with the
            // selected bike (or the global tier when none is chosen).
            const { daily, monthly } = resolvePlanPrice(selected ?? STANDARD, plan);
            return (
              <Reveal key={plan.id} delay={i * 90} style={{ display: "flex" }}>
                <article className={`card price-card ${plan.featured ? "feat" : ""}`} style={{ flex: 1 }}>
                  <div className="ptop">
                    <span className="term">{term}</span>
                    <span className="tag">{tag}</span>
                  </div>
                  <div className="amount">
                    <span className="big price-num" key={flashKey}>
                      €{daily.toFixed(2)}
                    </span>
                    <span className="per">{t("perDay")}</span>
                  </div>
                  <div className="per30">
                    <strong className="price-num" key={flashKey}>
                      €{monthly}
                    </strong>{" "}
                    {t("per30Suffix")}
                  </div>
                  <div className="deposit-line">
                    <span className="deposit-badge">
                      <span className="deposit-badge-label">{t("depositLabel")}</span>
                      <span className="deposit-badge-amount price-num" key={flashKey}>
                        €{monthly}
                      </span>
                    </span>
                    <span className="deposit-note">{t("depositReassure")}</span>
                    <span style={{ display: "block" }}>
                      {t("dueAtPickup", { amount: monthly * 2 })}
                    </span>
                    {plan.months > 1 && (
                      // Longer plans bill per 30-day period after the first payment:
                      // an invoice before each period, paid by bank transfer.
                      <span style={{ display: "block", marginTop: 4 }}>
                        {t("recurringNote", { amount: monthly })}
                      </span>
                    )}
                  </div>
                  <ul>
                    {perks.map((perk) => (
                      <li key={perk}>
                        <span className="ck">
                          <Ic.check s={11} />
                        </span>
                        {perk}
                      </li>
                    ))}
                  </ul>
                  <button
                    className={`btn btn-block ${plan.featured ? "btn-primary" : "btn-ghost"}`}
                    onClick={() =>
                      isWaitlist && selected
                        ? reserve(`waitlist:${selected.id}`, "pricing", { modelName: selected.name })
                        : reserve(plan.id, "pricing", selected ? { model: selected.id } : undefined)
                    }
                  >
                    {isWaitlist ? t("picker.joinWaitlist") : t("choose", { term })}
                    {plan.featured && !isWaitlist && (
                      <span className="arrow">
                        <Ic.arrow />
                      </span>
                    )}
                  </button>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
