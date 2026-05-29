"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  adminLogin,
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

const TOKEN_KEY = "rentaro_admin_jwt";

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
  const [state, setState] = useState<LoadState>({ phase: "idle" });

  // Login form state.
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Restore a saved JWT on mount (client-only).
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

  async function signIn() {
    const u = username.trim();
    if (!u || !password || signingIn) return;
    setSigningIn(true);
    setLoginError(null);
    try {
      const jwt = await adminLogin(u, password);
      try {
        localStorage.setItem(TOKEN_KEY, jwt);
      } catch {
        /* ignore persistence failure — still sign in for this session. */
      }
      setPassword("");
      setToken(jwt);
    } catch (err) {
      if (err instanceof AdminConfigError) {
        setLoginError(err.message);
      } else if (err instanceof AdminApiError) {
        setLoginError(err.message);
      } else {
        setLoginError("Something went wrong signing in.");
      }
    } finally {
      setSigningIn(false);
    }
  }

  function signOut() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    setToken(null);
    setUsername("");
    setPassword("");
    setLoginError(null);
    setState({ phase: "idle" });
  }

  const connected = Boolean(token);

  return (
    <main className="wrap" style={{ paddingTop: 40, paddingBottom: 80, minHeight: "70vh" }}>
      <Header connected={connected} onRefresh={() => token && load(token)} onSignOut={signOut} />

      {connected && <AdminNav />}

      {!connected ? (
        <LoginGate
          username={username}
          password={password}
          onUsername={setUsername}
          onPassword={setPassword}
          onSubmit={signIn}
          submitting={signingIn}
          error={loginError}
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

function AdminNav() {
  const links: [string, string][] = [
    ["Manage bookings", "/admin/bookings"],
    ["Manage fleet", "/admin/fleet"],
    ["Manage maintenance", "/admin/maintenance"],
  ];
  return (
    <nav style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 30 }}>
      {links.map(([label, href]) => (
        <Link
          key={href}
          href={href}
          className="btn btn-ghost"
          style={{ padding: "10px 18px", fontSize: 13.5 }}
        >
          {label} →
        </Link>
      ))}
    </nav>
  );
}

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

function LoginGate({
  username,
  password,
  onUsername,
  onPassword,
  onSubmit,
  submitting,
  error,
}: {
  username: string;
  password: string;
  onUsername: (v: string) => void;
  onPassword: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  return (
    <div className="card" style={{ padding: 32, maxWidth: 460 }}>
      <h2 style={{ fontSize: 20, letterSpacing: "-0.02em", marginBottom: 6 }}>Sign in</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 22, lineHeight: 1.6 }}>
        Sign in with your admin credentials to view bookings, fleet and maintenance. Your session
        is stored only in this browser.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="field">
          <label htmlFor="admin-username">Username</label>
          <input
            id="admin-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => onUsername(e.target.value)}
            placeholder="admin"
          />
        </div>
        <div className="field">
          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => onPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        {error && (
          <p
            className="mono"
            style={{ color: "var(--danger)", fontSize: 12.5, margin: "0 0 16px", lineHeight: 1.5 }}
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={!username.trim() || !password || submitting}
          style={{ marginTop: 4 }}
        >
          {submitting ? "Signing in…" : "Sign in"}
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
            Sign in again
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
