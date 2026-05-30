"use client";

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
import {
  generateContract,
  openContractDocument,
  ContractApiError,
  ContractConfigError,
  type Contract,
} from "@/services/adminContractService";
import { AdminTable, Th, Td, EmptyRow, AdminSection, fmtDate, fmtDay } from "@/components/admin/Table";
import { StatusPill } from "@/components/admin/StatusPill";
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

  // Run a mutating action, surface a banner, then refresh the table.
  const runAction = useCallback(
    async (action: () => Promise<void>, okText: string) => {
      setBanner(null);
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
        setBanner({ tone: "bad", text });
      }
    },
    [load, signOut],
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

  // Translate a contract-service error to a banner, dropping to the shell
  // sign-in on a 401 so the admin re-authenticates.
  const handleContractError = useCallback(
    (err: unknown, fallback: string) => {
      if (err instanceof ContractApiError && err.unauthorized) {
        signOut();
        return;
      }
      const text =
        err instanceof ContractApiError || err instanceof ContractConfigError
          ? err.message
          : fallback;
      setBanner({ tone: "bad", text });
    },
    [signOut],
  );

  // Generate (or regenerate) a contract for a booking and remember it.
  const onGenerateContract = useCallback(
    async (bookingId: string) => {
      setBanner(null);
      setBusy(bookingId, true);
      try {
        const contract = await generateContract(bookingId);
        setContracts((c) => ({ ...c, [bookingId]: contract }));
        setBanner({ tone: "ok", text: "Contract generated." });
      } catch (err) {
        handleContractError(err, "Could not generate the contract.");
      } finally {
        setBusy(bookingId, false);
      }
    },
    [setBusy, handleContractError],
  );

  // Open a contract PDF (generated or signed) in a new tab.
  const onDownloadContract = useCallback(
    async (bookingId: string, contractId: string, kind: "generated" | "signed") => {
      setBanner(null);
      setBusy(bookingId, true);
      try {
        await openContractDocument(contractId, kind);
      } catch (err) {
        handleContractError(err, "Could not open the document.");
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
              onGenerateContract={onGenerateContract}
              onDownloadContract={onDownloadContract}
            />
          </AdminSection>
        </>
      )}
    </div>
  );
}

/* ── Table with per-row actions ────────────────────────────────────────── */

function BookingsManageTable({
  bookings,
  units,
  contracts,
  contractBusy,
  onApprove,
  onReject,
  onAssign,
  onGenerateContract,
  onDownloadContract,
}: {
  bookings: AdminBooking[];
  units: AdminFleetUnit[];
  contracts: Record<string, Contract>;
  contractBusy: Record<string, boolean>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onAssign: (id: string, code: string) => void;
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
          <Th>Actions</Th>
          <Th>Contract</Th>
        </tr>
      </thead>
      <tbody>
        {bookings.length === 0 ? (
          <EmptyRow colSpan={9} label="No bookings yet." />
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
              <Td>
                <ContractCell
                  contract={contracts[b.id]}
                  busy={Boolean(contractBusy[b.id])}
                  onGenerate={() => onGenerateContract(b.id)}
                  onDownload={(kind) => {
                    const c = contracts[b.id];
                    if (c) onDownloadContract(b.id, c.id, kind);
                  }}
                />
              </Td>
            </tr>
          ))
        )}
      </tbody>
    </AdminTable>
  );
}

/**
 * Per-booking contract control. Before generation it offers a single
 * "Generate contract" button; afterwards it shows the signature status and
 * download links for whichever PDFs exist. A contract id is only known after
 * generating it in this session (there is no list-by-booking endpoint), so a
 * page refresh resets these back to the generate button — generation is
 * idempotent on the backend, so re-running it is safe.
 */
function ContractCell({
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
      <button
        type="button"
        className="btn btn-ghost"
        style={{ padding: "8px 14px", fontSize: 12.5, whiteSpace: "nowrap" }}
        disabled={busy}
        onClick={onGenerate}
      >
        {busy ? "Generating…" : "Generate contract"}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 150 }}>
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
            Generated
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
            Signed
          </button>
        )}
      </div>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ padding: "6px 11px", fontSize: 11.5, alignSelf: "flex-start" }}
        disabled={busy}
        onClick={onGenerate}
      >
        {busy ? "Working…" : "Regenerate"}
      </button>
    </div>
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
