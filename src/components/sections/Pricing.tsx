"use client";

import { useInteractions } from "@/components/providers/Interactions";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";
import { pricingPlans } from "@/data/pricingPlans";

export function Pricing() {
  const { reserve } = useInteractions();
  return (
    <section className="section-pad" id="pricing">
      <div className="wrap">
        <Reveal className="section-head center">
          <Kicker>Pricing · per 30-day period</Kicker>
          <h2 className="h-section">Pay daily. Billed monthly.</h2>
          <p className="lead" style={{ marginInline: "auto" }}>
            One simple model across every bike: the daily rate × 30 days. Commit to a longer
            term, pay less per day.
          </p>
        </Reveal>
        <div className="pricing-grid">
          {pricingPlans.map((plan, i) => (
            <Reveal key={plan.id} delay={i * 90} style={{ display: "flex" }}>
              <article className={`card price-card ${plan.featured ? "feat" : ""}`} style={{ flex: 1 }}>
                <div className="ptop">
                  <span className="term">{plan.term}</span>
                  <span className="tag">{plan.tag}</span>
                </div>
                <div className="amount">
                  <span className="big">€{plan.daily.toFixed(2)}</span>
                  <span className="per">/ day</span>
                </div>
                <div className="per30">
                  <strong>€{plan.monthly}</strong> per 30 days · daily × 30
                </div>
                <ul>
                  {plan.perks.map((pk) => (
                    <li key={pk}>
                      <span className="ck">
                        <Ic.check s={11} />
                      </span>
                      {pk}
                    </li>
                  ))}
                </ul>
                <button
                  className={`btn btn-block ${plan.featured ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => reserve(plan.id)}
                >
                  Choose {plan.term}
                  {plan.featured && (
                    <span className="arrow">
                      <Ic.arrow />
                    </span>
                  )}
                </button>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
