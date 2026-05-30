import type { Metadata } from "next";
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
  const t = await getTranslations({ locale: loc, namespace: "seo.monthly" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    alternates: buildAlternates(loc, "/monthly-ebike-rental"),
  };
}

const pointKeys = [
  "predictablePrice",
  "repairsOnUs",
  "commitFlexible",
  "nothingTiedUp",
] as const;

const includedKeys = ["bike", "service", "lockCharger", "swap"] as const;
const faqKeys = ["firstPayment", "cancel", "deposit", "extend"] as const;

export default async function MonthlyEbikeRentalPage() {
  const t = await getTranslations("seo.monthly");
  const th = await getTranslations("howItWorks");
  const popularModels = await modelService.getPopular();

  const rentItems = t.raw("compare.rent.items") as string[];
  const buyItems = t.raw("compare.buy.items") as string[];

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

      {/* Rent vs buy — the cash-flow case for a monthly plan */}
      <section className="section-pad">
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>{t("compare.kicker")}</Kicker>
            <h2 className="h-section">{t("compare.heading")}</h2>
            <p className="lead">
              {t("compare.lead")}
            </p>
          </Reveal>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 16,
            }}
          >
            <Reveal>
              <article className="card" style={{ padding: 28, height: "100%" }}>
                <div className="kicker" style={{ marginBottom: 18 }}>
                  <span className="bar" />
                  {t("compare.rent.title")}
                </div>
                <ul style={{ display: "grid", gap: 13, listStyle: "none", margin: 0, padding: 0 }}>
                  {rentItems.map((item) => (
                    <li key={item} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ color: "var(--lime)", marginTop: 3, flex: "none" }}>
                        <Ic.check s={13} />
                      </span>
                      <span style={{ color: "var(--text-2)", fontSize: 15.5, lineHeight: 1.55 }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
            <Reveal delay={80}>
              <article className="card" style={{ padding: 28, height: "100%", opacity: 0.94 }}>
                <div className="kicker muted" style={{ marginBottom: 18 }}>
                  <span className="bar" />
                  {t("compare.buy.title")}
                </div>
                <ul style={{ display: "grid", gap: 13, listStyle: "none", margin: 0, padding: 0 }}>
                  {buyItems.map((item) => (
                    <li key={item} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ color: "var(--text-dim)", marginTop: 3, flex: "none" }}>
                        <Ic.plus s={12} />
                      </span>
                      <span style={{ color: "var(--text-muted)", fontSize: 15.5, lineHeight: 1.55 }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      {/* How a monthly plan works */}
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

      {/* What's included in every monthly plan */}
      <section className="section-pad">
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>{t("included.kicker")}</Kicker>
            <h2 className="h-section">{t("included.heading")}</h2>
            <p className="lead">
              {t("included.lead")}
            </p>
          </Reveal>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {includedKeys.map((key, i) => (
              <Reveal key={key} delay={(i % 2) * 80}>
                <article className="card" style={{ padding: 22, display: "flex", gap: 14, height: "100%" }}>
                  <span
                    style={{
                      flex: "none",
                      width: 30,
                      height: 30,
                      borderRadius: 10,
                      background: "var(--lime)",
                      color: "var(--lime-ink)",
                      display: "grid",
                      placeItems: "center",
                      boxShadow: "0 0 24px -8px var(--lime-glow)",
                    }}
                  >
                    <Ic.check s={13} />
                  </span>
                  <div>
                    <h3 style={{ fontSize: 16.5, letterSpacing: "-0.01em", marginBottom: 5 }}>{t(`included.items.${key}.title`)}</h3>
                    <p style={{ color: "var(--text-muted)", fontSize: 14.5, lineHeight: 1.55 }}>{t(`included.items.${key}.copy`)}</p>
                  </div>
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
