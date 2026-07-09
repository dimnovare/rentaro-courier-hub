"use client";

import { useLocale, useTranslations } from "next-intl";
import { useInteractions } from "@/components/providers/Interactions";
import { Reveal } from "@/components/ui/Reveal";
import { TrustStrip } from "@/components/ui/TrustStrip";
import { Ic } from "@/components/ui/Icon";
import { operatingCityNames } from "@/lib/cities";
import type { City, LocalizedStrings } from "@/types";

export function Hero({
  liveAvailable,
  cities = [],
  marquee,
}: { liveAvailable?: number; cities?: City[]; marquee?: LocalizedStrings } = {}) {
  const { reserve, goModels } = useInteractions();
  const locale = useLocale();
  const t = useTranslations("hero");
  const tc = useTranslations("cities");
  const showBikes = typeof liveAvailable === "number" && liveAvailable > 0;
  const marqueeItems = marquee?.[locale] ?? marquee?.en ?? [];

  // A city counts as live once it is no longer "soon". Derived from the LIVE
  // city list (passed from the server) with LOCALIZED names so the pill, the
  // hero stat and the cities section can never disagree.
  const { live, soon, liveCount } = operatingCityNames(cities, (id) => tc(`names.${id}`));
  const liveCityNames = live.join(" + ");
  const soonCityNames = soon.join(", ");
  return (
    <section className="hero" id="top">
      <div className="wrap hero-grid">
        <div>
          <Reveal className="hero-pill">
            <span className="live" />
            {t("pill", {
              live: liveCityNames.toUpperCase(),
              soon: soonCityNames.toUpperCase(),
              soonState: soonCityNames ? "some" : "none",
            })}
          </Reveal>
          <Reveal delay={60}>
            <h1 className="h-hero">
              {t("headingLine1")}
              <br />
              {t("headingLine2")}
              <br />
              {t("headingLine3Pre")}<span className="accent">{t("headingLine3Accent")}</span>
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className="lead">
              {t("lead")}
            </p>
          </Reveal>
          <Reveal delay={180}>
            <div className="cta-row">
              <button className="btn btn-primary btn-lg" onClick={() => reserve(undefined, "hero")}>
                {t("ctaReserve")}
                <span className="arrow">
                  <Ic.arrow />
                </span>
              </button>
              <button className="btn btn-ghost btn-lg" onClick={() => goModels("hero")}>
                {t("ctaExplore")}
              </button>
            </div>
          </Reveal>
          <Reveal delay={210}>
            <TrustStrip />
          </Reveal>
          <Reveal delay={240}>
            <div className="hero-stats">
              <div className="hero-stat">
                <div className="n">
                  {t("stats.priceValue")}<span className="u">{t("stats.priceUnit")}</span>
                </div>
                <div className="l">{t("stats.priceLabel")}</div>
              </div>
              <div className="hero-stat">
                <div className="n">
                  {t("stats.termValue")}<span className="u">{t("stats.termUnit")}</span>
                </div>
                <div className="l">{t("stats.termLabel")}</div>
              </div>
              <div className="hero-stat">
                <div className="n">
                  {showBikes ? liveAvailable : liveCount}
                  <span className="u">
                    {showBikes ? t("stats.availableUnit") : t("stats.citiesUnit")}
                  </span>
                </div>
                <div className="l">
                  {showBikes ? t("stats.availableLabel") : t("stats.citiesLabel", { soon: soonCityNames, soonState: soonCityNames ? "some" : "none" })}
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Bike stage */}
        <Reveal delay={120} className="hero-stage">
          <div className="stage-glow" />
          <div className="stage-ring" />
          <div className="stage-ring r2" />
          <div className="stage-arc" />
          <div className="streak s1" />
          <div className="streak s2" />
          <div className="streak s3" />
          <div className="bike-shadow" />
          <img
            className="hero-bike"
            src="/assets/hero-bike.webp"
            alt={t("bikeAlt")}
          />
          <div className="spec-chip c1">
            <span className="v">{t("specChips.torqueValue")}</span>
            <span className="k">{t("specChips.torqueLabel")}</span>
          </div>
          <div className="spec-chip c2">
            <span className="v">{t("specChips.powerValue")}</span>
            <span className="k">{t("specChips.powerLabel")}</span>
          </div>
          <div className="spec-chip c3">
            <span className="v">{t("specChips.batteryValue")}</span>
            <span className="k">{t("specChips.batteryLabel")}</span>
          </div>
        </Reveal>
      </div>

      {/* Trust marquee */}
      <div className="wrap" style={{ marginTop: 0 }}>
        <div className="marquee">
          <div className="marquee-track">
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span className="marquee-item" key={i}>
                <Ic.check s={13} />
                {item}
                <span className="sep">/</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Narrow-phone stat/CTA rules live in globals.css ("Hero, narrow
          phones" section) — styled-jsx is not SSR'd under the App Router. */}
    </section>
  );
}
