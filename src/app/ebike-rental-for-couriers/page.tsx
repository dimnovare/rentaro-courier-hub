import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";
import { ModelCard } from "@/components/models/ModelCard";
import { Pricing } from "@/components/sections/Pricing";
import { Faq } from "@/components/sections/Faq";
import { popularModels } from "@/data/bikeModels";
import { steps } from "@/data/content";

export const metadata: Metadata = {
  title: "E-bike rental for couriers — rentaro",
  description:
    "rentaro is e-bike rental built for delivery couriers. Start quickly on a monthly plan, ride with service support and keep your bike — your income tool — moving. Tallinn, Riga and Helsinki.",
};

const points: { title: string; copy: string }[] = [
  {
    title: "Start delivering this week",
    copy: "Choose your model online, sign the contract on your phone and pick up the same week. No long wait, no big purchase before your first shift.",
  },
  {
    title: "Your bike is your income tool",
    copy: "If it's off the road, you're not earning. Service support is built into every plan, so small issues get fixed fast and you stay on the road.",
  },
  {
    title: "A price that fits your hours",
    copy: "Riding part-time? Start on a flexible 30-day plan. Full-time? A 6 or 12-month plan drops your daily rate. You're never locked into more than you need.",
  },
  {
    title: "Stamina for long shifts",
    copy: "Bikes picked for delivery work, with extra-battery options for the days you stitch together back-to-back orders across the city.",
  },
];

export default function EbikeRentalForCouriersPage() {
  return (
    <main>
      <section className="section-pad" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>E-bike rental for couriers</Kicker>
            <h1 className="h-section">Made for couriers, not weekend riders.</h1>
            <p className="lead">
              rentaro exists for one job: keeping delivery couriers earning. You rent a
              delivery-built e-bike by the month, start quickly, and ride with service support
              behind you. No big purchase, no resale headache, no day lost to a bike you can't
              fix. Choose your model, sign online and start your next shift.
            </p>
            <div style={{ display: "flex", gap: 13, flexWrap: "wrap", marginTop: 26 }}>
              <Link className="btn btn-primary btn-lg" href="/book">
                Start booking
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

      {/* How it works — courier onboarding */}
      <section className="section-pad">
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>How couriers start</Kicker>
            <h2 className="h-section">Choose. Sign. Ride.</h2>
            <p className="lead">
              Three steps from picking a bike to your first delivery — most of it from your phone.
            </p>
          </Reveal>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={(i % 3) * 80}>
                <article className="card" style={{ padding: 24, height: "100%" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      color: "var(--lime-ink)",
                      width: 44,
                      height: 44,
                      borderRadius: 13,
                      background: "var(--lime)",
                      display: "grid",
                      placeItems: "center",
                      marginBottom: 22,
                      boxShadow: "0 0 30px -6px var(--lime-glow)",
                    }}
                  >
                    {s.n}
                  </div>
                  <h3 style={{ fontSize: 19, letterSpacing: "-0.02em", marginBottom: 8 }}>{s.title}</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.6 }}>{s.copy}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Models couriers pick */}
      <section className="section-pad">
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>Courier favourites</Kicker>
            <h2 className="h-section">Bikes that hold up to the work.</h2>
            <p className="lead">
              Hand-picked for delivery shifts. Browse the most popular picks, or see the full
              fleet.
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

      <Pricing />

      <Faq />

      <section className="section-pad" style={{ paddingBottom: 96 }}>
        <div className="wrap">
          <Reveal>
            <div className="final">
              <div className="final-inner">
                <h2>Ready to start earning?</h2>
                <p>
                  Choose your rentaro e-bike, pick a plan and reserve in a few steps — service
                  support included from day one.
                </p>
                <div style={{ display: "flex", gap: 13, justifyContent: "center", flexWrap: "wrap" }}>
                  <Link className="btn btn-primary btn-lg" href="/book">
                    Start booking
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
