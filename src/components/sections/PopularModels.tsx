"use client";

import { useTranslations } from "next-intl";
import { useInteractions } from "@/components/providers/Interactions";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";
import { ModelCard } from "@/components/models/ModelCard";
import { popularModels } from "@/data/bikeModels";

export function PopularModels() {
  const { goModels } = useInteractions();
  const t = useTranslations("popularModels");
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
          {popularModels.map((m, i) => (
            <Reveal key={m.id} delay={i * 90}>
              <ModelCard m={m} />
            </Reveal>
          ))}
        </div>
        <Reveal delay={120} style={{ marginTop: 28, display: "flex", justifyContent: "center" }}>
          <button className="btn btn-ghost btn-lg" onClick={() => goModels()}>
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
