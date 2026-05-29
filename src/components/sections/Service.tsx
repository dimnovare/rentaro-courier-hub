import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";

export async function Service() {
  const t = await getTranslations("service");
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
                  <div className="n">{t("stats.citiesValue")}</div>
                  <div className="l">{t("stats.citiesLabel")}</div>
                </div>
                <div className="svc-stat">
                  <div className="n">{t("stats.modelsValue")}</div>
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
