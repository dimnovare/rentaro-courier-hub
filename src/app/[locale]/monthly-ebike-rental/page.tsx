import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";
import { ModelCard } from "@/components/models/ModelCard";
import { Pricing } from "@/components/sections/Pricing";
import { Faq } from "@/components/sections/Faq";
import { modelService } from "@/services/modelService";

export const metadata: Metadata = {
  title: "Monthly e-bike rental — rentaro",
  description:
    "Rent an e-bike by the month instead of buying. One predictable monthly price covers the bike, service support, lock and charger — with no large upfront cost. Tallinn, Riga and Helsinki.",
};

const pointKeys = [
  "predictablePrice",
  "repairsOnUs",
  "commitFlexible",
  "nothingTiedUp",
] as const;

export default async function MonthlyEbikeRentalPage() {
  const t = await getTranslations("seo.monthly");
  const popularModels = await modelService.getPopular();
  return (
    <main>
      <section className="section-pad" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>{t("hero.kicker")}</Kicker>
            <h1 className="h-section">{t("hero.heading")}</h1>
            <p className="lead">
              {t("hero.lead")}
            </p>
            <div style={{ display: "flex", gap: 13, flexWrap: "wrap", marginTop: 26 }}>
              <Link className="btn btn-primary btn-lg" href="/book">
                {t("hero.ctaReserve")}
                <span className="arrow">
                  <Ic.arrow />
                </span>
              </Link>
              <Link className="btn btn-ghost btn-lg" href="/models">
                {t("hero.ctaExplore")}
              </Link>
            </div>
          </Reveal>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {pointKeys.map((key, i) => (
              <Reveal key={key} delay={(i % 2) * 80}>
                <article className="card" style={{ padding: 24, height: "100%" }}>
                  <span
                    style={{
                      display: "inline-grid",
                      placeItems: "center",
                      width: 34,
                      height: 34,
                      borderRadius: 11,
                      background: "var(--lime)",
                      color: "var(--lime-ink)",
                      boxShadow: "0 0 24px -8px var(--lime-glow)",
                      marginBottom: 16,
                    }}
                  >
                    <Ic.bolt s={15} />
                  </span>
                  <h3 style={{ fontSize: 19, letterSpacing: "-0.02em", marginBottom: 8 }}>{t(`points.${key}.title`)}</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.6 }}>{t(`points.${key}.copy`)}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — the core of a monthly-rental story */}
      <Pricing />

      {/* Popular models */}
      <section className="section-pad">
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>{t("models.kicker")}</Kicker>
            <h2 className="h-section">{t("models.heading")}</h2>
            <p className="lead">
              {t("models.lead")}
            </p>
          </Reveal>
          <div className="models-grid">
            {popularModels.map((m, i) => (
              <Reveal key={m.id} delay={(i % 3) * 80}>
                <ModelCard m={m} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Faq />

      <section className="section-pad" style={{ paddingBottom: 96 }}>
        <div className="wrap">
          <Reveal>
            <div className="final">
              <div className="final-inner">
                <h2>{t("cta.heading")}</h2>
                <p>
                  {t("cta.lead")}
                </p>
                <div style={{ display: "flex", gap: 13, justifyContent: "center", flexWrap: "wrap" }}>
                  <Link className="btn btn-primary btn-lg" href="/book">
                    {t("cta.button")}
                    <span className="arrow">
                      <Ic.arrow />
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
