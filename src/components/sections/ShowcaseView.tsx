"use client";

import { useTranslations } from "next-intl";
import { useInteractions } from "@/components/providers/Interactions";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";
import type { BikeModel } from "@/types";

export function ShowcaseView({ m }: { m: BikeModel }) {
  const { reserve } = useInteractions();
  const t = useTranslations("showcase");
  const hasRange = m.specs.some((s) => s.k === "Range");
  return (
    <section className="section-pad">
      <div className="wrap">
        <Reveal>
          <div className="showcase">
            <div className="showcase-grid">
              <div className="showcase-media">
                <img src="/assets/lifestyle-rider.webp" alt={t("mediaAlt")} />
                <span className="tag">
                  <Ic.spark s={13} />
                  {t("tag")}
                </span>
              </div>
              <div className="showcase-body">
                <Kicker>{t("kicker")}</Kicker>
                <h2>{t("heading")}</h2>
                <p className="lead">{m.blurb}</p>
                <div className="spec-table">
                  {m.specs.map((s) => (
                    <div className="spec-cell" key={s.k}>
                      <div className="v">
                        {s.v}
                        {s.u && <span className="u">{s.u}</span>}
                      </div>
                      <div className="k">{s.k}</div>
                    </div>
                  ))}
                </div>
                {hasRange && (
                  <div className="spec-note">
                    {t("rangeNote")}
                  </div>
                )}
                <div style={{ display: "flex", gap: 12, marginTop: 26, flexWrap: "wrap" }}>
                  <button className="btn btn-primary" onClick={() => reserve(m.id)}>
                    {t("cta")}
                    <span className="arrow">
                      <Ic.arrow />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
