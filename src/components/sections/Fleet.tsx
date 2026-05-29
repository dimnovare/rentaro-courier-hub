import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { ModelCard } from "@/components/models/ModelCard";
import { bikeModels } from "@/data/bikeModels";

export function Fleet() {
  return (
    <section className="section-pad" id="fleet">
      <div className="wrap">
        <Reveal className="section-head">
          <Kicker>The full fleet</Kicker>
          <h2 className="h-section">Six bikes. One simple plan.</h2>
          <p className="lead">
            From the heavy-duty Engine Pro to lightweight folding commuters — every model
            rents on the same 30-day, 6 or 12-month terms.
          </p>
        </Reveal>
        <div className="models-grid">
          {bikeModels.map((m, i) => (
            <Reveal key={m.id} delay={(i % 3) * 80}>
              <ModelCard m={m} compact />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
