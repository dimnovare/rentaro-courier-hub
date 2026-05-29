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
  title: "Delivery e-bike rental — rentaro",
  description:
    "Delivery-built e-bikes you can rent by the month. Strong motors, real payload and service support to keep your downtime low — suitable for city delivery work in Tallinn, Riga and Helsinki.",
};

const points: { title: string; copy: string }[] = [
  {
    title: "Built to carry, not to cruise",
    copy: "Strong motors, real torque and high payload limits. These bikes are chosen for racks, bags and long days under load — not for a relaxed weekend ride.",
  },
  {
    title: "Downtime costs you money",
    copy: "Your bike is your income tool, so service support is built into every plan. We keep it moving with fast fixes and extra-battery options for back-to-back shifts.",
  },
  {
    title: "Ready for any weather",
    copy: "Hydraulic brakes, durable tyres and frames picked for daily city use — rain, cobbles and winter slush included. The bike turns up ready for the shift.",
  },
  {
    title: "Suitable for city delivery work",
    copy: "Whatever app or service you ride for, these bikes are set up for urban delivery: nimble in traffic, comfortable over distance and easy to lock up between drops.",
  },
];

export default function DeliveryEbikeRentalPage() {
  return (
    <main>
      <section className="section-pad" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>Delivery e-bike rental</Kicker>
            <h1 className="h-section">An e-bike built for the job.</h1>
            <p className="lead">
              Delivery riding is hard on a bike: long hours, heavy loads and every kind of
              weather. rentaro rents delivery-built e-bikes by the month, with the motor, payload
              and service support to match — so you spend your shift earning, not pushing a bike
              with a flat battery. Pay daily, billed monthly, with repairs handled for you.
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

      {/* Delivery-focused models */}
      <section className="section-pad">
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>Picked for delivery</Kicker>
            <h2 className="h-section">The bikes couriers reach for.</h2>
            <p className="lead">
              Power, payload and stamina that hold up to full delivery days. Browse the most
              popular delivery setups, or see the full fleet.
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
                <h2>Gear up for your next shift.</h2>
                <p>
                  Choose a delivery-ready e-bike and a plan, and reserve in a few steps — service
                  support and extra-battery options included.
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
