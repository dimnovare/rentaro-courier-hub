"use client";

import { useTranslations } from "next-intl";
import { useInteractions } from "@/components/providers/Interactions";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";
import type { City } from "@/types";

/** Map the data `country` value onto its message key. */
const countryKey: Record<string, string> = {
  Estonia: "estonia",
  Latvia: "latvia",
  Finland: "finland",
};

export function CitiesView({ cities }: { cities: City[] }) {
  const { reserve, openWaitlist } = useInteractions();
  const t = useTranslations("cities");
  return (
    <section className="section-pad" id="cities">
      <div className="wrap">
        <Reveal className="section-head">
          <Kicker>{t("kicker")}</Kicker>
          <h2 className="h-section">{t("heading")}</h2>
          <p className="lead">
            {t("lead")}
          </p>
        </Reveal>
        <div className="cities-grid">
          {cities.map((c, i) => {
            const cityName = t(`names.${c.id}`);
            return (
              <Reveal key={c.id} delay={i * 90}>
                <article className="card city-card">
                  <div className="ctop">
                    <div>
                      <div className="country">{t(`countries.${countryKey[c.country]}`)}</div>
                      <div className="cname">{cityName}</div>
                    </div>
                    <span className={`city-status ${c.status}`}>
                      <span className="dot" />
                      {t(`status.${c.status}`)}
                    </span>
                  </div>
                  <div className="city-meta">
                    <div>
                      <div className="l">{t("availableBikes")}</div>
                      <div className={`v ${c.status !== "soon" ? "num" : ""}`}>
                        {c.status === "soon" ? "—" : c.available}
                      </div>
                    </div>
                    <div>
                      <div className="l">{t("pickupArea")}</div>
                      <div className="v">{c.pickup}</div>
                    </div>
                  </div>
                  <button
                    className={`btn btn-block ${c.status === "available" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() =>
                      c.status === "soon"
                        ? openWaitlist({ cityId: c.id, source: `city-${c.id}` })
                        : reserve(`city:${c.id}`)
                    }
                  >
                    {c.status === "soon" ? t("notifyMe") : t("reserveIn", { city: cityName })}
                    {c.status === "available" && (
                      <span className="arrow">
                        <Ic.arrow />
                      </span>
                    )}
                  </button>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
