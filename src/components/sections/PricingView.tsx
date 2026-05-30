"use client";

import { useTranslations } from "next-intl";
import { useInteractions } from "@/components/providers/Interactions";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";
import type { PricingPlan } from "@/types";

/**
 * Perk message keys per plan id, in display order — mirrors the perk order in
 * `@/data/pricingPlans`. Copy lives in the `pricing.perks` namespace.
 */
const perkKeysByPlan: Record<string, string[]> = {
  p30: ["serviceSupport", "lockCharger", "extendSwitch"],
  p180: ["everythingIn30", "lowerDailyRate", "priorityMaintenance", "freeModelSwap"],
  p365: ["everythingIn6mo", "lowestDailyRate", "freeAccessoryBundle"],
};

export function PricingView({ plans }: { plans: PricingPlan[] }) {
  const { reserve } = useInteractions();
  const t = useTranslations("pricing");
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
            const perkKeys = perkKeysByPlan[plan.id] ?? [];
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
                    <span style={{ display: "block" }}>
                      {t("depositLine", { amount: plan.monthly })}
                    </span>
                    <span style={{ display: "block" }}>
                      {t("dueAtPickup", { amount: plan.monthly * 2 })}
                    </span>
                  </div>
                  <ul>
                    {perkKeys.map((pk) => (
                      <li key={pk}>
                        <span className="ck">
                          <Ic.check s={11} />
                        </span>
                        {t(`perks.${pk}`)}
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
