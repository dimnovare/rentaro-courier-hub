"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";
import { isWindDownMode } from "@/lib/windDown";
import {
  lookupBookingStatus,
  type BookingStatus,
  type LookupResult,
} from "@/services/bookingStatusService";

/** Map the API status (lowercased enum name) to its badge tone. Labels come from the `enums` namespace. */
const STATUS_VARIANT: Record<string, "popular" | "cargo" | "light"> = {
  submitted: "cargo",
  awaitingreview: "cargo",
  approved: "popular",
  rejected: "light",
  cancelled: "light",
};

function statusVariant(status: string) {
  return STATUS_VARIANT[status.toLowerCase()] ?? "light";
}

export function BookingStatusLookup() {
  const t = useTranslations("bookingStatus");
  const tWindDown = useTranslations("windDown");
  const params = useSearchParams();
  const prefill = params.get("ref") ?? params.get("id") ?? "";

  const [ref, setRef] = useState(prefill);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const autoRan = useRef(false);

  const run = useCallback(async (reference: string) => {
    const value = reference.trim();
    if (!value) return;
    setLoading(true);
    setResult(await lookupBookingStatus(value));
    setLoading(false);
  }, []);

  // Auto-run once when arriving with ?ref= / ?id= in the URL.
  useEffect(() => {
    if (autoRan.current || !prefill.trim()) return;
    autoRan.current = true;
    void run(prefill);
  }, [prefill, run]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void run(ref);
  };

  return (
    <>
      <Reveal className="section-head">
        <Kicker>{t("kicker")}</Kicker>
        <h2 className="h-section">{t("heading")}</h2>
        <p className="lead">
          {t("lead")}
        </p>
      </Reveal>

      <Reveal>
        <article className="card" style={{ maxWidth: 520, margin: "8px auto 0" }}>
          <div style={{ padding: "26px 24px 22px" }}>
            <form onSubmit={onSubmit}>
              <div className="field" style={{ marginBottom: 14 }}>
                <label htmlFor="ref">{t("refLabel")}</label>
                <input
                  id="ref"
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  placeholder={t("refPlaceholder")}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={loading || !ref.trim()}
                style={loading || !ref.trim() ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              >
                {loading ? t("checking") : t("checkStatus")}
                {!loading && (
                  <span className="arrow">
                    <Ic.arrow />
                  </span>
                )}
              </button>
            </form>

            {result && !loading && (
              <div style={{ marginTop: 22 }}>
                <StatusResult result={result} />
              </div>
            )}
          </div>
        </article>

        <p
          className="lead"
          style={{ maxWidth: 520, margin: "18px auto 0", textAlign: "center", fontSize: 14 }}
        >
          {isWindDownMode(process.env.NEXT_PUBLIC_BUSINESS_MODE) ? (
            // Wind-down: never offer a new reservation (the wizard redirects to
            // the closed notice) — point existing customers at support instead.
            <>
              {tWindDown("contactLead")}{" "}
              <a href="mailto:info@rentaro.ee" style={{ color: "var(--lime)" }}>
                info@rentaro.ee
              </a>
            </>
          ) : (
            <>
              {t("cantFindPrefix")}{" "}
              <Link href="/book" style={{ color: "var(--lime)" }}>
                {t("cantFindLink")}
              </Link>
              .
            </>
          )}
        </p>
      </Reveal>
    </>
  );
}

function StatusResult({ result }: { result: LookupResult }) {
  const t = useTranslations("bookingStatus");

  if (result.kind === "ok") return <StatusCard data={result.data} />;

  if (result.kind === "not_found") {
    return (
      <p className="wizard-err" role="alert">
        {t("notFound")}
      </p>
    );
  }

  if (result.kind === "no_api") {
    return (
      <p className="lead" role="status" style={{ fontSize: 14 }}>
        {t("preview")}
      </p>
    );
  }

  return (
    <p className="wizard-err" role="status">
      {t("error")}
    </p>
  );
}

function StatusCard({ data }: { data: BookingStatus }) {
  const t = useTranslations("bookingStatus");
  const tEnum = useTranslations("enums");
  const variant = statusVariant(data.status);
  const statusKey = `bookingStatus.${data.status.toLowerCase()}`;
  const label = tEnum.has(statusKey) ? tEnum(statusKey) : data.status;
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <span className="l" style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)" }}>
          {t("statusLabel")}
        </span>
        <span className={`model-badge ${variant}`} style={{ position: "static" }}>
          {label}
        </span>
      </div>

      <div className="summary-row">
        <span className="l">{t("reference")}</span>
        <span className="v mono">{data.reference}</span>
      </div>
      <div className="summary-row">
        <span className="l">{t("model")}</span>
        <span className="v">{data.modelName}</span>
      </div>
      <div className="summary-row">
        <span className="l">{t("plan")}</span>
        <span className="v">{data.planTerm}</span>
      </div>
      <div className="summary-row">
        <span className="l">{t("city")}</span>
        <span className="v">{data.cityName}</span>
      </div>
      <div className="summary-row" style={{ borderBottom: "none" }}>
        <span className="l">{t("startDate")}</span>
        <span className="v">{data.preferredStartDate ?? t("toBeConfirmed")}</span>
      </div>
    </div>
  );
}
