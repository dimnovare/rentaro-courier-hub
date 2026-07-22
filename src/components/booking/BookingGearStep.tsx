"use client";

import { useLocale, useTranslations } from "next-intl";
import type { AccessoryOfferQuote } from "@/types/accessoryOffer";

export interface BookingGearStepProps {
  offers: AccessoryOfferQuote[];
  /** Undefined means no decision yet; null is the explicit Bike Only choice. */
  value: string | null | undefined;
  onChange: (code: string | null) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function BookingGearStep({
  offers,
  value,
  onChange,
  loading = false,
  error,
  onRetry,
}: BookingGearStepProps) {
  const locale = useLocale();
  const t = useTranslations("booking.gear");
  const primary = offers.filter((offer) => offer.placement === "primary");
  const secondary = offers.filter((offer) => offer.placement === "secondary");
  const money = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  if (loading) {
    return (
      <div className="gear-state" role="status" aria-live="polite">
        <span className="gear-state-line" aria-hidden />
        <span>{t("loading")}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gear-state gear-state-error" role="alert">
        <span>{error}</span>
        {onRetry && (
          <button type="button" className="btn btn-ghost" onClick={onRetry}>
            {t("retry")}
          </button>
        )}
      </div>
    );
  }

  return (
    <fieldset className="gear-fieldset">
      <legend className="sr-only">{t("legend")}</legend>
      <div className="gear-choice-list">{primary.map(renderOffer)}</div>
      {secondary.length > 0 && (
        <div className="gear-secondary">
          <p className="gear-secondary-label">{t("secondaryLabel")}</p>
          <div className="gear-choice-list">{secondary.map(renderOffer)}</div>
        </div>
      )}
    </fieldset>
  );

  function renderOffer(offer: AccessoryOfferQuote) {
    const inputValue = offer.code ?? "bike-only";
    const checked = value !== undefined && value === offer.code;
    const unavailableName = offer.components.find(
      (component) => component.code === offer.unavailableComponent,
    )?.name ?? offer.unavailableComponent;

    return (
      <label
        className={`gear-choice${checked ? " is-selected" : ""}${
          offer.available ? "" : " is-unavailable"
        }`}
        key={inputValue}
      >
        <input
          type="radio"
          name="accessory-offer"
          value={inputValue}
          checked={checked}
          disabled={!offer.available}
          onChange={() => onChange(offer.code)}
        />
        <span className="gear-choice-copy">
          <span className="gear-choice-heading">
            <strong>{offer.name}</strong>
            {offer.recommended && (
              <span className="gear-recommended">{t("recommended")}</span>
            )}
          </span>
          <span className="gear-benefit">{offer.benefit}</span>
          {offer.components.length > 0 && (
            <span className="gear-components">
              {t("includes", {
                items: offer.components.map((component) => component.name).join(" + "),
              })}
            </span>
          )}
          {!offer.available && unavailableName && (
            <span className="gear-unavailable">
              {t("unavailable", { component: unavailableName })}
            </span>
          )}
        </span>
        <span className="gear-choice-price">
          <strong>€{money.format(offer.recurringPrice)}</strong>
          <span>{t("per30")}</span>
          {offer.savingAmount > 0 && (
            <em>{t("saving", { amount: money.format(offer.savingAmount) })}</em>
          )}
          {offer.extraBatteryDeposit != null && (
            <small>
              {t("batteryDeposit", {
                amount: money.format(offer.extraBatteryDeposit),
              })}
            </small>
          )}
        </span>
      </label>
    );
  }
}
