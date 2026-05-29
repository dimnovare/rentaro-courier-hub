"use client";

import { useInteractions } from "@/components/providers/Interactions";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";
import { ModelCard } from "@/components/models/ModelCard";
import { popularModels } from "@/data/bikeModels";

export function PopularModels() {
  const { goModels } = useInteractions();
  return (
    <section className="section-pad" id="models">
      <div className="wrap">
        <Reveal className="section-head">
          <Kicker>Most popular models</Kicker>
          <h2 className="h-section">The bikes couriers reach for first.</h2>
          <p className="lead">
            Hand-picked for delivery shifts — power, payload and stamina that hold up to full
            days on the road.
          </p>
        </Reveal>
        <div className="models-grid">
          {popularModels.map((m, i) => (
            <Reveal key={m.id} delay={i * 90}>
              <ModelCard m={m} />
            </Reveal>
          ))}
        </div>
        <Reveal delay={120} style={{ marginTop: 28, display: "flex", justifyContent: "center" }}>
          <button className="btn btn-ghost btn-lg" onClick={() => goModels()}>
            See the full fleet
            <span className="arrow">
              <Ic.arrow />
            </span>
          </button>
        </Reveal>
      </div>
    </section>
  );
}
