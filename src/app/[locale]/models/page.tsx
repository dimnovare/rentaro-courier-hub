import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildAlternates } from "@/i18n/alternates";
import { isLocale, type Locale } from "@/i18n/config";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { ModelCard } from "@/components/models/ModelCard";
import { modelService } from "@/services/modelService";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const t = await getTranslations({ locale: loc, namespace: "pageMeta.models" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: buildAlternates(loc, "/models"),
  };
}

export default async function ModelsPage() {
  // /api/public/models already embeds live-derived availability/status
  // server-side — no re-patch from /api/public/availability. The old second
  // fetch had its own 20s cache window and could contradict the embedded
  // values within the same render.
  const models = await modelService.getModels();
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
            {models.map((model, i) => (
              <Reveal key={model.id} delay={(i % 3) * 80}>
                <ModelCard m={model} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
