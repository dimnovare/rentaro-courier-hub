"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";
import {
  getRental,
  requestRepair,
  contactSupport,
  getRewards,
  type PortalRental,
  type PortalReward,
  type PortalResult,
} from "@/services/portalService";
import {
  getContract,
  startSigning,
  contractDocumentUrl,
  type PortalContract,
  type ContractResult,
} from "@/services/contractService";
import { createBookingPayment } from "@/services/paymentService";
import {
  startIdentityVerification,
  pollIdentitySession,
  type IdentityMethod,
  type IdentityCountry,
  type StartIdentityPayload,
} from "@/services/identityService";
import type { SiteSettings } from "@/services/settingsService";

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

export function ManageRental({ settings }: { settings: SiteSettings }) {
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

  return <PortalView rental={state.data} token={token} settings={settings} />;
}

/* ── The signed-in view: details card + two action forms ─────────────────── */

function PortalView({
  rental,
  token,
  settings,
}: {
  rental: PortalRental;
  token: string;
  settings: SiteSettings;
}) {
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

      {settings.showOnlineSigning && (
        <Reveal delay={54}>
          <p
            className="lead"
            style={{ maxWidth: 560, margin: "18px auto 0", fontSize: 14, color: "var(--text-muted)" }}
          >
            {t("signNote")}
          </p>
        </Reveal>
      )}

      <ContractCard token={token} showOnlineSigning={settings.showOnlineSigning} />

      {settings.showPayConfirm && (
        <PayCard
          bookingId={rental.bookingId ?? rental.reference}
          paymentStatus={rental.paymentStatus ?? null}
        />
      )}

      <RewardsCard token={token} />

      {settings.showReferAcourier && <ReferralCard code={rental.reference} />}

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

/* ── Earned rewards card ──────────────────────────────────────────────────── */

/**
 * Shows referral rewards earned by or for this customer. Only visible when at
 * least one reward exists — nothing is rendered if the list is empty or loading.
 */
function RewardsCard({ token }: { token: string }) {
  const t = useTranslations("portal");
  const [rewards, setRewards] = useState<PortalReward[] | null>(null);

  useEffect(() => {
    getRewards(token).then((r) => {
      if (r.kind === "ok" && r.data.length > 0) setRewards(r.data);
    });
  }, [token]);

  if (!rewards) return null;

  return (
    <Reveal delay={65}>
      <article className="card" style={{ maxWidth: 560, margin: "18px auto 0" }}>
        <div style={{ padding: "24px 24px 22px" }}>
          <h3 style={{ fontSize: 18, letterSpacing: "-0.02em", marginBottom: 4 }}>
            {t("rewards.heading")}
          </h3>
          <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {rewards.map((rw) => (
              <li key={rw.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: "var(--r-sm)", background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                    {rw.description ?? t("rewards.defaultDescription")}
                  </p>
                  <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                    {t(`rewards.role.${rw.role}`)}
                    {" · "}
                    {rw.daysAwarded != null ? t("rewards.days", { count: rw.daysAwarded }) : null}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    padding: "4px 10px",
                    borderRadius: "var(--r-sm)",
                    background: rw.status === "applied" ? "rgba(163,230,53,0.12)" : "rgba(255,255,255,0.06)",
                    color: rw.status === "applied" ? "var(--lime)" : "var(--text-muted)",
                  }}
                >
                  {t(`rewards.status.${rw.status}`)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </article>
    </Reveal>
  );
}

/* ── Referral share card ──────────────────────────────────────────────────── */

/**
 * "Refer a courier" card. Builds a shareable, attributable link
 * `{siteUrl}/?ref={code}` from the current origin and the booking reference, and
 * offers copy-to-clipboard. No payout logic here — the `?ref=` is captured when
 * a referred rider books. The origin is read on the client to stay SSR-safe.
 */
function ReferralCard({ code }: { code: string }) {
  const t = useTranslations("portal");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const link = `${origin}/?ref=${encodeURIComponent(code)}`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. insecure context) — leave the link visible to copy by hand.
    }
  };

  return (
    <Reveal delay={70}>
      <article className="card" style={{ maxWidth: 560, margin: "18px auto 0" }}>
        <div style={{ padding: "24px 24px 22px" }}>
          <h3 style={{ fontSize: 18, letterSpacing: "-0.02em", marginBottom: 4 }}>
            {t("referral.heading")}
          </h3>
          <p className="lead" style={{ fontSize: 13.5, marginBottom: 18 }}>
            {t("referral.lead")}
          </p>

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "stretch",
              flexWrap: "wrap",
            }}
          >
            <input
              readOnly
              value={link}
              aria-label={t("referral.linkLabel")}
              onFocus={(e) => e.currentTarget.select()}
              style={{
                flex: "1 1 220px",
                minWidth: 0,
                boxSizing: "border-box",
                padding: "13px 15px",
                borderRadius: "var(--r-sm)",
                background: "var(--bg-2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
              }}
            />
            <button type="button" className="btn btn-primary" onClick={onCopy}>
              {copied ? t("referral.copied") : t("referral.copy")}
              {!copied && (
                <span className="arrow">
                  <Ic.arrow />
                </span>
              )}
            </button>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

/* ── Identity verification card ──────────────────────────────────────────── */

/**
 * Card sequenced before the contract card. Drives a Smart-ID / Mobile-ID
 * identity verification session directly from the portal token.
 *
 * States
 * ------
 * `choose`   – method selection (Smart-ID / Mobile-ID) — shown when no record
 * `form`     – input form (personal code + country [+ phone for Mobile-ID])
 * `waiting`  – 4-digit verification code displayed; polling every 2 s
 * `verified` – success; collapses to a small chip
 * `failed`   – failure; shows reason + retry button
 */

type IdentityCardState =
  | { phase: "choose" }
  | { phase: "form"; method: IdentityMethod }
  | { phase: "waiting"; method: IdentityMethod; verificationCode: string; sessionId: string }
  | { phase: "verified"; verifiedName: string }
  | { phase: "failed"; reason: string };

function IdentityCard({
  token,
  initialStatus,
  initialVerifiedName,
}: {
  token: string;
  initialStatus: "none" | "pending" | "verified" | "failed";
  initialVerifiedName: string | null;
}) {
  const t = useTranslations("portal");

  const [state, setState] = useState<IdentityCardState>(() => {
    if (initialStatus === "verified" && initialVerifiedName) {
      return { phase: "verified", verifiedName: initialVerifiedName };
    }
    if (initialStatus === "verified") {
      return { phase: "verified", verifiedName: "" };
    }
    if (initialStatus === "failed") {
      return { phase: "failed", reason: "" };
    }
    // "pending" or "none" → start fresh (pending session from previous page load expired)
    return { phase: "choose" };
  });

  // ── form state ──────────────────────────────────────────────────────────
  const [personalCode, setPersonalCode] = useState("");
  const [country, setCountry] = useState<IdentityCountry>("EE");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── polling ─────────────────────────────────────────────────────────────
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => {
    // Clean up on unmount.
    return () => stopPolling();
  }, []);

  function startPolling(sessionId: string) {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const res = await pollIdentitySession(token, sessionId);
      if (res.kind !== "ok") return; // transient network error — keep polling
      const { status, verifiedName, reason } = res.data;
      if (status === "pending") return; // still waiting

      stopPolling();
      if (status === "verified") {
        setState({ phase: "verified", verifiedName: verifiedName ?? "" });
      } else {
        // "failed" | "expired"
        setState({ phase: "failed", reason: reason ?? "" });
      }
    }, 2000);
  }

  // ── handlers ─────────────────────────────────────────────────────────────

  function onSelectMethod(method: IdentityMethod) {
    setFormError(null);
    setPersonalCode("");
    setPhone("");
    setState({ phase: "form", method });
  }

  async function onSubmitForm(method: IdentityMethod) {
    if (submitting) return;
    if (!personalCode.trim()) {
      setFormError(t("identity.personalCodeLabel"));
      return;
    }
    setFormError(null);
    setSubmitting(true);

    const payload: StartIdentityPayload = {
      method,
      personalCode: personalCode.trim(),
      country,
      ...(method === "mobile-id" ? { phoneNumber: phone.trim() } : {}),
    };

    const res = await startIdentityVerification(token, payload);
    setSubmitting(false);

    if (res.kind === "ok") {
      const { verificationCode, sessionId } = res.data;
      setState({ phase: "waiting", method, verificationCode, sessionId });
      startPolling(sessionId);
    } else if (res.kind === "error") {
      setFormError(res.reason ?? t("identity.failedTitle"));
    } else {
      setFormError(t("identity.failedTitle"));
    }
  }

  function onRetry() {
    stopPolling();
    setFormError(null);
    setState({ phase: "choose" });
  }

  // ── collapsed "done" chip ────────────────────────────────────────────────
  if (state.phase === "verified") {
    const name = state.verifiedName;
    return (
      <Reveal delay={55}>
        <div
          style={{
            maxWidth: 560,
            margin: "18px auto 0",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderRadius: "var(--r-sm)",
            background: "rgba(163,230,53,0.08)",
            border: "1px solid rgba(163,230,53,0.25)",
          }}
        >
          <span style={{ color: "var(--lime)", display: "flex", alignItems: "center" }}>
            <Ic.check s={14} />
          </span>
          <span style={{ fontSize: 13.5, color: "var(--lime)", fontWeight: 600 }}>
            {name
              ? t("identity.doneChip") + " — " + name
              : t("identity.doneChip")}
          </span>
        </div>
      </Reveal>
    );
  }

  // ── method selection ─────────────────────────────────────────────────────
  if (state.phase === "choose") {
    return (
      <Reveal delay={55}>
        <article className="card" style={{ maxWidth: 560, margin: "18px auto 0" }}>
          <div style={{ padding: "24px 24px 22px" }}>
            <h3 style={{ fontSize: 18, letterSpacing: "-0.02em", marginBottom: 6 }}>
              {t("identity.title")}
            </h3>
            <p className="lead" style={{ fontSize: 13.5, marginBottom: 20 }}>
              {t("identity.subtitle")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => onSelectMethod("smart-id")}
              >
                {t("identity.methodSmart")}
                <span className="arrow"><Ic.arrow /></span>
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-block"
                onClick={() => onSelectMethod("mobile-id")}
              >
                {t("identity.methodMobile")}
                <span className="arrow"><Ic.arrow /></span>
              </button>
            </div>
          </div>
        </article>
      </Reveal>
    );
  }

  // ── input form ───────────────────────────────────────────────────────────
  if (state.phase === "form") {
    const { method } = state;
    return (
      <Reveal delay={55}>
        <article className="card" style={{ maxWidth: 560, margin: "18px auto 0" }}>
          <div style={{ padding: "24px 24px 22px" }}>
            <h3 style={{ fontSize: 18, letterSpacing: "-0.02em", marginBottom: 6 }}>
              {method === "smart-id" ? t("identity.methodSmart") : t("identity.methodMobile")}
            </h3>

            <div className="field" style={{ marginBottom: 14 }}>
              <label htmlFor="idPersonalCode">{t("identity.personalCodeLabel")}</label>
              <input
                id="idPersonalCode"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={personalCode}
                onChange={(e) => setPersonalCode(e.target.value)}
                placeholder="38010085718"
              />
            </div>

            <div className="field" style={{ marginBottom: 14 }}>
              <label htmlFor="idCountry">{t("identity.countryLabel")}</label>
              <select
                id="idCountry"
                value={country}
                onChange={(e) => setCountry(e.target.value as IdentityCountry)}
                style={selectStyle}
              >
                <option value="EE">{t("identity.countries.ee")}</option>
                <option value="LV">{t("identity.countries.lv")}</option>
                <option value="LT">{t("identity.countries.lt")}</option>
              </select>
            </div>

            {method === "mobile-id" && (
              <div className="field" style={{ marginBottom: 14 }}>
                <label htmlFor="idPhone">{t("identity.phoneLabel")}</label>
                <input
                  id="idPhone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+372 XXXX XXXX"
                />
              </div>
            )}

            {formError && (
              <p className="wizard-err" role="status" style={{ marginBottom: 12 }}>
                {formError}
              </p>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: "0 0 auto" }}
                onClick={onRetry}
              >
                ←
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, opacity: submitting ? 0.5 : 1, cursor: submitting ? "not-allowed" : undefined }}
                disabled={submitting}
                onClick={() => void onSubmitForm(method)}
              >
                {submitting ? "…" : t("identity.verifyBtn")}
                {!submitting && <span className="arrow"><Ic.arrow /></span>}
              </button>
            </div>
          </div>
        </article>
      </Reveal>
    );
  }

  // ── waiting for app approval ─────────────────────────────────────────────
  if (state.phase === "waiting") {
    const { verificationCode } = state;
    return (
      <Reveal delay={55}>
        <article className="card" style={{ maxWidth: 560, margin: "18px auto 0" }}>
          <div style={{ padding: "28px 24px 26px", textAlign: "center" }}>
            <h3 style={{ fontSize: 18, letterSpacing: "-0.02em", marginBottom: 6 }}>
              {t("identity.waitingTitle")}
            </h3>
            <p className="lead" style={{ fontSize: 13.5, marginBottom: 22 }}>
              {t("identity.waitingSubtitle")}
            </p>

            {/* Verification code — large, monospace, lime, inside a bordered box */}
            <div
              style={{
                display: "inline-block",
                padding: "18px 32px",
                borderRadius: "var(--r-sm)",
                border: "2px solid var(--lime)",
                background: "rgba(163,230,53,0.06)",
                marginBottom: 22,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 32,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  color: "var(--lime)",
                }}
              >
                {verificationCode}
              </span>
            </div>

            {/* Spinner */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                color: "var(--text-dim)",
                fontSize: 13.5,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 16,
                  height: 16,
                  border: "2px solid var(--border)",
                  borderTopColor: "var(--lime)",
                  borderRadius: "50%",
                  animation: "spin 0.9s linear infinite",
                }}
              />
              {t("identity.waitingSubtitle")}
            </div>

            {/* Inline keyframe style — safe in client component */}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </article>
      </Reveal>
    );
  }

  // ── failed ────────────────────────────────────────────────────────────────
  // state.phase === "failed"
  return (
    <Reveal delay={55}>
      <article className="card" style={{ maxWidth: 560, margin: "18px auto 0" }}>
        <div style={{ padding: "24px 24px 22px" }}>
          <h3 style={{ fontSize: 18, letterSpacing: "-0.02em", marginBottom: 6, color: "var(--text)" }}>
            {t("identity.failedTitle")}
          </h3>
          <p className="lead" style={{ fontSize: 13.5, marginBottom: 18 }}>
            {state.reason
              ? t("identity.failedSubtitle") + " — " + state.reason + "."
              : t("identity.failedSubtitle") + "."}
          </p>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={onRetry}
          >
            {t("identity.retryBtn")}
            <span className="arrow"><Ic.arrow /></span>
          </button>
        </div>
      </article>
    </Reveal>
  );
}

/* ── Rental contract card ─────────────────────────────────────────────────── */

/** Map a contract status (PascalCase enum name) to a badge variant. */
function contractStatusVariant(status: string): "popular" | "cargo" | "light" {
  switch (status) {
    case "Signed":
      return "popular";
    case "SentForSignature":
    case "Viewed":
    case "Generated":
      return "cargo";
    default:
      return "light";
  }
}

/**
 * "Rental contract" card. Fetches the contract via the portal token. Hides
 * itself entirely until a contract exists (the backend 404s before generation).
 * When unsigned and a signing provider is configured, offers a sign button that
 * starts signing then opens the provider URL; when signed, offers a download.
 */
function ContractCard({
  token,
  showOnlineSigning,
}: {
  token: string;
  showOnlineSigning: boolean;
}) {
  const t = useTranslations("contract");
  const tPortal = useTranslations("portal");
  const [state, setState] = useState<ContractResult<PortalContract> | null>(null);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  // Manual (on-paper) signing acknowledgement — only used when online signing is off.
  const [manualAgreed, setManualAgreed] = useState(false);

  const load = useCallback(async () => {
    setState(await getContract(token));
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  // Hide the card entirely while loading, when there's no contract yet, or on a
  // soft failure — the rest of the portal still works without it.
  if (state === null || state.kind === "none" || state.kind === "invalid") return null;
  if (state.kind === "no_api" || state.kind === "error" || state.kind === "not_configured") return null;

  const contract = state.data;
  const variant = contractStatusVariant(contract.status);
  const isSigned = contract.status === "Signed" || contract.hasSignedPdf;

  async function onSign() {
    if (signing) return;
    setSigning(true);
    setSignError(null);
    const res = await startSigning(token);
    if (res.kind === "ok" && res.data.signingUrl) {
      // Same-tab navigation: async window.open is blocked by popup blockers;
      // Dokobit redirects the user back after signing so same-tab is correct.
      window.location.href = res.data.signingUrl;
    } else if (res.kind === "not_configured") {
      // Provider went away between load and click — reflect it inline.
      setState({ kind: "ok", data: { ...contract, providerConfigured: false } });
    } else {
      setSignError(t("signFailed"));
    }
    setSigning(false);
  }

  return (
    <Reveal delay={60}>
      <article className="card" style={{ maxWidth: 560, margin: "18px auto 0" }}>
        <div style={{ padding: "24px 24px 22px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <h3 style={{ fontSize: 18, letterSpacing: "-0.02em" }}>{t("heading")}</h3>
            <span className={`model-badge ${variant}`} style={{ position: "static" }}>
              {t(`status.${contract.status}`)}
            </span>
          </div>

          <p className="lead" style={{ fontSize: 13.5, marginBottom: 18 }}>
            {isSigned
              ? t("signedLead")
              : !showOnlineSigning
                ? tPortal("signing.manualTitle")
                : contract.providerConfigured
                  ? t("unsignedLead")
                  : t("notAvailableLead")}
          </p>

          {isSigned ? (
            contract.hasSignedPdf ? (
              <a
                href={contractDocumentUrl(token, "signed")}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-block"
                style={{ textDecoration: "none" }}
              >
                {t("downloadSigned")}
                <span className="arrow">
                  <Ic.arrow />
                </span>
              </a>
            ) : null
          ) : !showOnlineSigning ? (
            /* Online signing disabled → sign on paper at handover. Offer a
               required acknowledgement plus a link to read the contract now. */
            <>
              {contract.hasGeneratedPdf && (
                <a
                  href={contractDocumentUrl(token, "generated")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-block"
                  style={{ textDecoration: "none", marginBottom: 14 }}
                >
                  {tPortal("contract.readInAdvance")}
                  <span className="arrow">
                    <Ic.arrow />
                  </span>
                </a>
              )}
              <label
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  cursor: "pointer",
                  fontSize: 13.5,
                  color: "var(--text)",
                }}
              >
                <input
                  type="checkbox"
                  required
                  checked={manualAgreed}
                  onChange={(e) => setManualAgreed(e.target.checked)}
                  style={{ marginTop: 3, accentColor: "var(--lime)", flex: "0 0 auto" }}
                />
                <span>{tPortal("signing.manualAgree")}</span>
              </label>
            </>
          ) : contract.providerConfigured ? (
            <>
              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled={signing}
                onClick={onSign}
                style={signing ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              >
                {signing ? t("opening") : t("sign")}
                {!signing && (
                  <span className="arrow">
                    <Ic.arrow />
                  </span>
                )}
              </button>
              {signError && (
                <p className="wizard-err" role="status">
                  {signError}
                </p>
              )}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginTop: 14,
                  flexWrap: "wrap",
                }}
              >
                <img src="/payment/smart-id.svg" alt="Smart-ID" height={11} style={{ width: "auto", maxWidth: 64, borderRadius: 3 }} />
                <img src="/payment/mobile-id.svg" alt="Mobile-ID" height={11} style={{ width: "auto", maxWidth: 64, borderRadius: 3 }} />
              </div>
            </>
          ) : (
            <p
              className="mono"
              style={{
                fontSize: 12,
                color: "var(--text-dim)",
                letterSpacing: "0.02em",
                margin: 0,
              }}
            >
              {t("notAvailableNote")}
            </p>
          )}
        </div>
      </article>
    </Reveal>
  );
}

/* ── Pay & confirm card ───────────────────────────────────────────────────── */

/**
 * "Pay & confirm your rental" card. This is the single payment moment in the
 * whole flow: it appears only after the booking is approved and the contract is
 * accepted/signed, and charges the first 30-day period + the refundable deposit.
 *
 * Behaviour by `paymentStatus`:
 * - `paid` → show a "Paid ✓" confirmation, no action.
 * - `pending` / `pending_manual` / `null` → show the Pay action. Clicking calls
 *   `POST /api/payments/booking/{bookingId}`: a `checkoutUrl` (Montonio) is
 *   redirected to; otherwise (manual / PendingManual, e.g. Montonio not yet
 *   live) we tell the rider payment is arranged at pickup.
 *
 * The card hides itself when there's nothing payable to show (no booking id, or
 * status null with no manual fallback surfaced yet) so it never appears before
 * the rider has been approved and accepted their contract.
 */
function PayCard({
  bookingId,
  paymentStatus,
}: {
  bookingId: string;
  paymentStatus: "paid" | "pending" | "pending_manual" | null;
}) {
  const t = useTranslations("pay");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Once a manual/PendingManual response comes back, surface the "arranged at
  // pickup" note even if the server's stored status was still generic.
  const [manual, setManual] = useState(paymentStatus === "pending_manual");

  const isPaid = paymentStatus === "paid";
  const showManual = manual || paymentStatus === "pending_manual";
  const canPay = !isPaid && !!bookingId.trim();

  async function onPay() {
    if (busy || !canPay) return;
    setBusy(true);
    setError(null);
    try {
      const res = await createBookingPayment(bookingId);
      if (res.checkoutUrl) {
        // Montonio configured → hand off to hosted checkout.
        window.location.href = res.checkoutUrl;
        return;
      }
      // No online checkout (Montonio not live) → arrange at pickup.
      setManual(true);
    } catch {
      setError(t("failed"));
    }
    setBusy(false);
  }

  // Nothing to show until the rider is in the payment stage.
  if (!isPaid && !canPay && !showManual) return null;

  const variant = isPaid ? "popular" : "cargo";

  return (
    <Reveal delay={62}>
      <article className="card" style={{ maxWidth: 560, margin: "18px auto 0" }}>
        <div style={{ padding: "24px 24px 22px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <h3 style={{ fontSize: 18, letterSpacing: "-0.02em" }}>{t("heading")}</h3>
            <span className={`model-badge ${variant}`} style={{ position: "static" }}>
              {isPaid ? t("statusPaid") : t("statusDue")}
            </span>
          </div>

          <p className="lead" style={{ fontSize: 13.5, marginBottom: 18 }}>
            {isPaid ? t("paidLead") : showManual ? t("manualLead") : t("dueLead")}
          </p>

          {isPaid ? (
            <p
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                color: "var(--lime)",
                margin: 0,
              }}
            >
              <Ic.check s={14} />
              {t("paidConfirm")}
            </p>
          ) : showManual ? (
            <p
              className="mono"
              style={{
                fontSize: 12,
                color: "var(--text-dim)",
                letterSpacing: "0.02em",
                margin: 0,
              }}
            >
              {t("manualNote")}
            </p>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled={busy}
                onClick={onPay}
                style={busy ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              >
                {busy ? t("opening") : t("pay")}
                {!busy && (
                  <span className="arrow">
                    <Ic.arrow />
                  </span>
                )}
              </button>
              {error && (
                <p className="wizard-err" role="status">
                  {error}
                </p>
              )}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginTop: 14,
                  flexWrap: "wrap",
                }}
              >
                <img src="/payment/montonio.svg" alt="Montonio" height={11} style={{ width: "auto", maxWidth: 64, borderRadius: 3 }} />
                <img src="/payment/visa.svg" alt="Visa" height={11} style={{ width: "auto", maxWidth: 64, borderRadius: 3 }} />
                <img src="/payment/mastercard.svg" alt="Mastercard" height={11} style={{ width: "auto", maxWidth: 64, borderRadius: 3 }} />
              </div>
            </>
          )}
        </div>
      </article>
    </Reveal>
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
