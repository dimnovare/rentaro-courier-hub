"use client";

import { useInteractions } from "@/components/providers/Interactions";
import { Reveal } from "@/components/ui/Reveal";
import { Ic } from "@/components/ui/Icon";

export function FinalCta() {
  const { reserve, nav } = useInteractions();
  return (
    <section>
      <div className="wrap">
        <Reveal>
          <div className="final">
            <div className="final-inner">
              <h2>Ready for your next shift?</h2>
              <p>
                Choose your rentaro e-bike, pick a plan and start riding — service support
                included from day one.
              </p>
              <div style={{ display: "flex", gap: 13, justifyContent: "center", flexWrap: "wrap" }}>
                <button className="btn btn-primary btn-lg" onClick={() => reserve()}>
                  Reserve your e-bike
                  <span className="arrow">
                    <Ic.arrow />
                  </span>
                </button>
                <button className="btn btn-ghost btn-lg" onClick={() => nav("pricing")}>
                  See pricing
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
