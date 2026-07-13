"use client";

import { useLocale, useTranslations } from "next-intl";
import { portalInvoicePdfUrl, type PortalInvoiceSummary } from "@/services/portalService";

export function InvoiceHistoryCard({
  token,
  invoices,
}: {
  token: string;
  invoices: PortalInvoiceSummary[];
}) {
  const t = useTranslations("portal.invoices");
  const locale = useLocale();
  if (invoices.length === 0) return null;

  return (
    <article className="card portal-billing-card portal-invoice-history">
      <div>
        <h3>{t("heading")}</h3>
        <p className="portal-card-lead">{t("lead")}</p>
        <div className="portal-invoice-list">
          {invoices.map((invoice) => (
            <div className="portal-invoice-row" key={invoice.id}>
              <div>
                <strong className="mono">{invoice.number}</strong>
                <span>
                  {t("issued", { date: formatDate(invoice.issueDate, locale) })}
                  {invoice.dueDate ? ` · ${t("due", { date: formatDate(invoice.dueDate, locale) })}` : ""}
                </span>
              </div>
              <div className="portal-invoice-total">
                <strong>{formatMoney(invoice.total, invoice.currency, locale)}</strong>
                <span className={`portal-billing-status status-${invoice.status}`}>
                  {t.has(`status.${invoice.status}`) ? t(`status.${invoice.status}`) : invoice.status}
                </span>
              </div>
              {invoice.hasPdf && (
                <a
                  className="portal-invoice-download"
                  href={portalInvoicePdfUrl(invoice.id, token)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${t("download")} ${invoice.number}`}
                >
                  {t("download")}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
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

