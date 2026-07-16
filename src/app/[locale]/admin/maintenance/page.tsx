"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  listTickets,
  createTicket,
  updateStatus,
  deleteTicket,
  MaintenanceApiError,
  MaintenanceConfigError,
  MaintenanceAuthError,
  type MaintenanceTicket,
  type CreateTicketInput,
} from "@/services/adminMaintenanceService";
import { AdminTable, AdminSection, Th, Td, EmptyRow, fmtDate } from "@/components/admin/Table";
import { StatusPill, statusLabel } from "@/components/admin/StatusPill";
import { Notice, InlineError, ErrorPanel } from "@/components/admin/Feedback";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { useAdminRefresh } from "@/components/admin/useAdminRefresh";
import { Drawer } from "@/components/admin/Drawer";
import { PageHeader } from "@/components/admin/PageHeader";
import { confirmAction } from "@/lib/confirm";

/**
 * Valid MaintenanceStatus values — wire values must match what the backend emits
 * (enum name, lower-cased, no separators), so they round-trip through the
 * case-insensitive Enum.TryParse on PATCH. Display labels come from the shared
 * statusLabel map ("inprogress" → "In progress").
 */
const TICKET_STATUSES = ["open", "inprogress", "resolved"] as const;

/** Valid MaintenanceIssueType values (Rentaro.Domain), lower-cased for the wire. */
const ISSUE_TYPES = [
  "puncture",
  "brakes",
  "battery",
  "motor",
  "lock",
  "charger",
  "generalservice",
  "inspection",
  "accident",
] as const;

/** Valid MaintenancePriority values (Rentaro.Domain), lower-cased for the wire. */
const PRIORITIES = ["low", "medium", "high"] as const;

/** Open/Resolved buckets for the filter tabs: "resolved" is its own bucket;
 *  everything else (open, inprogress, unknown) still needs attention. */
function isTicketResolved(t: MaintenanceTicket): boolean {
  return t.status.toLowerCase() === "resolved";
}

type TicketFilter = "open" | "resolved" | "all";

type LoadState =
  | { phase: "loading" }
  | { phase: "ready"; tickets: MaintenanceTicket[] }
  | { phase: "error"; message: string; config: boolean };

export default function AdminMaintenancePage() {
  const { signOut } = useAdminAuth();
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  // Tracks which ticket ids currently have an in-flight status update.
  const [pending, setPending] = useState<Record<number, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  // Whether the "New ticket" drawer is open.
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Filter tabs (Open / Resolved / All). Deep links pre-select via ?filter=.
  const urlFilter = useSearchParams().get("filter");
  const [filter, setFilter] = useState<TicketFilter>(() =>
    urlFilter === "resolved" || urlFilter === "all" ? urlFilter : "open",
  );
  useEffect(() => {
    if (urlFilter === "open" || urlFilter === "resolved" || urlFilter === "all") {
      setFilter(urlFilter);
    }
  }, [urlFilter]);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (!silent) {
        setState({ phase: "loading" });
        setActionError(null);
      }
      try {
        const tickets = await listTickets();
        setState({ phase: "ready", tickets });
      } catch (err) {
        if (err instanceof MaintenanceAuthError || (err instanceof MaintenanceApiError && err.unauthorized)) {
          signOut();
        } else if (silent) {
          // Keep the current table (and any open drawer) on screen; surface inline.
          setActionError(
            err instanceof MaintenanceApiError || err instanceof MaintenanceConfigError
              ? err.message
              : "Something went wrong refreshing maintenance tickets.",
          );
        } else {
          setState(toErrorState(err, "Something went wrong loading maintenance tickets."));
        }
      }
    },
    [signOut],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // The topbar Refresh reloads in place, so an open drawer survives it.
  useAdminRefresh(useCallback(() => void load({ silent: true }), [load]));

  async function changeStatus(id: number, nextStatus: string) {
    if (state.phase !== "ready") return;
    const current = state.tickets.find((t) => t.id === id);
    if (!current || current.status === nextStatus) return;

    // Resolving stamps resolvedAt and takes the ticket out of the open queue —
    // worth a pause, since the select fires on a single (mis)click.
    if (
      nextStatus === "resolved" &&
      !confirmAction(`Mark ticket #${id} as resolved? It leaves the open queue and gets a resolved date.`)
    ) {
      return;
    }

    setActionError(null);
    setPending((p) => ({ ...p, [id]: true }));
    try {
      const updated = await updateStatus(id, nextStatus);
      setState((s) =>
        s.phase === "ready"
          ? { ...s, tickets: s.tickets.map((t) => (t.id === id ? updated : t)) }
          : s,
      );
    } catch (err) {
      handleActionError(err, `Could not update ticket #${id}.`);
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    }
  }

  async function removeTicket(id: number) {
    if (!confirmAction(`Delete ticket #${id} permanently?`, { finality: "irreversible" })) {
      return;
    }
    setActionError(null);
    setPending((p) => ({ ...p, [id]: true }));
    try {
      await deleteTicket(id);
      setState((s) =>
        s.phase === "ready" ? { ...s, tickets: s.tickets.filter((t) => t.id !== id) } : s,
      );
    } catch (err) {
      // A backend without the DELETE endpoint answers 400/404 — surfaced here
      // as a normal inline error, so the page stays usable either way.
      handleActionError(err, `Could not delete ticket #${id}.`);
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    }
  }

  // Returns null on success, or an error message for the drawer to show inline.
  async function submitTicket(input: CreateTicketInput): Promise<string | null> {
    setActionError(null);
    try {
      const created = await createTicket(input);
      setState((s) =>
        s.phase === "ready" ? { ...s, tickets: [created, ...s.tickets] } : s,
      );
      setDrawerOpen(false);
      return null;
    } catch (err) {
      if (
        err instanceof MaintenanceAuthError ||
        (err instanceof MaintenanceApiError && err.unauthorized)
      ) {
        signOut();
        return null;
      }
      return err instanceof MaintenanceApiError ? err.message : "Could not create the ticket.";
    }
  }

  /** Drops to the shell sign-in on 401, otherwise shows an inline action error. */
  function handleActionError(err: unknown, fallback: string) {
    if (
      err instanceof MaintenanceAuthError ||
      (err instanceof MaintenanceApiError && err.unauthorized)
    ) {
      signOut();
    } else {
      setActionError(err instanceof MaintenanceApiError ? err.message : fallback);
    }
  }

  return (
    <div>
      {state.phase === "loading" ? (
        <Notice>Loading maintenance tickets…</Notice>
      ) : state.phase === "error" ? (
        <ErrorPanel message={state.message} config={state.config} onRetry={() => void load()} />
      ) : (
        <>
          <PageHeader
            title="Maintenance"
            subtitle="Log and track repairs and service for bike units."
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setDrawerOpen(true)}
              style={{ padding: "11px 20px", fontSize: 14 }}
            >
              + New ticket
            </button>
          </PageHeader>

          {actionError && <InlineError message={actionError} />}

          <TicketsTable
            tickets={state.tickets}
            filter={filter}
            onFilter={setFilter}
            pending={pending}
            onChangeStatus={changeStatus}
            onDelete={(id) => void removeTicket(id)}
          />

          <NewTicketDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            onSubmit={submitTicket}
          />
        </>
      )}
    </div>
  );
}

/* ── New ticket drawer ─────────────────────────────────────────────────── */

function NewTicketDrawer({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateTicketInput) => Promise<string | null>;
}) {
  const [bikeUnitCode, setBikeUnitCode] = useState("");
  const [issueType, setIssueType] = useState<string>(ISSUE_TYPES[0]);
  const [priority, setPriority] = useState<string>(PRIORITIES[1]); // medium
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const codeOk = bikeUnitCode.trim().length > 0;
  const canSubmit = codeOk && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setFormError(null);
    const err = await onSubmit({
      bikeUnitCode: bikeUnitCode.trim(),
      issueType,
      priority,
      description: description.trim(),
    });
    setSubmitting(false);
    if (err) {
      setFormError(err);
    } else {
      // Reset the free-text fields; keep issue/priority selections for fast entry.
      setBikeUnitCode("");
      setDescription("");
    }
  }

  // Closing clears any submit error so it never lingers on the next open.
  function close() {
    setFormError(null);
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="New ticket"
      footer={
        <>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={close}
            style={{ padding: "11px 20px", fontSize: 14 }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            style={{
              padding: "11px 20px",
              fontSize: 14,
              opacity: canSubmit ? 1 : 0.55,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? "Creating…" : "Create ticket"}
          </button>
        </>
      }
    >
      {/* Submitting on Enter mirrors the footer's Create action. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        {formError && <InlineError message={formError} />}

        <div className="field">
          <label htmlFor="mt-bike-code">Bike unit code</label>
          <input
            id="mt-bike-code"
            value={bikeUnitCode}
            onChange={(e) => setBikeUnitCode(e.target.value)}
            placeholder="e.g. TLN-EP-001"
            aria-label="Bike unit code"
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label>Issue type</label>
            <Select value={issueType} onChange={setIssueType} options={ISSUE_TYPES} ariaLabel="Issue type" />
          </div>

          <div className="field">
            <label>Priority</label>
            <Select value={priority} onChange={setPriority} options={PRIORITIES} ariaLabel="Priority" />
          </div>
        </div>

        <div className="field">
          <label htmlFor="mt-description">Description</label>
          <textarea
            id="mt-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's wrong with the bike?"
            aria-label="Description"
            rows={4}
            style={{ resize: "vertical", lineHeight: 1.5 }}
          />
        </div>

        {!codeOk && (
          <p className="mono" style={{ fontSize: 11.5, color: "var(--text-dim)", margin: 0 }}>
            A bike unit code is required.
          </p>
        )}

        {/* Hidden submit keeps Enter-to-create working without a visible button. */}
        <button type="submit" style={{ display: "none" }} aria-hidden tabIndex={-1} />
      </form>
    </Drawer>
  );
}

function Select({
  value,
  onChange,
  options,
  ariaLabel,
  busy = false,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Wire values; display labels come from the shared statusLabel map. */
  options: ReadonlyArray<string>;
  ariaLabel: string;
  busy?: boolean;
}) {
  // Include the current value even if it isn't in the known list, so the select
  // never silently drops an unexpected backend value.
  const opts = options.includes(value) ? options : [value, ...options];

  return (
    <select
      value={value}
      disabled={busy}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      style={{
        appearance: "none",
        WebkitAppearance: "none",
        width: "100%",
        padding: "10px 12px",
        borderRadius: "var(--r-sm)",
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        color: "var(--text-2)",
        fontFamily: "var(--font-mono)",
        fontSize: 12.5,
        letterSpacing: "0.02em",
        cursor: busy ? "wait" : "pointer",
        opacity: busy ? 0.6 : 1,
      }}
    >
      {opts.map((o) => (
        <option key={o} value={o} style={{ background: "var(--panel)", color: "var(--text)" }}>
          {statusLabel(o)}
        </option>
      ))}
    </select>
  );
}

/* ── Tickets table ─────────────────────────────────────────────────────── */

function TicketsTable({
  tickets,
  filter,
  onFilter,
  pending,
  onChangeStatus,
  onDelete,
}: {
  tickets: MaintenanceTicket[];
  filter: TicketFilter;
  onFilter: (next: TicketFilter) => void;
  pending: Record<number, boolean>;
  onChangeStatus: (id: number, status: string) => void;
  onDelete: (id: number) => void;
}) {
  const open = tickets.filter((t) => !isTicketResolved(t));
  const resolved = tickets.filter(isTicketResolved);
  const shown = filter === "open" ? open : filter === "resolved" ? resolved : tickets;

  const emptyLabel =
    tickets.length === 0
      ? "No maintenance tickets. Log one with + New ticket."
      : filter === "open"
        ? "No open tickets."
        : "No resolved tickets.";

  return (
    <AdminSection title="Tickets" count={shown.length} noun="ticket">
      <FilterTabs
        filter={filter}
        onFilter={onFilter}
        counts={{ open: open.length, resolved: resolved.length, all: tickets.length }}
      />
      <AdminTable>
        <thead>
          <tr>
            <Th>Created</Th>
            <Th>Bike unit</Th>
            <Th>Issue</Th>
            <Th>Priority</Th>
            <Th>Status</Th>
            <Th>Change status</Th>
            <Th>Resolved</Th>
            <Th>Description</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {shown.length === 0 ? (
            <EmptyRow colSpan={9} label={emptyLabel} />
          ) : (
            shown.map((t) => (
              <tr key={t.id}>
                <Td mono nowrap>
                  {fmtDate(t.createdAt)}
                </Td>
                <Td mono>{t.bikeUnitCode?.trim() ? t.bikeUnitCode : "—"}</Td>
                <Td nowrap>{statusLabel(t.issueType)}</Td>
                <Td nowrap>
                  <StatusPill value={t.priority} />
                </Td>
                <Td nowrap>
                  <StatusPill value={t.status} />
                </Td>
                <Td nowrap>
                  <StatusSelect
                    value={t.status}
                    busy={Boolean(pending[t.id])}
                    onChange={(next) => onChangeStatus(t.id, next)}
                  />
                </Td>
                <Td mono nowrap>
                  {t.resolvedAt ? fmtDate(t.resolvedAt) : "—"}
                </Td>
                <Td dim>{t.description?.trim() ? t.description : "—"}</Td>
                <Td nowrap>
                  {/* Deliberately quieter than the Resolve path (the status
                      select) — deleting a ticket is the rarer, harsher action. */}
                  <button
                    type="button"
                    className="admin-row-action danger"
                    onClick={() => onDelete(t.id)}
                    disabled={Boolean(pending[t.id])}
                  >
                    Delete
                  </button>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </AdminTable>
    </AdminSection>
  );
}

/** Lightweight segmented filter above the tickets table. */
function FilterTabs({
  filter,
  onFilter,
  counts,
}: {
  filter: TicketFilter;
  onFilter: (next: TicketFilter) => void;
  counts: Record<TicketFilter, number>;
}) {
  const tabs: { id: TicketFilter; label: string }[] = [
    { id: "open", label: "Open" },
    { id: "resolved", label: "Resolved" },
    { id: "all", label: "All" },
  ];
  return (
    <div
      role="group"
      aria-label="Filter tickets"
      style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`admin-row-action${filter === t.id ? " is-active" : ""}`}
          aria-pressed={filter === t.id}
          onClick={() => onFilter(t.id)}
        >
          {t.label}
          <span style={{ opacity: 0.75 }}>{counts[t.id]}</span>
        </button>
      ))}
    </div>
  );
}

function StatusSelect({
  value,
  busy,
  onChange,
}: {
  value: string;
  busy: boolean;
  onChange: (next: string) => void;
}) {
  return (
    <div style={{ minWidth: 150 }}>
      <Select
        value={value}
        busy={busy}
        onChange={onChange}
        options={TICKET_STATUSES}
        ariaLabel="Change ticket status"
      />
    </div>
  );
}

/* ── Error mapping (auth failures are handled by the caller via signOut) ─── */

function toErrorState(err: unknown, fallback: string): LoadState {
  if (err instanceof MaintenanceConfigError) {
    return { phase: "error", message: err.message, config: true };
  }
  if (err instanceof MaintenanceApiError) {
    return { phase: "error", message: err.message, config: false };
  }
  return { phase: "error", message: fallback, config: false };
}
