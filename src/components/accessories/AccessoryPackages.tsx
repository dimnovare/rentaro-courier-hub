"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Ic } from "@/components/ui/Icon";
import { getAccessoryOffers } from "@/services/accessoryOfferService";
import type { AccessoryOfferQuote } from "@/types/accessoryOffer";

interface AccessoryPackageCity {
  id: string;
  name: string;
}

export interface AccessoryPackagesProps {
  cities: AccessoryPackageCity[];
  compact?: boolean;
}

const planIds = ["p30", "p180", "p365"] as const;

export function AccessoryPackages({ cities, compact = false }: AccessoryPackagesProps) {
  const locale = useLocale();
  const t = useTranslations("accessories.packages");
  const tp = useTranslations("pricing.terms");
  const [cityId, setCityId] = useState(cities[0]?.id ?? "");
  const [planId, setPlanId] = useState<(typeof planIds)[number]>("p365");
  const [offers, setOffers] = useState<AccessoryOfferQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const city = cities.find((candidate) => candidate.id === cityId) ?? cities[0];
  const money = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  useEffect(() => {
    if (!cityId) {
      setLoading(false);
      setFailed(true);
      return;
    }

    let active = true;
    setLoading(true);
    setFailed(false);
    getAccessoryOffers({ cityId, planId, locale })
      .then((result) => {
        if (active) setOffers(result);
      })
      .catch(() => {
        if (active) {
          setOffers([]);
          setFailed(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [cityId, locale, planId, reload]);

  const visibleOffers = compact
    ? offers.filter((offer) => offer.placement === "primary")
    : offers;

  return (
    <div className={`package-comparison${compact ? " is-compact" : ""}`}>
      {!compact && (
        <div className="package-controls">
          <div className="package-plan-control" role="group" aria-label={t("planLabel")}>
            {planIds.map((id) => (
              <button
                type="button"
                key={id}
                className={planId === id ? "is-active" : ""}
                aria-pressed={planId === id}
                onClick={() => setPlanId(id)}
              >
                {tp(id)}
              </button>
            ))}
          </div>
          {cities.length > 1 && (
            <label className="package-city-control">
              <span>{t("cityLabel")}</span>
              <select
                aria-label={t("cityLabel")}
                value={cityId}
                onChange={(event) => setCityId(event.target.value)}
              >
                {cities.map((option) => (
                  <option value={option.id} key={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      <p className="package-policy">{t("policy")}</p>

      {loading ? (
        <div className="package-state" role="status">
          <span className="package-loading-line" aria-hidden />
          {t("loading")}
        </div>
      ) : failed ? (
        <div className="package-state package-state-error" role="alert">
          <span>{t("loadError")}</span>
          <button type="button" className="btn btn-ghost" onClick={() => setReload((n) => n + 1)}>
            {t("retry")}
          </button>
        </div>
      ) : (
        <div className="package-offer-list">
          {visibleOffers.map((offer) => {
            const unavailableComponent = offer.components.find(
              (component) => component.code === offer.unavailableComponent,
            )?.name ?? offer.unavailableComponent;
            const href = `/book?city=${encodeURIComponent(cityId)}&plan=${encodeURIComponent(planId)}`;

            return (
              <article
                className={`package-offer${offer.recommended ? " is-recommended" : ""}${
                  offer.available ? "" : " is-unavailable"
                }`}
                key={offer.code ?? "bike-only"}
              >
                <div className="package-offer-icons" aria-hidden>
                  {offer.components.length === 0 ? (
                    <span><Ic.bolt s={20} /></span>
                  ) : (
                    offer.components.map((component) => (
                      <span key={component.code}>{componentIcon(component.code)}</span>
                    ))
                  )}
                </div>
                <div className="package-offer-main">
                  <div className="package-offer-title">
                    <h3>{offer.name}</h3>
                    {offer.recommended && <span>{t("recommended")}</span>}
                  </div>
                  <p>{offer.benefit}</p>
                  {offer.components.length > 0 && (
                    <p className="package-components">
                      {t("includes", {
                        items: offer.components.map((component) => component.name).join(" + "),
                      })}
                    </p>
                  )}
                  {!offer.available && unavailableComponent && city && (
                    <p className="package-unavailable">
                      {t("unavailable", {
                        city: city.name,
                        component: unavailableComponent,
                      })}
                    </p>
                  )}
                </div>
                <div className="package-offer-action">
                  <div className="package-price">
                    <strong>€{money.format(offer.recurringPrice)}</strong>
                    <span>{t("per30")}</span>
                    {offer.savingAmount > 0 && (
                      <em>{t("saving", { amount: money.format(offer.savingAmount) })}</em>
                    )}
                  </div>
                  <Link
                    href={href}
                    className="package-choose"
                    aria-label={t("choose", { offer: offer.name })}
                    aria-disabled={!offer.available}
                    tabIndex={offer.available ? undefined : -1}
                    onClick={(event) => {
                      if (!offer.available) event.preventDefault();
                    }}
                  >
                    {offer.available ? t("chooseShort") : t("unavailableShort")}
                    {offer.available && <Ic.arrow s={15} />}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {compact && !loading && !failed && (
        <Link href="/accessories" className="package-all-link">
          {t("compareAll")} <Ic.arrow s={15} />
        </Link>
      )}
    </div>
  );
}

function componentIcon(code: string) {
  if (code === "battery") return <Ic.battery s={20} />;
  if (code === "lock") return <Ic.lock s={20} />;
  if (code === "phone") return <Ic.phone s={20} />;
  return <Ic.bolt s={20} />;
}
