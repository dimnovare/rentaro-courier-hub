"use client";

import { useTranslations } from "next-intl";
import { useInteractions } from "@/components/providers/Interactions";
import { Reveal } from "@/components/ui/Reveal";
import { Ic } from "@/components/ui/Icon";

export function FinalCta() {
  const { reserve, nav } = useInteractions();
  const t = useTranslations("finalCta");
  return (
    <section>
      <div className="wrap">
        <Reveal>
          <div className="final">
            <div className="final-inner">
              <h2>{t("heading")}</h2>
              <p>
                {t("lead")}
              </p>
              <div style={{ display: "flex", gap: 13, justifyContent: "center", flexWrap: "wrap" }}>
                <button className="btn btn-primary btn-lg" onClick={() => reserve()}>
                  {t("ctaReserve")}
                  <span className="arrow">
                    <Ic.arrow />
                  </span>
                </button>
                <button className="btn btn-ghost btn-lg" onClick={() => nav("pricing")}>
                  {t("ctaPricing")}
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
