"use client";

/**
 * /admin/billing — Money view (Phase 1 bookkeeping core). Shows a this-month vs
 * all-time summary (incomings from Paid payments, outgoings from expenses, net),
 * an editable Expenses table with per-row invoice download + an "Add expense"
 * drawer (with an optional invoice upload), and an incomings totals panel.
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
  BillingApiError,
  BillingConfigError,
  BillingAuthError,
  type Expense,
  type BillingSummary,
  type CreateExpenseInput,
} from "@/services/adminBillingService";
import { AdminTable, Th, Td, EmptyRow, AdminSection, fmtDay } from "@/components/admin/Table";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { useAdminRefresh } from "@/components/admin/useAdminRefresh";
import { Drawer } from "@/components/admin/Drawer";
import { DateField } from "@/components/admin/DateField";
import { PageHeader } from "@/components/admin/PageHeader";
import { formatEur } from "@/lib/money";

/** Common expense categories (free text — the field also accepts anything typed). */
const CATEGORIES = [
  { value: "bikes", label: "bikes" },
  { value: "parts", label: "parts" },
  { value: "rent", label: "rent" },
  { value: "other", label: "other" },
] as const;

/** Today as YYYY-MM-DD (local), used to seed the date input. */
function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type LoadState =
  | { phase: "loading" }
  | { phase: "ready"; expenses: Expense[]; summary: BillingSummary }
  | { phase: "error"; message: string; config: boolean };

export default function AdminBillingPage() {
  const { signOut } = useAdminAuth();
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    setActionError(null);
    try {
      const [expenses, summary] = await Promise.all([listExpenses(), getSummary()]);
      setState({ phase: "ready", expenses, summary });
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
          <PageHeader title="Billing" subtitle="Money in, money out — incomings, expenses and net.">
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

          <IncomingsPanel summary={state.summary} />

          <AddExpenseDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            onSubmit={submitExpense}
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
            {/* Free text with a datalist of common values — accepts anything typed. */}
            <input
              id="ex-category"
              list="ex-category-options"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. parts"
              aria-label="Category"
              disabled={submitting}
            />
            <datalist id="ex-category-options">
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value} />
              ))}
            </datalist>
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
