import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { ModelCard } from "@/components/models/ModelCard";
import { modelService } from "@/services/modelService";

export async function Fleet() {
  const t = await getTranslations("fleet");
  const bikeModels = await modelService.getModels();
  return (
    <section className="section-pad" id="fleet">
      <div className="wrap">
        <Reveal className="section-head">
          <Kicker>{t("kicker")}</Kicker>
          <h2 className="h-section">{t("heading")}</h2>
          <p className="lead">
            {t("lead")}
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
