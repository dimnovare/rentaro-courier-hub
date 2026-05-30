"use client";

/**
 * Admin dashboard — the console overview. No sign-in gate of its own: the shell
 * (src/app/admin/layout.tsx → AdminShell) handles auth and chrome, and this page
 * simply reads the token from useAdminAuth and renders an operator summary:
 *
 *   - greeting + quick actions
 *   - key metric cards (reused <MetricsCards />, via adminMetricsService)
 *   - recent bookings
 *   - alerts: returns due soon · open maintenance · pending bookings
 *
 * A 401 anywhere calls signOut() so the shell drops back to the sign-in screen.
 */
import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { useAdminRefresh } from "@/components/admin/useAdminRefresh";
import { MetricsCards } from "@/components/admin/MetricsCards";
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
  const { token, signOut } = useAdminAuth();
  const [state, setState] = useState<LoadState>({ phase: "loading" });

  const load = useCallback(async () => {
    if (!token) return;
    setState({ phase: "loading" });
    try {
      // Metrics and bookings are independent; a failure in metrics shouldn't
      // hide the recent-bookings list and vice versa.
      const [metricsRes, bookingsRes] = await Promise.allSettled([
        getMetrics(),
        getAdminBookings(token),
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
  }, [token, signOut]);

  useEffect(() => {
    void load();
  }, [load]);

  useAdminRefresh(load);

  const metrics = state.phase === "ready" ? state.data.metrics : null;
  const recent = state.phase === "ready" ? recentBookings(state.data.bookings) : [];
  const pendingCount = countPending(state.phase === "ready" ? state.data.bookings : []);

  return (
    <div>
      <header className="admin-dash-head">
        <div>
          <h1 className="admin-dash-greeting">{greeting()}, operator</h1>
          <p className="admin-dash-sub">{today()} · live fleet &amp; bookings overview</p>
        </div>
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
      </header>

      {state.phase === "error" && state.config ? (
        <ConfigNotice message={state.message} />
      ) : (
        <>
          {/* Key metrics — self-contained component, reads its own token. */}
          <MetricsCards />

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

/* ── Alerts ────────────────────────────────────────────────────────────── */

function Alerts({ metrics, pending }: { metrics: AdminMetrics | null; pending: number }) {
  // Prefer the precise pending count derived from the bookings list; fall back
  // to the metrics figure when bookings failed to load.
  const pendingBookings = pending || metrics?.pendingBookings || 0;
  const returningSoon = metrics?.bikesReturningSoon ?? 0;
  const openMaintenance = metrics?.openMaintenance ?? 0;

  const allClear = pendingBookings === 0 && returningSoon === 0 && openMaintenance === 0;
  if (allClear) {
    return (
      <div className="admin-alert calm">
        <span className="n">✓</span>
        <div className="body">
          <span className="t">All clear</span>
          <span className="s">no pending bookings, returns or open tickets</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AlertRow
        tone={pendingBookings > 0 ? "warn" : "calm"}
        n={pendingBookings}
        title="Bookings to review"
        sub="awaiting approval / assignment"
        href="/admin/bookings"
      />
      <AlertRow
        tone={returningSoon > 0 ? "warn" : "calm"}
        n={returningSoon}
        title="Returns due soon"
        sub="bikes scheduled back shortly"
        href="/admin/calendar"
      />
      <AlertRow
        tone={openMaintenance > 0 ? "bad" : "calm"}
        n={openMaintenance}
        title="Open maintenance"
        sub="tickets needing action"
        href="/admin/maintenance"
      />
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

/** Bookings still awaiting an operator decision. */
function countPending(bookings: AdminBooking[]): number {
  return bookings.filter((b) => /submitted|awaiting|review|pending|approved/i.test(b.status)).length;
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
