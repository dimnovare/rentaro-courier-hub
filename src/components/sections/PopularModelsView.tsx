"use client";

import { useTranslations } from "next-intl";
import { useInteractions } from "@/components/providers/Interactions";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";
import { ModelCard } from "@/components/models/ModelCard";
import { groupByFamily } from "@/lib/modelFamilies";
import type { BikeModel } from "@/types";

export function PopularModelsView({ models }: { models: BikeModel[] }) {
  const { goModels } = useInteractions();
  const t = useTranslations("popularModels");
  // Collapse colour variants (shared `family`) into one card; with all-null
  // families every model is its own singleton group (unchanged layout).
  const groups = groupByFamily(models);
  return (
    <section className="section-pad" id="models">
      <div className="wrap">
        <Reveal className="section-head">
          <Kicker>{t("kicker")}</Kicker>
          <h2 className="h-section">{t("heading")}</h2>
          <p className="lead">
            {t("lead")}
          </p>
        </Reveal>
        <div className="models-grid">
          {groups.map((g, i) => (
            <Reveal key={g.family ?? g.variants[0].id} delay={i * 90}>
              <ModelCard m={g.variants[0]} variants={g.variants} />
            </Reveal>
          ))}
        </div>
        <Reveal delay={120} style={{ marginTop: 28, display: "flex", justifyContent: "center" }}>
          <button className="btn btn-ghost btn-lg" onClick={() => goModels("popular-models")}>
            {t("cta")}
            <span className="arrow">
              <Ic.arrow />
            </span>
          </button>
        </Reveal>
      </div>
    </section>
  );
}
