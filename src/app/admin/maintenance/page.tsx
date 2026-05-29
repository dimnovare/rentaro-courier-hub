"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
  | { phase: "no-auth" }
  | { phase: "error"; message: string; unauthorized: boolean; config: boolean };

export default function AdminMaintenancePage() {
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  // Tracks which ticket ids currently have an in-flight status update.
  const [pending, setPending] = useState<Record<number, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    setActionError(null);
    try {
      const tickets = await listTickets();
      setState({ phase: "ready", tickets });
    } catch (err) {
      setState(toErrorState(err, "Something went wrong loading maintenance tickets."));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  async function submitTicket(input: CreateTicketInput): Promise<boolean> {
    setActionError(null);
    try {
      const created = await createTicket(input);
      setState((s) =>
        s.phase === "ready" ? { ...s, tickets: [created, ...s.tickets] } : s,
      );
      return true;
    } catch (err) {
      handleActionError(err, "Could not create the ticket.");
      return false;
    }
  }

  /** Drops to the auth gate on 401, otherwise shows an inline action error. */
  function handleActionError(err: unknown, fallback: string) {
    if (
      err instanceof MaintenanceAuthError ||
      (err instanceof MaintenanceApiError && err.unauthorized)
    ) {
      setState({ phase: "no-auth" });
    } else {
      setActionError(err instanceof MaintenanceApiError ? err.message : fallback);
    }
  }

  return (
    <main className="wrap" style={{ paddingTop: 40, paddingBottom: 80, minHeight: "70vh" }}>
      <PageHeader
        showRefresh={state.phase === "ready" || state.phase === "error"}
        onRefresh={() => void load()}
      />

      {state.phase === "loading" ? (
        <Notice>Loading maintenance tickets…</Notice>
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
          {actionError && <InlineError message={actionError} />}

          <NewTicketForm onSubmit={submitTicket} />

          <TicketsTable
            tickets={state.tickets}
            pending={pending}
            onChangeStatus={changeStatus}
          />
        </>
      )}
    </main>
  );
}

/* ── New ticket form ───────────────────────────────────────────────────── */

function NewTicketForm({
  onSubmit,
}: {
  onSubmit: (input: CreateTicketInput) => Promise<boolean>;
}) {
  const [bikeUnitCode, setBikeUnitCode] = useState("");
  const [issueType, setIssueType] = useState<string>(ISSUE_TYPES[0].value);
  const [priority, setPriority] = useState<string>(PRIORITIES[1].value); // medium
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const codeOk = bikeUnitCode.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!codeOk || submitting) return;
    setSubmitting(true);
    const ok = await onSubmit({
      bikeUnitCode: bikeUnitCode.trim(),
      issueType,
      priority,
      description: description.trim(),
    });
    setSubmitting(false);
    if (ok) {
      // Reset the free-text fields; keep issue/priority selections for fast entry.
      setBikeUnitCode("");
      setDescription("");
    }
  }

  return (
    <section style={{ marginBottom: 44 }}>
      <SectionHead title="New ticket" />
      <form onSubmit={handleSubmit} className="card" style={{ padding: 24 }}>
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          }}
        >
          <Field label="Bike unit code">
            <input
              value={bikeUnitCode}
              onChange={(e) => setBikeUnitCode(e.target.value)}
              placeholder="e.g. TLN-EP-001"
              aria-label="Bike unit code"
              style={inputStyle}
            />
          </Field>

          <Field label="Issue type">
            <Select value={issueType} onChange={setIssueType} options={ISSUE_TYPES} ariaLabel="Issue type" />
          </Field>

          <Field label="Priority">
            <Select value={priority} onChange={setPriority} options={PRIORITIES} ariaLabel="Priority" />
          </Field>
        </div>

        <div style={{ marginTop: 16 }}>
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's wrong with the bike?"
              aria-label="Description"
              rows={3}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
            />
          </Field>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18, flexWrap: "wrap" }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!codeOk || submitting}
            style={{
              padding: "12px 22px",
              fontSize: 14,
              opacity: !codeOk || submitting ? 0.55 : 1,
              cursor: !codeOk || submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Creating…" : "Create ticket"}
          </button>
          {!codeOk && (
            <span className="mono" style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
              A bike unit code is required.
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <span
        className="mono"
        style={{
          fontSize: 10.5,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-dim)",
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "var(--r-sm)",
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  color: "var(--text-2)",
  fontFamily: "var(--font-mono)",
  fontSize: 12.5,
  letterSpacing: "0.02em",
};

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

function PageHeader({ showRefresh, onRefresh }: { showRefresh: boolean; onRefresh: () => void }) {
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
          <span style={{ color: "var(--lime)" }}>maintenance</span>
        </h1>
        <p className="mono" style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 6 }}>
          Tickets, priority &amp; repair status
        </p>
        <Link
          href="/admin"
          className="mono"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: 11.5,
            color: "var(--text-muted)",
            textDecoration: "none",
            marginTop: 12,
          }}
        >
          <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>→</span> Admin home
        </Link>
      </div>
      {showRefresh && (
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: "11px 18px", fontSize: 13.5 }}
            onClick={onRefresh}
          >
            Refresh
          </button>
        </div>
      )}
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

function AuthGate() {
  return (
    <div className="card" style={{ padding: 32, maxWidth: 460 }}>
      <h2 style={{ fontSize: 20, letterSpacing: "-0.02em", marginBottom: 6 }}>Sign in required</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 22, lineHeight: 1.6 }}>
        You need an admin session to manage maintenance. Sign in on the admin home, then return here.
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
        style={{
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--danger)",
          marginBottom: 10,
        }}
      >
        {config ? "Not configured" : unauthorized ? "Unauthorized" : "Error"}
      </div>
      <p style={{ color: "var(--text-2)", fontSize: 14.5, margin: "0 0 20px", lineHeight: 1.6 }}>
        {message}
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {unauthorized ? (
          <Link
            href="/admin"
            className="btn btn-primary"
            style={{ padding: "12px 22px", fontSize: 14, textDecoration: "none" }}
          >
            Sign in again
          </Link>
        ) : config ? null : (
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
    </div>
  );
}

/* ── Error mapping ─────────────────────────────────────────────────────── */

function toErrorState(err: unknown, fallback: string): LoadState {
  if (err instanceof MaintenanceAuthError) {
    return { phase: "no-auth" };
  }
  if (err instanceof MaintenanceConfigError) {
    return { phase: "error", message: err.message, unauthorized: false, config: true };
  }
  if (err instanceof MaintenanceApiError) {
    return { phase: "error", message: err.message, unauthorized: err.unauthorized, config: false };
  }
  return { phase: "error", message: fallback, unauthorized: false, config: false };
}
