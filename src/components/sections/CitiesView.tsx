"use client";

import { useTranslations } from "next-intl";
import { useInteractions } from "@/components/providers/Interactions";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";
import { operatingCityNames } from "@/lib/cities";
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

  // Localized display name with a t.has guard: admin-added cities have no
  // cities.names.* key yet — fall back to the API-provided name (then the id)
  // instead of crashing on a missing message.
  const cityName = (id: string): string =>
    t.has(`names.${id}`)
      ? t(`names.${id}`)
      : (cities.find((c) => c.id === id)?.name ?? id);

  // Derive the live/soon split from LIVE data (same rule as the hero pill: a
  // city is "live" once it's no longer "soon") so the heading can never claim
  // more markets than are actually open. Names are localized via cities.names.*.
  const { live: liveNames, soon: soonNames } = operatingCityNames(cities, cityName);
  const heading =
    soonNames.length > 0
      ? t("headingWithSoon", { live: liveNames.join(" + "), soon: soonNames.join(", ") })
      : t("heading", { live: liveNames.join(" + ") });

  return (
    <section className="section-pad" id="cities">
      <div className="wrap">
        <Reveal className="section-head">
          <Kicker>{t("kicker")}</Kicker>
          <h2 className="h-section">{heading}</h2>
          <p className="lead">
            {t("lead")}
          </p>
        </Reveal>
        <div className="cities-grid">
          {cities.map((c, i) => {
            const name = cityName(c.id);
            // Country + status are catalog-driven too: an admin-added city may
            // carry a country with no message key — fall back to the raw value.
            const countryMsgKey = `countries.${countryKey[c.country] ?? c.country}`;
            return (
              <Reveal key={c.id} delay={i * 90}>
                <article className="card city-card">
                  <div className="ctop">
                    <div>
                      <div className="country">
                        {t.has(countryMsgKey) ? t(countryMsgKey) : c.country}
                      </div>
                      <div className="cname">{name}</div>
                    </div>
                    <span className={`city-status ${c.status}`}>
                      <span className="dot" />
                      {t.has(`status.${c.status}`) ? t(`status.${c.status}`) : c.status}
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
                        : reserve(`city:${c.id}`, "cities")
                    }
                  >
                    {c.status === "soon" ? t("notifyMe") : t("reserveIn", { city: name })}
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
