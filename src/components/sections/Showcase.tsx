"use client";

import { useInteractions } from "@/components/providers/Interactions";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";
import { enginePro } from "@/data/bikeModels";

export function Showcase() {
  const { reserve } = useInteractions();
  const m = enginePro;
  const hasRange = m.specs.some((s) => s.k === "Range");
  return (
    <section className="section-pad">
      <div className="wrap">
        <Reveal>
          <div className="showcase">
            <div className="showcase-grid">
              <div className="showcase-media">
                <img src="/assets/lifestyle-rider.webp" alt="Rider on the rentaro Engine Pro 2.0" />
                <span className="tag">
                  <Ic.spark s={13} />
                  Engine Pro 2.0 · in the field
                </span>
              </div>
              <div className="showcase-body">
                <Kicker>Flagship · built to haul</Kicker>
                <h2>Power that finishes the shift.</h2>
                <p className="lead">{m.blurb}</p>
                <div className="spec-table">
                  {m.specs.map((s) => (
                    <div className="spec-cell" key={s.k}>
                      <div className="v">
                        {s.v}
                        {s.u && <span className="u">{s.u}</span>}
                      </div>
                      <div className="k">{s.k}</div>
                    </div>
                  ))}
                </div>
                {hasRange && (
                  <div className="spec-note">
                    Range is a manufacturer estimate — real distance varies with load, terrain,
                    weather and rider.
                  </div>
                )}
                <div style={{ display: "flex", gap: 12, marginTop: 26, flexWrap: "wrap" }}>
                  <button className="btn btn-primary" onClick={() => reserve("engine-pro")}>
                    Reserve Engine Pro
                    <span className="arrow">
                      <Ic.arrow />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
