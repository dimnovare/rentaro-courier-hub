"use client";

import { useLocale, useTranslations } from "next-intl";
import { useInteractions } from "@/components/providers/Interactions";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";
import type { PricingPlan } from "@/types";

export function PricingView({ plans }: { plans: PricingPlan[] }) {
  const { reserve } = useInteractions();
  const t = useTranslations("pricing");
  const locale = useLocale();
  return (
    <section className="section-pad" id="pricing">
      <div className="wrap">
        <Reveal className="section-head center">
          <Kicker>{t("kicker")}</Kicker>
          <h2 className="h-section">{t("heading")}</h2>
          <p className="lead" style={{ marginInline: "auto" }}>
            {t("lead")}
          </p>
        </Reveal>
        <div className="pricing-grid">
          {plans.map((plan, i) => {
            const term = t(`terms.${plan.id}`);
            const perks = plan.perks[locale] ?? plan.perks.en ?? [];
            return (
              <Reveal key={plan.id} delay={i * 90} style={{ display: "flex" }}>
                <article className={`card price-card ${plan.featured ? "feat" : ""}`} style={{ flex: 1 }}>
                  <div className="ptop">
                    <span className="term">{term}</span>
                    <span className="tag">{t(`tags.${plan.id}`)}</span>
                  </div>
                  <div className="amount">
                    <span className="big">€{plan.daily.toFixed(2)}</span>
                    <span className="per">{t("perDay")}</span>
                  </div>
                  <div className="per30">
                    <strong>€{plan.monthly}</strong> {t("per30Suffix")}
                  </div>
                  <div className="deposit-line">
                    <span className="deposit-badge">
                      <span className="deposit-badge-label">{t("depositLabel")}</span>
                      <span className="deposit-badge-amount">
                        €{plan.monthly}
                      </span>
                    </span>
                    <span className="deposit-note">{t("depositReassure")}</span>
                    <span style={{ display: "block" }}>
                      {t("dueAtPickup", { amount: plan.monthly * 2 })}
                    </span>
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
                    onClick={() => reserve(plan.id, "pricing")}
                  >
                    {t("choose", { term })}
                    {plan.featured && (
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
