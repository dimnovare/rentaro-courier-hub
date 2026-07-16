"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  listSupportTickets,
  resolveSupportTicket,
  SupportApiError,
  SupportConfigError,
  SupportAuthError,
  type SupportTicket,
} from "@/services/adminSupportService";
import { AdminTable, AdminSection, Th, Td, EmptyRow, fmtDate } from "@/components/admin/Table";
import { StatusPill } from "@/components/admin/StatusPill";
import { Notice, InlineError, ErrorPanel } from "@/components/admin/Feedback";
import { Drawer } from "@/components/admin/Drawer";
import { PageHeader } from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { useAdminRefresh } from "@/components/admin/useAdminRefresh";
import { confirmAction } from "@/lib/confirm";

/* ── Load-state machine (mirrors the maintenance page) ─────────────────── */

type LoadState =
  | { phase: "loading" }
  | { phase: "ready"; tickets: SupportTicket[] }
  | { phase: "error"; message: string; config: boolean };

/** A ticket counts as resolved when the backend set a `resolvedAt` timestamp. */
function isResolved(t: SupportTicket): boolean {
  return Boolean(t.resolvedAt) || t.status.toLowerCase() === "resolved";
}

export default function AdminSupportPage() {
  const { signOut } = useAdminAuth();
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  // Tracks which ticket ids currently have an in-flight resolve.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  // The ticket whose full message is open in the drawer (null when closed).
  const [viewing, setViewing] = useState<SupportTicket | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (!silent) {
        setState({ phase: "loading" });
        setActionError(null);
      }
      try {
        const tickets = await listSupportTickets();
        setState({ phase: "ready", tickets });
      } catch (err) {
        if (err instanceof SupportAuthError || (err instanceof SupportApiError && err.unauthorized)) {
          signOut();
        } else if (silent) {
          // Keep the current inbox (and any open drawer) on screen; surface inline.
          setActionError(
            err instanceof SupportApiError || err instanceof SupportConfigError
              ? err.message
              : "Something went wrong refreshing support tickets.",
          );
        } else {
          setState(toErrorState(err, "Something went wrong loading support tickets."));
        }
      }
    },
    [signOut],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // The topbar Refresh reloads in place, so an open message drawer survives it.
  useAdminRefresh(useCallback(() => void load({ silent: true }), [load]));

  /** Drops to the shell sign-in on 401, otherwise shows an inline action error. */
  const handleActionError = useCallback(
    (err: unknown, fallback: string) => {
      if (err instanceof SupportAuthError || (err instanceof SupportApiError && err.unauthorized)) {
        signOut();
      } else {
        setActionError(err instanceof SupportApiError ? err.message : fallback);
      }
    },
    [signOut],
  );

  async function resolve(id: string) {
    if (!confirmAction("Mark this support ticket as resolved? It moves out of the open queue.")) {
      return;
    }
    setActionError(null);
    setPending((p) => ({ ...p, [id]: true }));
    try {
      const updated = await resolveSupportTicket(id);
      setState((s) =>
        s.phase === "ready"
          ? { ...s, tickets: s.tickets.map((t) => (t.id === id ? updated : t)) }
          : s,
      );
      setViewing((v) => (v && v.id === id ? updated : v));
    } catch (err) {
      handleActionError(err, `Could not resolve ticket #${id}.`);
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    }
  }

  return (
    <div>
      {state.phase === "loading" ? (
        <Notice>Loading support tickets…</Notice>
      ) : state.phase === "error" ? (
        <ErrorPanel message={state.message} config={state.config} onRetry={() => void load()} />
      ) : (
        <>
          <PageHeader
            title="Support"
            subtitle="Messages couriers send from the site. Resolve once handled."
          />

          {actionError && <InlineError message={actionError} />}

          <TicketsTable
            tickets={state.tickets}
            pending={pending}
            onResolve={(id) => void resolve(id)}
            onView={setViewing}
          />

          <TicketDrawer
            ticket={viewing}
            busy={viewing ? Boolean(pending[viewing.id]) : false}
            onClose={() => setViewing(null)}
            onResolve={(id) => void resolve(id)}
          />
        </>
      )}
    </div>
  );
}

/* ── Tickets table ─────────────────────────────────────────────────────── */

function TicketsTable({
  tickets,
  pending,
  onResolve,
  onView,
}: {
  tickets: SupportTicket[];
  pending: Record<string, boolean>;
  onResolve: (id: string) => void;
  onView: (ticket: SupportTicket) => void;
}) {
  return (
    <AdminSection title="Support inbox" count={tickets.length} noun="ticket">
      <AdminTable>
        <thead>
          <tr>
            <Th>Received</Th>
            <Th>Customer</Th>
            <Th>Source</Th>
            <Th>Booking</Th>
            <Th>Message</Th>
            <Th>Status</Th>
            <Th>Resolved</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {tickets.length === 0 ? (
            <EmptyRow
              colSpan={8}
              label="No support tickets. Messages couriers send from the site will appear here."
            />
          ) : (
            tickets.map((t) => {
              const resolved = isResolved(t);
              return (
                <tr key={t.id}>
                  <Td mono nowrap>
                    {fmtDate(t.createdAt)}
                  </Td>
                  <Td mono nowrap>
                    {t.customerEmail || "—"}
                  </Td>
                  <Td nowrap>{t.source ? t.source.replace(/_/g, " ") : "—"}</Td>
                  <Td mono nowrap>
                    <BookingRef bookingId={t.bookingId} />
                  </Td>
                  <Td>
                    <button
                      type="button"
                      onClick={() => onView(t)}
                      className="mono"
                      title="View full message"
                      style={{
                        display: "block",
                        maxWidth: 360,
                        textAlign: "left",
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        color: "var(--text-2)",
                        fontSize: 12.5,
                        lineHeight: 1.5,
                        cursor: "pointer",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        textDecoration: "underline",
                        textDecorationColor: "var(--border-strong)",
                        textUnderlineOffset: 3,
                      }}
                    >
                      {t.message?.trim() ? t.message : "—"}
                    </button>
                  </Td>
                  <Td nowrap>
                    {/* No forced tone: toneFor gives open the standard warn
                        treatment (matches the maintenance queue). */}
                    <StatusPill value={resolved ? "resolved" : "open"} />
                  </Td>
                  <Td mono nowrap>
                    {t.resolvedAt ? fmtDate(t.resolvedAt) : "—"}
                  </Td>
                  <Td nowrap>
                    <ResolveButton
                      resolved={resolved}
                      busy={Boolean(pending[t.id])}
                      onClick={() => onResolve(t.id)}
                    />
                  </Td>
                </tr>
              );
            })
          )}
        </tbody>
      </AdminTable>
    </AdminSection>
  );
}

function ResolveButton({
  resolved,
  busy,
  onClick,
}: {
  resolved: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  if (resolved) {
    return (
      <span className="mono" style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
        resolved
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="mono"
      style={{
        padding: "6px 12px",
        fontSize: 11.5,
        letterSpacing: "0.03em",
        borderRadius: "var(--r-full)",
        cursor: busy ? "wait" : "pointer",
        background: "var(--surface)",
        border: "1px solid var(--border-strong)",
        color: "var(--text-2)",
        opacity: busy ? 0.6 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {busy ? "Resolving…" : "Resolve"}
    </button>
  );
}

/* ── Message drawer (read-only view + resolve) ─────────────────────────── */

function TicketDrawer({
  ticket,
  busy,
  onClose,
  onResolve,
}: {
  ticket: SupportTicket | null;
  busy: boolean;
  onClose: () => void;
  onResolve: (id: string) => void;
}) {
  const resolved = ticket ? isResolved(ticket) : false;

  return (
    <Drawer
      open={ticket !== null}
      onClose={onClose}
      title="Support ticket"
      subtitle={ticket ? `#${ticket.id}` : undefined}
      footer={
        <>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            style={{ padding: "11px 20px", fontSize: 14 }}
          >
            Close
          </button>
          {ticket && !resolved && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onResolve(ticket.id)}
              disabled={busy}
              style={{
                padding: "11px 20px",
                fontSize: 14,
                opacity: busy ? 0.55 : 1,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {busy ? "Resolving…" : "Resolve"}
            </button>
          )}
        </>
      }
    >
      {ticket && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <MetaRow label="Customer" value={ticket.customerEmail || "—"} mono />
          <MetaRow label="Source" value={ticket.source ? ticket.source.replace(/_/g, " ") : "—"} />
          <div>
            <FieldLabel>Booking</FieldLabel>
            <span className="mono" style={{ fontSize: 13.5 }}>
              <BookingRef bookingId={ticket.bookingId} />
            </span>
          </div>
          <MetaRow label="Received" value={fmtDate(ticket.createdAt)} mono />
          <div>
            <FieldLabel>Status</FieldLabel>
            <StatusPill value={resolved ? "resolved" : "open"} />
            {ticket.resolvedAt && (
              <span className="mono" style={{ marginLeft: 10, fontSize: 11.5, color: "var(--text-dim)" }}>
                {fmtDate(ticket.resolvedAt)}
              </span>
            )}
          </div>
          <div>
            <FieldLabel>Message</FieldLabel>
            <p
              style={{
                margin: 0,
                color: "var(--text-2)",
                fontSize: 13.5,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {ticket.message?.trim() ? ticket.message : "—"}
            </p>
          </div>
        </div>
      )}
    </Drawer>
  );
}

/**
 * Booking reference: a deep link into /admin/bookings (which auto-opens the
 * Manage panel for ?id=). Styled like the page's other inline admin links
 * (the message preview): quiet underline that reads as clickable.
 */
function BookingRef({ bookingId }: { bookingId: string | null }) {
  if (!bookingId) {
    return <span style={{ color: "var(--text-dim)" }}>—</span>;
  }
  return (
    <Link
      href={`/admin/bookings?id=${encodeURIComponent(bookingId)}`}
      title="Open this booking in Bookings"
      style={{
        color: "var(--text-2)",
        textDecoration: "underline",
        textDecorationColor: "var(--border-strong)",
        textUnderlineOffset: 3,
      }}
    >
      #{bookingId}
    </Link>
  );
}

function MetaRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <span
        className={mono ? "mono" : undefined}
        style={{ color: "var(--text-2)", fontSize: 13.5, fontFamily: mono ? "var(--font-mono)" : undefined }}
      >
        {value}
      </span>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mono"
      style={{
        margin: "0 0 6px",
        fontSize: 10.5,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--text-dim)",
        fontWeight: 500,
      }}
    >
      {children}
    </p>
  );
}

/* ── Error mapping (auth failures are handled by the caller via signOut) ─── */

function toErrorState(err: unknown, fallback: string): LoadState {
  if (err instanceof SupportConfigError) {
    return { phase: "error", message: err.message, config: true };
  }
  if (err instanceof SupportApiError) {
    return { phase: "error", message: err.message, config: false };
  }
  return { phase: "error", message: fallback, config: false };
}
