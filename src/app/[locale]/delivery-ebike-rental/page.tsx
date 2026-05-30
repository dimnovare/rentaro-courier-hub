import type { Metadata } from "next";
import type { ReactElement } from "react";
import { buildAlternates } from "@/i18n/alternates";
import { isLocale, type Locale } from "@/i18n/config";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";
import { ModelCard } from "@/components/models/ModelCard";
import { Pricing } from "@/components/sections/Pricing";
import { Faq } from "@/components/sections/Faq";
import { modelService } from "@/services/modelService";
import { steps } from "@/data/content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const t = await getTranslations({ locale: loc, namespace: "seo.delivery" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    alternates: buildAlternates(loc, "/delivery-ebike-rental"),
  };
}

const pointKeys = [
  "builtToCarry",
  "downtimeCosts",
  "readyForWeather",
  "cityDelivery",
] as const;

const gearItems: { key: string; icon: (p: { s?: number }) => ReactElement }[] = [
  { key: "battery", icon: Ic.battery },
  { key: "bag", icon: Ic.bag },
  { key: "phone", icon: Ic.phone },
  { key: "lock", icon: Ic.lock },
];

const faqKeys = ["uptime", "accessories", "weather", "platforms"] as const;

export default async function DeliveryEbikeRentalPage() {
  const t = await getTranslations("seo.delivery");
  const th = await getTranslations("howItWorks");
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

      {/* Gear that earns shifts — delivery accessories */}
      <section className="section-pad">
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>{t("gear.kicker")}</Kicker>
            <h2 className="h-section">{t("gear.heading")}</h2>
            <p className="lead">
              {t("gear.lead")}
            </p>
          </Reveal>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {gearItems.map(({ key, icon: Icon }, i) => (
              <Reveal key={key} delay={(i % 4) * 70}>
                <article className="card" style={{ padding: 24, height: "100%" }}>
                  <span
                    style={{
                      display: "inline-grid",
                      placeItems: "center",
                      width: 44,
                      height: 44,
                      borderRadius: 13,
                      background: "var(--surface-2)",
                      border: "1px solid var(--border-strong)",
                      color: "var(--lime)",
                      marginBottom: 18,
                    }}
                  >
                    <Icon s={22} />
                  </span>
                  <h3 style={{ fontSize: 17.5, letterSpacing: "-0.02em", marginBottom: 7 }}>{t(`gear.items.${key}.title`)}</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: 14.5, lineHeight: 1.6 }}>{t(`gear.items.${key}.copy`)}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Delivery-focused models */}
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

      {/* How it works */}
      <section className="section-pad">
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>{t("how.kicker")}</Kicker>
            <h2 className="h-section">{t("how.heading")}</h2>
            <p className="lead">
              {t("how.lead")}
            </p>
          </Reveal>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={(i % 3) * 80}>
                <article className="card" style={{ padding: 24, height: "100%" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      color: "var(--lime-ink)",
                      width: 44,
                      height: 44,
                      borderRadius: 13,
                      background: "var(--lime)",
                      display: "grid",
                      placeItems: "center",
                      marginBottom: 22,
                      boxShadow: "0 0 30px -6px var(--lime-glow)",
                    }}
                  >
                    {s.n}
                  </div>
                  <h3 style={{ fontSize: 19, letterSpacing: "-0.02em", marginBottom: 8 }}>{th(`steps.${s.n}.title`)}</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.6 }}>{th(`steps.${s.n}.copy`)}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Pricing />

      {/* Page-specific FAQ */}
      <section className="section-pad">
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>{t("faq.kicker")}</Kicker>
            <h2 className="h-section">{t("faq.heading")}</h2>
          </Reveal>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 16,
            }}
          >
            {faqKeys.map((key, i) => (
              <Reveal key={key} delay={(i % 2) * 80}>
                <article className="card" style={{ padding: 24, height: "100%" }}>
                  <h3 style={{ fontSize: 17, letterSpacing: "-0.01em", marginBottom: 9 }}>{t(`faq.items.${key}.q`)}</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.62 }}>{t(`faq.items.${key}.a`)}</p>
                </article>
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
