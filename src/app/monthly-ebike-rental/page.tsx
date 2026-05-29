import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";
import { ModelCard } from "@/components/models/ModelCard";
import { Pricing } from "@/components/sections/Pricing";
import { Faq } from "@/components/sections/Faq";
import { popularModels } from "@/data/bikeModels";

export const metadata: Metadata = {
  title: "Monthly e-bike rental — rentaro",
  description:
    "Rent an e-bike by the month instead of buying. One predictable monthly price covers the bike, service support, lock and charger — with no large upfront cost. Tallinn, Riga and Helsinki.",
};

const points: { title: string; copy: string }[] = [
  {
    title: "One predictable price",
    copy: "Pay a daily rate billed every 30 days. No big upfront purchase, no surprise repair bills — you know exactly what the bike costs each month.",
  },
  {
    title: "Repairs are on us",
    copy: "Service support is part of every plan. If something needs fixing, we sort it — so a worn brake pad or a flat tyre doesn't become your problem.",
  },
  {
    title: "Commit as little or as long as you like",
    copy: "Start on a 30-day plan to test it, then move to a 6 or 12-month plan for a lower daily rate when you're ready. The longer the term, the less you pay per day.",
  },
  {
    title: "Nothing tied up in a bike",
    copy: "Buying an e-bike means hundreds up front, plus batteries, locks and maintenance. Renting keeps your cash free and the bike someone else's responsibility to maintain.",
  },
];

export default function MonthlyEbikeRentalPage() {
  return (
    <main>
      <section className="section-pad" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>Monthly e-bike rental</Kicker>
            <h1 className="h-section">Rent the bike. Skip the price tag.</h1>
            <p className="lead">
              A monthly e-bike rental is the simplest way onto a quality bike without buying one.
              You pay a clear daily rate, billed every 30 days, and the bike, service support,
              lock and charger come together as one package. When your needs change, so does your
              plan — no resale, no depreciation, no workshop bills.
            </p>
            <div style={{ display: "flex", gap: 13, flexWrap: "wrap", marginTop: 26 }}>
              <Link className="btn btn-primary btn-lg" href="/book">
                Reserve a bike
                <span className="arrow">
                  <Ic.arrow />
                </span>
              </Link>
              <Link className="btn btn-ghost btn-lg" href="/models">
                Explore the fleet
              </Link>
            </div>
          </Reveal>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {points.map((p, i) => (
              <Reveal key={p.title} delay={(i % 2) * 80}>
                <article className="card" style={{ padding: 24, height: "100%" }}>
                  <span
                    style={{
                      display: "inline-grid",
                      placeItems: "center",
                      width: 34,
                      height: 34,
                      borderRadius: 11,
                      background: "var(--lime)",
                      color: "var(--lime-ink)",
                      boxShadow: "0 0 24px -8px var(--lime-glow)",
                      marginBottom: 16,
                    }}
                  >
                    <Ic.bolt s={15} />
                  </span>
                  <h3 style={{ fontSize: 19, letterSpacing: "-0.02em", marginBottom: 8 }}>{p.title}</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.6 }}>{p.copy}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — the core of a monthly-rental story */}
      <Pricing />

      {/* Popular models */}
      <section className="section-pad">
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>Available monthly</Kicker>
            <h2 className="h-section">Bikes you can rent today.</h2>
            <p className="lead">
              Every bike in the fleet rents on the same monthly terms. Browse the most popular
              picks below, or see the full range.
            </p>
          </Reveal>
          <div className="models-grid">
            {popularModels.map((m, i) => (
              <Reveal key={m.id} delay={(i % 3) * 80}>
                <ModelCard m={m} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Faq />

      <section className="section-pad" style={{ paddingBottom: 96 }}>
        <div className="wrap">
          <Reveal>
            <div className="final">
              <div className="final-inner">
                <h2>Start your monthly plan.</h2>
                <p>
                  Pick a bike, choose a 30-day, 6 or 12-month plan and reserve in a few steps —
                  no payment now, service support from day one.
                </p>
                <div style={{ display: "flex", gap: 13, justifyContent: "center", flexWrap: "wrap" }}>
                  <Link className="btn btn-primary btn-lg" href="/book">
                    Reserve your e-bike
                    <span className="arrow">
                      <Ic.arrow />
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
