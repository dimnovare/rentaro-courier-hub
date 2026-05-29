"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";
import {
  lookupBookingStatus,
  type BookingStatus,
  type LookupResult,
} from "@/services/bookingStatusService";

/** Map the API status (lowercased enum name) to a friendly label + badge tone. */
const STATUS_META: Record<string, { label: string; variant: "popular" | "cargo" | "light" }> = {
  submitted: { label: "Submitted", variant: "cargo" },
  awaitingreview: { label: "Awaiting review", variant: "cargo" },
  approved: { label: "Approved", variant: "popular" },
  rejected: { label: "Not approved", variant: "light" },
  cancelled: { label: "Cancelled", variant: "light" },
};

function statusMeta(status: string) {
  return STATUS_META[status.toLowerCase()] ?? { label: status, variant: "light" as const };
}

export function BookingStatusLookup() {
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
        <Kicker>Track your booking</Kicker>
        <h2 className="h-section">Check your reservation status.</h2>
        <p className="lead">
          Enter the booking reference from your confirmation to see your model, plan, city and
          start date. No login needed — keep your reference handy.
        </p>
      </Reveal>

      <Reveal>
        <article className="card" style={{ maxWidth: 520, margin: "8px auto 0" }}>
          <div style={{ padding: "26px 24px 22px" }}>
            <form onSubmit={onSubmit}>
              <div className="field" style={{ marginBottom: 14 }}>
                <label htmlFor="ref">Booking reference</label>
                <input
                  id="ref"
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  placeholder="e.g. 3f9a1c20-…"
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
                {loading ? "Checking…" : "Check status"}
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
          Can&apos;t find your reference?{" "}
          <Link href="/book" style={{ color: "var(--lime)" }}>
            Start a new reservation
          </Link>
          .
        </p>
      </Reveal>
    </>
  );
}

function StatusResult({ result }: { result: LookupResult }) {
  if (result.kind === "ok") return <StatusCard data={result.data} />;

  if (result.kind === "not_found") {
    return (
      <p className="wizard-err" role="status">
        No booking found for that reference. Double-check the code from your confirmation email.
      </p>
    );
  }

  if (result.kind === "no_api") {
    return (
      <p className="lead" role="status" style={{ fontSize: 14 }}>
        Status lookup is in preview — connect the rentaro API to track live bookings.
      </p>
    );
  }

  return (
    <p className="wizard-err" role="status">
      Something went wrong looking that up. Please try again in a moment.
    </p>
  );
}

function StatusCard({ data }: { data: BookingStatus }) {
  const meta = statusMeta(data.status);
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
          Status
        </span>
        <span className={`model-badge ${meta.variant}`} style={{ position: "static" }}>
          {meta.label}
        </span>
      </div>

      <div className="summary-row">
        <span className="l">Reference</span>
        <span className="v mono">{data.reference}</span>
      </div>
      <div className="summary-row">
        <span className="l">Model</span>
        <span className="v">{data.modelName}</span>
      </div>
      <div className="summary-row">
        <span className="l">Plan</span>
        <span className="v">{data.planTerm}</span>
      </div>
      <div className="summary-row">
        <span className="l">City</span>
        <span className="v">{data.cityName}</span>
      </div>
      <div className="summary-row" style={{ borderBottom: "none" }}>
        <span className="l">Start date</span>
        <span className="v">{data.preferredStartDate ?? "To be confirmed"}</span>
      </div>
    </div>
  );
}
