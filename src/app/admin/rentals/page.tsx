"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  listRentals,
  scheduleReturn,
  markReturned,
  inspectRental,
  extendRental,
  RentalApiError,
  RentalConfigError,
  RentalAuthError,
  type AdminRental,
} from "@/services/adminRentalService";
import { AdminTable, Th, Td, EmptyRow, AdminSection, fmtDate, fmtDay } from "@/components/admin/Table";
import { StatusPill } from "@/components/admin/StatusPill";

const TOKEN_KEY = "rentaro_admin_jwt";

/** Today as YYYY-MM-DD (local), used to seed the date inputs. */
function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** €-format a numeric amount; em-dash for nullish. */
function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `€${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

type LoadState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "ready"; rentals: AdminRental[] }
  | { phase: "no-auth" }
  | { phase: "error"; message: string; unauthorized: boolean; config: boolean };

export default function AdminRentalsPage() {
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [state, setState] = useState<LoadState>({ phase: "idle" });
  const [banner, setBanner] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  // Rental ids with an in-flight action.
  const [pending, setPending] = useState<Record<string, boolean>>({});

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
      const rentals = await listRentals();
      setState({ phase: "ready", rentals });
    } catch (err) {
      setState(toErrorState(err, "Something went wrong loading rentals."));
    }
  }, []);

  useEffect(() => {
    if (hasToken) void load();
  }, [hasToken, load]);

  // Run a mutating action for a rental, then refresh the list. A returned
  // rental (when the endpoint echoes it) is patched in optimistically before
  // the refresh so the row updates instantly.
  const runAction = useCallback(
    async (
      id: string,
      action: () => Promise<AdminRental | undefined>,
      okText: string,
    ) => {
      setBanner(null);
      setPending((p) => ({ ...p, [id]: true }));
      try {
        const updated = await action();
        if (updated) {
          setState((s) =>
            s.phase === "ready"
              ? { ...s, rentals: s.rentals.map((r) => (r.id === id ? updated : r)) }
              : s,
          );
        }
        setBanner({ tone: "ok", text: okText });
        await load();
      } catch (err) {
        if (
          err instanceof RentalAuthError ||
          (err instanceof RentalApiError && err.unauthorized)
        ) {
          setState({ phase: "no-auth" });
        } else {
          const text =
            err instanceof RentalApiError || err instanceof RentalConfigError
              ? err.message
              : "Action failed.";
          setBanner({ tone: "bad", text });
        }
      } finally {
        setPending((p) => {
          const next = { ...p };
          delete next[id];
          return next;
        });
      }
    },
    [load],
  );

  return (
    <main className="wrap" style={{ paddingTop: 40, paddingBottom: 80, minHeight: "70vh" }}>
      <Header onRefresh={hasToken && state.phase === "ready" ? () => void load() : undefined} />

      {hasToken === null ? (
        <Notice>Loading…</Notice>
      ) : !hasToken ? (
        <AuthGate />
      ) : state.phase === "loading" || state.phase === "idle" ? (
        <Notice>Loading rentals…</Notice>
      ) : state.phase === "no-auth" ? (
        <AuthGate />
      ) : state.phase === "error" ? (
        <ErrorPanel
          message={state.message}
          unauthorized={state.unauthorized}
          config={state.config}
          onRetry={() => void load()}
        />
      ) : (
        <>
          {banner && <Banner tone={banner.tone} text={banner.text} />}

          <AdminSection title="Rentals" count={state.rentals.length}>
            <RentalsTable
              rentals={state.rentals}
              pending={pending}
              onScheduleReturn={(id, date) =>
                runAction(id, () => scheduleReturn(id, date), "Return scheduled.")
              }
              onReturn={(id) => runAction(id, () => markReturned(id), "Marked returned.")}
              onInspect={(id, passed, notes) =>
                runAction(
                  id,
                  () => inspectRental(id, passed, notes),
                  passed ? "Inspection passed." : "Inspection failed — logged.",
                )
              }
              onExtend={(id, date) =>
                runAction(id, () => extendRental(id, date), "Rental extended.")
              }
            />
          </AdminSection>
        </>
      )}
    </main>
  );
}

/** Map a thrown error onto an error / no-auth load state. */
function toErrorState(err: unknown, fallback: string): LoadState {
  if (err instanceof RentalAuthError) {
    return { phase: "no-auth" };
  }
  if (err instanceof RentalConfigError) {
    return { phase: "error", message: err.message, unauthorized: false, config: true };
  }
  if (err instanceof RentalApiError) {
    if (err.unauthorized) return { phase: "no-auth" };
    return { phase: "error", message: err.message, unauthorized: err.unauthorized, config: false };
  }
  return { phase: "error", message: fallback, unauthorized: false, config: false };
}

/* ── Table with per-row actions ────────────────────────────────────────── */

function RentalsTable({
  rentals,
  pending,
  onScheduleReturn,
  onReturn,
  onInspect,
  onExtend,
}: {
  rentals: AdminRental[];
  pending: Record<string, boolean>;
  onScheduleReturn: (id: string, date: string) => void;
  onReturn: (id: string) => void;
  onInspect: (id: string, passed: boolean, notes?: string) => void;
  onExtend: (id: string, date: string) => void;
}) {
  return (
    <AdminTable>
      <thead>
        <tr>
          <Th>Status</Th>
          <Th>Customer</Th>
          <Th>Bike</Th>
          <Th>Plan</Th>
          <Th>Start</Th>
          <Th>Planned end</Th>
          <Th>Returned</Th>
          <Th>Price / deposit</Th>
          <Th>Actions</Th>
        </tr>
      </thead>
      <tbody>
        {rentals.length === 0 ? (
          <EmptyRow colSpan={9} label="No rentals yet." />
        ) : (
          rentals.map((r) => {
            const overdue = r.isOverdue;
            return (
              <tr
                key={r.id}
                style={
                  overdue
                    ? { background: "rgba(255, 138, 120, 0.06)" }
                    : undefined
                }
              >
                <Td nowrap>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                    <StatusPill value={r.status} />
                    {overdue && <StatusPill value="overdue" tone="bad" />}
                  </div>
                </Td>
                <Td>
                  <div className="mono" style={{ fontSize: 12 }}>{r.customerEmail}</div>
                  {r.bookingId && (
                    <div className="mono" style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 3 }}>
                      booking {r.bookingId.slice(0, 8)}
                    </div>
                  )}
                </Td>
                <Td mono nowrap>
                  <div>{r.bikeUnitInternalCode}</div>
                  <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 3 }}>{r.modelId}</div>
                </Td>
                <Td mono nowrap>{r.planId}</Td>
                <Td mono nowrap>{fmtDay(r.startDate)}</Td>
                <Td
                  mono
                  nowrap
                  dim={!overdue}
                >
                  <span style={overdue ? { color: "var(--danger)" } : undefined}>
                    {fmtDay(r.plannedEndDate)}
                  </span>
                </Td>
                <Td mono nowrap dim>{fmtDay(r.actualEndDate)}</Td>
                <Td mono nowrap>
                  <div>{fmtMoney(r.monthlyPrice)}</div>
                  <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 3 }}>
                    dep {fmtMoney(r.depositAmount)}
                  </div>
                </Td>
                <Td>
                  <RowActions
                    busy={Boolean(pending[r.id])}
                    onScheduleReturn={(date) => onScheduleReturn(r.id, date)}
                    onReturn={() => onReturn(r.id)}
                    onInspect={(passed, notes) => onInspect(r.id, passed, notes)}
                    onExtend={(date) => onExtend(r.id, date)}
                  />
                </Td>
              </tr>
            );
          })
        )}
      </tbody>
    </AdminTable>
  );
}

/**
 * Per-rental action cluster: schedule a return (date), mark returned, run the
 * inspection (pass/fail + optional notes), and extend (date). Date inputs seed
 * to today; the parent disables the whole cluster while an action is in flight.
 */
function RowActions({
  busy,
  onScheduleReturn,
  onReturn,
  onInspect,
  onExtend,
}: {
  busy: boolean;
  onScheduleReturn: (date: string) => void;
  onReturn: () => void;
  onInspect: (passed: boolean, notes?: string) => void;
  onExtend: (date: string) => void;
}) {
  const [returnDate, setReturnDate] = useState(todayISO());
  const [extendDate, setExtendDate] = useState(todayISO());
  const [notes, setNotes] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 248 }}>
      {/* Schedule return */}
      <form
        style={actionRow}
        onSubmit={(e) => {
          e.preventDefault();
          if (returnDate && !busy) onScheduleReturn(returnDate);
        }}
      >
        <input
          type="date"
          value={returnDate}
          onChange={(e) => setReturnDate(e.target.value)}
          aria-label="Return date"
          style={dateStyle}
          disabled={busy}
        />
        <button type="submit" className="btn btn-ghost" style={miniBtn} disabled={busy || !returnDate}>
          Schedule return
        </button>
      </form>

      {/* Mark returned */}
      <div style={actionRow}>
        <button
          type="button"
          className="btn btn-ghost"
          style={miniBtn}
          disabled={busy}
          onClick={onReturn}
        >
          Mark returned
        </button>
      </div>

      {/* Inspect: notes + pass/fail */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          aria-label="Inspection notes"
          placeholder="Inspection notes (optional)"
          style={{ ...dateStyle, minWidth: 0, flex: "unset" }}
          disabled={busy}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn btn-primary"
            style={miniBtn}
            disabled={busy}
            onClick={() => onInspect(true, notes)}
          >
            Inspect: pass
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={miniBtn}
            disabled={busy}
            onClick={() => onInspect(false, notes)}
          >
            Fail
          </button>
        </div>
      </div>

      {/* Extend */}
      <form
        style={actionRow}
        onSubmit={(e) => {
          e.preventDefault();
          if (extendDate && !busy) onExtend(extendDate);
        }}
      >
        <input
          type="date"
          value={extendDate}
          onChange={(e) => setExtendDate(e.target.value)}
          aria-label="New planned end date"
          style={dateStyle}
          disabled={busy}
        />
        <button type="submit" className="btn btn-ghost" style={miniBtn} disabled={busy || !extendDate}>
          Extend
        </button>
      </form>

      {busy && (
        <span className="mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>
          Working…
        </span>
      )}
    </div>
  );
}

/* ── Inline styles for the compact action controls ─────────────────────── */

const actionRow: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" };

const miniBtn: React.CSSProperties = { padding: "8px 13px", fontSize: 12 };

const dateStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 130,
  padding: "8px 10px",
  borderRadius: "var(--r-sm)",
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  colorScheme: "dark",
};

/* ── Shared pieces (match the other admin pages) ───────────────────────── */

function Banner({ tone, text }: { tone: "ok" | "bad"; text: string }) {
  return (
    <div
      className="mono"
      role="status"
      style={{
        marginBottom: 18,
        padding: "11px 15px",
        borderRadius: "var(--r-sm)",
        fontSize: 12.5,
        color: tone === "ok" ? "var(--lime)" : "var(--danger)",
        background: tone === "ok" ? "rgba(216,255,54,0.08)" : "rgba(255,138,120,0.08)",
        border: `1px solid ${tone === "ok" ? "rgba(216,255,54,0.3)" : "rgba(255,138,120,0.32)"}`,
      }}
    >
      {text}
    </div>
  );
}

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
          <span style={{ color: "var(--lime)" }}>rentals</span>
        </h1>
        <p className="mono" style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 6 }}>
          Returns, inspections &amp; extensions
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

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="card mono" style={{ padding: 28, color: "var(--text-muted)", fontSize: 13 }}>
      {children}
    </div>
  );
}

function AuthGate() {
  return (
    <div className="card" style={{ padding: 32, maxWidth: 460 }}>
      <h2 style={{ fontSize: 20, letterSpacing: "-0.02em", marginBottom: 6 }}>Sign in required</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 22, lineHeight: 1.6 }}>
        You need an admin session to manage rentals. Sign in on the admin home, then return here.
      </p>
      <Link
        href="/admin"
        className="btn btn-primary"
        style={{ padding: "12px 22px", fontSize: 14, textDecoration: "none" }}
      >
        Sign in on the admin home
      </Link>
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
          <Link href="/admin" className="btn btn-primary" style={{ padding: "12px 22px", fontSize: 14, textDecoration: "none" }}>
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
