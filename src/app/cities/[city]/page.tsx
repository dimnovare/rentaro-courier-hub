import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";
import { ModelCard } from "@/components/models/ModelCard";
import { cities, getCityById } from "@/data/cities";
import { getCityContent } from "@/data/cityContent";
import { modelService } from "@/services/modelService";

type Params = { params: Promise<{ city: string }> };

/** Maps a City.country display value to its `cities.countries.*` message key. */
const countryKey = (country: string) => country.toLowerCase();

export function generateStaticParams() {
  return cities.map((c) => ({ city: c.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { city } = await params;
  const c = getCityById(city);
  const t = await getTranslations("cityPage");
  const tc = await getTranslations("cities");
  if (!c) return { title: t("meta.notFoundTitle") };
  const soon = c.status === "soon";
  const cityName = tc(`names.${c.id}`);
  const country = tc(`countries.${countryKey(c.country)}`);
  const title = soon
    ? t("meta.titleSoon", { city: cityName })
    : t("meta.titleLive", { city: cityName });
  const description = soon
    ? t("meta.descriptionSoon", { city: cityName, country })
    : t("meta.descriptionLive", { city: cityName, country });
  const url = `/cities/${c.id}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: "rentaro",
      url,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CityPage({ params }: Params) {
  const { city } = await params;
  const c = getCityById(city);
  const content = getCityContent(city);
  if (!c || !content) notFound();

  const popularModels = await modelService.getPopular();
  const t = await getTranslations("cityPage");
  const tc = await getTranslations("cities");
  const tContent = await getTranslations("cityContent");

  const soon = c.status === "soon";
  const cityName = tc(`names.${c.id}`);
  const country = tc(`countries.${countryKey(c.country)}`);
  const whyHere = tContent.raw(`${c.id}.whyHere`) as string[];
  const neighbourhoods = tContent.raw(`${c.id}.neighbourhoods`) as string[];

  return (
    <main>
      {/* Hero */}
      <section className="section-pad" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>{country} · {cityName}</Kicker>
            <h1 className="h-section">{tContent(`${c.id}.headline`)}</h1>
            <p className="lead">{tContent(`${c.id}.intro`)}</p>
          </Reveal>

          {/* Live availability + pickup, reusing the city-card visual language */}
          <Reveal delay={80}>
            <article className="card city-card" style={{ maxWidth: 560 }}>
              <div className="ctop">
                <div>
                  <div className="country">{country}</div>
                  <div className="cname">{cityName}</div>
                </div>
                <span className={`city-status ${c.status}`}>
                  <span className="dot" />
                  {tc(`status.${c.status}`)}
                </span>
              </div>
              <div className="city-meta">
                <div>
                  <div className="l">{tc("availableBikes")}</div>
                  <div className={`v ${!soon ? "num" : ""}`}>{soon ? "—" : c.available}</div>
                </div>
                <div>
                  <div className="l">{tc("pickupArea")}</div>
                  <div className="v">{c.pickup}</div>
                </div>
              </div>
              {soon ? (
                <Link className="btn btn-block btn-ghost" href="/book">
                  {t("hero.joinWaitlist")}
                </Link>
              ) : (
                <Link className="btn btn-block btn-primary" href={`/book?city=${c.id}`}>
                  {t("hero.reserveIn", { city: cityName })}
                  <span className="arrow">
                    <Ic.arrow />
                  </span>
                </Link>
              )}
            </article>
          </Reveal>
        </div>
      </section>

      {/* Why ride here */}
      <section className="section-pad">
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>{t("whyHere.kicker")}</Kicker>
            <h2 className="h-section">
              {soon
                ? t("whyHere.headingSoon", { city: cityName })
                : t("whyHere.headingLive", { city: cityName })}
            </h2>
          </Reveal>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {whyHere.map((point, i) => (
              <Reveal key={point} delay={(i % 2) * 80}>
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
                  <p style={{ color: "var(--text-2)", fontSize: 15.5, lineHeight: 1.55 }}>{point}</p>
                </article>
              </Reveal>
            ))}
          </div>

          {/* Pickup note + neighbourhoods */}
          <Reveal delay={120}>
            <div
              className="card"
              style={{ marginTop: 22, padding: 26, display: "grid", gap: 18 }}
            >
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <span style={{ color: "var(--lime)", marginTop: 2, flex: "none" }}>
                  <Ic.bolt s={16} />
                </span>
                <p style={{ color: "var(--text-muted)", fontSize: 15.5, lineHeight: 1.6, maxWidth: "62ch" }}>
                  {tContent(`${c.id}.pickupNote`)}
                </p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                {neighbourhoods.map((n) => (
                  <span className="spec-pill" key={n}>
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Popular models for this city */}
      <section className="section-pad">
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>{t("popular.kicker", { city: cityName })}</Kicker>
            <h2 className="h-section">{t("popular.heading")}</h2>
            <p className="lead">
              {t("popular.leadBase")}{soon ? t("popular.leadSoon", { city: cityName }) : t("popular.leadLive")}
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

      {/* Final CTA */}
      <section className="section-pad" style={{ paddingBottom: 96 }}>
        <div className="wrap">
          <Reveal>
            <div className="final">
              <div className="final-inner">
                <h2>
                  {soon
                    ? t("finalCta.headingSoon", { city: cityName })
                    : t("finalCta.headingLive", { city: cityName })}
                </h2>
                <p>
                  {soon
                    ? t("finalCta.copySoon", { city: cityName })
                    : t("finalCta.copyLive", { city: cityName })}
                </p>
                <div style={{ display: "flex", gap: 13, justifyContent: "center", flexWrap: "wrap" }}>
                  <Link className="btn btn-primary btn-lg" href={soon ? "/book" : `/book?city=${c.id}`}>
                    {soon ? t("finalCta.joinWaitlist") : t("finalCta.reserveIn", { city: cityName })}
                    <span className="arrow">
                      <Ic.arrow />
                    </span>
                  </Link>
                  <Link className="btn btn-ghost btn-lg" href="/models">
                    {t("finalCta.exploreFleet")}
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
