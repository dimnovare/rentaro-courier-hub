"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";
import {
  getRental,
  requestRepair,
  contactSupport,
  type PortalRental,
  type PortalResult,
} from "@/services/portalService";

/**
 * Map the API status (lowercased enum name) to its badge tone. Friendly labels
 * live in the `enums.bookingStatus` / `enums.rentalStatus` namespaces.
 */
const STATUS_VARIANT: Record<string, "popular" | "cargo" | "light"> = {
  // Booking statuses (before a bike is assigned)
  submitted: "cargo",
  awaitingreview: "cargo",
  approved: "popular",
  rejected: "light",
  cancelled: "light",
  paymentpending: "cargo",
  bikeassigned: "popular",
  completed: "light",
  // Rental statuses (once active)
  active: "popular",
  endingsoon: "cargo",
  returned: "light",
  closed: "light",
  overdue: "light",
};

function statusVariant(status: string) {
  return STATUS_VARIANT[status.toLowerCase()] ?? "light";
}

/**
 * Resolve a status (lowercased enum name) to its friendly label. The same value
 * is never both a booking and a rental status, so we try rental first, then
 * booking, then fall back to the raw value — matching the previous flat map.
 */
function useStatusLabel() {
  const tEnum = useTranslations("enums");
  return (status: string) => {
    const key = status.toLowerCase();
    if (tEnum.has(`rentalStatus.${key}`)) return tEnum(`rentalStatus.${key}`);
    if (tEnum.has(`bookingStatus.${key}`)) return tEnum(`bookingStatus.${key}`);
    return status;
  };
}

/** Issue type values match the backend MaintenanceIssueType enum (parsed case-insensitively). */
const ISSUE_TYPE_VALUES = [
  "Puncture",
  "Brakes",
  "Battery",
  "Motor",
  "Lock",
  "Charger",
  "GeneralService",
  "Accident",
] as const;

/** Map an issue type value onto its `enums.issueType` message key. */
const issueTypeKey: Record<string, string> = {
  Puncture: "puncture",
  Brakes: "brakes",
  Battery: "battery",
  Motor: "motor",
  Lock: "lock",
  Charger: "charger",
  GeneralService: "generalService",
  Accident: "accident",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "13px 15px",
  borderRadius: "var(--r-sm)",
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontFamily: "var(--font-body)",
  fontSize: 15,
  appearance: "none",
};

export function ManageRental() {
  const t = useTranslations("portal");
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [state, setState] = useState<PortalResult<PortalRental> | null>(null);

  const load = useCallback(async () => {
    setState(await getRental(token));
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  // Missing token, or the API rejected it → one clean message.
  if (!token.trim() || state?.kind === "invalid") {
    return <PortalNotice tone="error" title={t("invalidLink")} />;
  }

  if (state === null) {
    return <PortalNotice title={t("loading")} />;
  }

  if (state.kind === "no_api") {
    return (
      <PortalNotice title={t("previewTitle")}>
        {t("previewBody")}
      </PortalNotice>
    );
  }

  if (state.kind === "error") {
    return (
      <PortalNotice tone="error" title={t("errorTitle")}>
        {t("errorBody")}
      </PortalNotice>
    );
  }

  return <PortalView rental={state.data} token={token} />;
}

/* ── The signed-in view: details card + two action forms ─────────────────── */

function PortalView({ rental, token }: { rental: PortalRental; token: string }) {
  const t = useTranslations("portal");
  const statusLabel = useStatusLabel();
  const variant = statusVariant(rental.status);
  const label = statusLabel(rental.status);
  const greeting = rental.customerFirstName?.trim();

  return (
    <>
      <Reveal className="section-head">
        <Kicker>{t("kicker")}</Kicker>
        <h2 className="h-section">
          {greeting ? t("headingNamed", { name: greeting }) : t("heading")}
        </h2>
        <p className="lead">
          {t("lead")}
        </p>
      </Reveal>

      <Reveal>
        <article className="card" style={{ maxWidth: 560, margin: "8px auto 0" }}>
          <div style={{ padding: "26px 24px 22px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <span
                className="l"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-dim)",
                }}
              >
                {rental.hasRental ? t("rentalStatus") : t("bookingStatus")}
              </span>
              <span className={`model-badge ${variant}`} style={{ position: "static" }}>
                {label}
              </span>
            </div>

            <div className="summary-row">
              <span className="l">{t("reference")}</span>
              <span className="v mono">{rental.reference}</span>
            </div>
            <div className="summary-row">
              <span className="l">{t("bike")}</span>
              <span className="v">{rental.modelName}</span>
            </div>
            <div className="summary-row">
              <span className="l">{t("plan")}</span>
              <span className="v">{rental.planTerm}</span>
            </div>
            <div className="summary-row">
              <span className="l">{t("city")}</span>
              <span className="v">{rental.cityName}</span>
            </div>
            {rental.pickup && (
              <div className="summary-row">
                <span className="l">{t("pickup")}</span>
                <span className="v">{rental.pickup}</span>
              </div>
            )}
            <div className="summary-row">
              <span className="l">{t("startDate")}</span>
              <span className="v">{rental.startDate ?? t("toBeConfirmed")}</span>
            </div>
            {rental.plannedEndDate && (
              <div className="summary-row">
                <span className="l">{t("plannedEnd")}</span>
                <span className="v">{rental.plannedEndDate}</span>
              </div>
            )}
            <div className="summary-row" style={{ borderBottom: "none" }}>
              <span className="l">{t("assignedBike")}</span>
              <span className="v mono">{rental.unitCode ?? t("notYetAssigned")}</span>
            </div>
          </div>
        </article>
      </Reveal>

      <Reveal delay={80}>
        <div
          style={{
            display: "grid",
            gap: 18,
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            maxWidth: 560,
            margin: "18px auto 0",
          }}
        >
          <RepairForm token={token} />
          <SupportForm token={token} />
        </div>
      </Reveal>

      <p
        className="lead"
        style={{ maxWidth: 560, margin: "18px auto 0", textAlign: "center", fontSize: 14 }}
      >
        {t("needElsePrefix")}{" "}
        <Link href="/faq" style={{ color: "var(--lime)" }}>
          {t("needElseLink")}
        </Link>
        .
      </p>
    </>
  );
}

/* ── Action forms ─────────────────────────────────────────────────────────── */

type SubmitState = "idle" | "sending" | "ok" | "error";

function RepairForm({ token }: { token: string }) {
  const t = useTranslations("portal");
  const tEnum = useTranslations("enums");
  const [issueType, setIssueType] = useState<(typeof ISSUE_TYPE_VALUES)[number]>(ISSUE_TYPE_VALUES[0]);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || status === "sending") return;
    setStatus("sending");
    const res = await requestRepair(token, { issueType, description: description.trim() });
    if (res.kind === "ok") {
      setStatus("ok");
      setMessage(res.data.message);
      setDescription("");
    } else {
      setStatus("error");
      setMessage(res.kind === "invalid" ? t("invalidLink") : t("sendFailed"));
    }
  };

  return (
    <article className="card">
      <form onSubmit={onSubmit} style={{ padding: "22px 22px 20px" }}>
        <h3 style={{ fontSize: 18, letterSpacing: "-0.02em", marginBottom: 4 }}>{t("repair.heading")}</h3>
        <p className="lead" style={{ fontSize: 13.5, marginBottom: 18 }}>
          {t("repair.lead")}
        </p>

        <div className="field" style={{ marginBottom: 14 }}>
          <label htmlFor="issueType">{t("repair.issueType")}</label>
          <select
            id="issueType"
            value={issueType}
            onChange={(e) => setIssueType(e.target.value as (typeof ISSUE_TYPE_VALUES)[number])}
            style={selectStyle}
          >
            {ISSUE_TYPE_VALUES.map((value) => (
              <option key={value} value={value}>
                {tEnum(`issueType.${issueTypeKey[value]}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="field" style={{ marginBottom: 16 }}>
          <label htmlFor="repairDesc">{t("repair.descLabel")}</label>
          <textarea
            id="repairDesc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder={t("repair.descPlaceholder")}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={status === "sending" || !description.trim()}
          style={
            status === "sending" || !description.trim()
              ? { opacity: 0.5, cursor: "not-allowed" }
              : undefined
          }
        >
          {status === "sending" ? t("sending") : t("repair.submit")}
          {status !== "sending" && (
            <span className="arrow">
              <Ic.arrow />
            </span>
          )}
        </button>

        <FormFeedback status={status} message={message} />
      </form>
    </article>
  );
}

function SupportForm({ token }: { token: string }) {
  const t = useTranslations("portal");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<SubmitState>("idle");
  const [feedback, setFeedback] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || status === "sending") return;
    setStatus("sending");
    const res = await contactSupport(token, message.trim());
    if (res.kind === "ok") {
      setStatus("ok");
      setFeedback(res.data.message);
      setMessage("");
    } else {
      setStatus("error");
      setFeedback(res.kind === "invalid" ? t("invalidLink") : t("sendFailed"));
    }
  };

  return (
    <article className="card">
      <form onSubmit={onSubmit} style={{ padding: "22px 22px 20px" }}>
        <h3 style={{ fontSize: 18, letterSpacing: "-0.02em", marginBottom: 4 }}>{t("support.heading")}</h3>
        <p className="lead" style={{ fontSize: 13.5, marginBottom: 18 }}>
          {t("support.lead")}
        </p>

        <div className="field" style={{ marginBottom: 16 }}>
          <label htmlFor="supportMsg">{t("support.msgLabel")}</label>
          <textarea
            id="supportMsg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder={t("support.msgPlaceholder")}
          />
        </div>

        <button
          type="submit"
          className="btn btn-ghost btn-block"
          disabled={status === "sending" || !message.trim()}
          style={
            status === "sending" || !message.trim()
              ? { opacity: 0.5, cursor: "not-allowed" }
              : undefined
          }
        >
          {status === "sending" ? t("sending") : t("support.submit")}
        </button>

        <FormFeedback status={status} message={feedback} />
      </form>
    </article>
  );
}

function FormFeedback({ status, message }: { status: SubmitState; message: string }) {
  if (status === "ok") {
    return (
      <p
        role="status"
        style={{
          marginTop: 14,
          fontSize: 13.5,
          color: "var(--lime)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Ic.check s={14} />
        {message}
      </p>
    );
  }
  if (status === "error") {
    return (
      <p className="wizard-err" role="status">
        {message}
      </p>
    );
  }
  return null;
}

/* ── Shared notice (loading / invalid / preview / error) ─────────────────── */

function PortalNotice({
  title,
  children,
  tone = "neutral",
}: {
  title: string;
  children?: React.ReactNode;
  tone?: "neutral" | "error";
}) {
  const t = useTranslations("portal");
  return (
    <Reveal>
      <article className="card" style={{ maxWidth: 520, margin: "8px auto 0" }}>
        <div style={{ padding: "30px 26px", textAlign: "center" }}>
          <Kicker muted>{t("kicker")}</Kicker>
          <h2 className="h-section" style={{ fontSize: 26, marginTop: 6, marginBottom: 10 }}>
            {title}
          </h2>
          {children && (
            <p className="lead" style={{ margin: "0 auto", fontSize: 14.5 }}>
              {children}
            </p>
          )}
          {tone === "error" && (
            <p className="lead" style={{ margin: "16px auto 0", fontSize: 14 }}>
              {t("errorHelpPrefix")}{" "}
              <Link href="/booking/status" style={{ color: "var(--lime)" }}>
                {t("errorHelpLink")}
              </Link>{" "}
              {t("errorHelpSuffix")}
            </p>
          )}
        </div>
      </article>
    </Reveal>
  );
}
