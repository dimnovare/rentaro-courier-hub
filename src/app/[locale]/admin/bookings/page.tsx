"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listBookings,
  listUnitCodes,
  updateStatus,
  updateCustomer,
  type BookingCustomerPatch,
  assignUnit,
  getPayment,
  confirmPayment,
  revokePayment,
  createBooking,
  deleteBooking,
  BookingApiError,
  BookingConfigError,
  type AdminBooking,
  type AdminFleetUnit,
  type AdminPayment,
  type CreateBookingInput,
} from "@/services/adminBookingService";
import { listRentals } from "@/services/adminRentalService";
import { modelService } from "@/services/modelService";
import { cityService } from "@/services/cityService";
import { pricingService } from "@/services/pricingService";
import { getSettings } from "@/services/settingsService";
import { Drawer } from "@/components/admin/Drawer";
import { DateField } from "@/components/admin/DateField";
import {
  generateContract,
  markContractSigned,
  openContractDocument,
  getBookingContract,
  ContractApiError,
  ContractConfigError,
  type Contract,
  type ContractDocumentKind,
} from "@/services/adminContractService";
import { AdminTable, Th, Td, EmptyRow, AdminSection, fmtDate, fmtDay } from "@/components/admin/Table";
import { StatusPill, type PillTone } from "@/components/admin/StatusPill";
import { PageHeader } from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { useAdminRefresh } from "@/components/admin/useAdminRefresh";

/**
 * Every status the operator can set from the Manage panel's "Set status" select.
 * `value` is the wire form the backend expects (the BookingStatus enum name,
 * lower-cased with separators removed — matching the "approved"/"rejected" the
 * Approve/Reject buttons already send); `label` is a readable form. The status
 * endpoint is permissive (no forward-only guard), so any of these can move a
 * booking backward — e.g. an accidental Approve back to "Awaiting review".
 */
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "submitted", label: "Submitted" },
  { value: "awaitingreview", label: "Awaiting review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
  { value: "paymentpending", label: "Payment pending" },
  { value: "bikeassigned", label: "Bike assigned" },
  { value: "signaturepending", label: "Signature pending" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

interface PageData {
  bookings: AdminBooking[];
  units: AdminFleetUnit[];
  /** Catalogue options for the New-booking form. */
  models: { id: string; name: string }[];
  cities: { id: string; name: string }[];
  plans: { id: string; label: string }[];
  /**
   * bookingId → assigned bike unit code, derived from the rentals list. This is
   * the only truthful "a bike is really assigned" signal: the backend consumes
   * the hold (clears HeldBikeUnitId) when a rental starts, so the booking DTO
   * alone can't distinguish a real assignment from a raw status jump. `null`
   * when the rentals fetch failed (signal unknown — don't make claims from it).
   */
  rentalUnitByBooking: Map<string, string> | null;
}

type LoadState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "ready"; data: PageData }
  | { phase: "error"; message: string; config: boolean };

export default function AdminBookingsPage() {
  const { authenticated, signOut } = useAdminAuth();
  const [state, setState] = useState<LoadState>({ phase: "idle" });
  const [banner, setBanner] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  // Contracts known for a booking, keyed by booking id — populated either by
  // generating one this session or by the lazy-load when a Manage panel opens.
  const [contracts, setContracts] = useState<Record<string, Contract>>({});
  // Booking ids whose contract has been lazy-fetched (regardless of result), so
  // a booking with genuinely no contract isn't re-fetched every time it opens.
  const [contractLoaded, setContractLoaded] = useState<Record<string, true>>({});
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
  // Whether the "New booking" drawer is open.
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Whether online (Smart-ID / Mobile-ID) signing is enabled site-wide. Mirrors
  // the backend assign gate: it only blocks assignment on an unsigned agreement
  // when ShowOnlineSigning is true. In the default paper mode (false), approval
  // auto-generates an UNSIGNED "Generated" agreement that must NOT gate assigning.
  // Defaults to false (paper mode) so a missing/failed read never falsely blocks.
  const [onlineSigning, setOnlineSigning] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    // A "silent" refresh (after an action) keeps the current bookings on screen
    // instead of dropping to the full-page loading notice — which would unmount
    // and visibly blink an open Manage panel.
    if (!opts?.silent) setState({ phase: "loading" });
    try {
      const [bookings, units, models, cities, plans, rentals] = await Promise.all([
        listBookings(),
        listUnitCodes(),
        modelService.getModels(),
        cityService.getCities(),
        pricingService.getPlans(),
        // Rentals feed the "is a bike really assigned?" signal only — a hiccup
        // here must not take down bookings management, so degrade to null
        // (signal unknown) instead of failing the whole load.
        listRentals().catch(() => null),
      ]);
      setState({
        phase: "ready",
        data: {
          bookings,
          units,
          models: models.map((m) => ({ id: m.id, name: m.name })),
          cities: cities.map((c) => ({ id: c.id, name: c.name })),
          plans: plans.map((p) => ({ id: p.id, label: `${p.term} · €${p.monthly}/30d` })),
          rentalUnitByBooking: rentals
            ? new Map(
                rentals
                  .filter((r) => r.bookingId)
                  .map((r) => [r.bookingId as string, r.bikeUnitInternalCode]),
              )
            : null,
        },
      });
    } catch (err) {
      if (err instanceof BookingApiError && err.unauthorized) {
        signOut();
      } else if (opts?.silent) {
        // Silent-refresh failures keep the existing data; the triggering
        // action's own catch surfaces the error.
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
    if (authenticated) void load();
  }, [authenticated, load]);

  // Load the site's online-signing flag so the client assign gate matches the
  // backend (which only blocks on an unsigned contract when ShowOnlineSigning is
  // true). getSettings is fail-safe — it returns showOnlineSigning=false on any
  // error — so a hiccup leaves the gate in the safe paper-mode default.
  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    void getSettings().then((s) => {
      if (active) setOnlineSigning(s.showOnlineSigning);
    });
    return () => {
      active = false;
    };
  }, [authenticated]);

  useAdminRefresh(useCallback(() => void load({ silent: true }), [load]));

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

  // Fetch (once) the latest agreement contract for a booking, so the panel
  // restores its generated/signed state after a page refresh instead of falling
  // back to "Generate contract". Mirrors loadPayment: a 401 drops to sign-in,
  // other errors are swallowed (the contract readout is non-critical). The id is
  // marked loaded either way so a booking with no contract isn't re-fetched.
  const loadContract = useCallback(
    async (bookingId: string) => {
      try {
        const contract = await getBookingContract(bookingId);
        if (contract) setContracts((c) => ({ ...c, [bookingId]: contract }));
      } catch (err) {
        if (err instanceof ContractApiError && err.unauthorized) {
          signOut();
          return;
        }
        /* non-critical — leave the contract unknown. */
      } finally {
        setContractLoaded((m) => ({ ...m, [bookingId]: true }));
      }
    },
    [signOut],
  );

  // Toggle a booking's management panel; clears any stale per-row error. Opening
  // a row lazily loads its payment status and contract (unless already known).
  const toggleOpen = useCallback(
    (bookingId: string) => {
      setRowError(null);
      setOpenId((cur) => {
        const next = cur === bookingId ? null : bookingId;
        if (next && payments[bookingId] === undefined) void loadPayment(bookingId);
        if (next && !contractLoaded[bookingId] && contracts[bookingId] === undefined) {
          void loadContract(bookingId);
        }
        return next;
      });
    },
    [payments, loadPayment, contractLoaded, contracts, loadContract],
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
        await load({ silent: true });
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
      // Money action: creates a settled payment record (and an invoice when
      // auto-create is on) — confirm before recording.
      if (
        typeof window !== "undefined" &&
        !window.confirm(
          "Mark this payment as received? This records a settled payment (and creates an invoice if auto-create is enabled).",
        )
      ) {
        return;
      }
      setBanner(null);
      setRowError(null);
      try {
        const updated = await confirmPayment(bookingId);
        setPayments((m) => ({ ...m, [bookingId]: updated }));
        setBanner({ tone: "ok", text: "Payment marked as received." });
        await load({ silent: true });
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

  // Revert a booking's payment back to un-paid (PendingManual). Mirrors
  // onConfirmPayment: patches the local payment readout (so the panel flips back
  // out of "paid" and re-gates assignment) and refreshes the list.
  const onRevokePayment = useCallback(
    async (bookingId: string) => {
      if (
        typeof window !== "undefined" &&
        !window.confirm(
          "Mark this payment as unpaid? This reverts the confirmed payment and re-blocks bike assignment until it is confirmed again.",
        )
      ) {
        return;
      }
      setBanner(null);
      setRowError(null);
      try {
        const updated = await revokePayment(bookingId);
        setPayments((m) => ({ ...m, [bookingId]: updated }));
        setBanner({ tone: "ok", text: "Payment marked as unpaid." });
        await load({ silent: true });
      } catch (err) {
        if (err instanceof BookingApiError && err.unauthorized) {
          signOut();
          return;
        }
        const text =
          err instanceof BookingApiError || err instanceof BookingConfigError
            ? err.message
            : "Could not revoke the payment.";
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

  // Generate (or regenerate) a contract for a booking and remember it. When
  // `notify` is true the customer is emailed a copy to sign; otherwise the
  // contract is generated silently (e.g. for in-person paper signing).
  const onGenerateContract = useCallback(
    async (bookingId: string, notify: boolean) => {
      setBanner(null);
      setRowError(null);
      setBusy(bookingId, true);
      try {
        const contract = await generateContract(bookingId, notify);
        setContracts((c) => ({ ...c, [bookingId]: contract }));
        setBanner({
          tone: "ok",
          text: notify
            ? "Contract generated and emailed to the customer."
            : "Contract generated.",
        });
        await load({ silent: true });
      } catch (err) {
        handleContractError(bookingId, err, "Could not generate the contract.");
      } finally {
        setBusy(bookingId, false);
      }
    },
    [setBusy, handleContractError, load],
  );

  // Mark a booking's contract as signed — the path for paper signing, where the
  // renter signs in person. When `notify` is true the customer is emailed a
  // "contract signed" confirmation; otherwise no email is sent. `signedAt` is the
  // optional day the paper contract was actually signed (ISO yyyy-MM-dd); omitted
  // → today. The returned Contract replaces the stored one so the panel reflects
  // the signed state (and any corrected date).
  const onMarkSigned = useCallback(
    async (bookingId: string, notify: boolean, signedAt?: string) => {
      setBanner(null);
      setRowError(null);
      setBusy(bookingId, true);
      try {
        const contract = await markContractSigned(bookingId, notify, signedAt);
        setContracts((c) => ({ ...c, [bookingId]: contract }));
        setBanner({
          tone: "ok",
          text: notify
            ? "Contract marked as signed and confirmation emailed to the customer."
            : "Contract marked as signed.",
        });
        await load({ silent: true });
      } catch (err) {
        handleContractError(bookingId, err, "Could not mark the contract as signed.");
      } finally {
        setBusy(bookingId, false);
      }
    },
    [setBusy, handleContractError, load],
  );

  // Open a contract PDF (generated or signed) in a new tab.
  const onDownloadContract = useCallback(
    async (bookingId: string, contractId: string, kind: ContractDocumentKind) => {
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

  async function submitBooking(
    input: CreateBookingInput,
    notify: boolean,
    markPaid: boolean,
  ): Promise<string | null> {
    let newId: string;
    try {
      ({ id: newId } = await createBooking(input, notify));
    } catch (err) {
      if (err instanceof BookingApiError && err.unauthorized) {
        signOut();
        return null;
      }
      return err instanceof BookingApiError ? err.message : "Could not create the booking.";
    }

    // The booking now exists. If the operator ticked "already paid", confirm its
    // payment — but a failure here must NOT roll back or fail the create, since
    // the booking is committed. Surface that as a non-fatal banner instead.
    let paidWarning: string | null = null;
    if (markPaid) {
      try {
        await confirmPayment(newId);
      } catch (err) {
        if (err instanceof BookingApiError && err.unauthorized) {
          signOut();
          return null;
        }
        paidWarning =
          err instanceof BookingApiError || err instanceof BookingConfigError
            ? err.message
            : "Could not mark the new booking as paid.";
      }
    }

    setDrawerOpen(false);
    if (paidWarning) {
      setBanner({ tone: "bad", text: `Booking created, but payment was not marked: ${paidWarning}` });
    } else {
      setBanner({
        tone: "ok",
        text:
          (notify ? "Booking created and confirmation emailed." : "Booking created.") +
          (markPaid ? " Marked as paid." : ""),
      });
    }
    await load({ silent: true });
    return null;
  }

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

          <PageHeader
            title="Bookings"
            subtitle="Review requests, take payment, generate contracts and assign bikes."
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setDrawerOpen(true)}
              style={{ padding: "11px 20px", fontSize: 14 }}
            >
              + New booking
            </button>
          </PageHeader>

          <AdminSection title="Bookings" count={state.data.bookings.length}>
            <BookingsManageTable
              bookings={state.data.bookings}
              units={state.data.units}
              rentalUnitByBooking={state.data.rentalUnitByBooking}
              contracts={contracts}
              contractBusy={contractBusy}
              payments={payments}
              onlineSigning={onlineSigning}
              openId={openId}
              rowError={rowError}
              onToggle={toggleOpen}
              onConfirmPayment={onConfirmPayment}
              onRevokePayment={onRevokePayment}
              onSetStatus={(id, status, label) => {
                const ok = window.confirm(`Change this booking's status to "${label}"?`);
                if (!ok) return;
                void runAction(
                  id,
                  async () => {
                    await updateStatus(id, status);
                  },
                  `Status set to ${label}.`,
                );
              }}
              onApprove={(id) =>
                runAction(
                  id,
                  async () => {
                    await updateStatus(id, "approved");
                  },
                  "Booking approved.",
                )
              }
              onReject={(id) => {
                // Rejecting emails the customer a rejection and releases the
                // held bike — confirm before firing.
                const ok = window.confirm(
                  "Reject this booking? The customer is emailed a rejection and the held bike is released.",
                );
                if (!ok) return;
                void runAction(
                  id,
                  async () => {
                    await updateStatus(id, "rejected");
                  },
                  "Booking rejected.",
                );
              }}
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
              onMarkSigned={onMarkSigned}
              onDownloadContract={onDownloadContract}
              onSaveCustomer={(id, patch) =>
                runAction(
                  id,
                  async () => {
                    await updateCustomer(id, patch);
                  },
                  "Customer details updated.",
                )
              }
              onDelete={(id) => {
                const ok = window.confirm(
                  "Delete this booking permanently? This removes its contract, payments and any rental, and frees the bike. This cannot be undone.",
                );
                if (!ok) return;
                void runAction(
                  id,
                  async () => {
                    await deleteBooking(id);
                  },
                  "Booking deleted.",
                );
              }}
            />
          </AdminSection>

          <NewBookingDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            models={state.data.models}
            cities={state.data.cities}
            plans={state.data.plans}
            onSubmit={submitBooking}
          />
        </>
      )}
    </div>
  );
}

/* ── New booking drawer ────────────────────────────────────────────────── */

function NewBookingDrawer({
  open,
  onClose,
  models,
  cities,
  plans,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  models: { id: string; name: string }[];
  cities: { id: string; name: string }[];
  plans: { id: string; label: string }[];
  onSubmit: (input: CreateBookingInput, notify: boolean, markPaid: boolean) => Promise<string | null>;
}) {
  const [cityId, setCityId] = useState("");
  const [modelId, setModelId] = useState("");
  const [planId, setPlanId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");
  const [notify, setNotify] = useState(false);
  const [markPaid, setMarkPaid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Default the selects to the first option once the catalogue arrives.
  useEffect(() => {
    if (!cityId && cities[0]) setCityId(cities[0].id);
  }, [cities, cityId]);
  useEffect(() => {
    if (!modelId && models[0]) setModelId(models[0].id);
  }, [models, modelId]);
  useEffect(() => {
    if (!planId && plans[0]) setPlanId(plans[0].id);
  }, [plans, planId]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = emailOk && !!cityId && !!modelId && !!planId && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setFormError(null);
    const err = await onSubmit(
      {
        cityId,
        modelId,
        planId,
        customer: {
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          email: email.trim(),
          phone: phone.trim() || undefined,
        },
        preferredStartDate: startDate || undefined,
        notes: notes.trim() || undefined,
      },
      notify,
      markPaid,
    );
    setSubmitting(false);
    if (err) {
      setFormError(err);
    } else {
      // Reset for the next entry.
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setStartDate("");
      setNotes("");
      setNotify(false);
      setMarkPaid(false);
    }
  }

  function close() {
    setFormError(null);
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="New booking"
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
            {submitting ? "Creating…" : "Create booking"}
          </button>
        </>
      }
    >
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

        <div className="field-row">
          <div className="field">
            <label htmlFor="nb-city">City</label>
            <select id="nb-city" value={cityId} onChange={(e) => setCityId(e.target.value)} aria-label="City">
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="nb-model">Model</label>
            <select id="nb-model" value={modelId} onChange={(e) => setModelId(e.target.value)} aria-label="Model">
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="nb-plan">Plan</label>
          <select id="nb-plan" value={planId} onChange={(e) => setPlanId(e.target.value)} aria-label="Plan">
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="nb-first">First name</label>
            <input
              id="nb-first"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="optional"
              aria-label="First name"
            />
          </div>
          <div className="field">
            <label htmlFor="nb-last">Last name</label>
            <input
              id="nb-last"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="optional"
              aria-label="Last name"
            />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="nb-email">Email</label>
            <input
              id="nb-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="rider@example.com"
              aria-label="Email"
              aria-invalid={email.length > 0 && !emailOk}
            />
          </div>
          <div className="field">
            <label htmlFor="nb-phone">Phone</label>
            <input
              id="nb-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="optional"
              aria-label="Phone"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="nb-start">Preferred start date</label>
          <DateField value={startDate} onChange={setStartDate} disabled={submitting} />
        </div>

        <div className="field">
          <label htmlFor="nb-notes">Notes</label>
          <textarea
            id="nb-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How the booking came in, anything relevant…"
            aria-label="Notes"
            rows={3}
            style={{ resize: "vertical", lineHeight: 1.5 }}
          />
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13.5,
            color: "var(--text-2)",
            cursor: "pointer",
            marginTop: 4,
          }}
        >
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: "var(--lime)" }}
          />
          Email the customer the standard booking confirmation
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13.5,
            color: "var(--text-2)",
            cursor: "pointer",
            marginTop: 12,
          }}
        >
          <input
            type="checkbox"
            checked={markPaid}
            onChange={(e) => setMarkPaid(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: "var(--lime)" }}
          />
          Mark as already paid (payment received)
        </label>

        {email.length > 0 && !emailOk && (
          <p className="mono" style={{ fontSize: 11.5, color: "var(--text-dim)", margin: "10px 0 0" }}>
            A valid customer email is required.
          </p>
        )}

        {/* Hidden submit keeps Enter-to-create working. */}
        <button type="submit" style={{ display: "none" }} aria-hidden tabIndex={-1} />
      </form>
    </Drawer>
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
  rentalUnitByBooking,
  contracts,
  contractBusy,
  payments,
  onlineSigning,
  openId,
  rowError,
  onToggle,
  onApprove,
  onReject,
  onAssign,
  onConfirmPayment,
  onRevokePayment,
  onSetStatus,
  onGenerateContract,
  onMarkSigned,
  onDownloadContract,
  onSaveCustomer,
  onDelete,
}: {
  bookings: AdminBooking[];
  units: AdminFleetUnit[];
  rentalUnitByBooking: Map<string, string> | null;
  contracts: Record<string, Contract>;
  contractBusy: Record<string, boolean>;
  payments: Record<string, AdminPayment | null | "loading">;
  onlineSigning: boolean;
  openId: string | null;
  rowError: { bookingId: string; text: string } | null;
  onToggle: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onAssign: (id: string, code: string) => void;
  onConfirmPayment: (id: string) => void;
  onRevokePayment: (id: string) => void;
  onSetStatus: (id: string, status: string, label: string) => void;
  onGenerateContract: (id: string, notify: boolean) => void;
  onMarkSigned: (id: string, notify: boolean, signedAt?: string) => void;
  onDownloadContract: (id: string, contractId: string, kind: ContractDocumentKind) => void;
  onSaveCustomer: (id: string, patch: BookingCustomerPatch) => void;
  onDelete: (id: string) => void;
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
                // undefined = rentals unknown (fetch failed); null = known: no rental.
                assignedUnitCode={
                  rentalUnitByBooking === null
                    ? undefined
                    : (rentalUnitByBooking.get(b.id) ?? null)
                }
                contract={contracts[b.id]}
                contractBusy={Boolean(contractBusy[b.id])}
                payment={payments[b.id]}
                onlineSigning={onlineSigning}
                open={open}
                error={rowError && rowError.bookingId === b.id ? rowError.text : null}
                onToggle={() => onToggle(b.id)}
                onApprove={() => onApprove(b.id)}
                onReject={() => onReject(b.id)}
                onAssign={(code) => onAssign(b.id, code)}
                onConfirmPayment={() => onConfirmPayment(b.id)}
                onRevokePayment={() => onRevokePayment(b.id)}
                onSetStatus={(status, label) => onSetStatus(b.id, status, label)}
                onGenerateContract={(notify) => onGenerateContract(b.id, notify)}
                onMarkSigned={(notify, signedAt) => onMarkSigned(b.id, notify, signedAt)}
                onDownloadContract={(kind) => {
                  const c = contracts[b.id];
                  if (c) onDownloadContract(b.id, c.id, kind);
                }}
                onSaveCustomer={(patch) => onSaveCustomer(b.id, patch)}
                onDelete={() => onDelete(b.id)}
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
  assignedUnitCode,
  contract,
  contractBusy,
  payment,
  onlineSigning,
  open,
  error,
  onToggle,
  onApprove,
  onReject,
  onAssign,
  onConfirmPayment,
  onRevokePayment,
  onSetStatus,
  onGenerateContract,
  onMarkSigned,
  onDownloadContract,
  onSaveCustomer,
  onDelete,
}: {
  booking: AdminBooking;
  units: AdminFleetUnit[];
  /** Unit code of this booking's rental; null = known none; undefined = unknown. */
  assignedUnitCode: string | null | undefined;
  contract: Contract | undefined;
  contractBusy: boolean;
  payment: AdminPayment | null | "loading" | undefined;
  onlineSigning: boolean;
  open: boolean;
  error: string | null;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  onAssign: (code: string) => void;
  onConfirmPayment: () => void;
  onRevokePayment: () => void;
  onSetStatus: (status: string, label: string) => void;
  onGenerateContract: (notify: boolean) => void;
  onMarkSigned: (notify: boolean, signedAt?: string) => void;
  onDownloadContract: (kind: ContractDocumentKind) => void;
  onSaveCustomer: (patch: BookingCustomerPatch) => void;
  onDelete: () => void;
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
          {b.customerPhone && (
            <div className="mono" style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
              {b.customerPhone}
            </div>
          )}
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
              assignedUnitCode={assignedUnitCode}
              contract={contract}
              contractBusy={contractBusy}
              payment={payment}
              onlineSigning={onlineSigning}
              error={error}
              onApprove={onApprove}
              onReject={onReject}
              onAssign={onAssign}
              onConfirmPayment={onConfirmPayment}
              onRevokePayment={onRevokePayment}
              onSetStatus={onSetStatus}
              onGenerateContract={onGenerateContract}
              onMarkSigned={onMarkSigned}
              onDownloadContract={onDownloadContract}
              onSaveCustomer={onSaveCustomer}
              onDelete={onDelete}
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
  assignedUnitCode,
  contract,
  contractBusy,
  payment,
  onlineSigning,
  error,
  onApprove,
  onReject,
  onAssign,
  onConfirmPayment,
  onRevokePayment,
  onSetStatus,
  onGenerateContract,
  onMarkSigned,
  onDownloadContract,
  onSaveCustomer,
  onDelete,
}: {
  booking: AdminBooking;
  units: AdminFleetUnit[];
  /** Unit code of this booking's rental; null = known none; undefined = unknown. */
  assignedUnitCode: string | null | undefined;
  contract: Contract | undefined;
  contractBusy: boolean;
  payment: AdminPayment | null | "loading" | undefined;
  onlineSigning: boolean;
  error: string | null;
  onApprove: () => void;
  onReject: () => void;
  onAssign: (code: string) => void;
  onConfirmPayment: () => void;
  onRevokePayment: () => void;
  onSetStatus: (status: string, label: string) => void;
  onGenerateContract: (notify: boolean) => void;
  onMarkSigned: (notify: boolean, signedAt?: string) => void;
  onDownloadContract: (kind: ContractDocumentKind) => void;
  onSaveCustomer: (patch: BookingCustomerPatch) => void;
  onDelete: () => void;
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

      <BookingDetails booking={b} onSave={onSaveCustomer} />

      <PanelGroup title="1 · Review">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-primary" style={miniBtn} onClick={onApprove}>
            Approve
          </button>
          <button type="button" className="btn btn-ghost" style={miniBtn} onClick={onReject}>
            Reject
          </button>
        </div>
        <SetStatusControl current={b.status} onSetStatus={onSetStatus} />
        {b.heldBikeUnitCode && (
          <p style={{ ...hintStyle, marginTop: 8 }}>
            Held:{" "}
            <span className="mono" style={{ color: "var(--lime)" }}>{b.heldBikeUnitCode}</span>
            {b.holdExpiresAt && (
              <> · expires {fmtDay(b.holdExpiresAt)}</>
            )}
          </p>
        )}
      </PanelGroup>

      <PanelGroup title="2 · Contract">
        <ContractControl
          contract={contract}
          busy={contractBusy}
          onGenerate={onGenerateContract}
          onMarkSigned={onMarkSigned}
          onDownload={onDownloadContract}
        />
      </PanelGroup>

      <PanelGroup title="3 · Payment">
        <PaymentControl payment={payment} onConfirm={onConfirmPayment} onRevoke={onRevokePayment} />
      </PanelGroup>

      <PanelGroup title="4 · Assign a bike">
        <AssignControl
          booking={b}
          units={units}
          assignedUnitCode={assignedUnitCode}
          payment={payment}
          contract={contract}
          onlineSigning={onlineSigning}
          onAssign={onAssign}
        />
      </PanelGroup>

      {/* Danger zone — set apart on its own full-width row, behind a divider, so
          the destructive Delete is never fat-fingered alongside the lifecycle
          actions above. */}
      <div
        style={{
          flexBasis: "100%",
          marginTop: 4,
          paddingTop: 14,
          borderTop: "1px solid rgba(255,138,120,0.22)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          type="button"
          className="btn btn-ghost"
          style={dangerBtn}
          onClick={onDelete}
        >
          Delete booking
        </button>
        <p style={hintStyle}>
          Permanently removes this booking with its contract, payments and any rental. This cannot be undone.
        </p>
      </div>
    </div>
  );
}

/** Language code → friendly name for the customer's preferred locale. */
const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  et: "Eesti",
  lv: "Latviešu",
  fi: "Suomi",
  ru: "Русский",
};
function localeLabel(locale: string | null): string {
  if (!locale) return "—";
  return LOCALE_LABELS[locale.toLowerCase()] ?? locale;
}

/** One labelled fact in the read-only details grid. */
function Detail({
  label,
  value,
  mono,
  full,
}: {
  label: string;
  value: string;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div style={full ? { gridColumn: "1 / -1" } : undefined}>
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-dim)",
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        className={mono ? "mono" : undefined}
        style={{ fontSize: 13, color: "var(--text-2)", wordBreak: "break-word", lineHeight: 1.5 }}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * Read-only "who is this and what did they book" block, so an operator sees the
 * whole record (phone, language, contact/payment method, accessories, notes)
 * without opening the database. Every field here is already on the booking row.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function BookingDetails({
  booking: b,
  onSave,
}: {
  booking: AdminBooking;
  onSave: (patch: BookingCustomerPatch) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [first, setFirst] = useState(b.customerFirstName);
  const [last, setLast] = useState(b.customerLastName);
  const [email, setEmail] = useState(b.customerEmail);
  const [phone, setPhone] = useState(b.customerPhone ?? "");

  // Re-sync the form to the booking after a save + refresh (or a different row).
  useEffect(() => {
    setFirst(b.customerFirstName);
    setLast(b.customerLastName);
    setEmail(b.customerEmail);
    setPhone(b.customerPhone ?? "");
    setEditing(false);
  }, [b.id, b.customerFirstName, b.customerLastName, b.customerEmail, b.customerPhone]);

  const emailOk = EMAIL_RE.test(email.trim());
  const canSave = first.trim().length > 0 && emailOk;

  return (
    <div
      style={{
        flexBasis: "100%",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "10px 22px",
        padding: "13px 15px",
        borderRadius: "var(--r-sm)",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid var(--border)",
      }}
    >
      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", marginBottom: -4 }}>
        {editing ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: "5px 12px", fontSize: 11.5, opacity: canSave ? 1 : 0.5 }}
              disabled={!canSave}
              onClick={() => {
                onSave({ firstName: first.trim(), lastName: last.trim(), email: email.trim(), phone: phone.trim() });
              }}
            >
              Save customer
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: "5px 12px", fontSize: 11.5 }}
              onClick={() => {
                setFirst(b.customerFirstName);
                setLast(b.customerLastName);
                setEmail(b.customerEmail);
                setPhone(b.customerPhone ?? "");
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: "5px 12px", fontSize: 11.5 }}
            onClick={() => setEditing(true)}
          >
            Edit customer
          </button>
        )}
      </div>

      {editing ? (
        <>
          <EditField label="First name" value={first} onChange={setFirst} />
          <EditField label="Last name" value={last} onChange={setLast} />
          <EditField label="Email" value={email} onChange={setEmail} invalid={email.trim() !== "" && !emailOk} />
          <EditField label="Phone" value={phone} onChange={setPhone} />
        </>
      ) : (
        <>
          <Detail label="Name" value={`${b.customerFirstName} ${b.customerLastName}`.trim() || "—"} />
          <Detail label="Email" value={b.customerEmail} mono />
          <Detail label="Phone" value={b.customerPhone || "—"} mono />
        </>
      )}
      <Detail label="Language" value={localeLabel(b.locale)} />
      <Detail label="Contact via" value={b.contactMethod || "—"} />
      <Detail label="Payment" value={b.paymentMethod ?? "—"} />
      <Detail label="Fulfillment" value={b.fulfillment === "delivery" ? "Delivery" : "Pickup"} />
      <Detail label="City" value={b.cityId} mono />
      <Detail label="Model" value={b.modelId} mono />
      <Detail label="Plan" value={b.planId} mono />
      <Detail label="Preferred start" value={fmtDay(b.preferredStartDate)} mono />
      <Detail
        label="Accessories"
        value={b.accessoryIds.length ? b.accessoryIds.join(", ") : "—"}
        mono
      />
      {b.notes ? <Detail label="Notes" value={b.notes} full /> : null}
    </div>
  );
}

/** A labelled text input used when editing a booking's customer details. */
function EditField({
  label,
  value,
  onChange,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        className="mono"
        style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)" }}
      >
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "7px 10px",
          borderRadius: "var(--r-sm)",
          background: "var(--surface)",
          border: `1px solid ${invalid ? "var(--danger)" : "var(--border)"}`,
          color: "var(--text)",
          fontSize: 13,
          width: "100%",
        }}
      />
    </label>
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
 * "Set status" override for the Review group. The Approve/Reject buttons cover
 * the common path; this select can move a booking to ANY status — forward or
 * backward — so an accidental Approve can be reverted (e.g. back to "Awaiting
 * review"). The select defaults to the booking's current status; picking another
 * confirms, then runs the same updateStatus path the Approve button uses.
 */
function SetStatusControl({
  current,
  onSetStatus,
}: {
  current: string;
  onSetStatus: (status: string, label: string) => void;
}) {
  // Match the booking's current status to a known wire value so the select
  // defaults to it (statuses arrive already lower-cased and separator-free).
  const currentValue = current.toLowerCase().replace(/[\s_-]/g, "");
  return (
    <div style={{ marginTop: 10 }}>
      <label
        className="mono"
        htmlFor={`set-status-${current}`}
        style={{ ...hintStyle, display: "block", marginBottom: 6 }}
      >
        Set status
      </label>
      <select
        id={`set-status-${current}`}
        value={currentValue}
        onChange={(e) => {
          const value = e.target.value;
          if (value === currentValue) return;
          const opt = STATUS_OPTIONS.find((o) => o.value === value);
          if (opt) onSetStatus(opt.value, opt.label);
        }}
        style={selectStyle}
        aria-label="Set booking status"
      >
        {/* Show the current status even if it isn't one of the selectable
            options, so the select never appears blank. */}
        {!STATUS_OPTIONS.some((o) => o.value === currentValue) && (
          <option value={currentValue}>{current}</option>
        )}
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
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
  onRevoke,
}: {
  payment: AdminPayment | null | "loading" | undefined;
  onConfirm: () => void;
  onRevoke: () => void;
}) {
  if (payment === "loading") {
    return <p style={hintStyle}>Checking payment…</p>;
  }

  if (payment == null) {
    // No payment row exists (cash / walk-in / admin booking). The confirm-payment
    // endpoint CREATES a settled Paid payment in that case, so still offer the
    // "Mark payment received" button — clicking it records the payment and
    // unblocks bike assignment, just like the pending path below.
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <StatusPill value="no payment" tone="neutral" />
        <button
          type="button"
          className="btn btn-primary"
          style={{ ...miniBtn, alignSelf: "flex-start" }}
          onClick={onConfirm}
        >
          Mark payment received
        </button>
        <p style={hintStyle}>
          No payment recorded. Confirm once you have received payment (e.g. cash) to record it and unlock bike assignment.
        </p>
      </div>
    );
  }

  const status = payment.status.toLowerCase();
  const settled = status === "paid";
  // Only "pending_manual" (no automatic charge — cash / walk-in) may be confirmed
  // by hand. A bare "pending" from a real provider (e.g. Montonio) is a card charge
  // in flight that settles via webhook; manually flipping it to Paid would mark an
  // unsettled real payment as received, so it is NOT confirmable here. Terminal
  // states (cancelled/refunded) and the settled "paid" state are not confirmable.
  const confirmable = status === "pending_manual";
  // A real provider charge still awaiting settlement (a non-manual "pending").
  const providerPending = status === "pending" && payment.provider.toLowerCase() !== "manual";
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
      {settled && (
        <button
          type="button"
          className="btn btn-ghost"
          style={{ ...miniBtn, alignSelf: "flex-start" }}
          onClick={onRevoke}
        >
          Mark unpaid
        </button>
      )}
      <p style={hintStyle}>
        {settled
          ? "Payment confirmed — bike assignment is unlocked."
          : confirmable
            ? "No automatic charge was taken. Confirm once you have received payment to unlock bike assignment."
            : providerPending
              ? "Awaiting card payment via the provider — not yet settled. It will settle automatically once the charge clears; bike assignment stays blocked until then."
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
 * Per-booking contract control. rentaro signs on paper, in person, so the flow
 * is: generate the contract (optionally emailing the customer a copy), then mark
 * it signed by hand once the renter has signed (again with an optional email).
 *
 * Before generation it offers a "Generate contract" button with an
 * "email the customer a copy" checkbox (default on). Afterwards it shows the
 * signature status, download links for whichever PDFs exist, a regenerate
 * action, and — until signed — a "Mark contract as signed" button with its own
 * "email the customer" checkbox (default off). Once the stored contract's status
 * is "signed" it shows the signed confirmation (with the signed date) in place
 * of the mark-signed control, while keeping the download actions available.
 *
 * A contract id is only known after generating it in this session (there is no
 * list-by-booking endpoint), so a page refresh resets these back to the generate
 * button — generation is idempotent on the backend, so re-running it is safe.
 */
/** Short local date for the "uploaded on …" admin note. */
function formatUploadedDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function ContractControl({
  contract,
  busy,
  onGenerate,
  onMarkSigned,
  onDownload,
}: {
  contract: Contract | undefined;
  busy: boolean;
  onGenerate: (notify: boolean) => void;
  onMarkSigned: (notify: boolean, signedAt?: string) => void;
  onDownload: (kind: ContractDocumentKind) => void;
}) {
  // Email the customer a copy when generating — defaults on (the prior behaviour).
  const [emailOnGenerate, setEmailOnGenerate] = useState(true);
  // Email the customer when marking signed — defaults off (paper signing is quiet).
  const [emailOnSign, setEmailOnSign] = useState(false);
  // The day the paper contract was signed, ISO yyyy-MM-dd — defaults to today.
  // Sent as the mark-signed `signedAt` so the recorded date can differ from now.
  const [signOnDate, setSignOnDate] = useState(todayIso);
  // Editable signed date for an already-signed contract, seeded from its stored
  // signedAt (first 10 chars of the ISO timestamp); lets an operator correct it.
  const [editSignedDate, setEditSignedDate] = useState(() => isoDay(contract?.signedAt));
  // Re-seed the editable date whenever the stored signed date changes (e.g. after
  // a successful correction returns a fresh contract), so the input stays in sync.
  useEffect(() => {
    setEditSignedDate(isoDay(contract?.signedAt));
  }, [contract?.signedAt]);

  if (!contract) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ padding: "8px 14px", fontSize: 12.5, whiteSpace: "nowrap", alignSelf: "flex-start" }}
          disabled={busy}
          onClick={() => onGenerate(emailOnGenerate)}
        >
          {busy ? "Generating…" : "Generate contract"}
        </button>
        <ContractCheckbox
          checked={emailOnGenerate}
          onChange={setEmailOnGenerate}
          disabled={busy}
          label="Email the customer a copy"
        />
        <p style={hintStyle}>Fills the active template. Emailing the customer a copy is optional.</p>
      </div>
    );
  }

  const signed = contract.status === "Signed";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <StatusPill value={contractStatusLabel(contract.status)} tone={contractStatusTone(contract.status)} />
      {signed && (
        <>
          <p style={signerStyle}>
            Contract signed{contract.signedAt ? ` · ${fmtDay(contract.signedAt)}` : ""}
          </p>
          {/* Let the operator correct the recorded signed date. Re-calls the
              mark-signed path (notify off) with the new signedAt; the backend
              re-stamps even when already signed, and the returned Contract
              refreshes the stored one. */}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <label className="mono" style={{ ...hintStyle, display: "flex", flexDirection: "column", gap: 4 }}>
              Signed on
              <DateField value={editSignedDate} onChange={setEditSignedDate} disabled={busy} />
            </label>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: "6px 11px", fontSize: 11.5 }}
              disabled={busy || !editSignedDate || editSignedDate === isoDay(contract.signedAt)}
              onClick={() => onMarkSigned(false, editSignedDate)}
            >
              {busy ? "Working…" : "Update date"}
            </button>
          </div>
        </>
      )}
      {contract.signedByName && (
        <p style={signerStyle}>
          Signed by: {contract.signedByName}
          {contract.signedByCountry ? ` (${contract.signedByCountry})` : ""}
        </p>
      )}
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
        {contract.hasUploadedDoc && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: "6px 11px", fontSize: 11.5 }}
            disabled={busy}
            onClick={() => onDownload("uploaded")}
            title={contract.uploadedDocFileName ?? undefined}
          >
            Customer copy ↓
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost"
          style={{ padding: "6px 11px", fontSize: 11.5 }}
          disabled={busy}
          onClick={() => onGenerate(emailOnGenerate)}
        >
          {busy ? "Working…" : "Regenerate"}
        </button>
      </div>
      {contract.hasUploadedDoc && !signed && (
        <p
          style={{
            ...hintStyle,
            color: "var(--lime)",
            marginTop: 2,
          }}
        >
          The customer uploaded a signed copy
          {contract.uploadedAt ? ` on ${formatUploadedDate(contract.uploadedAt)}` : ""} — review
          it (Customer copy ↓), then mark the contract signed below.
        </p>
      )}
      {!signed && (
        <>
          <label className="mono" style={{ ...hintStyle, display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
            Signed on
            <DateField value={signOnDate} onChange={setSignOnDate} disabled={busy} />
          </label>
          <button
            type="button"
            className="btn btn-primary"
            style={{ ...miniBtn, alignSelf: "flex-start", marginTop: 2 }}
            disabled={busy || !signOnDate}
            onClick={() => onMarkSigned(emailOnSign, signOnDate)}
          >
            {busy ? "Working…" : "Mark contract as signed"}
          </button>
          <ContractCheckbox
            checked={emailOnSign}
            onChange={setEmailOnSign}
            disabled={busy}
            label="Email the customer"
          />
          <p style={hintStyle}>
            For paper signing — mark the contract signed by hand on the date above. Bike assignment unlocks once it is signed.
          </p>
        </>
      )}
    </div>
  );
}

/** A compact labelled checkbox matching the New-booking drawer's checkbox style. */
function ContractCheckbox({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        color: "var(--text-2)",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 15, height: 15, accentColor: "var(--lime)" }}
      />
      {label}
    </label>
  );
}

/**
 * Bike-assignment control. The fleet returns every unit, so we filter to ones
 * that can actually start this rental: status "available" AND matching the
 * booking's model + city. (The dropdown otherwise let operators pick a rented /
 * damaged unit, or a unit in the wrong city/model, which the backend would
 * either reject or — worse — silently accept.) When nothing matches we explain
 * why instead of showing an empty, un-actionable select.
 *
 * The backend also refuses (409) to start a rental until the payment is settled
 * and the contract signed. We mirror those gates in the UI so the disabled
 * reason is visible up front rather than only surfacing after a failed click.
 * Payment is reliably fetched per row; contract state is only known once a
 * contract has been generated in this session (no list-by-booking endpoint), so
 * a not-yet-known contract does not block — payment alone gates in that case.
 */
function AssignControl({
  booking: b,
  units,
  assignedUnitCode,
  payment,
  contract,
  onlineSigning,
  onAssign,
}: {
  booking: AdminBooking;
  units: AdminFleetUnit[];
  /** Unit code of this booking's rental; null = known none; undefined = unknown. */
  assignedUnitCode: string | null | undefined;
  payment: AdminPayment | null | "loading" | undefined;
  contract: Contract | undefined;
  onlineSigning: boolean;
  onAssign: (code: string) => void;
}) {
  const [code, setCode] = useState("");

  // Units that can start this rental: status "available" OR "reserved" (the
  // backend accepts a reserved unit unless it's held by a *different* booking),
  // and matching the booking's model + city. Reserved ones are labelled
  // distinctly so the operator knows what they're picking.
  const eligible = useMemo(
    () =>
      units.filter(
        (u) =>
          (u.status?.toLowerCase() === "available" || u.status?.toLowerCase() === "reserved") &&
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

  // Once a bike is assigned (or the rental is running/finished) this panel's
  // job is done — the previously-eligible unit is now rented, so without this
  // guard the empty `eligible` list would show the "No assignable unit" warning
  // on every successfully assigned booking.
  //
  // BUT status alone doesn't prove an assignment: a raw set-status jump to
  // active/completed skips assignment entirely (the backend releases the held
  // unit on that jump), so only claim "already assigned" when the row carries
  // an actual assignment signal: a rental linked to this booking (the assign
  // endpoint consumes the hold, so heldBikeUnitCode is null after a REAL
  // assignment) or a still-held unit (a raw jump to bikeassigned keeps the
  // hold). When the rentals lookup failed (undefined) the signal is unknown —
  // keep the softer claim rather than wrongly telling the operator to reset a
  // legitimately assigned booking.
  const normalizedStatus = (b.status ?? "").toLowerCase().replace(/[_\s-]/g, "");
  if (normalizedStatus === "bikeassigned" || normalizedStatus === "active" || normalizedStatus === "completed") {
    const linkedUnit = assignedUnitCode ?? b.heldBikeUnitCode;
    if (linkedUnit || assignedUnitCode === undefined) {
      return (
        <p style={hintStyle}>
          A bike{linkedUnit ? <> (<span className="mono">{linkedUnit}</span>)</> : ""} is
          already assigned to this booking
          {normalizedStatus === "active" ? " and the rental is active" : ""}
          {normalizedStatus === "completed" ? " and the rental is completed" : ""}. Manage the
          unit from the Rentals or Fleet view.
        </p>
      );
    }
    return (
      <p style={hintStyle}>
        This booking&apos;s status is past assignment, but no bike is linked. Set the
        status back to approved to assign one.
      </p>
    );
  }

  if (eligible.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="mono" style={{ fontSize: 11.5, color: "var(--warn)" }}>
          No assignable <b>{b.modelId}</b> unit in <b>{b.cityId}</b>.
        </span>
        <p style={hintStyle}>
          {availableElsewhere > 0
            ? `${availableElsewhere} available in another city. Move a unit to ${b.cityId} or free one up in the Fleet view.`
            : "Free up or add a unit in the Fleet view, then reopen this row."}
        </p>
      </div>
    );
  }

  // Mirror the backend's pre-conditions (settled payment + signed contract) so
  // the assign button is disabled with an inline reason rather than letting the
  // operator click into a 409. Payment is checked first; contract is only known
  // once generated this session, so an unknown contract is not treated as a
  // blocker (payment alone gates then).
  const paymentSettled = payment != null && payment !== "loading" && payment.status.toLowerCase() === "paid";
  // Mirror the backend, which only blocks assignment on an unsigned agreement when
  // ShowOnlineSigning is true. In the default paper mode (onlineSigning=false), the
  // auto-generated "Generated" agreement is signed on paper, so it must never gate
  // assignment — otherwise the operator is forced to falsely mark it signed.
  const contractSigned = !onlineSigning || contract == null || contract.status === "Signed";
  const blockReason =
    payment === "loading"
      ? "Checking payment…"
      : !paymentSettled
        ? "Confirm payment first"
        : !contractSigned
          ? "Contract must be signed first"
          : null;
  const gated = blockReason != null;

  return (
    <form
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (code && !gated) onAssign(code);
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select value={code} onChange={(e) => setCode(e.target.value)} style={selectStyle} aria-label="Bike unit">
          <option value="">Choose a unit…</option>
          {eligible.map((u) => (
            <option key={u.internalCode} value={u.internalCode}>
              {u.status?.toLowerCase() === "reserved"
                ? `${u.internalCode} · reserved`
                : u.internalCode}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary" style={miniBtn} disabled={!code || gated}>
          Assign &amp; start rental
        </button>
      </div>
      <p style={hintStyle}>
        {gated
          ? blockReason
          : `${eligible.length} assignable ${eligible.length === 1 ? "unit" : "units"} for this model + city.`}
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

/** Today's date as an ISO `yyyy-MM-dd` string (local), for seeding date inputs. */
function todayIso(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

/** First 10 chars (the `yyyy-MM-dd` date part) of an ISO timestamp, or "" when
 *  absent — the value a `<input type="date">` expects. */
function isoDay(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
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

// Destructive variant of the ghost button: red-tinted border/text over a faint
// danger wash, matching the --danger treatment used elsewhere in the admin UI.
const dangerBtn: React.CSSProperties = {
  padding: "8px 14px",
  fontSize: 12.5,
  color: "var(--danger)",
  background: "rgba(255,138,120,0.06)",
  borderColor: "rgba(255,138,120,0.32)",
};

const hintStyle: React.CSSProperties = {
  fontSize: 11,
  lineHeight: 1.5,
  color: "var(--text-muted)",
  margin: 0,
};

// Verified e-signature identity — lime accent so an admin can spot-check that
// the signer matches the renter at a glance.
const signerStyle: React.CSSProperties = {
  fontSize: 11.5,
  lineHeight: 1.5,
  color: "var(--lime)",
  margin: 0,
  fontFamily: "var(--font-mono)",
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
