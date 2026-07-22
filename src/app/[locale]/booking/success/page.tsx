"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/Reveal";
import { Ic } from "@/components/ui/Icon";
import { company } from "@/data/company";
import { track } from "@/services/analytics";

type Summary = {
  id: string;
  model: string;
  plan: string;
  /** Recurring per-30-days total (bike + selected package). */
  monthly: number;
  /** The bike's own 30-day price — the deposit equals exactly this. */
  bikeMonthly?: number;
  /** Selected package's per-30-day amount. */
  gear?: number;
  /** Optional one-time refundable extra-battery deposit. */
  batteryDeposit?: number;
  accessoryPackage?: string;
  /** One-time delivery fee (0 for pickup). */
  fee?: number;
  city: string;
  startDate: string;
  firstName: string;
  accessories: string[];
  /** Secure portal deep-link, present once the booking flow has it. */
  portalUrl?: string;
};

export default function BookingSuccessPage() {
  const t = useTranslations("success");
  const [s, setS] = useState<Summary | null>(null);

  useEffect(() => {
    let booking: Summary | null = null;
    try {
      const raw = sessionStorage.getItem("rentaro_booking");
      if (raw) {
        booking = JSON.parse(raw) as Summary;
        setS(booking);
      }
    } catch {
      /* ignore */
    }
    // Funnel end: the success page was reached and viewed. `id` is the booking
    // reference (not PII); consent-gated inside `track`.
    track("booking_success_viewed", { id: booking?.id });
  }, []);

  // Primary action: open the secure portal when we have its URL, otherwise fall
  // back to the public status tracker keyed by the booking reference.
  const trackHref =
    s?.portalUrl && s.portalUrl.trim()
      ? s.portalUrl
      : s
        ? `/booking/status?id=${encodeURIComponent(s.id)}`
        : "/booking/status";
  const trackLabel = s?.portalUrl?.trim() ? t("trackAndSign") : t("trackOnly");
  const supportEmail = company.supportEmail.trim();

  return (
    <main>
      <section className="section-pad" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <Reveal>
            <div className="final" style={{ marginTop: 0 }}>
              <div className="final-inner">
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "var(--lime)",
                    color: "var(--lime-ink)",
                    display: "grid",
                    placeItems: "center",
                    margin: "0 auto 22px",
                    boxShadow: "0 0 40px -6px var(--lime-glow)",
                  }}
                >
                  <Ic.check s={28} />
                </div>
                <h2 className="success-heading">
                  {s?.firstName ? t("headingNamed", { name: s.firstName }) : t("heading")}
                </h2>
                <p className="success-body">{t("body")}</p>

                {/* Direct visit / refresh: the live summary lives in sessionStorage
                    and is gone, so there is no reference to restate. Tell the rider
                    plainly and point them at the status lookup (hardcoded copy —
                    not yet in the success i18n bundle). */}
                {!s && (
                  <p
                    className="lead"
                    style={{ fontSize: 14, margin: "0 auto 22px", maxWidth: 460 }}
                  >
                    Your live booking summary is not available in this session. Use
                    your booking reference to look it up below.
                  </p>
                )}

                {s && (
                  <article
                    className="card"
                    style={{ maxWidth: 440, margin: "8px auto 22px", textAlign: "left" }}
                  >
                    <div style={{ padding: "6px 20px" }}>
                      <div className="summary-row">
                        <span className="l">{t("reference")}</span>
                        <span className="v mono">{s.id}</span>
                      </div>
                      <div className="summary-row">
                        <span className="l">{t("model")}</span>
                        <span className="v">{s.model}</span>
                      </div>
                      <div className="summary-row">
                        <span className="l">{t("plan")}</span>
                        <span className="v">{s.plan}</span>
                      </div>
                      <div className="summary-row">
                        <span className="l">{t("city")}</span>
                        <span className="v">{s.city}</span>
                      </div>
                      {s.accessoryPackage && (
                        <div className="summary-row">
                          <span className="l">{t("gearPackage")}</span>
                          <span className="v">{s.accessoryPackage}</span>
                        </div>
                      )}
                      <div className="summary-row" style={{ borderBottom: "none" }}>
                        <span className="l">{t("startDate")}</span>
                        <span className="v">{s.startDate}</span>
                      </div>
                    </div>
                  </article>
                )}

                {/* Restated cost: the refundable deposit equals the BIKE's 30-day
                    price only (never add-ons), and the total due before pickup is
                    first 30 days (bike + add-ons) + deposit + one-time delivery
                    fee. Older summaries lack the split fields — fall back to the
                    recurring total so the line never understates. */}
                {s && s.monthly > 0 && (
                  <p
                    className="mono"
                    style={{
                      fontSize: 12.5,
                      letterSpacing: "0.03em",
                      color: "var(--text-dim)",
                      margin: "0 auto 24px",
                      maxWidth: 440,
                    }}
                  >
                    {(s.batteryDeposit ?? 0) > 0
                      ? t("costWithBattery", {
                          bikeDeposit: s.bikeMonthly ?? s.monthly,
                          batteryDeposit: s.batteryDeposit ?? 0,
                          total:
                            (s.bikeMonthly ?? s.monthly) +
                            s.monthly +
                            (s.batteryDeposit ?? 0) +
                            (s.fee ?? 0),
                        })
                      : t("cost", {
                          deposit: s.bikeMonthly ?? s.monthly,
                          total: (s.bikeMonthly ?? s.monthly) + s.monthly + (s.fee ?? 0),
                        })}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 13,
                    justifyContent: "center",
                    flexWrap: "wrap",
                    marginBottom: 22,
                  }}
                >
                  <Link className="btn btn-primary btn-lg" href={trackHref}>
                    {trackLabel}
                    <span className="arrow">
                      <Ic.arrow />
                    </span>
                  </Link>
                  <Link className="btn btn-ghost btn-lg" href="/models">
                    {t("browseFleet")}
                  </Link>
                  <Link className="btn btn-ghost btn-lg" href="/">
                    {t("backHome")}
                  </Link>
                </div>

                {/* What happens next + optional support line (renders only once a
                    support email is configured in company.ts — blank by design today). */}
                <p className="lead" style={{ fontSize: 14, margin: "0 auto", maxWidth: 460 }}>
                  {t("nextSteps")}
                </p>
                {supportEmail && (
                  <p
                    className="lead"
                    style={{ fontSize: 14, margin: "8px auto 0", maxWidth: 460 }}
                  >
                    {t("supportPrefix")}{" "}
                    <a href={`mailto:${supportEmail}`} style={{ color: "var(--lime)" }}>
                      {supportEmail}
                    </a>
                  </p>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* .success-heading / .success-body styles live in globals.css ("Booking
          success page" section) — styled-jsx is not SSR'd under the App Router. */}
    </main>
  );
}
