import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { ModelCard } from "@/components/models/ModelCard";
import { modelService } from "@/services/modelService";
import { getLiveModelTotals, modelStatus } from "@/services/availabilityService";

export const metadata: Metadata = {
  title: "All e-bike models — rentaro",
  description:
    "Browse the full rentaro fleet — delivery-ready e-bikes available on 30-day, 6 or 12-month plans in Tallinn, Riga and Helsinki.",
};

export default async function ModelsPage() {
  const [models, liveTotals] = await Promise.all([
    modelService.getModels(),
    getLiveModelTotals(),
  ]);
  const patched = models.map((m) => {
    const avail = liveTotals.get(m.id);
    if (avail === undefined) return m;
    return { ...m, availability: avail, status: modelStatus(avail) };
  });
  const t = await getTranslations("modelsPage");
  return (
    <main>
      <section className="section-pad" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>{t("kicker")}</Kicker>
            <h2 className="h-section">{t("heading")}</h2>
            <p className="lead">
              {t("lead")}
            </p>
          </Reveal>
          <div className="models-grid">
            {patched.map((m, i) => (
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
