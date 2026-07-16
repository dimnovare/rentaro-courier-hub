"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  listRentals,
  scheduleReturn,
  markReturned,
  inspectRental,
  updateRentalDates,
  sendReturnReminder,
  listRentalExtensions,
  createComplimentaryExtension,
  cancelRentalExtension,
  RentalApiError,
  RentalConfigError,
  RentalAuthError,
  type AdminRental,
  type RentalExtension,
} from "@/services/adminRentalService";
import { invoicePdfPath } from "@/services/adminBillingService";
import { AdminTable, Th, Td, EmptyRow, AdminSection } from "@/components/admin/Table";
import { fmtDay, todayIso, isoDay } from "@/lib/dates";
import { formatEur } from "@/lib/money";
import { confirmAction } from "@/lib/confirm";
import { Banner, Notice, ErrorPanel } from "@/components/admin/Feedback";
import { StatusPill, statusLabel } from "@/components/admin/StatusPill";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { useAdminRefresh } from "@/components/admin/useAdminRefresh";
import { Drawer } from "@/components/admin/Drawer";
import { DateField } from "@/components/admin/DateField";
import { PageHeader } from "@/components/admin/PageHeader";

/** ISO day `days` after the given ISO day (local, no timezone shifting). */
function addDays(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  d.setDate(d.getDate() + days);
  return isoDay(d);
}

/** Days from today (local midnight) until the given ISO day; negative = past. */
function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Math.round((end.getTime() - today.getTime()) / 86_400_000);
}

/** Rental statuses still counting down to a planned end. */
const ACTIVEISH = new Set(["active", "endingsoon", "extended", "returnscheduled", "overdue"]);

/**
 * "Ends in Nd" cue next to the planned end for rentals that are still running.
 * Warn tone within a week of the end, danger once overdue; null (no chip) for
 * returned/closed rentals or ones without a planned end.
 */
function endsInChip(r: AdminRental): { text: string; tone: "warn" | "bad" | "neutral" } | null {
  if (!r.plannedEndDate || r.actualEndDate) return null;
  if (!ACTIVEISH.has((r.status ?? "").toLowerCase())) return null;
  const days = daysUntil(r.plannedEndDate);
  if (days < 0 || r.isOverdue) {
    return { text: days < 0 ? `${-days}d overdue` : "overdue", tone: "bad" };
  }
  if (days === 0) return { text: "ends today", tone: "warn" };
  return { text: `ends in ${days}d`, tone: days <= 7 ? "warn" : "neutral" };
}

type LoadState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "ready"; rentals: AdminRental[] }
  | { phase: "error"; message: string; config: boolean };

export default function AdminRentalsPage() {
  const { authenticated, signOut } = useAdminAuth();
  const [state, setState] = useState<LoadState>({ phase: "idle" });
  const [banner, setBanner] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  // Rental ids with an in-flight action.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  // The rental whose "Manage" drawer is currently open (null = closed).
  const [manageId, setManageId] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // Whether the ?id=<rentalId> deep link has been consumed (once per mount).
  const deepLinkDone = useRef(false);

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
    if (authenticated) void load();
  }, [authenticated, load]);

  useAdminRefresh(useCallback(() => void load({ silent: true }), [load]));

  // Deep link: /admin/rentals?id=<rentalId> auto-opens that rental's Manage
  // drawer once the list is loaded (dashboard / support cross-links).
  useEffect(() => {
    if (deepLinkDone.current || state.phase !== "ready") return;
    deepLinkDone.current = true;
    const id = searchParams.get("id");
    if (id && state.rentals.some((r) => r.id === id)) setManageId(id);
  }, [state, searchParams]);

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

  // Closing the drawer also strips a consumed ?id deep link from the URL, so a
  // reload doesn't surprise-reopen the drawer.
  const closeManage = useCallback(() => {
    setManageId(null);
    if (searchParams.get("id")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("id");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [searchParams, router, pathname]);

  return (
    <div>
      {state.phase === "loading" || state.phase === "idle" ? (
        <Notice>Loading rentals…</Notice>
      ) : state.phase === "error" ? (
        <ErrorPanel message={state.message} config={state.config} onRetry={() => void load()} />
      ) : (
        <>
          <PageHeader
            title="Rentals"
            subtitle="Active and past rentals. Schedule returns, inspect and extend."
          />

          {banner && <Banner tone={banner.tone} text={banner.text} />}

          <AdminSection title="Rentals" count={state.rentals.length} noun="rental">
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
            onClose={closeManage}
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
            onEditDates={(id, body) =>
              runAction(id, () => updateRentalDates(id, body), "Dates updated.")
            }
            onSendReminder={(id) =>
              runAction(id, () => sendReturnReminder(id), "Return reminder sent.")
            }
            onExtensionChanged={() => void load({ silent: true })}
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
          <Th>Return due</Th>
          <Th>Returned</Th>
          <Th align="right">Price / deposit</Th>
          <Th>Actions</Th>
        </tr>
      </thead>
      <tbody>
        {rentals.length === 0 ? (
          <EmptyRow
            colSpan={10}
            label="No rentals yet. Rentals appear when you assign a bike to an approved booking — see Bookings."
          />
        ) : (
          rentals.map((r) => {
            const overdue = r.isOverdue;
            const chip = endsInChip(r);
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
                  {/* The rental DTO carries only the customer email (no name). */}
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
                  {chip && (
                    <div style={{ marginTop: 4 }}>
                      <StatusPill value={chip.text} tone={chip.tone} />
                    </div>
                  )}
                </Td>
                <Td mono nowrap dim>{fmtDay(r.returnScheduledDate)}</Td>
                <Td mono nowrap dim>{fmtDay(r.actualEndDate)}</Td>
                <Td mono nowrap align="right">
                  <div>{formatEur(r.monthlyPrice)}</div>
                  <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 3 }}>
                    dep {formatEur(r.depositAmount)}
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
 * Per-rental "Manage" drawer. Groups the lifecycle actions — schedule a return
 * (date), mark returned, run the inspection (pass/fail + optional notes),
 * extend (date + reason, via the extension ledger) and edit dates — into
 * numbered blocks, each with its own input(s) + button wired to the same
 * services as before. The banner is echoed inside the drawer so action
 * feedback is visible without losing the operator's place, and the whole
 * drawer disables while an action for this rental is in flight.
 */
function ManageRentalDrawer({
  rental,
  banner,
  busy,
  onClose,
  onScheduleReturn,
  onReturn,
  onInspect,
  onEditDates,
  onSendReminder,
  onExtensionChanged,
}: {
  rental: AdminRental | null;
  banner: { tone: "ok" | "bad"; text: string } | null;
  busy: boolean;
  onClose: () => void;
  onScheduleReturn: (id: string, date: string) => void;
  onReturn: (id: string) => void;
  onInspect: (id: string, passed: boolean, notes?: string) => void;
  onEditDates: (id: string, body: { startDate?: string; plannedEndDate?: string }) => void;
  onSendReminder: (id: string) => void;
  onExtensionChanged: () => void;
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
          onEditDates={onEditDates}
          onSendReminder={onSendReminder}
          onExtensionChanged={onExtensionChanged}
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
  onEditDates,
  onSendReminder,
  onExtensionChanged,
}: {
  rental: AdminRental;
  banner: { tone: "ok" | "bad"; text: string } | null;
  busy: boolean;
  onScheduleReturn: (id: string, date: string) => void;
  onReturn: (id: string) => void;
  onInspect: (id: string, passed: boolean, notes?: string) => void;
  onEditDates: (id: string, body: { startDate?: string; plannedEndDate?: string }) => void;
  onSendReminder: (id: string) => void;
  onExtensionChanged: () => void;
}) {
  const id = rental.id;
  // Seed from the saved scheduled return (if any) so re-opening shows it, not today.
  const [returnDate, setReturnDate] = useState(rental.returnScheduledDate ?? todayIso());
  const [notes, setNotes] = useState("");
  // Edit-dates block, seeded from the rental's current ISO dates.
  const [startDate, setStartDate] = useState(rental.startDate);
  const [plannedEnd, setPlannedEnd] = useState(rental.plannedEndDate ?? "");

  // The action banner renders at the top of the drawer body, which can be
  // scrolled off-screen when acting on a lower block — bring it (minimally)
  // back into view whenever it (re)appears.
  const bannerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (banner) bannerRef.current?.scrollIntoView({ block: "nearest" });
  }, [banner]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {banner && (
        <div ref={bannerRef}>
          <Banner tone={banner.tone} text={banner.text} />
        </div>
      )}

      {/* 1 · Schedule return */}
      <ActionBlock label="1 · Schedule return">
        {rental.returnScheduledDate && (
          <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Currently scheduled: {fmtDay(rental.returnScheduledDate)}
          </span>
        )}
        <form
          style={actionRow}
          onSubmit={(e) => {
            e.preventDefault();
            if (returnDate && !busy) onScheduleReturn(id, returnDate);
          }}
        >
          <DateField value={returnDate} onChange={setReturnDate} disabled={busy} />
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
            onClick={() => {
              if (
                !confirmAction(
                  "Mark this rental as returned? This ends the active rental and frees the bike for inspection.",
                )
              ) {
                return;
              }
              onReturn(id);
            }}
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
              onClick={() => {
                // Inspection is terminal: it permanently CLOSES the rental with
                // no undo, so a single (mis)click must not be enough.
                if (!confirmAction("Pass inspection and close this rental?", { finality: "final" })) {
                  return;
                }
                onInspect(id, true, notes);
              }}
            >
              Pass inspection
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={miniBtn}
              disabled={busy}
              onClick={() => {
                if (
                  !confirmAction(
                    "Fail inspection and close this rental? The bike unit goes to maintenance.",
                    { finality: "final" },
                  )
                ) {
                  return;
                }
                onInspect(id, false, notes);
              }}
            >
              Fail inspection
            </button>
          </div>
        </div>
      </ActionBlock>

      {/* 4 · Extend + extension history (one combined control — see below) */}
      <RentalExtensionAdminSection rental={rental} onChanged={onExtensionChanged} />

      {/* 5 · Edit dates */}
      <ActionBlock label="5 · Edit dates">
        <form
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (startDate && !busy) {
              onEditDates(id, { startDate, plannedEndDate: plannedEnd || undefined });
            }
          }}
        >
          <label style={editDateField}>
            <span style={editDateLabel}>Start date</span>
            <DateField value={startDate} onChange={setStartDate} disabled={busy} />
          </label>

          <label style={editDateField}>
            <span style={editDateLabel}>Planned end</span>
            <DateField value={plannedEnd} onChange={setPlannedEnd} disabled={busy} />
          </label>

          <p className="mono" style={editDateHint}>
            Leave end blank to auto-set 30 days / the plan length from the start.
          </p>

          <div>
            <button type="submit" className="btn btn-ghost" style={miniBtn} disabled={busy || !startDate}>
              Save dates
            </button>
          </div>
        </form>
      </ActionBlock>

      {/* 6 · Send return reminder (manual — works regardless of the auto setting) */}
      <ActionBlock label="6 · Send return reminder">
        <div style={actionRow}>
          <button
            type="button"
            className="btn btn-ghost"
            style={miniBtn}
            disabled={busy}
            onClick={() => onSendReminder(id)}
          >
            {rental.lastReturnReminderSentAt ? "Send reminder again" : "Send return reminder"}
          </button>
          {rental.lastReturnReminderSentAt && (
            <span className="mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>
              Last sent {fmtDay(rental.lastReturnReminderSentAt.slice(0, 10))}
            </span>
          )}
        </div>
      </ActionBlock>

      {busy && (
        <span className="mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>
          Working…
        </span>
      )}
    </div>
  );
}

/**
 * The single "Extend" control + the extension ledger.
 *
 * There used to be TWO near-identical flows here: a bare "Extend" (date-only,
 * POST /extend) and this complimentary-extension form (date + reason). The
 * backend has since turned /extend into an alias of the complimentary flow —
 * it now REQUIRES a reason and records the same ledger entry — so the bare
 * control could only ever 400. The two are merged into this one control:
 * one date (seeded planned end + 30 days), one reason, one button.
 */
function RentalExtensionAdminSection({
  rental,
  onChanged,
}: {
  rental: AdminRental;
  onChanged: () => void;
}) {
  const [extensions, setExtensions] = useState<RentalExtension[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  // Seed the proposed end a full billing period past the current planned end —
  // the planned end itself (or today) is never a valid extension target.
  const seedEndDate = useCallback(
    () => (rental.plannedEndDate ? addDays(rental.plannedEndDate, 30) : todayIso()),
    [rental.plannedEndDate],
  );
  const [newEndDate, setNewEndDate] = useState(seedEndDate);
  const [reason, setReason] = useState("");

  // Re-seed when the planned end moves (e.g. right after an extension applies),
  // so the next proposal starts from the new end instead of the stale one.
  useEffect(() => {
    setNewEndDate(seedEndDate());
  }, [seedEndDate]);

  const loadExtensions = useCallback(async () => {
    try {
      setError(null);
      setExtensions(await listRentalExtensions(rental.id));
    } catch (err) {
      setError(extensionErrorMessage(err));
    }
  }, [rental.id]);

  useEffect(() => {
    void loadExtensions();
  }, [loadExtensions]);

  async function applyComplimentaryExtension() {
    const trimmedReason = reason.trim();
    if (!newEndDate || !trimmedReason || workingId) return;

    setWorkingId("complimentary");
    setError(null);
    setNotice(null);
    try {
      await createComplimentaryExtension(rental.id, {
        newEndDate,
        reason: trimmedReason,
      });
      setReason("");
      setNotice("Complimentary extension applied.");
      await loadExtensions();
      onChanged();
    } catch (err) {
      setError(extensionErrorMessage(err));
    } finally {
      setWorkingId(null);
    }
  }

  async function cancelExtension(extensionId: string) {
    if (workingId) return;
    setWorkingId(extensionId);
    setError(null);
    setNotice(null);
    try {
      await cancelRentalExtension(rental.id, extensionId);
      setNotice("Extension cancelled.");
      await loadExtensions();
      onChanged();
    } catch (err) {
      setError(extensionErrorMessage(err));
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <>
      <ActionBlock label="4 · Extend">
        {error && <Banner tone="bad" text={error} />}
        {notice && <Banner tone="ok" text={notice} />}

        <form
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
          onSubmit={(event) => {
            event.preventDefault();
            void applyComplimentaryExtension();
          }}
        >
          <fieldset
            aria-label="Complimentary extension end date"
            style={{ ...editDateField, border: 0, padding: 0, margin: 0 }}
          >
            <legend style={{ ...editDateLabel, padding: 0, marginBottom: 5 }}>
              Complimentary extension end date
            </legend>
            <DateField
              value={newEndDate}
              onChange={setNewEndDate}
              disabled={Boolean(workingId)}
            />
          </fieldset>
          <label style={editDateField}>
            <span style={editDateLabel}>Reason (required for audit history)</span>
            <input
              type="text"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              aria-label="Complimentary extension reason"
              placeholder="e.g. Service downtime credit"
              style={{ ...dateStyle, minWidth: 0, flex: "unset" }}
              disabled={Boolean(workingId)}
            />
          </label>
          <div>
            <button
              type="submit"
              className="btn btn-primary"
              style={miniBtn}
              disabled={Boolean(workingId) || !newEndDate || !reason.trim()}
            >
              Apply complimentary extension
            </button>
          </div>
          <p className="mono" style={editDateHint}>
            Extends at no charge and is recorded in the ledger below. Paid
            extensions are requested by the customer from their portal.
          </p>
        </form>
      </ActionBlock>

      <ActionBlock label="Extension history">
        {extensions === null ? (
          <span className="mono" style={extensionHintStyle}>Loading extension ledger…</span>
        ) : extensions.length === 0 ? (
          <span className="mono" style={extensionHintStyle}>No extension requests yet.</span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {extensions.map((extension) => (
              <div key={extension.id} className="card" style={extensionCardStyle}>
                <div style={extensionHeaderStyle}>
                  <div>
                    <strong style={{ display: "block", fontSize: 13 }}>
                      {fmtDay(extension.previousPlannedEndDate)} → {fmtDay(extension.proposedPlannedEndDate)}
                    </strong>
                    <span className="mono" style={extensionHintStyle}>
                      <span>{titleCase(extension.source)}</span>
                      <span> · {extension.billingPeriodCount} billing period{extension.billingPeriodCount === 1 ? "" : "s"}</span>
                    </span>
                  </div>
                  <StatusPill value={titleCase(extension.status)} />
                </div>

                <div className="mono" style={extensionMoneyStyle}>
                  {formatEur(extension.baseAmountPerPeriod)} bike + {formatEur(extension.accessoryAmountPerPeriod)} selected optional extras = {formatEur(extension.totalAmountPerPeriod)} / period
                </div>

                {extension.adminReason && (
                  <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 12.5 }}>
                    Reason: {extension.adminReason}
                  </p>
                )}

                {extension.periods.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {extension.periods.map((period) => (
                      <div key={period.id} style={periodRowStyle}>
                        <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          #{period.sequenceNumber} · {fmtDay(period.serviceStartDate)} – {fmtDay(period.serviceEndDateExclusive)} · {statusLabel(period.status)}
                        </span>
                        {period.invoiceId && period.invoiceNumber ? (
                          <a
                            href={invoicePdfPath(period.invoiceId)}
                            target="_blank"
                            rel="noreferrer"
                            className="mono"
                            style={{ color: "var(--lime)", fontSize: 11 }}
                          >
                            {period.invoiceNumber}
                          </a>
                        ) : (
                          <span className="mono" style={extensionHintStyle}>Not invoiced</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {extension.status === "awaiting_payment" && (
                  <div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={miniBtn}
                      disabled={Boolean(workingId)}
                      onClick={() => void cancelExtension(extension.id)}
                    >
                      Cancel extension
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ActionBlock>
    </>
  );
}

function extensionErrorMessage(err: unknown): string {
  if (err instanceof RentalApiError || err instanceof RentalConfigError || err instanceof RentalAuthError) {
    return err.message;
  }
  return "Could not update the extension ledger.";
}

function titleCase(value: string): string {
  const normalized = value.replaceAll("_", " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
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

const editDateField: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5 };

const editDateLabel: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-muted)",
  fontFamily: "var(--font-mono)",
};

const editDateHint: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  lineHeight: 1.5,
  color: "var(--text-dim)",
};

const extensionHintStyle: React.CSSProperties = {
  fontSize: 10.5,
  color: "var(--text-dim)",
};

const extensionCardStyle: React.CSSProperties = {
  padding: 14,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  borderRadius: "var(--r-sm)",
};

const extensionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};

const extensionMoneyStyle: React.CSSProperties = {
  fontSize: 11,
  lineHeight: 1.55,
  color: "var(--text-2)",
};

const periodRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  paddingTop: 6,
  borderTop: "1px solid var(--border)",
};
