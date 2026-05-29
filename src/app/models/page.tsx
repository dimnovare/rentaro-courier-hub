import type { Metadata } from "next";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { ModelCard } from "@/components/models/ModelCard";
import { modelService } from "@/services/modelService";

export const metadata: Metadata = {
  title: "All e-bike models — rentaro",
  description:
    "Browse the full rentaro fleet — delivery-ready e-bikes available on 30-day, 6 or 12-month plans in Tallinn, Riga and Helsinki.",
};

export default async function ModelsPage() {
  const models = await modelService.getModels();
  return (
    <main>
      <section className="section-pad" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>The full fleet</Kicker>
            <h2 className="h-section">All models.</h2>
            <p className="lead">
              Every rentaro e-bike rents on the same simple terms — 30-day, 6 or 12-month plans
              with service support included. Pick the bike that fits your shifts.
            </p>
          </Reveal>
          <div className="models-grid">
            {models.map((m, i) => (
              <Reveal key={m.id} delay={(i % 3) * 80}>
                <ModelCard m={m} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
