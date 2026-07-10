import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { cityService } from "@/services/cityService";
import { modelService } from "@/services/modelService";
import { operatingCityNames } from "@/lib/cities";

export async function Service() {
  const [t, tc, cities, models] = await Promise.all([
    getTranslations("service"),
    getTranslations("cities"),
    cityService.getCities(),
    modelService.getModels(),
  ]);
  // A city is live once it is no longer "soon" — derived from LIVE data so this
  // stat stays in lockstep with the hero pill and hero stat, with localized
  // "soon" names. t.has guard: admin-added cities have no cities.names.* key —
  // fall back to the API-provided name (then the id) instead of crashing.
  const { soon, liveCount } = operatingCityNames(cities, (id) =>
    tc.has(`names.${id}`)
      ? tc(`names.${id}`)
      : (cities.find((c) => c.id === id)?.name ?? id),
  );
  const liveCityCount = liveCount;
  const soonCityNames = soon.join(", ");
  return (
    <section className="section-pad">
      <div className="wrap">
        <Reveal>
          <div className="service">
            <div className="service-grid">
              <div>
                <Kicker>{t("kicker")}</Kicker>
                <h2>{t("heading")}</h2>
                <p>
                  {t("copy")}
                </p>
              </div>
              <div className="svc-stats">
                <div className="svc-stat">
                  <div className="n">{t("stats.supportValue")}</div>
                  <div className="l">{t("stats.supportLabel")}</div>
                </div>
                <div className="svc-stat">
                  <div className="n">{liveCityCount}</div>
                  <div className="l">{t("stats.citiesLabel", { soon: soonCityNames, soonState: soonCityNames ? "some" : "none" })}</div>
                </div>
                <div className="svc-stat">
                  <div className="n">{models.length}</div>
                  <div className="l">{t("stats.modelsLabel")}</div>
                </div>
                <div className="svc-stat">
                  <div className="n">{t("stats.minPlanValue")}</div>
                  <div className="l">{t("stats.minPlanLabel")}</div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
