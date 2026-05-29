import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";
import { ModelCard } from "@/components/models/ModelCard";
import { cities, getCityById } from "@/data/cities";
import { getCityContent } from "@/data/cityContent";
import { popularModels } from "@/data/bikeModels";

type Params = { params: Promise<{ city: string }> };

export function generateStaticParams() {
  return cities.map((c) => ({ city: c.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { city } = await params;
  const c = getCityById(city);
  if (!c) return { title: "City not found — rentaro" };
  const soon = c.status === "soon";
  return {
    title: soon
      ? `E-bike rental in ${c.name} — coming soon · rentaro`
      : `Monthly e-bike rental in ${c.name} — rentaro`,
    description: soon
      ? `rentaro is bringing delivery-ready monthly e-bike rental to ${c.name}, ${c.country}. Join the waitlist for launch dates and pickup details.`
      : `Rent a delivery-built e-bike by the month in ${c.name}, ${c.country}. 30-day, 6 and 12-month plans with service support, lock, charger and extra-battery options.`,
  };
}

const STATUS_LABEL: Record<string, string> = {
  available: "Available",
  limited: "Limited",
  soon: "Coming soon",
};

export default async function CityPage({ params }: Params) {
  const { city } = await params;
  const c = getCityById(city);
  const content = getCityContent(city);
  if (!c || !content) notFound();

  const soon = c.status === "soon";

  return (
    <main>
      {/* Hero */}
      <section className="section-pad" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>{c.country} · {c.name}</Kicker>
            <h1 className="h-section">{content.headline}</h1>
            <p className="lead">{content.intro}</p>
          </Reveal>

          {/* Live availability + pickup, reusing the city-card visual language */}
          <Reveal delay={80}>
            <article className="card city-card" style={{ maxWidth: 560 }}>
              <div className="ctop">
                <div>
                  <div className="country">{c.country}</div>
                  <div className="cname">{c.name}</div>
                </div>
                <span className={`city-status ${c.status}`}>
                  <span className="dot" />
                  {STATUS_LABEL[c.status]}
                </span>
              </div>
              <div className="city-meta">
                <div>
                  <div className="l">Available bikes</div>
                  <div className={`v ${!soon ? "num" : ""}`}>{soon ? "—" : c.available}</div>
                </div>
                <div>
                  <div className="l">Pickup area</div>
                  <div className="v">{c.pickup}</div>
                </div>
              </div>
              {soon ? (
                <Link className="btn btn-block btn-ghost" href="/book">
                  Join the waitlist
                </Link>
              ) : (
                <Link className="btn btn-block btn-primary" href={`/book?city=${c.id}`}>
                  Reserve in {c.name}
                  <span className="arrow">
                    <Ic.arrow />
                  </span>
                </Link>
              )}
            </article>
          </Reveal>
        </div>
      </section>

      {/* Why ride here */}
      <section className="section-pad">
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>Why couriers ride here</Kicker>
            <h2 className="h-section">
              Built for {c.name} {soon ? "shifts." : "delivery shifts."}
            </h2>
          </Reveal>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {content.whyHere.map((point, i) => (
              <Reveal key={point} delay={(i % 2) * 80}>
                <article className="card" style={{ padding: 22, display: "flex", gap: 14, height: "100%" }}>
                  <span
                    style={{
                      flex: "none",
                      width: 30,
                      height: 30,
                      borderRadius: 10,
                      background: "var(--lime)",
                      color: "var(--lime-ink)",
                      display: "grid",
                      placeItems: "center",
                      boxShadow: "0 0 24px -8px var(--lime-glow)",
                    }}
                  >
                    <Ic.check s={13} />
                  </span>
                  <p style={{ color: "var(--text-2)", fontSize: 15.5, lineHeight: 1.55 }}>{point}</p>
                </article>
              </Reveal>
            ))}
          </div>

          {/* Pickup note + neighbourhoods */}
          <Reveal delay={120}>
            <div
              className="card"
              style={{ marginTop: 22, padding: 26, display: "grid", gap: 18 }}
            >
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <span style={{ color: "var(--lime)", marginTop: 2, flex: "none" }}>
                  <Ic.bolt s={16} />
                </span>
                <p style={{ color: "var(--text-muted)", fontSize: 15.5, lineHeight: 1.6, maxWidth: "62ch" }}>
                  {content.pickupNote}
                </p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                {content.neighbourhoods.map((n) => (
                  <span className="spec-pill" key={n}>
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Popular models for this city */}
      <section className="section-pad">
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>Popular in {c.name}</Kicker>
            <h2 className="h-section">Bikes couriers reach for first.</h2>
            <p className="lead">
              Every rentaro e-bike rents on the same terms — 30-day, 6 or 12-month plans with
              service support included. {soon ? "These bikes arrive in " + c.name + " at launch." : "Pick the one that fits your shifts."}
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

      {/* Final CTA */}
      <section className="section-pad" style={{ paddingBottom: 96 }}>
        <div className="wrap">
          <Reveal>
            <div className="final">
              <div className="final-inner">
                <h2>
                  {soon ? `Want a rentaro bike in ${c.name}?` : `Ready to ride in ${c.name}?`}
                </h2>
                <p>
                  {soon
                    ? `Join the waitlist and we'll let you know the moment delivery-ready e-bikes land in ${c.name}.`
                    : `Choose your model, pick a plan and start delivering in ${c.name} this week — service support included from day one.`}
                </p>
                <div style={{ display: "flex", gap: 13, justifyContent: "center", flexWrap: "wrap" }}>
                  <Link className="btn btn-primary btn-lg" href={soon ? "/book" : `/book?city=${c.id}`}>
                    {soon ? "Join the waitlist" : `Reserve in ${c.name}`}
                    <span className="arrow">
                      <Ic.arrow />
                    </span>
                  </Link>
                  <Link className="btn btn-ghost btn-lg" href="/models">
                    Explore the fleet
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
