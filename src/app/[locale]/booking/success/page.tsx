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
  monthly: number;
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
                      <div className="summary-row" style={{ borderBottom: "none" }}>
                        <span className="l">{t("startDate")}</span>
                        <span className="v">{s.startDate}</span>
                      </div>
                    </div>
                  </article>
                )}

                {/* Restated cost: refundable deposit (= one 30-day period) plus the
                    total paid later in the portal — after approval and contract
                    acceptance (two periods). Only shown once we have the price. */}
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
                    {t("cost", { deposit: s.monthly, total: s.monthly * 2 })}
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

      {/* Scoped to this page only. Roman's ask: rebalance the success message so
          the second sentence (the "we'll confirm availability…" line) reads as an
          equal partner to the heading instead of big-then-tiny. We dial the
          heading down a touch and bump the body up to a near-matching size,
          brighter color and medium weight — a balanced pair, still on-brand. */}
      <style jsx>{`
        .success-heading {
          font-size: clamp(26px, 3.6vw, 38px);
          margin-bottom: 14px;
        }
        .success-body {
          font-size: clamp(21px, 2.9vw, 32px);
          line-height: 1.32;
          font-weight: 500;
          letter-spacing: -0.015em;
          color: var(--text);
          max-width: 30ch;
        }
      `}</style>
    </main>
  );
}
