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
  getRentalAccessories,
  confirmRentalAccessoryHandover,
  updateRentalAccessoryDeposit,
  listRentalExtensions,
  createComplimentaryExtension,
  cancelRentalExtension,
  RentalApiError,
  RentalConfigError,
  RentalAuthError,
  type AdminRental,
  type RentalExtension,
} from "@/services/adminRentalService";
import type {
  AccessoryAssignmentOutcome,
  AccessoryCondition,
  AccessoryDepositStatus,
  AccessoryInspectionInput,
  AdminRentalAccessory,
  AdminRentalAccessoryResponse,
} from "@/types/accessoryInventory";
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
import { track } from "@/services/analytics";

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
        return true;
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
        return false;
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
            onInspect={(id, passed, notes, accessories) =>
              runAction(
                id,
                () => inspectRental(id, passed, notes, accessories),
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
  onReturn: (id: string) => Promise<boolean>;
  onInspect: (
    id: string,
    passed: boolean,
    notes?: string,
    accessories?: AccessoryInspectionInput[],
  ) => Promise<boolean>;
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
  onReturn: (id: string) => Promise<boolean>;
  onInspect: (
    id: string,
    passed: boolean,
    notes?: string,
    accessories?: AccessoryInspectionInput[],
  ) => Promise<boolean>;
  onEditDates: (id: string, body: { startDate?: string; plannedEndDate?: string }) => void;
  onSendReminder: (id: string) => void;
  onExtensionChanged: () => void;
}) {
  const id = rental.id;
  // Seed from the saved scheduled return (if any) so re-opening shows it, not today.
  const [returnDate, setReturnDate] = useState(rental.returnScheduledDate ?? todayIso());
  // Edit-dates block, seeded from the rental's current ISO dates.
  const [startDate, setStartDate] = useState(rental.startDate);
  const [plannedEnd, setPlannedEnd] = useState(rental.plannedEndDate ?? "");

  // The action banner renders at the top of the drawer body, which can be
  // scrolled off-screen when acting on a lower block — bring it (minimally)
  // back into view whenever it (re)appears.
  const bannerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (banner && typeof bannerRef.current?.scrollIntoView === "function") {
      bannerRef.current.scrollIntoView({ block: "nearest" });
    }
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

      <RentalAccessoryOperations
        rental={rental}
        busy={busy}
        onReturn={onReturn}
        onInspect={onInspect}
      />

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

type CustodyState =
  | { phase: "loading" }
  | { phase: "ready"; data: AdminRentalAccessoryResponse }
  | { phase: "error"; message: string };

type InspectionOutcome = Extract<
  AccessoryAssignmentOutcome,
  "returned" | "damaged" | "missing" | "retained"
>;

interface HandoverDraft {
  condition: AccessoryCondition;
  notes: string;
}

interface InspectionDraft {
  outcome: "" | InspectionOutcome;
  condition: AccessoryCondition;
  notes: string;
}

const ACCESSORY_CONDITIONS: readonly AccessoryCondition[] = [
  "new",
  "good",
  "worn",
  "damaged",
];

function RentalAccessoryOperations({
  rental,
  busy,
  onReturn,
  onInspect,
}: {
  rental: AdminRental;
  busy: boolean;
  onReturn: (id: string) => Promise<boolean>;
  onInspect: (
    id: string,
    passed: boolean,
    notes?: string,
    accessories?: AccessoryInspectionInput[],
  ) => Promise<boolean>;
}) {
  const { signOut } = useAdminAuth();
  const [state, setState] = useState<CustodyState>({ phase: "loading" });
  const [handover, setHandover] = useState<Record<number, HandoverDraft>>({});
  const [inspection, setInspection] = useState<Record<number, InspectionDraft>>({});
  const [bikeNotes, setBikeNotes] = useState("");
  const [depositAction, setDepositAction] = useState<"" | "refunded" | "partially_retained" | "retained">("");
  const [retainedAmount, setRetainedAmount] = useState("");
  const [retentionReason, setRetentionReason] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const applyResponse = useCallback((response: AdminRentalAccessoryResponse) => {
    setState({ phase: "ready", data: response });
    setHandover(
      Object.fromEntries(
        response.items.map((item) => [
          item.accessoryUnitId,
          {
            condition: item.outboundCondition || item.unitCondition,
            notes: item.outboundNotes ?? "",
          },
        ]),
      ),
    );
    setInspection(
      Object.fromEntries(
        response.items.map((item) => [
          item.accessoryUnitId,
          {
            outcome: "",
            condition: item.inboundCondition ?? item.unitCondition,
            notes: item.inspectionNotes ?? "",
          },
        ]),
      ),
    );
  }, []);

  const loadCustody = useCallback(async () => {
    setState({ phase: "loading" });
    setError(null);
    try {
      applyResponse(await getRentalAccessories(rental.id));
    } catch (err) {
      if (isRentalUnauthorized(err)) signOut();
      else setState({ phase: "error", message: rentalActionError(err, "Could not load assigned equipment.") });
    }
  }, [applyResponse, rental.id, signOut]);

  useEffect(() => {
    void loadCustody();
  }, [loadCustody, rental.status]);

  const data = state.phase === "ready" ? state.data : null;
  const liveItems = data?.items.filter((item) => item.completedAt == null) ?? [];
  const awaitingHandover =
    liveItems.length > 0 &&
    liveItems.every((item) => item.outcome === "assigned" || item.outcome === "handedover") &&
    liveItems.some((item) => item.outcome === "assigned");
  const deposit = data?.items.find((item) => item.depositAmount > 0) ?? null;
  const inspectionItems = liveItems.filter((item) => item.outcome === "returned");
  const returned = rental.status.toLowerCase() === "returned";
  const canMarkReturned = !["returned", "closed"].includes(rental.status.toLowerCase());
  const inspectionReady =
    state.phase === "ready" &&
    inspectionItems.every((item) => validInspectionDraft(inspection[item.accessoryUnitId]));

  async function confirmHandover() {
    if (!awaitingHandover || working) return;
    const newlyHandedOver = liveItems.filter((item) => item.outcome === "assigned");
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      const response = await confirmRentalAccessoryHandover(rental.id, {
        items: liveItems.map((item) => {
          const draft = handover[item.accessoryUnitId] ?? {
            condition: item.outboundCondition,
            notes: "",
          };
          return {
            accessoryUnitId: item.accessoryUnitId,
            condition: draft.condition,
            notes: draft.notes.trim() || null,
          };
        }),
      });
      applyResponse(response);
      setNotice("Equipment handover confirmed.");
      newlyHandedOver.forEach((item) =>
        track(
          "admin_accessory_handover",
          accessoryCustodyAnalytics(response, item, "handedover"),
        ),
      );
    } catch (err) {
      if (isRentalUnauthorized(err)) signOut();
      else setError(rentalActionError(err, "Could not confirm equipment handover."));
    } finally {
      setWorking(false);
    }
  }

  async function markReturnedWithEquipment() {
    if (!canMarkReturned || working) return;
    if (
      !confirmAction(
        "Mark this rental as returned? This ends the active rental and frees the bike for inspection.",
      )
    ) {
      return;
    }

    const returningItems = liveItems.filter((item) => item.completedAt == null);
    setWorking(true);
    const ok = await onReturn(rental.id);
    setWorking(false);
    if (ok && data) {
      returningItems.forEach((item) =>
        track(
          "admin_accessory_return",
          accessoryCustodyAnalytics(data, item, "returned"),
        ),
      );
    }
  }

  async function updateDeposit(status: AccessoryDepositStatus) {
    if (!deposit || working) return;
    setError(null);
    setNotice(null);

    let body:
      | { status: AccessoryDepositStatus }
      | { status: AccessoryDepositStatus; retainedAmount: number; reason: string } = { status };
    if (status === "partially_retained" || status === "retained") {
      const amount = Number(retainedAmount);
      const reason = retentionReason.trim();
      const validAmount =
        amount > 0 &&
        (status === "partially_retained" ? amount < deposit.depositAmount : amount <= deposit.depositAmount);
      if (!validAmount) {
        setError(
          status === "partially_retained"
            ? `A partial retention must be greater than zero and less than ${formatEur(deposit.depositAmount)}.`
            : `A retained amount must be greater than zero and no more than ${formatEur(deposit.depositAmount)}.`,
        );
        return;
      }
      if (!reason) {
        setError("A retention reason is required.");
        return;
      }
      body = { status, retainedAmount: amount, reason };
    }

    setWorking(true);
    try {
      applyResponse(await updateRentalAccessoryDeposit(rental.id, body));
      setDepositAction("");
      setRetainedAmount("");
      setRetentionReason("");
      setNotice("Deposit status updated.");
    } catch (err) {
      if (isRentalUnauthorized(err)) signOut();
      else setError(rentalActionError(err, "Could not update the deposit."));
    } finally {
      setWorking(false);
    }
  }

  function inspectionPayload(): AccessoryInspectionInput[] | null {
    if (!inspectionReady) {
      setError("Choose an outcome for every returned accessory.");
      return null;
    }
    return inspectionItems.map((item) => {
      const draft = inspection[item.accessoryUnitId];
      const needsCondition = draft.outcome === "returned" || draft.outcome === "damaged";
      return {
        accessoryUnitId: item.accessoryUnitId,
        outcome: draft.outcome as InspectionOutcome,
        condition: needsCondition ? draft.condition : null,
        notes: draft.notes.trim() || null,
      };
    });
  }

  async function completeInspection(passed: boolean) {
    const accessories = inspectionPayload();
    if (accessories == null || working) return;
    const prompt = passed
      ? "Pass inspection and close this rental?"
      : "Fail inspection and close this rental? The bike unit goes to maintenance.";
    if (!confirmAction(prompt, { finality: "final" })) return;

    setWorking(true);
    const ok = await onInspect(rental.id, passed, bikeNotes.trim() || undefined, accessories);
    setWorking(false);
    if (ok) {
      accessories.forEach((item) => {
        const source = inspectionItems.find((row) => row.accessoryUnitId === item.accessoryUnitId);
        if (!source) return;
        const event = accessoryInspectionEvent(item.outcome);
        if (event && data) {
          track(event, accessoryCustodyAnalytics(data, source, item.outcome));
        }
      });
    }
  }

  return (
    <>
      <ActionBlock label="2 · Mark returned">
        {canMarkReturned ? (
          <div style={actionRow}>
            <button
              type="button"
              className="btn btn-ghost"
              style={miniBtn}
              disabled={busy || working}
              onClick={() => void markReturnedWithEquipment()}
            >
              Mark returned
            </button>
          </div>
        ) : (
          <span className="mono" style={editDateHint}>Return recorded.</span>
        )}
      </ActionBlock>

      <ActionBlock label="3 · Equipment custody">
      <span style={{ fontSize: 14, fontWeight: 650 }}>Equipment custody</span>
      {error && <Banner tone="bad" text={error} />}
      {notice && <Banner tone="ok" text={notice} />}

      {state.phase === "loading" ? (
        <span className="mono" style={editDateHint}>Loading assigned equipment…</span>
      ) : state.phase === "error" ? (
        <div style={actionRow}>
          <span className="mono" style={{ ...editDateHint, color: "var(--danger)" }}>{state.message}</span>
          <button type="button" className="btn btn-ghost" style={miniBtn} onClick={() => void loadCustody()}>Try again</button>
        </div>
      ) : state.phase !== "ready" ? null : state.data.items.length === 0 ? (
        <span className="mono" style={editDateHint}>No optional equipment is assigned to this rental.</span>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {state.data.items.map((item) => (
            <div key={item.assignmentId} style={custodyItemStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: "block", fontSize: 13.5 }}>{item.accessoryName}</strong>
                  <span className="mono" style={{ fontSize: 11, color: "var(--text-dim)", overflowWrap: "anywhere" }}>
                    {item.assetCode}{item.serialNumber ? ` · ${item.serialNumber}` : ""}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <StatusPill value={item.outcome} />
                  <StatusPill value={item.unitCondition} />
                </div>
              </div>

              <AccessoryCustodyHistory item={item} />

              {awaitingHandover && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                  <label style={compactRentalLabel}>
                    Outbound condition
                    <select
                      aria-label={`${item.assetCode} outbound condition`}
                      value={(handover[item.accessoryUnitId]?.condition ?? item.outboundCondition)}
                      disabled={busy || working}
                      onChange={(event) =>
                        setHandover((current) => ({
                          ...current,
                          [item.accessoryUnitId]: {
                            condition: event.target.value as AccessoryCondition,
                            notes: current[item.accessoryUnitId]?.notes ?? "",
                          },
                        }))
                      }
                      style={rentalSelectStyle}
                    >
                      {ACCESSORY_CONDITIONS.map((condition) => <option key={condition} value={condition}>{statusLabel(condition)}</option>)}
                    </select>
                  </label>
                  <label style={compactRentalLabel}>
                    Handover notes
                    <input
                      aria-label={`${item.assetCode} handover notes`}
                      value={handover[item.accessoryUnitId]?.notes ?? ""}
                      disabled={busy || working}
                      onChange={(event) =>
                        setHandover((current) => ({
                          ...current,
                          [item.accessoryUnitId]: {
                            condition: current[item.accessoryUnitId]?.condition ?? item.outboundCondition,
                            notes: event.target.value,
                          },
                        }))
                      }
                      style={rentalSelectStyle}
                    />
                  </label>
                </div>
              )}

              {returned && item.outcome === "returned" && item.completedAt == null && (
                <InspectionUnitFields
                  item={item}
                  draft={inspection[item.accessoryUnitId]}
                  disabled={busy || working}
                  onChange={(next) => setInspection((current) => ({ ...current, [item.accessoryUnitId]: next }))}
                />
              )}
            </div>
          ))}

          {awaitingHandover && (
            <button type="button" className="btn btn-primary" style={miniBtn} disabled={busy || working} onClick={() => void confirmHandover()}>
              Confirm equipment handover
            </button>
          )}

          {deposit && <DepositControls deposit={deposit} action={depositAction} amount={retainedAmount} reason={retentionReason} disabled={busy || working} onAction={setDepositAction} onAmount={setRetainedAmount} onReason={setRetentionReason} onCollect={() => void updateDeposit("collected")} onUpdate={() => depositAction && void updateDeposit(depositAction)} />}
        </div>
      )}

      {returned && state.phase === "ready" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
          <input
            type="text"
            value={bikeNotes}
            onChange={(event) => setBikeNotes(event.target.value)}
            aria-label="Inspection notes"
            placeholder="Bike inspection notes (optional)"
            style={{ ...dateStyle, minWidth: 0, flex: "unset" }}
            disabled={busy || working}
          />
          {inspectionItems.length > 0 && !inspectionReady && (
            <span className="mono" style={{ ...editDateHint, color: "var(--warn)" }}>Choose an outcome for every returned accessory.</span>
          )}
          <div style={actionRow}>
            <button type="button" className="btn btn-primary" style={miniBtn} disabled={busy || working || !inspectionReady} onClick={() => void completeInspection(true)}>
              Pass inspection
            </button>
            <button type="button" className="btn btn-ghost" style={miniBtn} disabled={busy || working || !inspectionReady} onClick={() => void completeInspection(false)}>
              Fail inspection
            </button>
          </div>
        </div>
      )}
      </ActionBlock>
    </>
  );
}

function AccessoryCustodyHistory({ item }: { item: AdminRentalAccessory }) {
  const events = [
    `Assigned ${fmtDay(item.assignedAt.slice(0, 10))}`,
    item.handedOverAt ? `Handed over ${fmtDay(item.handedOverAt.slice(0, 10))}` : null,
    item.returnedAt ? `Returned ${fmtDay(item.returnedAt.slice(0, 10))}` : null,
    item.completedAt ? `Completed ${fmtDay(item.completedAt.slice(0, 10))}` : null,
  ].filter((event): event is string => event != null);

  return (
    <div
      aria-label={`${item.assetCode} custody history`}
      className="mono"
      style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10.5, color: "var(--text-dim)" }}
    >
      <span style={{ overflowWrap: "anywhere" }}>{events.join(" · ")}</span>
      {item.outboundNotes && <span style={{ overflowWrap: "anywhere" }}>Handover note: {item.outboundNotes}</span>}
      {item.inspectionNotes && <span style={{ overflowWrap: "anywhere" }}>Inspection note: {item.inspectionNotes}</span>}
    </div>
  );
}

function InspectionUnitFields({
  item,
  draft,
  disabled,
  onChange,
}: {
  item: AdminRentalAccessory;
  draft: InspectionDraft | undefined;
  disabled: boolean;
  onChange: (draft: InspectionDraft) => void;
}) {
  const current = draft ?? { outcome: "", condition: item.unitCondition, notes: "" };
  const showCondition = current.outcome === "returned" || current.outcome === "damaged";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
      <label style={compactRentalLabel}>
        Inspection outcome
        <select
          aria-label={`${item.assetCode} inspection outcome`}
          value={current.outcome}
          disabled={disabled}
          onChange={(event) => {
            const outcome = event.target.value as "" | InspectionOutcome;
            onChange({
              ...current,
              outcome,
              condition: outcome === "damaged"
                ? "damaged"
                : outcome === "returned" && current.condition === "damaged"
                  ? "good"
                  : current.condition,
            });
          }}
          style={rentalSelectStyle}
        >
          <option value="">Choose outcome</option>
          <option value="returned">Returned / serviceable</option>
          <option value="damaged">Damaged</option>
          <option value="missing">Missing</option>
          <option value="retained">Retained by customer</option>
        </select>
      </label>
      {showCondition && (
        <label style={compactRentalLabel}>
          Inbound condition
          <select
            aria-label={`${item.assetCode} inbound condition`}
            value={current.condition}
            disabled={disabled || current.outcome === "damaged"}
            onChange={(event) => onChange({ ...current, condition: event.target.value as AccessoryCondition })}
            style={rentalSelectStyle}
          >
            {(current.outcome === "damaged" ? ["damaged"] : ["new", "good", "worn"]).map((condition) => (
              <option key={condition} value={condition}>{statusLabel(condition)}</option>
            ))}
          </select>
        </label>
      )}
      <label style={{ ...compactRentalLabel, gridColumn: "1 / -1" }}>
        Accessory inspection notes
        <input
          aria-label={`${item.assetCode} inspection notes`}
          value={current.notes}
          disabled={disabled}
          onChange={(event) => onChange({ ...current, notes: event.target.value })}
          style={rentalSelectStyle}
        />
      </label>
    </div>
  );
}

function DepositControls({
  deposit,
  action,
  amount,
  reason,
  disabled,
  onAction,
  onAmount,
  onReason,
  onCollect,
  onUpdate,
}: {
  deposit: AdminRentalAccessory;
  action: "" | "refunded" | "partially_retained" | "retained";
  amount: string;
  reason: string;
  disabled: boolean;
  onAction: (action: "" | "refunded" | "partially_retained" | "retained") => void;
  onAmount: (amount: string) => void;
  onReason: (reason: string) => void;
  onCollect: () => void;
  onUpdate: () => void;
}) {
  const retention = action === "partially_retained" || action === "retained";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>Extra-battery deposit · {formatEur(deposit.depositAmount)}</span>
        <StatusPill value={deposit.depositStatus} />
      </div>
      {deposit.depositStatus === "due" && (
        <button type="button" className="btn btn-primary" style={miniBtn} disabled={disabled} onClick={onCollect}>Mark deposit collected</button>
      )}
      {deposit.depositStatus === "collected" && (
        <>
          <label style={compactRentalLabel}>
            Deposit outcome
            <select
              aria-label="Deposit outcome"
              value={action}
              disabled={disabled}
              onChange={(event) =>
                onAction(event.target.value as "" | "refunded" | "partially_retained" | "retained")
              }
              style={rentalSelectStyle}
            >
              <option value="">Choose outcome</option>
              <option value="refunded">Refunded in full</option>
              <option value="partially_retained">Partly retained</option>
              <option value="retained">Retained</option>
            </select>
          </label>
          {retention && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
              <label style={compactRentalLabel}>
                Amount retained (€)
                <input aria-label="Amount retained (€)" type="number" min={0} max={deposit.depositAmount} step="0.01" value={amount} disabled={disabled} onChange={(event) => onAmount(event.target.value)} style={rentalSelectStyle} />
              </label>
              <label style={compactRentalLabel}>
                Retention reason
                <input aria-label="Retention reason" value={reason} disabled={disabled} onChange={(event) => onReason(event.target.value)} style={rentalSelectStyle} />
              </label>
            </div>
          )}
          <button type="button" className="btn btn-ghost" style={miniBtn} disabled={disabled || !action} onClick={onUpdate}>Update deposit</button>
        </>
      )}
      {(deposit.depositStatus === "partially_retained" || deposit.depositStatus === "retained") && (
        <span className="mono" style={editDateHint}>
          {formatEur(deposit.retainedAmount)} retained{deposit.retainedReason ? ` · ${deposit.retainedReason}` : ""}
        </span>
      )}
    </div>
  );
}

function validInspectionDraft(draft: InspectionDraft | undefined): boolean {
  if (!draft?.outcome) return false;
  if (draft.outcome === "returned") return draft.condition !== "damaged";
  if (draft.outcome === "damaged") return draft.condition === "damaged";
  return true;
}

function accessoryInspectionEvent(outcome: AccessoryAssignmentOutcome): string | null {
  switch (outcome) {
    case "returned":
      return null;
    case "damaged":
      return "admin_accessory_damage";
    case "missing":
      return "admin_accessory_loss";
    case "retained":
      return "admin_accessory_retained";
    default:
      return "admin_accessory_inspection";
  }
}

function accessoryCustodyAnalytics(
  data: AdminRentalAccessoryResponse,
  item: AdminRentalAccessory,
  outcome: AccessoryAssignmentOutcome,
): Record<string, string> {
  return {
    ...(data.offerCode ? { offer_code: data.offerCode } : {}),
    component_code: item.accessoryCode,
    city: item.cityId,
    outcome,
  };
}

function isRentalUnauthorized(error: unknown): boolean {
  return error instanceof RentalAuthError || (error instanceof RentalApiError && error.unauthorized);
}

function rentalActionError(error: unknown, fallback: string): string {
  return error instanceof RentalApiError || error instanceof RentalConfigError || error instanceof RentalAuthError
    ? error.message
    : fallback;
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

const custodyItemStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: "12px 0",
  borderBottom: "1px solid var(--border)",
};

const compactRentalLabel: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  fontSize: 11,
  color: "var(--text-muted)",
  fontFamily: "var(--font-mono)",
};

const rentalSelectStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  padding: "8px 10px",
  borderRadius: "var(--r-sm)",
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  letterSpacing: 0,
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
