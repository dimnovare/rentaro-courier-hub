"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listTickets,
  createTicket,
  updateStatus,
  MaintenanceApiError,
  MaintenanceConfigError,
  MaintenanceAuthError,
  type MaintenanceTicket,
  type CreateTicketInput,
} from "@/services/adminMaintenanceService";
import { AdminTable, Th, Td, EmptyRow, fmtDate } from "@/components/admin/Table";
import { StatusPill } from "@/components/admin/StatusPill";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { useAdminRefresh } from "@/components/admin/useAdminRefresh";
import { Drawer } from "@/components/admin/Drawer";
import { PageHeader } from "@/components/admin/PageHeader";

/**
 * Valid MaintenanceStatus values — wire values must match what the backend emits
 * (enum name, lower-cased, no separators), so they round-trip through the
 * case-insensitive Enum.TryParse on PATCH.
 */
const TICKET_STATUSES = [
  { value: "open", label: "open" },
  { value: "inprogress", label: "in progress" },
  { value: "resolved", label: "resolved" },
] as const;

/** Valid MaintenanceIssueType values (Rentaro.Domain), lower-cased for the wire. */
const ISSUE_TYPES = [
  { value: "puncture", label: "puncture" },
  { value: "brakes", label: "brakes" },
  { value: "battery", label: "battery" },
  { value: "motor", label: "motor" },
  { value: "lock", label: "lock" },
  { value: "charger", label: "charger" },
  { value: "generalservice", label: "general service" },
  { value: "inspection", label: "inspection" },
  { value: "accident", label: "accident" },
] as const;

/** Valid MaintenancePriority values (Rentaro.Domain), lower-cased for the wire. */
const PRIORITIES = [
  { value: "low", label: "low" },
  { value: "medium", label: "medium" },
  { value: "high", label: "high" },
] as const;

/** Pretty label for a raw status value coming back from the API. */
function statusLabel(value: string): string {
  return TICKET_STATUSES.find((s) => s.value === value.toLowerCase())?.label ?? value;
}

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

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    setActionError(null);
    try {
      const tickets = await listTickets();
      setState({ phase: "ready", tickets });
    } catch (err) {
      if (err instanceof MaintenanceAuthError || (err instanceof MaintenanceApiError && err.unauthorized)) {
        signOut();
      } else {
        setState(toErrorState(err, "Something went wrong loading maintenance tickets."));
      }
    }
  }, [signOut]);

  useEffect(() => {
    void load();
  }, [load]);

  useAdminRefresh(load);

  async function changeStatus(id: number, nextStatus: string) {
    if (state.phase !== "ready") return;
    const current = state.tickets.find((t) => t.id === id);
    if (!current || current.status === nextStatus) return;

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
            pending={pending}
            onChangeStatus={changeStatus}
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
  const [issueType, setIssueType] = useState<string>(ISSUE_TYPES[0].value);
  const [priority, setPriority] = useState<string>(PRIORITIES[1].value); // medium
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
        {formError && (
          <div
            className="mono"
            role="alert"
            style={{
              color: "var(--danger)",
              fontSize: 12,
              marginBottom: 16,
              padding: "10px 13px",
              borderRadius: "var(--r-sm)",
              border: "1px solid rgba(255, 138, 120, 0.32)",
              background: "rgba(255, 138, 120, 0.06)",
            }}
          >
            {formError}
          </div>
        )}

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
  options: ReadonlyArray<{ value: string; label: string }>;
  ariaLabel: string;
  busy?: boolean;
}) {
  // Include the current value even if it isn't in the known list, so the select
  // never silently drops an unexpected backend value.
  const known = options.some((o) => o.value === value);
  const opts = known ? options : [{ value, label: statusLabel(value) }, ...options];

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
        <option key={o.value} value={o.value} style={{ background: "var(--panel)", color: "var(--text)" }}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ── Tickets table ─────────────────────────────────────────────────────── */

function TicketsTable({
  tickets,
  pending,
  onChangeStatus,
}: {
  tickets: MaintenanceTicket[];
  pending: Record<number, boolean>;
  onChangeStatus: (id: number, status: string) => void;
}) {
  return (
    <section style={{ marginBottom: 24 }}>
      <SectionHead title="Tickets" count={tickets.length} />
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
          </tr>
        </thead>
        <tbody>
          {tickets.length === 0 ? (
            <EmptyRow colSpan={8} label="No maintenance tickets." />
          ) : (
            tickets.map((t) => (
              <tr key={t.id}>
                <Td mono nowrap>
                  {fmtDate(t.createdAt)}
                </Td>
                <Td mono>{t.bikeUnitCode}</Td>
                <Td nowrap>{t.issueType.replace(/_/g, " ")}</Td>
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
              </tr>
            ))
          )}
        </tbody>
      </AdminTable>
    </section>
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

/* ── Shared pieces (mirrors the fleet page) ────────────────────────────── */

function SectionHead({ title, count }: { title: string; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
      <h2 style={{ fontSize: 22, letterSpacing: "-0.02em" }}>{title}</h2>
      {typeof count === "number" && (
        <span className="mono" style={{ fontSize: 12, color: "var(--text-dim)" }}>
          {count} {count === 1 ? "ticket" : "tickets"}
        </span>
      )}
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

function InlineError({ message }: { message: string }) {
  return (
    <div
      className="mono"
      style={{
        color: "var(--danger)",
        fontSize: 12.5,
        marginBottom: 20,
        padding: "12px 16px",
        borderRadius: "var(--r-md)",
        border: "1px solid rgba(255, 138, 120, 0.32)",
        background: "rgba(255, 138, 120, 0.06)",
      }}
    >
      {message}
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
        style={{
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--danger)",
          marginBottom: 10,
        }}
      >
        {config ? "Not configured" : "Error"}
      </div>
      <p style={{ color: "var(--text-2)", fontSize: 14.5, margin: "0 0 20px", lineHeight: 1.6 }}>
        {message}
      </p>
      {!config && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={onRetry}
          style={{ padding: "12px 22px", fontSize: 14 }}
        >
          Try again
        </button>
      )}
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
