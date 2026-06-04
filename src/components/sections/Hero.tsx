"use client";

import { useTranslations } from "next-intl";
import { useInteractions } from "@/components/providers/Interactions";
import { Reveal } from "@/components/ui/Reveal";
import { TrustStrip } from "@/components/ui/TrustStrip";
import { Ic } from "@/components/ui/Icon";
import { cities } from "@/data/cities";

// Single source of truth for "how many cities are live" — a city counts as live
// once it is no longer "soon". Derived here so the pill, the hero stat and the
// service stat can never disagree.
const liveCities = cities.filter((c) => c.status !== "soon");
const soonCities = cities.filter((c) => c.status === "soon");
const liveCityCount = liveCities.length;
// Proper-case lists for the stat label; the all-caps pill uppercases its own.
const liveCityNames = liveCities.map((c) => c.name).join(" + ");
const soonCityNames = soonCities.map((c) => c.name).join(", ");

/** Marquee item keys, in display order — copy lives in the `marquee` namespace. */
const marqueeKeys = [
  "minDays",
  "serviceSupport",
  "lockCharger",
  "extraBattery",
  "digitalContract",
  "builtForShifts",
  "pickupDelivery",
] as const;

export function Hero() {
  const { reserve, goModels } = useInteractions();
  const t = useTranslations("hero");
  const tm = useTranslations("marquee");
  return (
    <section className="hero" id="top">
      <div className="wrap hero-grid">
        <div>
          <Reveal className="hero-pill">
            <span className="live" />
            {t("pill", {
              live: liveCityNames.toUpperCase(),
              soon: soonCityNames.toUpperCase(),
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
                  {liveCityCount}<span className="u">{t("stats.citiesUnit")}</span>
                </div>
                <div className="l">{t("stats.citiesLabel", { soon: soonCityNames })}</div>
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
            {[...marqueeKeys, ...marqueeKeys].map((key, i) => (
              <span className="marquee-item" key={i}>
                <Ic.check s={13} />
                {tm(key)}
                <span className="sep">/</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
