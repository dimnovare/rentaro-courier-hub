"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

/** Map the API status (lowercased enum name) to a friendly label + badge tone. */
const STATUS_META: Record<string, { label: string; variant: "popular" | "cargo" | "light" }> = {
  // Booking statuses (before a bike is assigned)
  submitted: { label: "Submitted", variant: "cargo" },
  awaitingreview: { label: "Awaiting review", variant: "cargo" },
  approved: { label: "Approved", variant: "popular" },
  rejected: { label: "Not approved", variant: "light" },
  cancelled: { label: "Cancelled", variant: "light" },
  paymentpending: { label: "Payment pending", variant: "cargo" },
  bikeassigned: { label: "Bike assigned", variant: "popular" },
  completed: { label: "Completed", variant: "light" },
  // Rental statuses (once active)
  active: { label: "Active", variant: "popular" },
  endingsoon: { label: "Ending soon", variant: "cargo" },
  returned: { label: "Returned", variant: "light" },
  closed: { label: "Closed", variant: "light" },
  overdue: { label: "Overdue", variant: "light" },
};

function statusMeta(status: string) {
  return STATUS_META[status.toLowerCase()] ?? { label: status, variant: "light" as const };
}

/** Issue types — values match the backend MaintenanceIssueType enum (parsed case-insensitively). */
const ISSUE_TYPES: { value: string; label: string }[] = [
  { value: "Puncture", label: "Puncture / flat tyre" },
  { value: "Brakes", label: "Brakes" },
  { value: "Battery", label: "Battery" },
  { value: "Motor", label: "Motor" },
  { value: "Lock", label: "Lock" },
  { value: "Charger", label: "Charger" },
  { value: "GeneralService", label: "General service" },
  { value: "Accident", label: "Accident / crash damage" },
];

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
    return <PortalNotice tone="error" title="This link is invalid or expired." />;
  }

  if (state === null) {
    return <PortalNotice title="Loading your rental…" />;
  }

  if (state.kind === "no_api") {
    return (
      <PortalNotice title="Portal preview">
        Your rental portal is in preview — connect the rentaro API to manage live rentals.
      </PortalNotice>
    );
  }

  if (state.kind === "error") {
    return (
      <PortalNotice tone="error" title="Something went wrong.">
        We couldn&apos;t load your rental just now. Please refresh in a moment.
      </PortalNotice>
    );
  }

  return <PortalView rental={state.data} token={token} />;
}

/* ── The signed-in view: details card + two action forms ─────────────────── */

function PortalView({ rental, token }: { rental: PortalRental; token: string }) {
  const meta = statusMeta(rental.status);
  const greeting = rental.customerFirstName?.trim();

  return (
    <>
      <Reveal className="section-head">
        <Kicker>Manage your rental</Kicker>
        <h2 className="h-section">
          {greeting ? `Hi ${greeting} — here's your rental.` : "Here's your rental."}
        </h2>
        <p className="lead">
          View your details, report an issue with your bike or message the team. No login needed —
          this page is tied to the secure link from your confirmation email.
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
                {rental.hasRental ? "Rental status" : "Booking status"}
              </span>
              <span className={`model-badge ${meta.variant}`} style={{ position: "static" }}>
                {meta.label}
              </span>
            </div>

            <div className="summary-row">
              <span className="l">Reference</span>
              <span className="v mono">{rental.reference}</span>
            </div>
            <div className="summary-row">
              <span className="l">Bike</span>
              <span className="v">{rental.modelName}</span>
            </div>
            <div className="summary-row">
              <span className="l">Plan</span>
              <span className="v">{rental.planTerm}</span>
            </div>
            <div className="summary-row">
              <span className="l">City</span>
              <span className="v">{rental.cityName}</span>
            </div>
            {rental.pickup && (
              <div className="summary-row">
                <span className="l">Pickup</span>
                <span className="v">{rental.pickup}</span>
              </div>
            )}
            <div className="summary-row">
              <span className="l">Start date</span>
              <span className="v">{rental.startDate ?? "To be confirmed"}</span>
            </div>
            {rental.plannedEndDate && (
              <div className="summary-row">
                <span className="l">Planned end</span>
                <span className="v">{rental.plannedEndDate}</span>
              </div>
            )}
            <div className="summary-row" style={{ borderBottom: "none" }}>
              <span className="l">Assigned bike</span>
              <span className="v mono">{rental.unitCode ?? "Not yet assigned"}</span>
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
        Need something else?{" "}
        <Link href="/faq" style={{ color: "var(--lime)" }}>
          Check the FAQ
        </Link>
        .
      </p>
    </>
  );
}

/* ── Action forms ─────────────────────────────────────────────────────────── */

type SubmitState = "idle" | "sending" | "ok" | "error";

function RepairForm({ token }: { token: string }) {
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0]!.value);
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
      setMessage(
        res.kind === "invalid"
          ? "This link is invalid or expired."
          : "Couldn't send that just now. Please try again.",
      );
    }
  };

  return (
    <article className="card">
      <form onSubmit={onSubmit} style={{ padding: "22px 22px 20px" }}>
        <h3 style={{ fontSize: 18, letterSpacing: "-0.02em", marginBottom: 4 }}>Request a repair</h3>
        <p className="lead" style={{ fontSize: 13.5, marginBottom: 18 }}>
          Something not right with your bike? Tell us and our service team will follow up.
        </p>

        <div className="field" style={{ marginBottom: 14 }}>
          <label htmlFor="issueType">Issue type</label>
          <select
            id="issueType"
            value={issueType}
            onChange={(e) => setIssueType(e.target.value)}
            style={selectStyle}
          >
            {ISSUE_TYPES.map((it) => (
              <option key={it.value} value={it.value}>
                {it.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field" style={{ marginBottom: 16 }}>
          <label htmlFor="repairDesc">What&apos;s wrong?</label>
          <textarea
            id="repairDesc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="e.g. Rear brake feels loose and squeaks."
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
          {status === "sending" ? "Sending…" : "Send repair request"}
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
      setFeedback(
        res.kind === "invalid"
          ? "This link is invalid or expired."
          : "Couldn't send that just now. Please try again.",
      );
    }
  };

  return (
    <article className="card">
      <form onSubmit={onSubmit} style={{ padding: "22px 22px 20px" }}>
        <h3 style={{ fontSize: 18, letterSpacing: "-0.02em", marginBottom: 4 }}>Contact support</h3>
        <p className="lead" style={{ fontSize: 13.5, marginBottom: 18 }}>
          A question about your plan, pickup or anything else? Send us a message.
        </p>

        <div className="field" style={{ marginBottom: 16 }}>
          <label htmlFor="supportMsg">Your message</label>
          <textarea
            id="supportMsg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="How can we help?"
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
          {status === "sending" ? "Sending…" : "Send message"}
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
  return (
    <Reveal>
      <article className="card" style={{ maxWidth: 520, margin: "8px auto 0" }}>
        <div style={{ padding: "30px 26px", textAlign: "center" }}>
          <Kicker muted>Manage your rental</Kicker>
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
              Check the link in your confirmation email, or{" "}
              <Link href="/booking/status" style={{ color: "var(--lime)" }}>
                track your booking
              </Link>{" "}
              instead.
            </p>
          )}
        </div>
      </article>
    </Reveal>
  );
}
