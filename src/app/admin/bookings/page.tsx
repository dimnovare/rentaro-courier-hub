"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listBookings,
  listUnitCodes,
  updateStatus,
  assignUnit,
  getPayment,
  confirmPayment,
  BookingApiError,
  BookingConfigError,
  type AdminBooking,
  type AdminFleetUnit,
  type AdminPayment,
} from "@/services/adminBookingService";
import {
  generateContract,
  openContractDocument,
  ContractApiError,
  ContractConfigError,
  type Contract,
} from "@/services/adminContractService";
import { AdminTable, Th, Td, EmptyRow, AdminSection, fmtDate, fmtDay } from "@/components/admin/Table";
import { StatusPill, type PillTone } from "@/components/admin/StatusPill";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { useAdminRefresh } from "@/components/admin/useAdminRefresh";

interface PageData {
  bookings: AdminBooking[];
  units: AdminFleetUnit[];
}

type LoadState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "ready"; data: PageData }
  | { phase: "error"; message: string; config: boolean };

export default function AdminBookingsPage() {
  const { token, signOut } = useAdminAuth();
  const [state, setState] = useState<LoadState>({ phase: "idle" });
  const [banner, setBanner] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  // Contracts generated this session, keyed by booking id.
  const [contracts, setContracts] = useState<Record<string, Contract>>({});
  // Booking ids with an in-flight contract action (generate / download).
  const [contractBusy, setContractBusy] = useState<Record<string, boolean>>({});
  // Latest payment per booking, fetched lazily when a Manage panel opens.
  // `"loading"` while in flight; `null` once we know there is no payment.
  const [payments, setPayments] = useState<Record<string, AdminPayment | null | "loading">>({});
  // The booking id whose management panel is currently expanded (one at a time).
  const [openId, setOpenId] = useState<string | null>(null);
  // Per-row action error, shown inside the open management panel. Keyed by
  // booking id so it disappears when another row is opened.
  const [rowError, setRowError] = useState<{ bookingId: string; text: string } | null>(null);

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    try {
      const [bookings, units] = await Promise.all([listBookings(), listUnitCodes()]);
      setState({ phase: "ready", data: { bookings, units } });
    } catch (err) {
      if (err instanceof BookingApiError && err.unauthorized) {
        signOut();
      } else if (err instanceof BookingConfigError) {
        setState({ phase: "error", message: err.message, config: true });
      } else if (err instanceof BookingApiError) {
        setState({ phase: "error", message: err.message, config: false });
      } else {
        setState({ phase: "error", message: "Something went wrong loading bookings.", config: false });
      }
    }
  }, [signOut]);

  useEffect(() => {
    if (token) void load();
  }, [token, load]);

  useAdminRefresh(load);

  // Fetch (once) the latest payment for a booking. Errors are swallowed: the
  // payment readout is non-critical, so a hiccup just leaves it unknown rather
  // than blocking the panel. A 401 still drops to sign-in.
  const loadPayment = useCallback(
    async (bookingId: string) => {
      setPayments((m) => ({ ...m, [bookingId]: "loading" }));
      try {
        const payment = await getPayment(bookingId);
        setPayments((m) => ({ ...m, [bookingId]: payment }));
      } catch (err) {
        if (err instanceof BookingApiError && err.unauthorized) {
          signOut();
          return;
        }
        setPayments((m) => {
          const next = { ...m };
          delete next[bookingId];
          return next;
        });
      }
    },
    [signOut],
  );

  // Toggle a booking's management panel; clears any stale per-row error. Opening
  // a row lazily loads its payment status (unless already known).
  const toggleOpen = useCallback(
    (bookingId: string) => {
      setRowError(null);
      setOpenId((cur) => {
        const next = cur === bookingId ? null : bookingId;
        if (next && payments[bookingId] === undefined) void loadPayment(bookingId);
        return next;
      });
    },
    [payments, loadPayment],
  );

  // Surface a per-row error inside the management panel for a booking.
  const setRowErr = useCallback((bookingId: string, text: string) => {
    setRowError({ bookingId, text });
  }, []);

  // Run a mutating action for a booking. Success → top banner + refresh; a
  // failure stays attached to the row (so the cause is visible next to the
  // control the operator just used) instead of scrolling away in the banner.
  const runAction = useCallback(
    async (bookingId: string, action: () => Promise<void>, okText: string) => {
      setBanner(null);
      setRowError(null);
      try {
        await action();
        setBanner({ tone: "ok", text: okText });
        await load();
      } catch (err) {
        // A 401 means the session died mid-action — drop to the shell sign-in.
        if (err instanceof BookingApiError && err.unauthorized) {
          signOut();
          return;
        }
        const text =
          err instanceof BookingApiError || err instanceof BookingConfigError
            ? err.message
            : "Action failed.";
        setRowErr(bookingId, text);
      }
    },
    [load, signOut, setRowErr],
  );

  // Manually confirm a booking's payment as received. On success we patch the
  // local payment readout (so the panel flips to "paid" and the assign gate
  // unblocks immediately) and refresh the list. Errors surface inline.
  const onConfirmPayment = useCallback(
    async (bookingId: string) => {
      setBanner(null);
      setRowError(null);
      try {
        const updated = await confirmPayment(bookingId);
        setPayments((m) => ({ ...m, [bookingId]: updated }));
        setBanner({ tone: "ok", text: "Payment marked as received." });
        await load();
      } catch (err) {
        if (err instanceof BookingApiError && err.unauthorized) {
          signOut();
          return;
        }
        const text =
          err instanceof BookingApiError || err instanceof BookingConfigError
            ? err.message
            : "Could not confirm the payment.";
        setRowErr(bookingId, text);
      }
    },
    [load, signOut, setRowErr],
  );

  // Mark a booking's contract action busy/idle.
  const setBusy = useCallback((bookingId: string, busy: boolean) => {
    setContractBusy((m) => {
      if (busy) return { ...m, [bookingId]: true };
      const next = { ...m };
      delete next[bookingId];
      return next;
    });
  }, []);

  // Translate a contract-service error to a per-row message, dropping to the
  // shell sign-in on a 401 so the admin re-authenticates.
  const handleContractError = useCallback(
    (bookingId: string, err: unknown, fallback: string) => {
      if (err instanceof ContractApiError && err.unauthorized) {
        signOut();
        return;
      }
      const text =
        err instanceof ContractApiError || err instanceof ContractConfigError
          ? err.message
          : fallback;
      setRowErr(bookingId, text);
    },
    [signOut, setRowErr],
  );

  // Generate (or regenerate) a contract for a booking and remember it.
  const onGenerateContract = useCallback(
    async (bookingId: string) => {
      setBanner(null);
      setRowError(null);
      setBusy(bookingId, true);
      try {
        const contract = await generateContract(bookingId);
        setContracts((c) => ({ ...c, [bookingId]: contract }));
        setBanner({ tone: "ok", text: "Contract generated and sent for signing." });
        await load();
      } catch (err) {
        handleContractError(bookingId, err, "Could not generate the contract.");
      } finally {
        setBusy(bookingId, false);
      }
    },
    [setBusy, handleContractError, load],
  );

  // Open a contract PDF (generated or signed) in a new tab.
  const onDownloadContract = useCallback(
    async (bookingId: string, contractId: string, kind: "generated" | "signed") => {
      setBanner(null);
      setRowError(null);
      setBusy(bookingId, true);
      try {
        await openContractDocument(contractId, kind);
      } catch (err) {
        handleContractError(bookingId, err, "Could not open the document.");
      } finally {
        setBusy(bookingId, false);
      }
    },
    [setBusy, handleContractError],
  );

  return (
    <div>
      {state.phase === "loading" || state.phase === "idle" ? (
        <Notice>Loading bookings…</Notice>
      ) : state.phase === "error" ? (
        <ErrorPanel message={state.message} config={state.config} onRetry={() => void load()} />
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
              contracts={contracts}
              contractBusy={contractBusy}
              payments={payments}
              openId={openId}
              rowError={rowError}
              onToggle={toggleOpen}
              onConfirmPayment={onConfirmPayment}
              onApprove={(id) =>
                runAction(
                  id,
                  async () => {
                    await updateStatus(id, "approved");
                  },
                  "Booking approved.",
                )
              }
              onReject={(id) =>
                runAction(
                  id,
                  async () => {
                    await updateStatus(id, "rejected");
                  },
                  "Booking rejected.",
                )
              }
              onAssign={(id, code) =>
                runAction(
                  id,
                  async () => {
                    await assignUnit(id, code);
                  },
                  `Assigned ${code} and started a rental.`,
                )
              }
              onGenerateContract={onGenerateContract}
              onDownloadContract={onDownloadContract}
            />
          </AdminSection>
        </>
      )}
    </div>
  );
}

/* ── Table with an always-visible "Manage" expander per row ─────────────────
 *
 * The booking facts stay in compact columns. All per-booking actions
 * (approve / reject, generate contract, assign a bike) live in a panel that
 * expands *under* the row and spans its full width, so every control is
 * reachable without horizontal scrolling no matter how wide the table is.
 */

const COL_COUNT = 8;

function BookingsManageTable({
  bookings,
  units,
  contracts,
  contractBusy,
  payments,
  openId,
  rowError,
  onToggle,
  onApprove,
  onReject,
  onAssign,
  onConfirmPayment,
  onGenerateContract,
  onDownloadContract,
}: {
  bookings: AdminBooking[];
  units: AdminFleetUnit[];
  contracts: Record<string, Contract>;
  contractBusy: Record<string, boolean>;
  payments: Record<string, AdminPayment | null | "loading">;
  openId: string | null;
  rowError: { bookingId: string; text: string } | null;
  onToggle: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onAssign: (id: string, code: string) => void;
  onConfirmPayment: (id: string) => void;
  onGenerateContract: (id: string) => void;
  onDownloadContract: (id: string, contractId: string, kind: "generated" | "signed") => void;
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
          <Th>Manage</Th>
        </tr>
      </thead>
      <tbody>
        {bookings.length === 0 ? (
          <EmptyRow colSpan={COL_COUNT} label="No bookings yet." />
        ) : (
          bookings.map((b) => {
            const open = openId === b.id;
            return (
              <BookingRow
                key={b.id}
                booking={b}
                units={units}
                contract={contracts[b.id]}
                contractBusy={Boolean(contractBusy[b.id])}
                payment={payments[b.id]}
                open={open}
                error={rowError && rowError.bookingId === b.id ? rowError.text : null}
                onToggle={() => onToggle(b.id)}
                onApprove={() => onApprove(b.id)}
                onReject={() => onReject(b.id)}
                onAssign={(code) => onAssign(b.id, code)}
                onConfirmPayment={() => onConfirmPayment(b.id)}
                onGenerateContract={() => onGenerateContract(b.id)}
                onDownloadContract={(kind) => {
                  const c = contracts[b.id];
                  if (c) onDownloadContract(b.id, c.id, kind);
                }}
              />
            );
          })
        )}
      </tbody>
    </AdminTable>
  );
}

function BookingRow({
  booking: b,
  units,
  contract,
  contractBusy,
  payment,
  open,
  error,
  onToggle,
  onApprove,
  onReject,
  onAssign,
  onConfirmPayment,
  onGenerateContract,
  onDownloadContract,
}: {
  booking: AdminBooking;
  units: AdminFleetUnit[];
  contract: Contract | undefined;
  contractBusy: boolean;
  payment: AdminPayment | null | "loading" | undefined;
  open: boolean;
  error: string | null;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  onAssign: (code: string) => void;
  onConfirmPayment: () => void;
  onGenerateContract: () => void;
  onDownloadContract: (kind: "generated" | "signed") => void;
}) {
  return (
    <>
      <tr style={open ? { background: "rgba(255,255,255,0.02)" } : undefined}>
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
        <Td nowrap>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: "8px 14px", fontSize: 12.5, whiteSpace: "nowrap" }}
            aria-expanded={open}
            onClick={onToggle}
          >
            {open ? "Close ▴" : "Manage ▾"}
          </button>
        </Td>
      </tr>
      {open && (
        <tr>
          <td colSpan={COL_COUNT} style={{ padding: 0, borderBottom: "1px solid var(--border)" }}>
            <ManagePanel
              booking={b}
              units={units}
              contract={contract}
              contractBusy={contractBusy}
              payment={payment}
              error={error}
              onApprove={onApprove}
              onReject={onReject}
              onAssign={onAssign}
              onConfirmPayment={onConfirmPayment}
              onGenerateContract={onGenerateContract}
              onDownloadContract={onDownloadContract}
            />
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * Full-width actions panel for one booking. Lays out three task groups —
 * review, contract, and bike assignment — that wrap on narrow screens, so the
 * key actions never sit off the right edge of the table.
 */
function ManagePanel({
  booking: b,
  units,
  contract,
  contractBusy,
  payment,
  error,
  onApprove,
  onReject,
  onAssign,
  onConfirmPayment,
  onGenerateContract,
  onDownloadContract,
}: {
  booking: AdminBooking;
  units: AdminFleetUnit[];
  contract: Contract | undefined;
  contractBusy: boolean;
  payment: AdminPayment | null | "loading" | undefined;
  error: string | null;
  onApprove: () => void;
  onReject: () => void;
  onAssign: (code: string) => void;
  onConfirmPayment: () => void;
  onGenerateContract: () => void;
  onDownloadContract: (kind: "generated" | "signed") => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 14,
        padding: "16px 14px",
        background: "rgba(216,255,54,0.015)",
      }}
    >
      {error && (
        <div
          className="mono"
          role="alert"
          style={{
            flexBasis: "100%",
            padding: "10px 13px",
            borderRadius: "var(--r-sm)",
            fontSize: 12,
            lineHeight: 1.5,
            color: "var(--danger)",
            background: "rgba(255,138,120,0.08)",
            border: "1px solid rgba(255,138,120,0.32)",
          }}
        >
          {error}
        </div>
      )}

      {referralCodeOf(b) && (
        <div
          className="mono"
          style={{
            flexBasis: "100%",
            fontSize: 11.5,
            color: "var(--text-muted)",
          }}
        >
          Referred by:{" "}
          <span style={{ color: "var(--lime)" }}>{referralCodeOf(b)}</span>
        </div>
      )}

      <PanelGroup title="1 · Review">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-primary" style={miniBtn} onClick={onApprove}>
            Approve
          </button>
          <button type="button" className="btn btn-ghost" style={miniBtn} onClick={onReject}>
            Reject
          </button>
        </div>
      </PanelGroup>

      <PanelGroup title="2 · Contract">
        <ContractControl
          contract={contract}
          busy={contractBusy}
          onGenerate={onGenerateContract}
          onDownload={onDownloadContract}
        />
      </PanelGroup>

      <PanelGroup title="3 · Payment">
        <PaymentControl payment={payment} onConfirm={onConfirmPayment} />
      </PanelGroup>

      <PanelGroup title="4 · Assign a bike">
        <AssignControl booking={b} units={units} onAssign={onAssign} />
      </PanelGroup>
    </div>
  );
}

/** A titled column within the management panel. */
function PanelGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ minWidth: 220, flex: "1 1 240px" }}>
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--text-dim)",
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

/**
 * Per-booking payment readout + manual-confirmation control. Payment is fetched
 * lazily when the panel opens:
 *   - `"loading"`  → still fetching.
 *   - `undefined`  → not fetched (treated like "unknown").
 *   - `null`       → no payment exists for this booking yet.
 *   - object       → the latest payment.
 *
 * When the payment is unsettled (`pending` / `pending_manual` — e.g. Montonio is
 * not configured, so no money was auto-collected), it offers "Mark payment
 * received", which confirms it server-side. A bike cannot be assigned until the
 * payment is settled, so this control gates step 4.
 */
function PaymentControl({
  payment,
  onConfirm,
}: {
  payment: AdminPayment | null | "loading" | undefined;
  onConfirm: () => void;
}) {
  if (payment === "loading") {
    return <p style={hintStyle}>Checking payment…</p>;
  }

  if (payment == null) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <StatusPill value="no payment" tone="neutral" />
        <p style={hintStyle}>No payment recorded for this booking.</p>
      </div>
    );
  }

  const status = payment.status.toLowerCase();
  const settled = status === "paid";
  // "pending" (awaiting the provider) and "pending_manual" (no auto-charge) both
  // allow a manual confirmation. Terminal states (cancelled/refunded) and the
  // settled "paid" state do not.
  const confirmable = status === "pending" || status === "pending_manual";
  const amount = `${payment.amount.toFixed(2)} ${payment.currency}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <StatusPill value={status} tone={paymentStatusTone(status)} />
        <span className="mono" style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{amount}</span>
      </div>
      {confirmable && (
        <button
          type="button"
          className="btn btn-primary"
          style={{ ...miniBtn, alignSelf: "flex-start" }}
          onClick={onConfirm}
        >
          Mark payment received
        </button>
      )}
      <p style={hintStyle}>
        {settled
          ? "Payment confirmed — bike assignment is unlocked."
          : confirmable
            ? "No automatic charge was taken. Confirm once you have received payment to unlock bike assignment."
            : `Payment is ${status.replace(/_/g, " ")} — bike assignment stays blocked.`}
      </p>
    </div>
  );
}

/** Coarse pill tone for a payment status. */
function paymentStatusTone(status: string): PillTone {
  switch (status) {
    case "paid":
      return "good";
    case "pending":
    case "pending_manual":
      return "warn";
    case "failed":
    case "cancelled":
    case "refunded":
      return "bad";
    default:
      return "neutral";
  }
}

/**
 * Per-booking contract control. Before generation it offers a single
 * "Generate contract" button; afterwards it shows the signature status and
 * download links for whichever PDFs exist. A contract id is only known after
 * generating it in this session (there is no list-by-booking endpoint), so a
 * page refresh resets these back to the generate button — generation is
 * idempotent on the backend, so re-running it is safe.
 */
function ContractControl({
  contract,
  busy,
  onGenerate,
  onDownload,
}: {
  contract: Contract | undefined;
  busy: boolean;
  onGenerate: () => void;
  onDownload: (kind: "generated" | "signed") => void;
}) {
  if (!contract) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ padding: "8px 14px", fontSize: 12.5, whiteSpace: "nowrap", alignSelf: "flex-start" }}
          disabled={busy}
          onClick={onGenerate}
        >
          {busy ? "Generating…" : "Generate contract"}
        </button>
        <p style={hintStyle}>Fills the active template, emails the customer to sign.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <StatusPill value={contractStatusLabel(contract.status)} tone={contractStatusTone(contract.status)} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {contract.hasGeneratedPdf && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: "6px 11px", fontSize: 11.5 }}
            disabled={busy}
            onClick={() => onDownload("generated")}
          >
            Generated PDF
          </button>
        )}
        {contract.hasSignedPdf && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: "6px 11px", fontSize: 11.5 }}
            disabled={busy}
            onClick={() => onDownload("signed")}
          >
            Signed PDF
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost"
          style={{ padding: "6px 11px", fontSize: 11.5 }}
          disabled={busy}
          onClick={onGenerate}
        >
          {busy ? "Working…" : "Regenerate"}
        </button>
      </div>
      {contract.status !== "Signed" && (
        <p style={hintStyle}>Bike assignment unlocks once this contract is signed.</p>
      )}
    </div>
  );
}

/**
 * Bike-assignment control. The fleet returns every unit, so we filter to ones
 * that can actually start this rental: status "available" AND matching the
 * booking's model + city. (The dropdown otherwise let operators pick a rented /
 * damaged unit, or a unit in the wrong city/model, which the backend would
 * either reject or — worse — silently accept.) When nothing matches we explain
 * why instead of showing an empty, un-actionable select.
 */
function AssignControl({
  booking: b,
  units,
  onAssign,
}: {
  booking: AdminBooking;
  units: AdminFleetUnit[];
  onAssign: (code: string) => void;
}) {
  const [code, setCode] = useState("");

  const eligible = useMemo(
    () =>
      units.filter(
        (u) =>
          u.status?.toLowerCase() === "available" &&
          u.modelId === b.modelId &&
          u.cityId === b.cityId,
      ),
    [units, b.modelId, b.cityId],
  );

  // Are there available units of this model in *other* cities? Helps explain a
  // "none here" situation (vs. genuinely none free anywhere).
  const availableElsewhere = useMemo(
    () =>
      units.filter(
        (u) => u.status?.toLowerCase() === "available" && u.modelId === b.modelId && u.cityId !== b.cityId,
      ).length,
    [units, b.modelId, b.cityId],
  );

  if (eligible.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="mono" style={{ fontSize: 11.5, color: "var(--warn)" }}>
          No available <b>{b.modelId}</b> unit in <b>{b.cityId}</b>.
        </span>
        <p style={hintStyle}>
          {availableElsewhere > 0
            ? `${availableElsewhere} available in another city. Move a unit to ${b.cityId} or free one up in the Fleet view.`
            : "Free up or add a unit in the Fleet view, then reopen this row."}
        </p>
      </div>
    );
  }

  return (
    <form
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (code) onAssign(code);
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select value={code} onChange={(e) => setCode(e.target.value)} style={selectStyle} aria-label="Bike unit">
          <option value="">Choose a unit…</option>
          {eligible.map((u) => (
            <option key={u.internalCode} value={u.internalCode}>
              {u.internalCode}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary" style={miniBtn} disabled={!code}>
          Assign &amp; start rental
        </button>
      </div>
      <p style={hintStyle}>
        {eligible.length} available {eligible.length === 1 ? "unit" : "units"} for this model + city.
      </p>
    </form>
  );
}

/** Coarse pill tone for a contract signature status. */
function contractStatusTone(status: Contract["status"]) {
  switch (status) {
    case "Signed":
      return "good" as const;
    case "Declined":
    case "Expired":
    case "Failed":
      return "bad" as const;
    case "SentForSignature":
    case "Viewed":
    case "Generated":
      return "warn" as const;
    default:
      return "neutral" as const;
  }
}

/** Spaced label for a contract status (e.g. SentForSignature → "sent for signature"). */
function contractStatusLabel(status: Contract["status"]): string {
  return status.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

/**
 * Reads the optional `referralCode` from a booking. The backend includes it on
 * the bookings list payload; the shared AdminBooking type doesn't declare it, so
 * we read it defensively (trimmed, empty treated as absent) rather than widening
 * that type here.
 */
function referralCodeOf(b: AdminBooking): string | null {
  const code = (b as { referralCode?: string | null }).referralCode;
  const trimmed = typeof code === "string" ? code.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

/* ── Inline styles for the compact action controls ─────────────────────── */

const miniBtn: React.CSSProperties = { padding: "8px 14px", fontSize: 12.5 };

const hintStyle: React.CSSProperties = {
  fontSize: 11,
  lineHeight: 1.5,
  color: "var(--text-muted)",
  margin: 0,
};

const selectStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 150,
  padding: "8px 10px",
  borderRadius: "var(--r-sm)",
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
};

/* ── Pieces ────────────────────────────────────────────────────────────── */

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
