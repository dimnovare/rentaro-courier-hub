"use client";

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
import { AdminTable, Th, Td, EmptyRow, AdminSection, fmtDay } from "@/components/admin/Table";
import { StatusPill } from "@/components/admin/StatusPill";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { useAdminRefresh } from "@/components/admin/useAdminRefresh";
import { Drawer } from "@/components/admin/Drawer";

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
  | { phase: "error"; message: string; config: boolean };

export default function AdminRentalsPage() {
  const { token, signOut } = useAdminAuth();
  const [state, setState] = useState<LoadState>({ phase: "idle" });
  const [banner, setBanner] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  // Rental ids with an in-flight action.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  // The rental whose "Manage" drawer is currently open (null = closed).
  const [manageId, setManageId] = useState<string | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    // A "silent" refresh (after an action, or a background refresh) keeps the
    // current rentals on screen instead of dropping to the full-page loading
    // notice — which would unmount and visibly blink an open Manage drawer.
    if (!opts?.silent) setState({ phase: "loading" });
    try {
      const rentals = await listRentals();
      setState({ phase: "ready", rentals });
    } catch (err) {
      if (err instanceof RentalAuthError || (err instanceof RentalApiError && err.unauthorized)) {
        signOut();
      } else if (!opts?.silent) {
        setState(toErrorState(err, "Something went wrong loading rentals."));
      }
      // Silent-refresh failures keep the existing data; the triggering action's
      // own catch surfaces the error via the banner.
    }
  }, [signOut]);

  useEffect(() => {
    if (token) void load();
  }, [token, load]);

  useAdminRefresh(useCallback(() => void load({ silent: true }), [load]));

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
        await load({ silent: true });
      } catch (err) {
        if (
          err instanceof RentalAuthError ||
          (err instanceof RentalApiError && err.unauthorized)
        ) {
          signOut();
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
    [load, signOut],
  );

  const managed =
    state.phase === "ready" && manageId
      ? state.rentals.find((r) => r.id === manageId) ?? null
      : null;

  // Opening a row's drawer clears any stale banner from a previous action.
  function openManage(id: string) {
    setBanner(null);
    setManageId(id);
  }

  return (
    <div>
      {state.phase === "loading" || state.phase === "idle" ? (
        <Notice>Loading rentals…</Notice>
      ) : state.phase === "error" ? (
        <ErrorPanel message={state.message} config={state.config} onRetry={() => void load()} />
      ) : (
        <>
          {banner && <Banner tone={banner.tone} text={banner.text} />}

          <AdminSection title="Rentals" count={state.rentals.length}>
            <RentalsTable
              rentals={state.rentals}
              pending={pending}
              onManage={openManage}
            />
          </AdminSection>

          <ManageRentalDrawer
            rental={managed}
            banner={banner}
            busy={managed ? Boolean(pending[managed.id]) : false}
            onClose={() => setManageId(null)}
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
        </>
      )}
    </div>
  );
}

/** Map a non-auth thrown error onto an error load state (auth failures are
 *  handled by the caller, which signs out). */
function toErrorState(err: unknown, fallback: string): LoadState {
  if (err instanceof RentalConfigError) {
    return { phase: "error", message: err.message, config: true };
  }
  if (err instanceof RentalApiError) {
    return { phase: "error", message: err.message, config: false };
  }
  return { phase: "error", message: fallback, config: false };
}

/* ── Table with per-row actions ────────────────────────────────────────── */

function RentalsTable({
  rentals,
  pending,
  onManage,
}: {
  rentals: AdminRental[];
  pending: Record<string, boolean>;
  onManage: (id: string) => void;
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
                <Td nowrap>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={miniBtn}
                    disabled={Boolean(pending[r.id])}
                    onClick={() => onManage(r.id)}
                  >
                    Manage ▾
                  </button>
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
 * Per-rental "Manage" drawer. Groups the four lifecycle actions — schedule a
 * return (date), mark returned, run the inspection (pass/fail + optional notes),
 * and extend (date) — into numbered blocks, each with its own input(s) + button
 * wired to the same services as before. The banner is echoed inside the drawer
 * so action feedback is visible without losing the operator's place, and the
 * whole drawer disables while an action for this rental is in flight.
 */
function ManageRentalDrawer({
  rental,
  banner,
  busy,
  onClose,
  onScheduleReturn,
  onReturn,
  onInspect,
  onExtend,
}: {
  rental: AdminRental | null;
  banner: { tone: "ok" | "bad"; text: string } | null;
  busy: boolean;
  onClose: () => void;
  onScheduleReturn: (id: string, date: string) => void;
  onReturn: (id: string) => void;
  onInspect: (id: string, passed: boolean, notes?: string) => void;
  onExtend: (id: string, date: string) => void;
}) {
  return (
    <Drawer
      open={rental !== null}
      onClose={onClose}
      title="Manage rental"
      subtitle={rental ? `${rental.id} · ${rental.customerEmail}` : undefined}
      footer={
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onClose}
          style={{ padding: "11px 20px", fontSize: 14 }}
        >
          Close
        </button>
      }
    >
      {rental && (
        // Keyed by rental id so the per-action input state (dates, notes)
        // re-seeds whenever a different rental's drawer is opened.
        <ManageRentalBody
          key={rental.id}
          rental={rental}
          banner={banner}
          busy={busy}
          onScheduleReturn={onScheduleReturn}
          onReturn={onReturn}
          onInspect={onInspect}
          onExtend={onExtend}
        />
      )}
    </Drawer>
  );
}

function ManageRentalBody({
  rental,
  banner,
  busy,
  onScheduleReturn,
  onReturn,
  onInspect,
  onExtend,
}: {
  rental: AdminRental;
  banner: { tone: "ok" | "bad"; text: string } | null;
  busy: boolean;
  onScheduleReturn: (id: string, date: string) => void;
  onReturn: (id: string) => void;
  onInspect: (id: string, passed: boolean, notes?: string) => void;
  onExtend: (id: string, date: string) => void;
}) {
  const id = rental.id;
  const [returnDate, setReturnDate] = useState(todayISO());
  const [extendDate, setExtendDate] = useState(todayISO());
  const [notes, setNotes] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {banner && <Banner tone={banner.tone} text={banner.text} />}

      {/* 1 · Schedule return */}
      <ActionBlock label="1 · Schedule return">
        <form
          style={actionRow}
          onSubmit={(e) => {
            e.preventDefault();
            if (returnDate && !busy) onScheduleReturn(id, returnDate);
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
      </ActionBlock>

      {/* 2 · Mark returned */}
      <ActionBlock label="2 · Mark returned">
        <div style={actionRow}>
          <button
            type="button"
            className="btn btn-ghost"
            style={miniBtn}
            disabled={busy}
            onClick={() => onReturn(id)}
          >
            Mark returned
          </button>
        </div>
      </ActionBlock>

      {/* 3 · Inspect: notes + pass/fail */}
      <ActionBlock label="3 · Inspect">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
              onClick={() => onInspect(id, true, notes)}
            >
              Inspect: pass
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={miniBtn}
              disabled={busy}
              onClick={() => onInspect(id, false, notes)}
            >
              Fail
            </button>
          </div>
        </div>
      </ActionBlock>

      {/* 4 · Extend */}
      <ActionBlock label="4 · Extend">
        <form
          style={actionRow}
          onSubmit={(e) => {
            e.preventDefault();
            if (extendDate && !busy) onExtend(id, extendDate);
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
      </ActionBlock>

      {busy && (
        <span className="mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>
          Working…
        </span>
      )}
    </div>
  );
}

/** A labelled group inside the Manage drawer. */
function ActionBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <h3
        className="mono"
        style={{
          fontSize: 10.5,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          margin: 0,
          fontWeight: 500,
        }}
      >
        {label}
      </h3>
      {children}
    </section>
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

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="card mono" style={{ padding: 28, color: "var(--text-muted)", fontSize: 13 }}>
      {children}
    </div>
  );
}

function ErrorPanel({
  message,
  config,
  onRetry,
}: {
  message: string;
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
        {config ? "Not configured" : "Error"}
      </div>
      <p style={{ color: "var(--text-2)", fontSize: 14.5, margin: "0 0 20px", lineHeight: 1.6 }}>{message}</p>
      {!config && (
        <button type="button" className="btn btn-primary" onClick={onRetry} style={{ padding: "12px 22px", fontSize: 14 }}>
          Try again
        </button>
      )}
    </div>
  );
}
