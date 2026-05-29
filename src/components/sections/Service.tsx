import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";

export function Service() {
  return (
    <section className="section-pad">
      <div className="wrap">
        <Reveal>
          <div className="service">
            <div className="service-grid">
              <div>
                <Kicker>Your income tool</Kicker>
                <h2>Your bike is your income tool. We keep it moving.</h2>
                <p>
                  Brake adjustments, punctures and general maintenance are part of every plan.
                  If a bike needs longer repair we replace it where stock allows — your shifts
                  keep running. Damage and theft follow a clear process you sign for up front.
                </p>
              </div>
              <div className="svc-stats">
                <div className="svc-stat">
                  <div className="n">24h</div>
                  <div className="l">Support window</div>
                </div>
                <div className="svc-stat">
                  <div className="n">3</div>
                  <div className="l">Cities live</div>
                </div>
                <div className="svc-stat">
                  <div className="n">6</div>
                  <div className="l">Models</div>
                </div>
                <div className="svc-stat">
                  <div className="n">30d</div>
                  <div className="l">Minimum plan</div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
