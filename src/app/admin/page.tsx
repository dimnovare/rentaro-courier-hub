"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getAdminBookings,
  getAdminFleet,
  getAdminMaintenance,
  AdminApiError,
  AdminConfigError,
  type AdminBooking,
  type AdminFleet,
  type AdminMaintenanceTicket,
} from "@/services/adminService";
import { BookingsTable } from "@/components/admin/BookingsTable";
import { FleetView } from "@/components/admin/FleetView";
import { MaintenanceTable } from "@/components/admin/MaintenanceTable";
import { AdminSection } from "@/components/admin/Table";

const TOKEN_KEY = "rentaro_admin_token";

interface DashboardData {
  bookings: AdminBooking[];
  fleet: AdminFleet;
  maintenance: AdminMaintenanceTicket[];
}

type LoadState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "ready"; data: DashboardData }
  | { phase: "error"; message: string; unauthorized: boolean; config: boolean };

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [state, setState] = useState<LoadState>({ phase: "idle" });

  // Restore a saved token on mount (client-only).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TOKEN_KEY);
      if (saved) setToken(saved);
    } catch {
      /* localStorage may be unavailable; gate stays closed. */
    }
  }, []);

  const load = useCallback(async (t: string) => {
    setState({ phase: "loading" });
    try {
      const [bookings, fleet, maintenance] = await Promise.all([
        getAdminBookings(t),
        getAdminFleet(t),
        getAdminMaintenance(t),
      ]);
      setState({ phase: "ready", data: { bookings, fleet, maintenance } });
    } catch (err) {
      if (err instanceof AdminConfigError) {
        setState({ phase: "error", message: err.message, unauthorized: false, config: true });
      } else if (err instanceof AdminApiError) {
        setState({
          phase: "error",
          message: err.message,
          unauthorized: err.unauthorized,
          config: false,
        });
      } else {
        setState({
          phase: "error",
          message: "Something went wrong loading admin data.",
          unauthorized: false,
          config: false,
        });
      }
    }
  }, []);

  // Fetch whenever we have a token.
  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

  function connect() {
    const t = draft.trim();
    if (!t) return;
    try {
      localStorage.setItem(TOKEN_KEY, t);
    } catch {
      /* ignore persistence failure — still connect for this session. */
    }
    setToken(t);
  }

  function signOut() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    setToken(null);
    setDraft("");
    setState({ phase: "idle" });
  }

  const connected = Boolean(token);

  return (
    <main className="wrap" style={{ paddingTop: 40, paddingBottom: 80, minHeight: "70vh" }}>
      <Header connected={connected} onRefresh={() => token && load(token)} onSignOut={signOut} />

      {!connected ? (
        <TokenGate
          draft={draft}
          onDraft={setDraft}
          onConnect={connect}
        />
      ) : state.phase === "loading" || state.phase === "idle" ? (
        <Notice>Loading admin data…</Notice>
      ) : state.phase === "error" ? (
        <ErrorPanel
          message={state.message}
          unauthorized={state.unauthorized}
          config={state.config}
          onReenter={signOut}
          onRetry={() => token && load(token)}
        />
      ) : (
        <>
          <AdminSection title="Bookings" count={state.data.bookings.length}>
            <BookingsTable bookings={state.data.bookings} />
          </AdminSection>

          <AdminSection
            title="Fleet"
            count={state.data.fleet.models.length + state.data.fleet.units.length}
          >
            <FleetView fleet={state.data.fleet} />
          </AdminSection>

          <AdminSection title="Maintenance" count={state.data.maintenance.length}>
            <MaintenanceTable tickets={state.data.maintenance} />
          </AdminSection>
        </>
      )}
    </main>
  );
}

/* ── Pieces ────────────────────────────────────────────────────────────── */

function Header({
  connected,
  onRefresh,
  onSignOut,
}: {
  connected: boolean;
  onRefresh: () => void;
  onSignOut: () => void;
}) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        paddingBottom: 24,
        marginBottom: 32,
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div>
        <h1 style={{ fontSize: 26, letterSpacing: "-0.03em" }}>
          rentaro <span style={{ color: "var(--text-dim)" }}>·</span>{" "}
          <span style={{ color: "var(--lime)" }}>admin</span>
        </h1>
        <p className="mono" style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 6 }}>
          Read-only operations view
        </p>
      </div>
      {connected && (
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn btn-ghost" style={{ padding: "11px 18px", fontSize: 13.5 }} onClick={onRefresh}>
            Refresh
          </button>
          <button type="button" className="btn btn-ghost" style={{ padding: "11px 18px", fontSize: 13.5 }} onClick={onSignOut}>
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}

function TokenGate({
  draft,
  onDraft,
  onConnect,
}: {
  draft: string;
  onDraft: (v: string) => void;
  onConnect: () => void;
}) {
  return (
    <div className="card" style={{ padding: 32, maxWidth: 460 }}>
      <h2 style={{ fontSize: 20, letterSpacing: "-0.02em", marginBottom: 6 }}>Connect</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 22, lineHeight: 1.6 }}>
        Paste your admin token to view bookings, fleet and maintenance. The token is stored only
        in this browser.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onConnect();
        }}
      >
        <div className="field">
          <label htmlFor="admin-token">Admin token</label>
          <input
            id="admin-token"
            type="password"
            autoComplete="off"
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            placeholder="X-Admin-Token"
          />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={!draft.trim()} style={{ marginTop: 4 }}>
          Connect
        </button>
      </form>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="card mono" style={{ padding: 28, color: "var(--text-muted)", fontSize: 13 }}>
      {children}
    </div>
  );
}

function ErrorPanel({
  message,
  unauthorized,
  config,
  onReenter,
  onRetry,
}: {
  message: string;
  unauthorized: boolean;
  config: boolean;
  onReenter: () => void;
  onRetry: () => void;
}) {
  return (
    <div
      className="card"
      style={{
        padding: 28,
        maxWidth: 520,
        borderColor: "rgba(255, 138, 120, 0.32)",
        background: "linear-gradient(180deg, rgba(255,138,120,0.06), rgba(255,255,255,0.02))",
      }}
    >
      <div className="mono" style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--danger)", marginBottom: 10 }}>
        {config ? "Not configured" : unauthorized ? "Unauthorized" : "Error"}
      </div>
      <p style={{ color: "var(--text-2)", fontSize: 14.5, margin: "0 0 20px", lineHeight: 1.6 }}>{message}</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {unauthorized ? (
          <button type="button" className="btn btn-primary" onClick={onReenter} style={{ padding: "12px 22px", fontSize: 14 }}>
            Re-enter token
          </button>
        ) : config ? null : (
          <button type="button" className="btn btn-primary" onClick={onRetry} style={{ padding: "12px 22px", fontSize: 14 }}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
