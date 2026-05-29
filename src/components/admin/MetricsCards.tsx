"use client";

/**
 * Self-contained admin metrics summary. Drop <MetricsCards /> anywhere inside
 * the authenticated admin hub — it takes no props, fetches on mount via
 * adminMetricsService (JWT read from localStorage), and renders a responsive
 * row of stat cards in the dark/lime brand style.
 *
 * Auth gating lives in the hub: if there is no token (or the API base URL is
 * unset) this component renders nothing rather than showing an error, so it is
 * always safe to mount.
 */
import { useEffect, useState } from "react";
import {
  getMetrics,
  AdminConfigError,
  AdminMetricsApiError,
  type AdminMetrics,
} from "@/services/adminMetricsService";

type State =
  | { phase: "loading" }
  | { phase: "ready"; data: AdminMetrics }
  | { phase: "error"; message: string }
  // "hidden" — no token / not configured: render nothing, the hub gates auth.
  | { phase: "hidden" };

/** Format a number as a euro amount with no decimals (e.g. €1,234). */
function euro(n: number): string {
  return `€${Math.round(n).toLocaleString("en-US")}`;
}

export function MetricsCards() {
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getMetrics();
        if (active) setState({ phase: "ready", data });
      } catch (err) {
        if (!active) return;
        if (err instanceof AdminConfigError) {
          // API base URL not set — nothing to show; stay invisible.
          setState({ phase: "hidden" });
        } else if (err instanceof AdminMetricsApiError && err.unauthorized) {
          // No token / expired — the hub's gate handles re-auth; stay invisible.
          setState({ phase: "hidden" });
        } else if (err instanceof AdminMetricsApiError) {
          setState({ phase: "error", message: err.message });
        } else {
          setState({ phase: "error", message: "Could not load metrics." });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (state.phase === "hidden") return null;

  if (state.phase === "loading") {
    return (
      <div className="card mono" style={{ padding: 22, color: "var(--text-dim)", fontSize: 12, marginBottom: 30 }}>
        Loading metrics…
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div
        className="card mono"
        style={{
          padding: 22,
          marginBottom: 30,
          fontSize: 12,
          color: "var(--danger)",
          borderColor: "rgba(255, 138, 120, 0.32)",
          background: "linear-gradient(180deg, rgba(255,138,120,0.06), rgba(255,255,255,0.02))",
        }}
      >
        {state.message}
      </div>
    );
  }

  const m = state.data;
  const cards: { label: string; value: string; accent?: boolean }[] = [
    { label: "MRR estimate", value: euro(m.mrrEstimate), accent: true },
    { label: "Active rentals", value: String(m.activeRentals) },
    { label: "Bikes available", value: String(m.bikesAvailable) },
    { label: "Bikes rented", value: String(m.bikesRented) },
    { label: "Pending bookings", value: String(m.pendingBookings) },
    { label: "Open maintenance", value: String(m.openMaintenance) },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 14,
        marginBottom: 34,
      }}
    >
      {cards.map((c) => (
        <Stat key={c.label} label={c.label} value={c.value} accent={c.accent} />
      ))}
    </div>
  );
}

/* Single stat tile — mirrors the homepage .svc-stat look (display-font lime
 * number over a mono uppercase label) on top of the shared .card surface. */
function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 30,
          lineHeight: 1.05,
          letterSpacing: "-0.03em",
          color: accent ? "var(--lime)" : "var(--text)",
        }}
      >
        {value}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 10.5,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginTop: 6,
        }}
      >
        {label}
      </div>
    </div>
  );
}

export default MetricsCards;
