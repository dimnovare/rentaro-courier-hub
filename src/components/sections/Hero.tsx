"use client";

import { useInteractions } from "@/components/providers/Interactions";
import { Reveal } from "@/components/ui/Reveal";
import { Ic } from "@/components/ui/Icon";
import { trust } from "@/data/content";

export function Hero() {
  const { reserve, goModels } = useInteractions();
  return (
    <section className="hero" id="top">
      <div className="wrap hero-grid">
        <div>
          <Reveal className="hero-pill">
            <span className="live" />
            FLEET LIVE · TALLINN &amp; RIGA
          </Reveal>
          <Reveal delay={60}>
            <h1 className="h-hero">
              Delivery-ready
              <br />
              e-bikes by
              <br />
              the <span className="accent">month.</span>
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className="lead">
              Rent a delivery-built e-bike for city work — 30-day, 6 or 12-month plans with
              service, lock, charger and extra-battery options included. Pay daily, billed
              monthly.
            </p>
          </Reveal>
          <Reveal delay={180}>
            <div className="cta-row">
              <button className="btn btn-primary btn-lg" onClick={() => reserve()}>
                Reserve a bike
                <span className="arrow">
                  <Ic.arrow />
                </span>
              </button>
              <button className="btn btn-ghost btn-lg" onClick={() => goModels()}>
                Explore the fleet
              </button>
            </div>
          </Reveal>
          <Reveal delay={240}>
            <div className="hero-stats">
              <div className="hero-stat">
                <div className="n">
                  €3.90<span className="u">/day</span>
                </div>
                <div className="l">From, 12-mo plan</div>
              </div>
              <div className="hero-stat">
                <div className="n">
                  30<span className="u">days</span>
                </div>
                <div className="l">Minimum term</div>
              </div>
              <div className="hero-stat">
                <div className="n">
                  3<span className="u">cities</span>
                </div>
                <div className="l">Live now</div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Bike stage */}
        <Reveal delay={120} className="hero-stage">
          <div className="stage-glow" />
          <div className="stage-ring" />
          <div className="stage-ring r2" />
          <div className="stage-arc" />
          <div className="streak s1" />
          <div className="streak s2" />
          <div className="streak s3" />
          <div className="bike-shadow" />
          <img
            className="hero-bike"
            src="/assets/hero-bike.png"
            alt="rentaro Engine Pro 2.0 delivery e-bike"
          />
          <div className="spec-chip c1">
            <span className="v">75 Nm</span>
            <span className="k">Torque sensor</span>
          </div>
          <div className="spec-chip c2">
            <span className="v">1200 W</span>
            <span className="k">Peak power</span>
          </div>
          <div className="spec-chip c3">
            <span className="v">832 Wh</span>
            <span className="k">Battery</span>
          </div>
        </Reveal>
      </div>

      {/* Trust marquee */}
      <div className="wrap" style={{ marginTop: 0 }}>
        <div className="marquee">
          <div className="marquee-track">
            {[...trust, ...trust].map((t, i) => (
              <span className="marquee-item" key={i}>
                <Ic.check s={13} />
                {t}
                <span className="sep">/</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
