"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  listBookings,
  listUnitCodes,
  updateStatus,
  assignUnit,
  BookingApiError,
  BookingConfigError,
  type AdminBooking,
  type AdminFleetUnit,
} from "@/services/adminBookingService";
import { AdminTable, Th, Td, EmptyRow, AdminSection, fmtDate, fmtDay } from "@/components/admin/Table";
import { StatusPill } from "@/components/admin/StatusPill";

const TOKEN_KEY = "rentaro_admin_jwt";

interface PageData {
  bookings: AdminBooking[];
  units: AdminFleetUnit[];
}

type LoadState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "ready"; data: PageData }
  | { phase: "error"; message: string; unauthorized: boolean; config: boolean };

export default function AdminBookingsPage() {
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [state, setState] = useState<LoadState>({ phase: "idle" });
  const [banner, setBanner] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  // Detect a saved JWT on mount (client-only). The service reads it again per
  // request; this just decides whether to show the table or the sign-in prompt.
  useEffect(() => {
    try {
      setHasToken(Boolean(localStorage.getItem(TOKEN_KEY)));
    } catch {
      setHasToken(false);
    }
  }, []);

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    try {
      const [bookings, units] = await Promise.all([listBookings(), listUnitCodes()]);
      setState({ phase: "ready", data: { bookings, units } });
    } catch (err) {
      if (err instanceof BookingConfigError) {
        setState({ phase: "error", message: err.message, unauthorized: false, config: true });
      } else if (err instanceof BookingApiError) {
        setState({ phase: "error", message: err.message, unauthorized: err.unauthorized, config: false });
      } else {
        setState({ phase: "error", message: "Something went wrong loading bookings.", unauthorized: false, config: false });
      }
    }
  }, []);

  useEffect(() => {
    if (hasToken) void load();
  }, [hasToken, load]);

  // Run a mutating action, surface a banner, then refresh the table.
  const runAction = useCallback(
    async (action: () => Promise<void>, okText: string) => {
      setBanner(null);
      try {
        await action();
        setBanner({ tone: "ok", text: okText });
        await load();
      } catch (err) {
        const text =
          err instanceof BookingApiError || err instanceof BookingConfigError
            ? err.message
            : "Action failed.";
        setBanner({ tone: "bad", text });
        // A 401 means the session died mid-action — drop to the error view.
        if (err instanceof BookingApiError && err.unauthorized) {
          setState({ phase: "error", message: err.message, unauthorized: true, config: false });
        }
      }
    },
    [load],
  );

  return (
    <main className="wrap" style={{ paddingTop: 40, paddingBottom: 80, minHeight: "70vh" }}>
      <Header onRefresh={hasToken ? () => void load() : undefined} />

      {hasToken === null ? (
        <Notice>Loading…</Notice>
      ) : !hasToken ? (
        <SignInPrompt />
      ) : state.phase === "loading" || state.phase === "idle" ? (
        <Notice>Loading bookings…</Notice>
      ) : state.phase === "error" ? (
        <ErrorPanel
          message={state.message}
          unauthorized={state.unauthorized}
          config={state.config}
          onRetry={() => void load()}
        />
      ) : (
        <>
          {banner && (
            <div
              className="mono"
              role="status"
              style={{
                marginBottom: 18,
                padding: "11px 15px",
                borderRadius: "var(--r-sm)",
                fontSize: 12.5,
                color: banner.tone === "ok" ? "var(--lime)" : "var(--danger)",
                background: banner.tone === "ok" ? "rgba(216,255,54,0.08)" : "rgba(255,138,120,0.08)",
                border: `1px solid ${banner.tone === "ok" ? "rgba(216,255,54,0.3)" : "rgba(255,138,120,0.32)"}`,
              }}
            >
              {banner.text}
            </div>
          )}

          <AdminSection title="Bookings" count={state.data.bookings.length}>
            <BookingsManageTable
              bookings={state.data.bookings}
              units={state.data.units}
              onApprove={(id) =>
                runAction(async () => {
                  await updateStatus(id, "approved");
                }, "Booking approved.")
              }
              onReject={(id) =>
                runAction(async () => {
                  await updateStatus(id, "rejected");
                }, "Booking rejected.")
              }
              onAssign={(id, code) =>
                runAction(async () => {
                  await assignUnit(id, code);
                }, `Assigned ${code} and started a rental.`)
              }
            />
          </AdminSection>
        </>
      )}
    </main>
  );
}

/* ── Table with per-row actions ────────────────────────────────────────── */

function BookingsManageTable({
  bookings,
  units,
  onApprove,
  onReject,
  onAssign,
}: {
  bookings: AdminBooking[];
  units: AdminFleetUnit[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onAssign: (id: string, code: string) => void;
}) {
  return (
    <AdminTable>
      <thead>
        <tr>
          <Th>Created</Th>
          <Th>Status</Th>
          <Th>Customer</Th>
          <Th>City</Th>
          <Th>Model</Th>
          <Th>Plan</Th>
          <Th>Start</Th>
          <Th>Actions</Th>
        </tr>
      </thead>
      <tbody>
        {bookings.length === 0 ? (
          <EmptyRow colSpan={8} label="No bookings yet." />
        ) : (
          bookings.map((b) => (
            <tr key={b.id}>
              <Td mono nowrap>
                {fmtDate(b.createdAt)}
              </Td>
              <Td nowrap>
                <StatusPill value={b.status} />
              </Td>
              <Td>
                <div>
                  {b.customerFirstName} {b.customerLastName}
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                  {b.customerEmail}
                </div>
              </Td>
              <Td mono>{b.cityId}</Td>
              <Td mono>{b.modelId}</Td>
              <Td mono>{b.planId}</Td>
              <Td mono nowrap>
                {fmtDay(b.preferredStartDate)}
              </Td>
              <Td>
                <RowActions
                  units={units}
                  onApprove={() => onApprove(b.id)}
                  onReject={() => onReject(b.id)}
                  onAssign={(code) => onAssign(b.id, code)}
                />
              </Td>
            </tr>
          ))
        )}
      </tbody>
    </AdminTable>
  );
}

function RowActions({
  units,
  onApprove,
  onReject,
  onAssign,
}: {
  units: AdminFleetUnit[];
  onApprove: () => void;
  onReject: () => void;
  onAssign: (code: string) => void;
}) {
  const [code, setCode] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 200 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary" style={miniBtn} onClick={onApprove}>
          Approve
        </button>
        <button type="button" className="btn btn-ghost" style={miniBtn} onClick={onReject}>
          Reject
        </button>
      </div>
      <form
        style={{ display: "flex", gap: 8, alignItems: "center" }}
        onSubmit={(e) => {
          e.preventDefault();
          if (code) onAssign(code);
        }}
      >
        <select value={code} onChange={(e) => setCode(e.target.value)} style={selectStyle} aria-label="Bike unit">
          <option value="">Assign bike…</option>
          {units.map((u) => (
            <option key={u.internalCode} value={u.internalCode}>
              {u.internalCode} · {u.status}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-ghost" style={miniBtn} disabled={!code}>
          Assign
        </button>
      </form>
    </div>
  );
}

/* ── Inline styles for the compact action controls ─────────────────────── */

const miniBtn: React.CSSProperties = { padding: "8px 14px", fontSize: 12.5 };

const selectStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 120,
  padding: "8px 10px",
  borderRadius: "var(--r-sm)",
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
};

/* ── Pieces ────────────────────────────────────────────────────────────── */

function Header({ onRefresh }: { onRefresh?: () => void }) {
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
          <span style={{ color: "var(--lime)" }}>bookings</span>
        </h1>
        <p className="mono" style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 6 }}>
          Approve, reject and assign bikes
        </p>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Link href="/admin" className="btn btn-ghost" style={{ padding: "11px 18px", fontSize: 13.5 }}>
          Dashboard
        </Link>
        {onRefresh && (
          <button type="button" className="btn btn-ghost" style={{ padding: "11px 18px", fontSize: 13.5 }} onClick={onRefresh}>
            Refresh
          </button>
        )}
      </div>
    </header>
  );
}

function SignInPrompt() {
  return (
    <div className="card" style={{ padding: 32, maxWidth: 460 }}>
      <h2 style={{ fontSize: 20, letterSpacing: "-0.02em", marginBottom: 6 }}>Sign in required</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 22, lineHeight: 1.6 }}>
        Sign in on the admin home to manage bookings.
      </p>
      <Link href="/admin" className="btn btn-primary" style={{ padding: "12px 22px", fontSize: 14 }}>
        Go to admin home
      </Link>
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
  onRetry,
}: {
  message: string;
  unauthorized: boolean;
  config: boolean;
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
      <div
        className="mono"
        style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--danger)", marginBottom: 10 }}
      >
        {config ? "Not configured" : unauthorized ? "Unauthorized" : "Error"}
      </div>
      <p style={{ color: "var(--text-2)", fontSize: 14.5, margin: "0 0 20px", lineHeight: 1.6 }}>{message}</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {unauthorized ? (
          <Link href="/admin" className="btn btn-primary" style={{ padding: "12px 22px", fontSize: 14 }}>
            Sign in again
          </Link>
        ) : config ? null : (
          <button type="button" className="btn btn-primary" onClick={onRetry} style={{ padding: "12px 22px", fontSize: 14 }}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
