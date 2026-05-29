"use client";

import { useInteractions } from "@/components/providers/Interactions";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";
import { cities } from "@/data/cities";

export function Cities() {
  const { reserve } = useInteractions();
  return (
    <section className="section-pad" id="cities">
      <div className="wrap">
        <Reveal className="section-head">
          <Kicker>City availability</Kicker>
          <h2 className="h-section">Live in three cities.</h2>
          <p className="lead">
            Real-time availability across our launch markets. Reserve in seconds, pick up the
            same week.
          </p>
        </Reveal>
        <div className="cities-grid">
          {cities.map((c, i) => (
            <Reveal key={c.id} delay={i * 90}>
              <article className="card city-card">
                <div className="ctop">
                  <div>
                    <div className="country">{c.country}</div>
                    <div className="cname">{c.name}</div>
                  </div>
                  <span className={`city-status ${c.status}`}>
                    <span className="dot" />
                    {c.status === "available" ? "Available" : c.status === "limited" ? "Limited" : "Coming soon"}
                  </span>
                </div>
                <div className="city-meta">
                  <div>
                    <div className="l">Available bikes</div>
                    <div className={`v ${c.status !== "soon" ? "num" : ""}`}>
                      {c.status === "soon" ? "—" : c.available}
                    </div>
                  </div>
                  <div>
                    <div className="l">Pickup area</div>
                    <div className="v">{c.pickup}</div>
                  </div>
                </div>
                <button
                  className={`btn btn-block ${c.status === "available" ? "btn-primary" : "btn-ghost"}`}
                  disabled={c.status === "soon"}
                  style={c.status === "soon" ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                  onClick={() => c.status !== "soon" && reserve(`city:${c.id}`)}
                >
                  {c.status === "soon" ? "Notify me" : `Reserve in ${c.name}`}
                  {c.status === "available" && (
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
