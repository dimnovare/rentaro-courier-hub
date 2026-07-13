"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  cancelExtension,
  getRental,
  portalInvoicePdfUrl,
  requestExtension,
  type PortalRental,
  type PortalResult,
} from "@/services/portalService";

type RequestFn = typeof requestExtension;
type CancelFn = typeof cancelExtension;
type ReloadFn = (token: string) => Promise<PortalResult<PortalRental>>;

export function RentalExtensionCard({
  token,
  rental,
  onRentalChanged,
  request = requestExtension,
  cancel = cancelExtension,
  reload = getRental,
  makeIdempotencyKey = defaultIdempotencyKey,
}: {
  token: string;
  rental: PortalRental;
  onRentalChanged: (rental: PortalRental) => void;
  request?: RequestFn;
  cancel?: CancelFn;
  reload?: ReloadFn;
  makeIdempotencyKey?: () => string;
}) {
  const t = useTranslations("portal.extension");
  const locale = useLocale();
  const options = rental.extensionOptions ?? [];
  const extension = rental.currentExtension ?? null;
  const eligibility = rental.extensionEligibility;
  const [selectedCode, setSelectedCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestKey = useRef<string | null>(null);

  const selected = options.find((option) => option.optionCode === selectedCode);

  async function refresh(): Promise<boolean> {
    const result = await reload(token);
    if (result.kind !== "ok") return false;
    onRentalChanged(result.data);
    return true;
  }

  async function submit() {
    if (busy || !selected || !consent || !rental.plannedEndDate) return;
    setBusy(true);
    setError("");
    requestKey.current ??= makeIdempotencyKey();
    const result = await request(
      token,
      {
        optionCode: selected.optionCode,
        expectedPlannedEndDate: rental.plannedEndDate,
        consent: true,
      },
      requestKey.current,
    );

    if (result.kind === "ok") {
      requestKey.current = null;
      if (!(await refresh())) setError(t("reloadFailed"));
    } else if (result.kind === "conflict") {
      requestKey.current = null;
      await refresh();
      setError(t("stale"));
    } else {
      setError(t("requestFailed"));
    }
    setBusy(false);
  }

  async function cancelPending() {
    if (busy || !extension) return;
    setBusy(true);
    setError("");
    const result = await cancel(token, extension.id);
    if (result.kind === "ok") {
      if (!(await refresh())) setError(t("reloadFailed"));
    } else {
      setError(t("cancelFailed"));
    }
    setBusy(false);
  }

  if (!rental.hasRental || (!eligibility?.eligible && !extension)) return null;

  if (extension?.status === "awaiting_payment") {
    const invoice = (rental.invoices ?? []).find(
      (item) =>
        item.rentalExtensionId === extension.id &&
        item.kind === "rentalExtension" &&
        !["paid", "void", "voided", "cancelled"].includes(item.status),
    );
    const transfer = extension.bankTransfer;
    return (
      <PortalBillingCard heading={t("awaitingPayment")} lead={t("awaitingPaymentLead")}>
        <ExtensionSummary rental={rental} locale={locale} />
        {transfer && (
          <dl className="portal-bank-details">
            <Detail label={t("accountName")} value={transfer.accountName} />
            {transfer.bankName && <Detail label={t("bankName")} value={transfer.bankName} />}
            <Detail label={t("iban")} value={transfer.iban} mono />
            <Detail label={t("paymentReference")} value={transfer.reference} mono />
          </dl>
        )}
        <div className="portal-billing-actions">
          {invoice?.hasPdf && (
            <a
              className="btn btn-secondary"
              href={portalInvoicePdfUrl(invoice.id, token)}
              target="_blank"
              rel="noreferrer"
            >
              {t("downloadInvoice")}
            </a>
          )}
          <button className="btn btn-quiet" type="button" disabled={busy} onClick={cancelPending}>
            {busy ? t("working") : t("cancelUnpaid")}
          </button>
        </div>
        {error && <p className="portal-form-error" role="alert">{error}</p>}
      </PortalBillingCard>
    );
  }

  if (extension && ["active", "completed", "manual_review"].includes(extension.status)) {
    const heading = extension.status === "manual_review"
      ? t("reviewHeading")
      : extension.status === "completed"
        ? t("completedHeading")
        : t("activeHeading");
    const lead = extension.status === "manual_review"
      ? t("reviewLead")
      : extension.status === "completed"
        ? t("completedLead")
        : t("activeLead");
    return (
      <PortalBillingCard heading={heading} lead={lead}>
        <ExtensionSummary rental={rental} locale={locale} />
        {(rental.billingSchedule ?? []).length > 0 && (
          <div className="portal-billing-schedule" aria-label={t("scheduleLabel")}>
            {(rental.billingSchedule ?? []).map((period) => (
              <div className="portal-schedule-row" key={period.id}>
                <div>
                  <strong>{formatDateRange(period.serviceStartDate, period.serviceEndDate, locale)}</strong>
                  <span>{t("invoiceOn", { date: formatDate(period.invoiceIssueDate, locale) })}</span>
                </div>
                <div className="portal-schedule-amount">
                  <strong>{formatMoney(period.amount, period.currency, locale)}</strong>
                  <span className={`portal-billing-status status-${period.status}`}>
                    {statusLabel(period.status, t)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </PortalBillingCard>
    );
  }

  if (!eligibility?.eligible || options.length === 0) return null;

  return (
    <PortalBillingCard heading={t("heading")} lead={t("lead")}>
      <fieldset className="portal-extension-options">
        <legend className="sr-only">{t("chooseTerm")}</legend>
        {options.map((option) => (
          <label className="portal-extension-option" key={option.optionCode}>
            <input
              type="radio"
              name="rental-extension"
              value={option.optionCode}
              checked={selectedCode === option.optionCode}
              onChange={() => setSelectedCode(option.optionCode)}
            />
            <span className="portal-extension-option-copy">
              <strong>{termLabel(option.termMonths, t)}</strong>
              <span>{t("everyPeriod", { amount: formatMoney(option.amountPerPeriod, option.currency, locale) })}</span>
              <small>{t("totalCommitment", { amount: formatMoney(option.totalCommitment, option.currency, locale) })}</small>
              {option.accessoryAmountPerPeriod && option.accessoryAmountPerPeriod > 0 ? (
                <small>{t("optionalAccessories", { amount: formatMoney(option.accessoryAmountPerPeriod, option.currency, locale) })}</small>
              ) : null}
              <small>
                {t("serviceDates", {
                  start: formatDate(option.firstServiceStartDate, locale),
                  end: formatDate(option.firstServiceEndDate, locale),
                })}
              </small>
            </span>
          </label>
        ))}
      </fieldset>

      <label className="portal-extension-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span>{t("consent")}</span>
      </label>

      <button
        className="btn btn-primary btn-block"
        type="button"
        disabled={!selected || !consent || busy}
        onClick={submit}
      >
        {busy ? t("working") : t("confirm")}
        <span className="arrow" aria-hidden="true">-&gt;</span>
      </button>
      <p className="portal-extension-note">{t("paymentNote")}</p>
      {error && <p className="portal-form-error" role="alert">{error}</p>}
    </PortalBillingCard>
  );
}

function PortalBillingCard({
  heading,
  lead,
  children,
}: {
  heading: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <article className="card portal-billing-card">
      <div>
        <h3>{heading}</h3>
        <p className="portal-card-lead">{lead}</p>
        {children}
      </div>
    </article>
  );
}

function ExtensionSummary({ rental, locale }: { rental: PortalRental; locale: string }) {
  const t = useTranslations("portal.extension");
  const extension = rental.currentExtension;
  if (!extension) return null;
  return (
    <dl className="portal-extension-summary">
      <Detail label={t("term")} value={termLabel(extension.termMonths, t)} />
      <Detail
        label={t("eachPeriod")}
        value={formatMoney(extension.amountPerPeriod, extension.currency, locale)}
      />
      <Detail
        label={t("newPlannedEnd")}
        value={formatDate(extension.proposedPlannedEndDate, locale)}
      />
      {extension.nextInvoiceDate && (
        <Detail label={t("nextInvoice")} value={formatDate(extension.nextInvoiceDate, locale)} />
      )}
    </dl>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={mono ? "mono" : undefined}>{value}</dd>
    </div>
  );
}

function termLabel(months: number, t: ReturnType<typeof useTranslations>): string {
  return months === 1 ? t("term30") : t("termMonths", { count: months });
}

function statusLabel(status: string, t: ReturnType<typeof useTranslations>): string {
  const key = `status.${status}`;
  return t.has(key) ? t(key) : status;
}

function formatMoney(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string, locale: string): string {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function formatDateRange(start: string, end: string, locale: string): string {
  return `${formatDate(start, locale)} - ${formatDate(end, locale)}`;
}

function defaultIdempotencyKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
