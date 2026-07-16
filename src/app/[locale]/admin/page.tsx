"use client";

/**
 * Admin dashboard — the console overview and daily starting point. No sign-in
 * gate of its own: the shell (src/app/[locale]/admin/layout.tsx → AdminShell)
 * handles auth and chrome, and this page reads the token from useAdminAuth and
 * renders an at-a-glance ops view:
 *
 *   - greeting + quick actions
 *   - headline est. monthly revenue
 *   - metric cards grouped by concern: Fleet · Rentals · Pipeline — cards that
 *     map to a workqueue link straight to the relevant admin page, and the
 *     numbers that need action (ending soon / overdue / awaiting bike / open
 *     maintenance) light up warn/danger when > 0
 *   - recent bookings + a prioritised "Needs attention" triage list
 *
 * All figures come from GET /api/admin/metrics via adminMetricsService (see the
 * shared ops contract). A 401 anywhere calls signOut() so the shell drops back
 * to the sign-in screen.
 */
import type { CSSProperties, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { useAdminRefresh } from "@/components/admin/useAdminRefresh";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusPill } from "@/components/admin/StatusPill";
import { fmtDate } from "@/components/admin/Table";
import {
  getMetrics,
  AdminConfigError as MetricsConfigError,
  AdminMetricsApiError,
  type AdminMetrics,
} from "@/services/adminMetricsService";
import {
  getAdminBookings,
  AdminApiError,
  AdminConfigError,
  type AdminBooking,
} from "@/services/adminService";

interface DashData {
  metrics: AdminMetrics | null;
  bookings: AdminBooking[];
}

type LoadState =
  | { phase: "loading" }
  | { phase: "ready"; data: DashData }
  | { phase: "error"; message: string; config: boolean };

export default function AdminDashboardPage() {
  const { authenticated, signOut } = useAdminAuth();
  const [state, setState] = useState<LoadState>({ phase: "loading" });

  const load = useCallback(async () => {
    if (!authenticated) return;
    setState({ phase: "loading" });
    try {
      // Metrics and bookings are independent; a failure in metrics shouldn't
      // hide the recent-bookings list and vice versa.
      const [metricsRes, bookingsRes] = await Promise.allSettled([
        getMetrics(),
        getAdminBookings(),
      ]);

      // Surface a 401 from either call as a session drop.
      for (const r of [metricsRes, bookingsRes]) {
        if (
          r.status === "rejected" &&
          (r.reason instanceof AdminMetricsApiError || r.reason instanceof AdminApiError) &&
          r.reason.unauthorized
        ) {
          signOut();
          return;
        }
      }

      // If the API base URL isn't configured, both fail the same way — show it.
      if (
        metricsRes.status === "rejected" &&
        bookingsRes.status === "rejected" &&
        (metricsRes.reason instanceof MetricsConfigError ||
          bookingsRes.reason instanceof AdminConfigError)
      ) {
        const reason =
          metricsRes.reason instanceof MetricsConfigError
            ? metricsRes.reason
            : bookingsRes.reason;
        setState({ phase: "error", message: (reason as Error).message, config: true });
        return;
      }

      setState({
        phase: "ready",
        data: {
          metrics: metricsRes.status === "fulfilled" ? metricsRes.value : null,
          bookings: bookingsRes.status === "fulfilled" ? bookingsRes.value : [],
        },
      });
    } catch (err) {
      setState({
        phase: "error",
        message: err instanceof Error ? err.message : "Could not load the dashboard.",
        config: false,
      });
    }
  }, [authenticated, signOut]);

  useEffect(() => {
    void load();
  }, [load]);

  useAdminRefresh(load);

  const metrics = state.phase === "ready" ? state.data.metrics : null;
  const recent = state.phase === "ready" ? recentBookings(state.data.bookings) : [];
  const pendingCount = countPending(state.phase === "ready" ? state.data.bookings : []);

  return (
    <div>
      <PageHeader
        title={`${greeting()}, operator`}
        subtitle={`${today()} · live fleet & bookings overview`}
      >
        <div className="admin-quick">
          <Link href="/admin/bookings" className="primary">
            Review bookings
          </Link>
          <Link href="/admin/fleet" className="ghost">
            Fleet
          </Link>
          <Link href="/admin/calendar" className="ghost">
            Calendar
          </Link>
          <Link href="/admin/maintenance" className="ghost">
            New ticket
          </Link>
        </div>
      </PageHeader>

      {state.phase === "error" && state.config ? (
        <ConfigNotice message={state.message} />
      ) : (
        <>
          {state.phase === "loading" ? (
            <div
              className="card mono"
              style={{ padding: 22, color: "var(--text-dim)", fontSize: 12, marginBottom: 30 }}
            >
              Loading metrics…
            </div>
          ) : metrics ? (
            <OpsMetrics metrics={metrics} pending={pendingCount} />
          ) : (
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
              Metrics are unavailable right now. Booking data below is still current.
            </div>
          )}

          <div className="admin-grid cols-2">
            {/* Recent bookings */}
            <section className="card admin-panel">
              <div className="admin-panel-head">
                <h2>Recent bookings</h2>
                <Link href="/admin/bookings">Manage →</Link>
              </div>
              {state.phase === "loading" ? (
                <p className="admin-empty">Loading…</p>
              ) : recent.length === 0 ? (
                <p className="admin-empty">No bookings yet.</p>
              ) : (
                <div className="admin-recent">
                  {recent.map((b) => (
                    <div className="admin-recent-row" key={b.id}>
                      <div className="who">
                        <span className="nm">
                          {b.customerFirstName} {b.customerLastName}
                        </span>
                        <span className="meta">
                          {b.cityId} · {b.modelId} · {b.planId}
                        </span>
                      </div>
                      <StatusPill value={b.status} />
                      <span className="when">{fmtDate(b.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Alerts */}
            <section className="card admin-panel">
              <div className="admin-panel-head">
                <h2>Needs attention</h2>
              </div>
              {state.phase === "loading" ? (
                <p className="admin-empty">Loading…</p>
              ) : (
                <Alerts metrics={metrics} pending={pendingCount} />
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Ops metrics: headline revenue + grouped cards ─────────────────────── */

function OpsMetrics({ metrics, pending }: { metrics: AdminMetrics; pending: number }) {
  const m = readMetrics(metrics, pending);

  return (
    <div style={{ marginBottom: 30 }}>
      {/* Headline: estimated monthly recurring revenue. */}
      <div
        className="card"
        style={{
          padding: "22px 24px",
          marginBottom: 22,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 18,
          flexWrap: "wrap",
          borderColor: "rgba(216, 255, 54, 0.24)",
          background: "linear-gradient(180deg, rgba(216,255,54,0.05), rgba(255,255,255,0.015))",
        }}
      >
        <div>
          <div
            className="mono"
            style={{
              fontSize: 10.5,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: 8,
            }}
          >
            Est. monthly revenue
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 44,
              lineHeight: 1,
              letterSpacing: "-0.03em",
              color: "var(--lime)",
            }}
          >
            {euro(m.estMonthlyRevenueEur)}
          </div>
        </div>
        <div className="mono" style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.6 }}>
          {m.activeRentals} active {m.activeRentals === 1 ? "rental" : "rentals"}
          <br />
          recurring · {m.currency}
        </div>
      </div>

      {/* Fleet */}
      <MetricGroup title="Fleet">
        <StatCard label="Available" value={m.availableBikes} href="/admin/fleet" tone="good" />
        <StatCard label="Rented" value={m.rentedBikes} href="/admin/fleet" />
        <StatCard
          label="Incoming"
          value={m.incomingBikes}
          href="/admin/fleet"
          hint="on order"
          tone={m.incomingBikes > 0 ? "info" : "default"}
        />
        <StatCard
          label="Maintenance"
          value={m.maintenanceOpen}
          href="/admin/maintenance"
          tone={m.maintenanceOpen > 0 ? "danger" : "default"}
        />
      </MetricGroup>

      {/* Rentals */}
      <MetricGroup title="Rentals">
        <StatCard label="Active" value={m.activeRentals} href="/admin/rentals" />
        <StatCard
          label="Ending soon"
          value={m.endingSoon}
          href="/admin/rentals"
          hint="within 7 days"
          tone={m.endingSoon > 0 ? "warn" : "default"}
        />
        <StatCard
          label="Overdue"
          value={m.overdue}
          href="/admin/rentals"
          hint="past planned end"
          tone={m.overdue > 0 ? "danger" : "default"}
        />
      </MetricGroup>

      {/* Pipeline */}
      <MetricGroup title="Pipeline">
        <StatCard
          label="Pending bookings"
          value={m.pendingBookings}
          href="/admin/bookings"
          hint="to review"
          tone={m.pendingBookings > 0 ? "warn" : "default"}
        />
        <StatCard
          label="Awaiting bike"
          value={m.awaitingBike}
          href="/admin/bookings"
          hint="approved, no unit"
          tone={m.awaitingBike > 0 ? "warn" : "default"}
        />
      </MetricGroup>
    </div>
  );
}

function MetricGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <h2
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          fontWeight: 500,
          marginBottom: 12,
        }}
      >
        {title}
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 14,
        }}
      >
        {children}
      </div>
    </section>
  );
}

type CardTone = "default" | "good" | "warn" | "danger" | "info";

/** One metric tile. When `href` is set the whole card is a link to that
 *  workqueue, with a "View →" cue. `tone` colours the number (and tints the
 *  card for warn/danger) so figures needing action stand out. */
function StatCard({
  label,
  value,
  href,
  tone = "default",
  hint,
}: {
  label: string;
  value: number;
  href?: string;
  tone?: CardTone;
  hint?: string;
}) {
  const numberColor =
    tone === "good"
      ? "var(--lime)"
      : tone === "warn"
        ? "var(--warn)"
        : tone === "danger"
          ? "var(--danger)"
          : tone === "info"
            ? "var(--blue)"
            : "var(--text)";

  const cardStyle: CSSProperties = {
    padding: 18,
    display: "block",
    textDecoration: "none",
    ...(tone === "warn"
      ? {
          borderColor: "rgba(255, 198, 90, 0.3)",
          background: "linear-gradient(180deg, rgba(255,198,90,0.05), rgba(255,255,255,0.015))",
        }
      : tone === "danger"
        ? {
            borderColor: "rgba(255, 138, 120, 0.32)",
            background: "linear-gradient(180deg, rgba(255,138,120,0.05), rgba(255,255,255,0.015))",
          }
        : {}),
  };

  const inner = (
    <>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 30,
          lineHeight: 1.05,
          letterSpacing: "-0.03em",
          color: numberColor,
        }}
      >
        {value.toLocaleString("en-US")}
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
      <div
        className="mono"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginTop: 8,
          fontSize: 10,
          color: "var(--text-dim)",
          minHeight: 12,
        }}
      >
        <span>{hint ?? ""}</span>
        {href && <span style={{ color: "var(--text-muted)" }}>View →</span>}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="card" style={cardStyle}>
        {inner}
      </Link>
    );
  }
  return (
    <div className="card" style={cardStyle}>
      {inner}
    </div>
  );
}

/* ── Alerts ────────────────────────────────────────────────────────────── */

function Alerts({ metrics, pending }: { metrics: AdminMetrics | null; pending: number }) {
  const m = metrics ? readMetrics(metrics, pending) : null;

  // Prioritised triage: only surface what actually needs an operator now.
  const rows: { tone: "warn" | "bad"; n: number; title: string; sub: string; href: string }[] = [];
  if (m) {
    if (m.overdue > 0)
      rows.push({ tone: "bad", n: m.overdue, title: "Overdue rentals", sub: "past planned end — chase return", href: "/admin/rentals" });
    if (m.maintenanceOpen > 0)
      rows.push({ tone: "bad", n: m.maintenanceOpen, title: "Open maintenance", sub: "tickets needing action", href: "/admin/maintenance" });
    if (m.awaitingBike > 0)
      rows.push({ tone: "warn", n: m.awaitingBike, title: "Awaiting bike", sub: "approved bookings, no unit assigned", href: "/admin/bookings" });
    if (m.pendingBookings > 0)
      rows.push({ tone: "warn", n: m.pendingBookings, title: "Bookings to review", sub: "awaiting approval / assignment", href: "/admin/bookings" });
    if (m.endingSoon > 0)
      rows.push({ tone: "warn", n: m.endingSoon, title: "Rentals ending soon", sub: "within 7 days — plan the return", href: "/admin/rentals" });
  } else if (pending > 0) {
    // Metrics unavailable — still surface the pending count we derived locally.
    rows.push({ tone: "warn", n: pending, title: "Bookings to review", sub: "awaiting approval / assignment", href: "/admin/bookings" });
  }

  if (rows.length === 0) {
    return (
      <div className="admin-alert calm">
        <span className="n">✓</span>
        <div className="body">
          <span className="t">All clear</span>
          <span className="s">nothing needs action right now</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {rows.map((r) => (
        <AlertRow key={r.title} tone={r.tone} n={r.n} title={r.title} sub={r.sub} href={r.href} />
      ))}
    </div>
  );
}

function AlertRow({
  tone,
  n,
  title,
  sub,
  href,
}: {
  tone: "warn" | "bad" | "calm";
  n: number;
  title: string;
  sub: string;
  href: string;
}) {
  return (
    <div className={`admin-alert ${tone}`}>
      <span className="n">{n}</span>
      <div className="body">
        <span className="t">{title}</span>
        <span className="s">{sub}</span>
      </div>
      <Link href={href} className="go">
        View →
      </Link>
    </div>
  );
}

function ConfigNotice({ message }: { message: string }) {
  return (
    <div
      className="card"
      style={{
        padding: 28,
        maxWidth: 560,
        borderColor: "rgba(255, 138, 120, 0.32)",
        background: "linear-gradient(180deg, rgba(255,138,120,0.06), rgba(255,255,255,0.02))",
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--danger)",
          marginBottom: 10,
        }}
      >
        Not configured
      </div>
      <p style={{ color: "var(--text-2)", fontSize: 14.5, margin: 0, lineHeight: 1.6 }}>{message}</p>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

/** Resolve the dashboard figures from the metrics DTO. The backend returns a
 *  superset (see the ops contract): prefer the newer action-oriented field
 *  names, falling back to the legacy names so an older backend still renders.
 *  `pending` is the precise pending count derived from the bookings list; it
 *  wins over the metrics figure when non-zero. */
function readMetrics(m: AdminMetrics, pending: number) {
  const n = (v: number | undefined | null): number => (typeof v === "number" ? v : 0);
  return {
    estMonthlyRevenueEur: n(m.estMonthlyRevenueEur ?? m.mrrEstimate),
    currency: m.currency ?? "EUR",
    activeRentals: n(m.activeRentals),
    endingSoon: n(m.endingSoon ?? m.bikesReturningSoon),
    overdue: n(m.overdue),
    awaitingBike: n(m.awaitingBike),
    availableBikes: n(m.availableBikes ?? m.bikesAvailable),
    rentedBikes: n(m.rentedBikes ?? m.bikesRented),
    incomingBikes: n(m.incomingBikes),
    maintenanceOpen: n(m.maintenanceOpen ?? m.openMaintenance),
    pendingBookings: pending || n(m.pendingBookings),
  };
}

/** Format a number as a euro amount with no decimals (e.g. €1,234). */
function euro(n: number): string {
  return `€${Math.round(n).toLocaleString("en-US")}`;
}

/** Bookings still awaiting an operator decision. */
function countPending(bookings: AdminBooking[]): number {
  return bookings.filter((b) => /^(submitted|awaitingreview)$/i.test(b.status)).length;
}

/** Newest five bookings by createdAt. */
function recentBookings(bookings: AdminBooking[]): AdminBooking[] {
  return [...bookings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function today(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
