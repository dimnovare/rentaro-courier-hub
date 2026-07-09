"use client";

/**
 * /admin/billing — Money view. Shows a this-month vs all-time summary (incomings
 * from Paid payments, outgoings from expenses, net), an editable Expenses table
 * with per-row invoice download + an "Add expense" drawer (with an optional
 * invoice upload), a generated-Invoices table with per-row PDF download / mark
 * paid + a "Create invoice" drawer (booking-prefilled or manual line items), and
 * an incomings totals panel.
 *
 * Mirrors the maintenance page's phase machine (loading / ready / error),
 * useAdminAuth signOut-on-401 and useAdminRefresh wiring. Dark admin style via
 * CSS variables + inline styles; wide 1480px container comes from AdminShell.
 */

import { useCallback, useEffect, useState } from "react";
import {
  listExpenses,
  createExpense,
  deleteExpense,
  uploadExpenseInvoice,
  expenseInvoicePath,
  getSummary,
  listInvoices,
  createInvoice,
  invoicePdfPath,
  markInvoicePaid,
  deleteInvoice,
  BillingApiError,
  BillingConfigError,
  BillingAuthError,
  type Expense,
  type BillingSummary,
  type CreateExpenseInput,
  type Invoice,
  type CreateInvoiceInput,
} from "@/services/adminBillingService";
import { listBookings, type AdminBooking } from "@/services/adminBookingService";
import { AdminTable, Th, Td, EmptyRow, AdminSection, fmtDay } from "@/components/admin/Table";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { useAdminRefresh } from "@/components/admin/useAdminRefresh";
import { Drawer } from "@/components/admin/Drawer";
import { DateField } from "@/components/admin/DateField";
import { PageHeader } from "@/components/admin/PageHeader";
import { formatEur } from "@/lib/money";

/** Common expense categories for bookkeeping. Backend still stores free-text. */
const CATEGORIES = [
  { value: "Bike purchase", label: "Bike purchase" },
  { value: "Bike parts", label: "Bike parts" },
  { value: "Workshop / maintenance", label: "Workshop / maintenance" },
  { value: "Accessories", label: "Accessories" },
  { value: "Storage / rent", label: "Storage / rent" },
  { value: "Tools", label: "Tools" },
  { value: "Software", label: "Software" },
  { value: "Marketing / ads", label: "Marketing / ads" },
  { value: "Insurance", label: "Insurance" },
  { value: "Legal / accounting", label: "Legal / accounting" },
  { value: "Transport", label: "Transport" },
  { value: "Bank fees", label: "Bank fees" },
  { value: "Other", label: "Other" },
] as const;

/** Today as YYYY-MM-DD (local), used to seed the date input. */
function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type LoadState =
  | { phase: "loading" }
  | { phase: "ready"; expenses: Expense[]; invoices: Invoice[]; summary: BillingSummary }
  | { phase: "error"; message: string; config: boolean };

export default function AdminBillingPage() {
  const { signOut } = useAdminAuth();
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [invoiceDrawerOpen, setInvoiceDrawerOpen] = useState(false);

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    setActionError(null);
    try {
      const [expenses, invoices, summary] = await Promise.all([
        listExpenses(),
        listInvoices(),
        getSummary(),
      ]);
      setState({ phase: "ready", expenses, invoices, summary });
    } catch (err) {
      if (err instanceof BillingAuthError || (err instanceof BillingApiError && err.unauthorized)) {
        signOut();
      } else {
        setState(toErrorState(err, "Something went wrong loading billing."));
      }
    }
  }, [signOut]);

  useEffect(() => {
    void load();
  }, [load]);

  useAdminRefresh(load);

  async function removeExpense(id: string) {
    if (state.phase !== "ready") return;
    if (typeof window !== "undefined" && !window.confirm("Delete this expense? This cannot be undone.")) {
      return;
    }
    setActionError(null);
    setPending((p) => ({ ...p, [id]: true }));
    try {
      await deleteExpense(id);
      // Reload so the summary totals stay in sync with the removed amount.
      await load();
    } catch (err) {
      handleActionError(err, "Could not delete the expense.");
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    }
  }

  // Returns null on success, or an error message for the drawer to show inline.
  async function submitExpense(input: CreateExpenseInput, invoice: File | null): Promise<string | null> {
    setActionError(null);
    try {
      const created = await createExpense(input);
      if (invoice) {
        try {
          await uploadExpenseInvoice(created.id, invoice);
        } catch (uploadErr) {
          // The expense was created; only the invoice failed. Reload so the row
          // shows, and surface the upload problem inline.
          await load();
          setDrawerOpen(false);
          return uploadErr instanceof BillingApiError
            ? `Expense saved, but the invoice upload failed${uploadErr.message ? `: ${uploadErr.message}` : ""}.`
            : "Expense saved, but the invoice upload failed.";
        }
      }
      // Reload so both the list and the summary totals reflect the new expense.
      await load();
      setDrawerOpen(false);
      return null;
    } catch (err) {
      if (err instanceof BillingAuthError || (err instanceof BillingApiError && err.unauthorized)) {
        signOut();
        return null;
      }
      return err instanceof BillingApiError ? err.message : "Could not create the expense.";
    }
  }

  // Returns null on success, or an error message for the invoice drawer to show inline.
  async function submitInvoice(input: CreateInvoiceInput): Promise<string | null> {
    setActionError(null);
    try {
      await createInvoice(input);
      // Reload so the invoices list (and its numbering) reflects the new invoice.
      await load();
      setInvoiceDrawerOpen(false);
      return null;
    } catch (err) {
      if (err instanceof BillingAuthError || (err instanceof BillingApiError && err.unauthorized)) {
        signOut();
        return null;
      }
      return err instanceof BillingApiError ? err.message : "Could not create the invoice.";
    }
  }

  async function markPaid(id: string) {
    if (state.phase !== "ready") return;
    if (
      typeof window !== "undefined" &&
      !window.confirm("Mark this invoice as PAID? There is no un-mark — this is final.")
    ) {
      return;
    }
    setActionError(null);
    setPending((p) => ({ ...p, [id]: true }));
    try {
      const updated = await markInvoicePaid(id);
      // Patch the row in place — nothing else on the page depends on it.
      setState((s) =>
        s.phase === "ready"
          ? { ...s, invoices: s.invoices.map((i) => (i.id === updated.id ? updated : i)) }
          : s,
      );
    } catch (err) {
      handleActionError(err, "Could not mark the invoice paid.");
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    }
  }

  async function removeInvoice(inv: Invoice) {
    if (state.phase !== "ready") return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Delete invoice ${inv.number}? Use this only for mistakes or orphaned invoices — ` +
          `deleting issued invoices leaves a gap in the numbering. This cannot be undone.`,
      )
    ) {
      return;
    }
    setActionError(null);
    setPending((p) => ({ ...p, [inv.id]: true }));
    try {
      await deleteInvoice(inv.id);
      await load();
    } catch (err) {
      handleActionError(err, "Could not delete the invoice.");
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[inv.id];
        return next;
      });
    }
  }

  /** Drops to the shell sign-in on 401, otherwise shows an inline action error. */
  function handleActionError(err: unknown, fallback: string) {
    if (err instanceof BillingAuthError || (err instanceof BillingApiError && err.unauthorized)) {
      signOut();
    } else {
      setActionError(err instanceof BillingApiError ? err.message : fallback);
    }
  }

  return (
    <div>
      {state.phase === "loading" ? (
        <Notice>Loading billing…</Notice>
      ) : state.phase === "error" ? (
        <ErrorPanel message={state.message} config={state.config} onRetry={() => void load()} />
      ) : (
        <>
          <PageHeader title="Billing" subtitle="Money in, money out — incomings, expenses, invoices and net.">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setInvoiceDrawerOpen(true)}
              style={{ padding: "11px 20px", fontSize: 14 }}
            >
              + Create invoice
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setDrawerOpen(true)}
              style={{ padding: "11px 20px", fontSize: 14 }}
            >
              + Add expense
            </button>
          </PageHeader>

          {actionError && <InlineError message={actionError} />}

          <SummaryHeader summary={state.summary} />

          <ExpensesTable
            expenses={state.expenses}
            pending={pending}
            onDelete={removeExpense}
          />

          <InvoicesTable
            invoices={state.invoices}
            pending={pending}
            onMarkPaid={markPaid}
            onDelete={removeInvoice}
          />

          <IncomingsPanel summary={state.summary} />

          <AddExpenseDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            onSubmit={submitExpense}
          />

          <CreateInvoiceDrawer
            open={invoiceDrawerOpen}
            onClose={() => setInvoiceDrawerOpen(false)}
            onSubmit={submitInvoice}
          />
        </>
      )}
    </div>
  );
}

/* ── Summary header (this month + all-time) ────────────────────────────── */

function SummaryHeader({ summary }: { summary: BillingSummary }) {
  return (
    <section style={{ marginBottom: 34 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, letterSpacing: "-0.02em" }}>This month</h2>
        <span className="mono" style={{ fontSize: 12, color: "var(--text-dim)" }}>
          current calendar month
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <BigStat label="Incomings" value={formatEur(summary.monthIncomings)} tone="pos" />
        <BigStat label="Outgoings" value={formatEur(summary.monthOutgoings)} tone="neg" />
        <BigStat
          label="Net"
          value={formatEur(summary.monthNet)}
          tone={summary.monthNet >= 0 ? "pos" : "neg"}
          accent
        />
      </div>

      {/* All-time, smaller. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
        }}
      >
        <SmallStat label="All-time incomings" value={formatEur(summary.allIncomings)} />
        <SmallStat label="All-time outgoings" value={formatEur(summary.allOutgoings)} />
        <SmallStat label="All-time net" value={formatEur(summary.allNet)} />
      </div>
    </section>
  );
}

function BigStat({
  label,
  value,
  tone,
  accent,
}: {
  label: string;
  value: string;
  tone: "pos" | "neg";
  accent?: boolean;
}) {
  const color = accent
    ? "var(--lime)"
    : tone === "neg"
      ? "var(--danger)"
      : "var(--text)";
  return (
    <div className="card" style={{ padding: 20 }}>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 30,
          lineHeight: 1.05,
          letterSpacing: "-0.03em",
          color,
        }}
      >
        {value}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 10.5,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginTop: 6,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="card"
      style={{
        padding: "14px 16px",
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-dim)",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 16, color: "var(--text-2)", letterSpacing: "-0.01em" }}>{value}</span>
    </div>
  );
}

/* ── Expenses table ────────────────────────────────────────────────────── */

function ExpensesTable({
  expenses,
  pending,
  onDelete,
}: {
  expenses: Expense[];
  pending: Record<string, boolean>;
  onDelete: (id: string) => void;
}) {
  return (
    <AdminSection title="Expenses" count={expenses.length}>
      <AdminTable>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Category</Th>
            <Th>Supplier</Th>
            <Th>Description</Th>
            <Th>Amount</Th>
            <Th>Invoice</Th>
            <Th>Delete</Th>
          </tr>
        </thead>
        <tbody>
          {expenses.length === 0 ? (
            <EmptyRow colSpan={7} label="No expenses recorded yet." />
          ) : (
            expenses.map((x) => (
              <tr key={x.id}>
                <Td mono nowrap>
                  {fmtDay(x.date)}
                </Td>
                <Td nowrap>{x.category?.trim() ? x.category : "—"}</Td>
                <Td>{x.supplier?.trim() ? x.supplier : "—"}</Td>
                <Td dim>{x.description?.trim() ? x.description : "—"}</Td>
                <Td mono nowrap>
                  {formatEur(x.amountGross)}
                </Td>
                <Td nowrap>
                  {x.hasInvoice ? (
                    <a
                      href={expenseInvoicePath(x.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="mono"
                      style={{ color: "var(--lime)", fontSize: 12, textDecoration: "none" }}
                      title={x.invoiceFileName?.trim() ? x.invoiceFileName : undefined}
                    >
                      download
                    </a>
                  ) : (
                    <span className="mono" style={{ color: "var(--text-dim)", fontSize: 12 }}>
                      —
                    </span>
                  )}
                </Td>
                <Td nowrap>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={Boolean(pending[x.id])}
                    onClick={() => onDelete(x.id)}
                    style={{
                      padding: "6px 12px",
                      fontSize: 12,
                      opacity: pending[x.id] ? 0.55 : 1,
                      cursor: pending[x.id] ? "wait" : "pointer",
                    }}
                  >
                    {pending[x.id] ? "Deleting…" : "Delete"}
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

/* ── Invoices table ────────────────────────────────────────────────────── */

function InvoicesTable({
  invoices,
  pending,
  onMarkPaid,
  onDelete,
}: {
  invoices: Invoice[];
  pending: Record<string, boolean>;
  onMarkPaid: (id: string) => void;
  onDelete: (inv: Invoice) => void;
}) {
  return (
    <AdminSection title="Invoices" count={invoices.length}>
      <AdminTable>
        <thead>
          <tr>
            <Th>Number</Th>
            <Th>Date</Th>
            <Th>Customer</Th>
            <Th>Total</Th>
            <Th>Status</Th>
            <Th>PDF</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {invoices.length === 0 ? (
            <EmptyRow colSpan={7} label="No invoices generated yet." />
          ) : (
            invoices.map((inv) => {
              const paid = inv.status === "paid";
              return (
                <tr key={inv.id}>
                  <Td mono nowrap>
                    {inv.number}
                  </Td>
                  <Td mono nowrap>
                    {fmtDay(inv.issueDate)}
                  </Td>
                  <Td>
                    {inv.customerName?.trim() ? inv.customerName : "—"}
                    {inv.customerEmail?.trim() ? (
                      <span className="mono" style={{ color: "var(--text-dim)", fontSize: 11, marginLeft: 8 }}>
                        {inv.customerEmail}
                      </span>
                    ) : null}
                  </Td>
                  <Td mono nowrap>
                    {formatEur(inv.total)}
                  </Td>
                  <Td nowrap>
                    <span
                      className="mono"
                      style={{
                        fontSize: 11,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: paid ? "var(--lime)" : "var(--text-muted)",
                      }}
                    >
                      {inv.status}
                    </span>
                    {!paid && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={Boolean(pending[inv.id])}
                        onClick={() => onMarkPaid(inv.id)}
                        style={{
                          marginLeft: 10,
                          padding: "5px 10px",
                          fontSize: 11.5,
                          opacity: pending[inv.id] ? 0.55 : 1,
                          cursor: pending[inv.id] ? "wait" : "pointer",
                        }}
                      >
                        {pending[inv.id] ? "Saving…" : "Mark paid"}
                      </button>
                    )}
                  </Td>
                  <Td nowrap>
                    {inv.hasPdf ? (
                      <a
                        href={invoicePdfPath(inv.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="mono"
                        style={{ color: "var(--lime)", fontSize: 12, textDecoration: "none" }}
                        title={`${inv.number}.pdf`}
                      >
                        download
                      </a>
                    ) : (
                      <span className="mono" style={{ color: "var(--text-dim)", fontSize: 12 }}>
                        —
                      </span>
                    )}
                  </Td>
                  <Td nowrap>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={Boolean(pending[inv.id])}
                      onClick={() => onDelete(inv)}
                      style={{
                        padding: "5px 10px",
                        fontSize: 11.5,
                        color: "var(--danger)",
                        border: "1px solid rgba(255, 138, 120, 0.32)",
                        opacity: pending[inv.id] ? 0.55 : 1,
                      }}
                    >
                      Delete
                    </button>
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

/* ── Create invoice drawer ─────────────────────────────────────────────── */

/** One editable manual line row (all strings — controlled inputs). */
interface ManualLineRow {
  description: string;
  quantity: string;
  unitPrice: string;
}

const EMPTY_LINE: ManualLineRow = { description: "", quantity: "1", unitPrice: "" };

function CreateInvoiceDrawer({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateInvoiceInput) => Promise<string | null>;
}) {
  const [mode, setMode] = useState<"booking" | "manual">("booking");
  const [bookings, setBookings] = useState<AdminBooking[] | null>(null);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [rows, setRows] = useState<ManualLineRow[]>([{ ...EMPTY_LINE }]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch the bookings for the dropdown when the drawer first opens.
  useEffect(() => {
    if (!open || bookings !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await listBookings();
        if (!cancelled) {
          // Newest first, matching the bookings page.
          setBookings([...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
          setBookingsError(null);
        }
      } catch {
        if (!cancelled) {
          setBookingsError("Could not load bookings — switch to manual mode or reopen to retry.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, bookings]);

  const validRows = rows.filter((r) => r.description.trim().length > 0);
  const canSubmit =
    !submitting &&
    (mode === "booking"
      ? bookingId.length > 0
      : customerName.trim().length > 0 && validRows.length > 0);

  function toNum(raw: string, fallback: number): number {
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  }

  function resetFields() {
    setBookingId("");
    setCustomerName("");
    setCustomerEmail("");
    setRows([{ ...EMPTY_LINE }]);
    // Keep the chosen mode for fast repeat entry.
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setFormError(null);
    const input: CreateInvoiceInput =
      mode === "booking"
        ? { bookingId }
        : {
            customerName: customerName.trim(),
            customerEmail: customerEmail.trim(),
            lineItems: validRows.map((r) => ({
              description: r.description.trim(),
              quantity: toNum(r.quantity, 1),
              unitPrice: toNum(r.unitPrice, 0),
            })),
          };
    const err = await onSubmit(input);
    setSubmitting(false);
    if (err) {
      setFormError(err);
    } else {
      resetFields();
    }
  }

  function setRow(index: number, patch: Partial<ManualLineRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  // Closing clears any submit error so it never lingers on the next open.
  function close() {
    setFormError(null);
    onClose();
  }

  const modeButton = (value: "booking" | "manual", label: string) => (
    <button
      type="button"
      className={mode === value ? "btn btn-primary" : "btn btn-ghost"}
      onClick={() => setMode(value)}
      aria-pressed={mode === value}
      style={{ padding: "8px 14px", fontSize: 12.5 }}
    >
      {label}
    </button>
  );

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Create invoice"
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
            {submitting ? "Creating…" : "Create invoice"}
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

        {/* Booking-prefilled vs manual line items. */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {modeButton("booking", "From booking")}
          {modeButton("manual", "Manual line items")}
        </div>

        {mode === "booking" ? (
          <div className="field">
            <label htmlFor="inv-booking">Booking</label>
            <select
              id="inv-booking"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              aria-label="Booking"
              disabled={submitting || bookings === null}
            >
              <option value="">
                {bookings === null && !bookingsError ? "Loading bookings…" : "Choose a booking…"}
              </option>
              {(bookings ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {`${b.customerFirstName} ${b.customerLastName}`.trim() || b.customerEmail} — {b.modelId} —{" "}
                  {fmtDay(b.createdAt.slice(0, 10))}
                </option>
              ))}
            </select>
            {bookingsError && (
              <p className="mono" style={{ fontSize: 11, color: "var(--danger)", margin: "6px 0 0" }}>
                {bookingsError}
              </p>
            )}
            <p className="mono" style={{ fontSize: 11, color: "var(--text-dim)", margin: "6px 0 0" }}>
              Prefills the customer and line items from the booking&apos;s first payment: rental (first
              30 days), delivery fee when applicable, and the selected accessories.
            </p>
          </div>
        ) : (
          <>
            <div className="field-row">
              <div className="field">
                <label htmlFor="inv-customer">Customer name</label>
                <input
                  id="inv-customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Who is billed"
                  aria-label="Customer name"
                  disabled={submitting}
                />
              </div>
              <div className="field">
                <label htmlFor="inv-email">Customer email</label>
                <input
                  id="inv-email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="name@example.com"
                  aria-label="Customer email"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="field">
              <label>Line items</label>
              {rows.map((row, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <input
                    value={row.description}
                    onChange={(e) => setRow(i, { description: e.target.value })}
                    placeholder="Description"
                    aria-label={`Line ${i + 1} description`}
                    disabled={submitting}
                    style={{ flex: 3, minWidth: 0 }}
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="1"
                    value={row.quantity}
                    onChange={(e) => setRow(i, { quantity: e.target.value })}
                    placeholder="Qty"
                    aria-label={`Line ${i + 1} quantity`}
                    disabled={submitting}
                    style={{ width: 64, flexShrink: 0 }}
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={row.unitPrice}
                    onChange={(e) => setRow(i, { unitPrice: e.target.value })}
                    placeholder="€ / unit"
                    aria-label={`Line ${i + 1} unit price`}
                    disabled={submitting}
                    style={{ width: 90, flexShrink: 0 }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                    disabled={submitting || rows.length === 1}
                    aria-label={`Remove line ${i + 1}`}
                    style={{
                      padding: "6px 10px",
                      fontSize: 12,
                      flexShrink: 0,
                      opacity: rows.length === 1 ? 0.45 : 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setRows((prev) => [...prev, { ...EMPTY_LINE }])}
                disabled={submitting}
                style={{ padding: "7px 12px", fontSize: 12 }}
              >
                + Add line
              </button>
              <p className="mono" style={{ fontSize: 11, color: "var(--text-dim)", margin: "8px 0 0" }}>
                Prices are gross (VAT included) — the VAT split uses the rate from Settings.
              </p>
            </div>
          </>
        )}

        {!canSubmit && !submitting && (
          <p className="mono" style={{ fontSize: 11.5, color: "var(--text-dim)", margin: 0 }}>
            {mode === "booking"
              ? "Pick a booking to invoice."
              : "A customer name and at least one line with a description are required."}
          </p>
        )}

        {/* Hidden submit keeps Enter-to-save working. */}
        <button type="submit" style={{ display: "none" }} aria-hidden tabIndex={-1} />
      </form>
    </Drawer>
  );
}

/* ── Incomings panel (Phase 1: totals only) ────────────────────────────── */

function IncomingsPanel({ summary }: { summary: BillingSummary }) {
  return (
    <AdminSection title="Incomings">
      <div className="card" style={{ padding: 22 }}>
        <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 18px", lineHeight: 1.6 }}>
          Incomings are the sum of all <strong style={{ color: "var(--text-2)" }}>paid</strong> customer
          payments. A full itemised incomings table is planned for a later phase.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
          }}
        >
          <SmallStat label="This month" value={formatEur(summary.monthIncomings)} />
          <SmallStat label="All-time" value={formatEur(summary.allIncomings)} />
        </div>
      </div>
    </AdminSection>
  );
}

/* ── Add expense drawer ────────────────────────────────────────────────── */

function AddExpenseDrawer({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateExpenseInput, invoice: File | null) => Promise<string | null>;
}) {
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState<string>(CATEGORIES[0].value);
  const [supplier, setSupplier] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [invoice, setInvoice] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const amountNum = Number(amount);
  const amountOk = amount.trim().length > 0 && Number.isFinite(amountNum) && amountNum >= 0;
  const descOk = description.trim().length > 0;
  const dateOk = date.length > 0;
  const canSubmit = amountOk && descOk && dateOk && !submitting;

  function resetFields() {
    setDate(todayISO());
    setSupplier("");
    setDescription("");
    setAmount("");
    setNotes("");
    setInvoice(null);
    // Keep the category selection for fast repeat entry.
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setFormError(null);
    const err = await onSubmit(
      {
        date,
        category: category.trim(),
        supplier: supplier.trim(),
        description: description.trim(),
        amountGross: amountNum,
        currency: "EUR",
        notes: notes.trim() || undefined,
      },
      invoice,
    );
    setSubmitting(false);
    if (err) {
      setFormError(err);
    } else {
      resetFields();
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
      title="Add expense"
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
            {submitting ? "Saving…" : "Save expense"}
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

        <div className="field">
          <label>Date</label>
          <DateField value={date} onChange={setDate} disabled={submitting} />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="ex-category">Category</label>
            <select
              id="ex-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Category"
              disabled={submitting}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="ex-amount">Amount (€, gross)</label>
            <input
              id="ex-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              aria-label="Amount in euros"
              disabled={submitting}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="ex-supplier">Supplier</label>
          <input
            id="ex-supplier"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="Who was paid"
            aria-label="Supplier"
            disabled={submitting}
          />
        </div>

        <div className="field">
          <label htmlFor="ex-description">Description</label>
          <textarea
            id="ex-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this expense for?"
            aria-label="Description"
            rows={3}
            disabled={submitting}
            style={{ resize: "vertical", lineHeight: 1.5 }}
          />
        </div>

        <div className="field">
          <label htmlFor="ex-notes">Notes (optional)</label>
          <input
            id="ex-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else"
            aria-label="Notes"
            disabled={submitting}
          />
        </div>

        <div className="field">
          <label htmlFor="ex-invoice">Invoice / receipt (optional)</label>
          <input
            id="ex-invoice"
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            onChange={(e) => setInvoice(e.target.files?.[0] ?? null)}
            aria-label="Invoice or receipt file"
            disabled={submitting}
            style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}
          />
          <p className="mono" style={{ fontSize: 11, color: "var(--text-dim)", margin: "6px 0 0" }}>
            PDF, PNG or JPG · max 10 MB
          </p>
        </div>

        {!canSubmit && (
          <p className="mono" style={{ fontSize: 11.5, color: "var(--text-dim)", margin: 0 }}>
            A date, description and a non-negative amount are required.
          </p>
        )}

        {/* Hidden submit keeps Enter-to-save working. */}
        <button type="submit" style={{ display: "none" }} aria-hidden tabIndex={-1} />
      </form>
    </Drawer>
  );
}

/* ── Shared pieces (mirrors the maintenance page) ──────────────────────── */

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
  if (err instanceof BillingConfigError) {
    return { phase: "error", message: err.message, config: true };
  }
  if (err instanceof BillingApiError) {
    return { phase: "error", message: err.message, config: false };
  }
  return { phase: "error", message: fallback, config: false };
}
